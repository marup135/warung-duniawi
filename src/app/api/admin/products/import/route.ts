import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Helper parse line CSV (menghargai tanda kutip dan delimiter koma atau titik koma)
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File CSV tidak ditemukan.' },
        { status: 400 }
      );
    }

    // Baca file sebagai teks UTF-8
    let text = await file.text();

    // Hapus UTF-8 BOM jika ada
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    const lines = text
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, message: 'File CSV kosong atau tidak memiliki baris data.' },
        { status: 400 }
      );
    }

    // Deteksi delimiter (koma ',' atau titik koma ';')
    const firstLine = lines[0];
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

    const headerCols = parseCSVLine(firstLine, delimiter).map((h) =>
      h.toLowerCase().replace(/["\s]/g, '')
    );

    // Identifikasi indeks kolom penting
    // Mendukung format ekspor: ID Produk, Barcode, Nama Produk, Kategori, Harga (Rp), Satuan, Status Stok, Deskripsi, URL Gambar
    const nameIdx = headerCols.findIndex((h) => h.includes('nama') || h.includes('name'));
    const priceIdx = headerCols.findIndex((h) => h.includes('harga') || h.includes('price'));
    const barcodeIdx = headerCols.findIndex((h) => h.includes('barcode') || h.includes('kode'));
    const categoryIdx = headerCols.findIndex((h) => h.includes('kategori') || h.includes('category'));
    const unitIdx = headerCols.findIndex((h) => h.includes('satuan') || h.includes('unit'));
    const stockIdx = headerCols.findIndex((h) => h.includes('stok') || h.includes('status'));
    const descIdx = headerCols.findIndex((h) => h.includes('deskripsi') || h.includes('desc'));
    const imgIdx = headerCols.findIndex((h) => h.includes('gambar') || h.includes('image') || h.includes('foto'));

    if (nameIdx === -1 || priceIdx === -1) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Format kolom tidak valid. CSV wajib memiliki minimal kolom "Nama Produk" dan "Harga".',
        },
        { status: 400 }
      );
    }

    // Ambil semua kategori untuk pencocokan / pembuatan kategori baru
    const existingCategories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>();
    existingCategories.forEach((c) => {
      categoryMap.set(c.name.toLowerCase().trim(), c.id);
    });

    // Helper slug
    const makeSlug = (text: string) => {
      const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'item';
      return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
    };

    // Default category fallback
    let defaultCategoryId = existingCategories[0]?.id;
    if (!defaultCategoryId) {
      const createdDefaultCat = await prisma.category.create({
        data: { name: 'Sembako & Dapur', slug: 'sembako-dapur', icon: '🌾' },
      });
      defaultCategoryId = createdDefaultCat.id;
      categoryMap.set('sembako & dapur', defaultCategoryId);
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i], delimiter);
      if (cols.length === 0) continue;

      const rawName = cols[nameIdx]?.trim();
      const rawPrice = cols[priceIdx]?.replace(/[^\d]/g, '');

      if (!rawName || !rawPrice) {
        skippedCount++;
        continue;
      }

      const name = rawName;
      const price = parseInt(rawPrice, 10);
      if (isNaN(price) || price < 0) {
        skippedCount++;
        continue;
      }

      const barcodeRaw = barcodeIdx !== -1 ? cols[barcodeIdx]?.trim() : '';
      const barcode = barcodeRaw && barcodeRaw !== '-' ? barcodeRaw : null;
      const unit = unitIdx !== -1 && cols[unitIdx]?.trim() ? cols[unitIdx].trim() : 'pcs';
      const desc = descIdx !== -1 && cols[descIdx]?.trim() && cols[descIdx] !== '-' ? cols[descIdx].trim() : null;
      const imageUrl = imgIdx !== -1 && cols[imgIdx]?.trim() && cols[imgIdx] !== '-' ? cols[imgIdx].trim() : null;

      const inStock =
        stockIdx !== -1
          ? !cols[stockIdx]?.toLowerCase().includes('habis') && !cols[stockIdx]?.toLowerCase().includes('false')
          : true;

      // Cari atau buat kategori
      const rawCatName = categoryIdx !== -1 ? cols[categoryIdx]?.trim() : '';
      let targetCategoryId = defaultCategoryId;

      if (rawCatName && rawCatName !== '-') {
        const catKey = rawCatName.toLowerCase();
        if (categoryMap.has(catKey)) {
          targetCategoryId = categoryMap.get(catKey)!;
        } else {
          // Buat kategori baru jika belum ada
          try {
            const newCat = await prisma.category.create({
              data: {
                name: rawCatName,
                slug: makeSlug(rawCatName),
                icon: '📦',
              },
            });
            categoryMap.set(catKey, newCat.id);
            targetCategoryId = newCat.id;
          } catch {
            targetCategoryId = defaultCategoryId;
          }
        }
      }

      // Cek apakah produk sudah ada (cocokkan barcode jika ada, atau cocokkan nama)
      let existingProd = null;
      if (barcode) {
        existingProd = await prisma.product.findUnique({
          where: { barcode },
        });
      }

      if (!existingProd) {
        existingProd = await prisma.product.findFirst({
          where: { name: { equals: name } },
        });
      }

      if (existingProd) {
        // UPDATE PRODUK
        await prisma.product.update({
          where: { id: existingProd.id },
          data: {
            name,
            price,
            unit,
            barcode: barcode || existingProd.barcode,
            categoryId: targetCategoryId,
            inStock,
            ...(desc ? { description: desc } : {}),
            ...(imageUrl ? { imageUrl } : {}),
          },
        });
        updatedCount++;
      } else {
        // INSERT PRODUK BARU
        await prisma.product.create({
          data: {
            name,
            slug: makeSlug(name),
            price,
            unit,
            barcode,
            categoryId: targetCategoryId,
            inStock,
            description: desc,
            imageUrl,
          },
        });
        insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Impor berhasil: ${insertedCount} produk baru ditambahkan, ${updatedCount} produk diperbarui, ${skippedCount} baris dilewati.`,
      data: {
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
      },
    });
  } catch (error: any) {
    console.error('Error importing products:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengimpor file CSV.' },
      { status: 500 }
    );
  }
}
