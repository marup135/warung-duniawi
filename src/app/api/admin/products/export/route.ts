import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: Ekspor seluruh data produk ke format CSV
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    // Buat header CSV
    const headers = [
      'ID Produk',
      'Barcode',
      'Nama Produk',
      'Kategori',
      'Harga (Rp)',
      'Satuan',
      'Status Stok',
      'Produk Unggulan',
      'Deskripsi',
      'URL Gambar',
      'Tanggal Dibuat',
    ];

    // Helper untuk escape format CSV (menghindari error jika ada tanda koma atau petik)
    const escapeCsvField = (field: any) => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = products.map((p) => [
      escapeCsvField(p.id),
      escapeCsvField(p.barcode || '-'),
      escapeCsvField(p.name),
      escapeCsvField(p.category?.name || '-'),
      escapeCsvField(p.price),
      escapeCsvField(p.unit),
      escapeCsvField(p.inStock ? 'Tersedia' : 'Habis'),
      escapeCsvField(p.isFeatured ? 'Ya' : 'Tidak'),
      escapeCsvField(p.description || '-'),
      escapeCsvField(p.imageUrl || '-'),
      escapeCsvField(new Date(p.createdAt).toLocaleString('id-ID')),
    ]);

    // Gabungkan baris dengan newline
    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    // Tambahkan UTF-8 BOM (\uFEFF) agar terbaca sempurna di Microsoft Excel (tidak rusak aksen/karakter)
    const bomCsvContent = '\uFEFF' + csvContent;

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `produk-warungduniawi-${dateStr}.csv`;

    return new NextResponse(bomCsvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Error exporting products:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data produk' },
      { status: 500 }
    );
  }
}
