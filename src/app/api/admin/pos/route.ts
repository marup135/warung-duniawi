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
      let product = null;

      if (item.productId && item.productId.startsWith('manual-')) {
        // Produk Manual Cepat Kasir (F2)
        const manualName = (item.name || 'Barang Lain-lain').trim();
        const manualPrice = Number(item.price) || 0;

        // Cari atau buat kategori umum "Lain-lain"
        let genericCategory = await prisma.category.findFirst({
          where: { slug: 'lain-lain' },
        });

        if (!genericCategory) {
          genericCategory = await prisma.category.create({
            data: {
              name: 'Lain-lain',
              slug: 'lain-lain',
              icon: '📦',
              sortOrder: 99,
            },
          });
        }

        // Cari apakah produk manual dengan nama dan harga ini sudah ada, jika belum buat baru
        const manualSlug = `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        product = await prisma.product.create({
          data: {
            name: manualName,
            slug: manualSlug,
            price: manualPrice,
            unit: 'item',
            categoryId: genericCategory.id,
            inStock: true,
          },
        });
      } else {
        product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
      }

      if (!product) {
        return NextResponse.json(
          { success: false, message: `Produk tidak ditemukan` },
          { status: 400 }
        );
      }

      const itemPrice = item.price !== undefined ? Number(item.price) : product.price;
      const itemSubtotal = itemPrice * item.quantity;
      totalAmount += itemSubtotal;

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
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
