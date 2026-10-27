import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: Ambil daftar semua pesanan untuk dashboard admin
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pesanan' },
      { status: 500 }
    );
  }
}

// PATCH: Update status pesanan (e.g., PENDING -> PROCESSING -> COMPLETED)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, message: 'orderId dan status wajib diisi' },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      message: `Status order berhasil diubah menjadi ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate status pesanan' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus pesanan per ID atau hapus riwayat pesanan online yang selesai / dibatalkan
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    const mode = searchParams.get('mode'); // 'single', 'completed_online', 'all_online'

    if (orderId) {
      // Hapus satu pesanan tertentu
      await prisma.order.delete({
        where: { id: orderId },
      });

      return NextResponse.json({
        success: true,
        message: 'Pesanan berhasil dihapus dari riwayat!',
      });
    }

    if (mode === 'completed_online') {
      // Hapus semua pesanan online yang sudah COMPLETED atau CANCELLED
      const result = await prisma.order.deleteMany({
        where: {
          orderSource: 'ONLINE_WEB',
          status: { in: ['COMPLETED', 'CANCELLED'] },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil membersihkan ${result.count} riwayat pesanan online yang sudah selesai/dibatalkan!`,
        count: result.count,
      });
    }

    if (mode === 'all_online') {
      // Hapus semua pesanan online
      const result = await prisma.order.deleteMany({
        where: {
          orderSource: 'ONLINE_WEB',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus seluruh riwayat (${result.count}) pesanan online!`,
        count: result.count,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Parameter id atau mode wajib diisi' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menghapus pesanan' },
      { status: 500 }
    );
  }
}

