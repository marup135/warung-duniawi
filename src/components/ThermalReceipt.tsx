'use client';

import React from 'react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: {
    name: string;
    unit: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pickupMethod: string;
  paymentMethod: string;
  totalAmount: number;
  amountPaid?: number | null;
  changeAmount?: number | null;
  orderSource?: string | null;
  notes?: string | null;
  items: OrderItem[];
  createdAt: string;
}

interface ThermalReceiptProps {
  order: Order | null;
}

export default function ThermalReceipt({ order }: ThermalReceiptProps) {
  if (!order) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isPosOffline = order.orderSource === 'POS_KASIR' || order.pickupMethod === 'POS_OFFLINE';

  return (
    <div id="printable-receipt" className="hidden print:block text-black font-mono text-[11px] leading-tight">
      {/* Header Struk */}
      <div className="text-center font-bold border-b border-black pb-2 mb-2">
        <div className="text-sm font-extrabold uppercase">WARUNG DUNIAWI</div>
        <div className="text-[10px]">Sembako & Kebutuhan Harian</div>
        <div className="text-[9px] font-normal">Jl. Raya Utama No. 1, Kasir</div>
        <div className="text-[9px] font-normal">WA: 0812-3456-7890</div>
      </div>

      {/* Info Transaksi */}
      <div className="border-b border-black pb-2 mb-2 text-[10px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>NO: {order.orderNumber}</span>
          <span>{formattedDate}</span>
        </div>
        <div>PELANGGAN : {order.customerName.toUpperCase()}</div>
        {order.customerPhone && order.customerPhone !== '-' && (
          <div>NO WA     : {order.customerPhone}</div>
        )}
        <div>TIPE      : {isPosOffline ? 'TRANSAKSI KASIR TOKO' : 'AMBIL DI WARUNG'}</div>
      </div>

      {/* List Items */}
      <div className="border-b border-black pb-2 mb-2 space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="text-[10px]">
            <div className="font-bold line-clamp-1">{item.product.name}</div>
            <div className="flex justify-between pl-2 text-[9.5px]">
              <span>
                {item.quantity} x {formatRupiah(item.price)}
              </span>
              <span className="font-bold">{formatRupiah(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ringkasan Bayar & Kembalian */}
      <div className="space-y-1 text-[10.5px]">
        <div className="flex justify-between font-extrabold text-xs">
          <span>TOTAL  :</span>
          <span>{formatRupiah(order.totalAmount)}</span>
        </div>

        {isPosOffline && order.amountPaid ? (
          <>
            <div className="flex justify-between text-[10px]">
              <span>BAYAR  :</span>
              <span>{formatRupiah(order.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold">
              <span>KEMBALI:</span>
              <span>{formatRupiah(order.changeAmount || 0)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-[10px]">
            <span>BAYAR DI KASIR:</span>
            <span>QRIS / TUNAI</span>
          </div>
        )}
      </div>

      {order.notes && (
        <div className="mt-2 text-[9px] italic border-t border-black pt-1">
          Ket: {order.notes}
        </div>
      )}

      {/* Footer Struk */}
      <div className="text-center mt-3 pt-2 border-t border-black text-[9px]">
        <div>*** TERIMA KASIH ***</div>
        <div>Selamat Belanja Kembali di</div>
        <div className="font-bold">Warung Duniawi</div>
      </div>
    </div>
  );
}
