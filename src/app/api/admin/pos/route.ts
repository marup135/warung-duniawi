import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST: Transaksi Kasir Toko POS Offline
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, amountPaid, changeAmount, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Daftar belanjaan kasir kosong' },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { success: false, message: `Produk ID ${item.productId} tidak ditemukan` },
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

    // Kode Unik Transaksi Kasir Toko: WD-POS-YYMMDD-XXX
    const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `WD-POS-${todayStr}-${randomSuffix}`;

    const newPosOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName: 'Pembeli Toko (Offline)',
        customerPhone: '-',
        pickupMethod: 'POS_OFFLINE',
        paymentMethod: 'TUNAI_KASIR',
        status: 'COMPLETED', // Transaksi kasir langsung lunas/selesai
        totalAmount,
        amountPaid: Number(amountPaid) || totalAmount,
        changeAmount: Number(changeAmount) || 0,
        orderSource: 'POS_KASIR',
        notes: notes ? notes.trim() : 'Transaksi Kasir Toko',
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
      message: 'Transaksi Kasir berhasil diselesaikan!',
      data: newPosOrder,
    });
  } catch (error) {
    console.error('Error submitting POS order:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses transaksi kasir' },
      { status: 500 }
    );
  }
}
