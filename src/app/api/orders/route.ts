import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, items, notes } = body;

    if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data pesanan tidak lengkap' },
        { status: 400 }
      );
    }

    // Hitung total belanja dari database
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || !product.inStock) {
        return NextResponse.json(
          { success: false, message: `Produk ${product?.name || 'tersebut'} tidak tersedia` },
          { status: 400 }
        );
      }

      const itemSubtotal = product.price * item.quantity;
      totalAmount += itemSubtotal;

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemSubtotal,
      });
    }

    // Generate kode unik order: WD-TANGGAL-RANDOM (cth: WD-261002-891)
    const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `WD-${todayStr}-${randomSuffix}`;

    // Simpan order & order items ke database Prisma
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        pickupMethod: 'PICKUP',
        paymentMethod: 'CASH_OR_QRIS_ON_SITE',
        status: 'PENDING',
        totalAmount,
        notes: notes ? notes.trim() : null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pesanan berhasil dibuat!',
      data: newOrder,
    });
  } catch (error) {
    console.error('Error submitting order:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses pesanan' },
      { status: 500 }
    );
  }
}
