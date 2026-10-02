import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST: Tambah produk baru oleh admin
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, categoryId, price, unit, description, imageUrl, inStock, isFeatured } = body;

    if (!name || !categoryId || price === undefined) {
      return NextResponse.json(
        { success: false, message: 'Nama, kategori, dan harga wajib diisi' },
        { status: 400 }
      );
    }

    // Slug otomatis dari nama produk
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = `${slugBase}-${Math.floor(Math.random() * 1000)}`;

    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        categoryId,
        price: Number(price),
        unit: unit ? unit.trim() : 'pcs',
        description: description ? description.trim() : null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil ditambahkan!',
      data: newProduct,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambah produk' },
      { status: 500 }
    );
  }
}

// PUT / PATCH: Full Edit atau Quick Edit Produk
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { productId, name, categoryId, price, unit, description, imageUrl, inStock, isFeatured } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'productId wajib diisi' },
        { status: 400 }
      );
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId;
    if (price !== undefined) dataToUpdate.price = Number(price);
    if (unit !== undefined) dataToUpdate.unit = unit.trim();
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl ? imageUrl.trim() : null;
    if (inStock !== undefined) dataToUpdate.inStock = Boolean(inStock);
    if (isFeatured !== undefined) dataToUpdate.isFeatured = Boolean(isFeatured);

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui!',
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui produk' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}

// DELETE: Hapus produk dari database
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'ID produk wajib diberikan' },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus!',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}
