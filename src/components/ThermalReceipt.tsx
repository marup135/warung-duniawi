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
  deliveryAddress?: string | null;
  paymentMethod: string;
  totalAmount: number;
  shippingFee?: number | null;
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
    <div
      id="printable-receipt"
      className="struk-kasir struk-container hidden print:block text-black font-mono text-[11px] font-bold leading-normal"
    >
      {/* Baris kosong pemisah agar teks toko tidak kena pisau pemotong */}
      <div style={{ height: '14px' }}></div>

      {/* Header Struk */}
      <div className="text-center font-bold border-b border-black pb-2 mb-2">
        <div className="text-base font-black uppercase tracking-wider">WARUNG DUNIAWI</div>
        <div className="text-[11px] font-bold">Sembako & Kebutuhan Harian</div>
        <div className="text-[10px] font-normal">Jl. Raya Utama No. 1, Kasir</div>
        <div className="text-[10px] font-normal">WA: 0812-3456-7890</div>
      </div>

      {/* Info Transaksi */}
      <div className="border-b border-black pb-1.5 mb-1.5 text-[11px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>{order.orderNumber}</span>
          <span>{formattedDate}</span>
        </div>
        <div className="truncate font-bold">PELANGGAN: {order.customerName.toUpperCase()}</div>
        {order.customerPhone && order.customerPhone !== '-' && (
          <div>NO WA: {order.customerPhone}</div>
        )}
        <div className="font-semibold">
          TIPE: {isPosOffline
            ? 'KASIR TOKO'
            : order.pickupMethod === 'DELIVERY'
            ? 'DIANTAR (KP. PAMUNDAYAN 1)'
            : 'AMBIL DI WARUNG'}
        </div>
        {order.pickupMethod === 'DELIVERY' && order.deliveryAddress && (
          <div className="font-bold border-t border-dashed border-black pt-1 mt-1 text-[10.5px]">
            ALAMAT: {order.deliveryAddress.toUpperCase()}
          </div>
        )}
      </div>

      {/* List Items */}
      <div className="border-b border-black pb-1.5 mb-1.5 space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="text-[11.5px]">
            <div className="font-bold">{item.product.name}</div>
            <div className="flex justify-between pl-1 text-[11px]">
              <span>
                {item.quantity} x {formatRupiah(item.price)}
              </span>
              <span className="font-bold">{formatRupiah(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ringkasan Bayar & Kembalian */}
      <div className="space-y-0.5 text-[12px]">
        {order.shippingFee !== undefined && order.shippingFee !== null && order.shippingFee > 0 && (
          <div className="flex justify-between text-[11px]">
            <span>ONGKIR:</span>
            <span>{formatRupiah(order.shippingFee)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-sm pt-1 border-t border-dashed border-black">
          <span>TOTAL:</span>
          <span>{formatRupiah(order.totalAmount)}</span>
        </div>

        {isPosOffline && order.amountPaid ? (
          <>
            <div className="flex justify-between text-[11px] pt-0.5">
              <span>BAYAR:</span>
              <span>{formatRupiah(order.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span>KEMBALIAN:</span>
              <span>{formatRupiah(order.changeAmount || 0)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-[11px] pt-0.5">
            <span>BAYAR:</span>
            <span className="font-bold">QRIS / TUNAI</span>
          </div>
        )}
      </div>

      {order.notes && (
        <div className="mt-2 text-[10px] italic border-t border-black pt-1">
          Ket: {order.notes}
        </div>
      )}

      {/* Footer Struk */}
      <div className="text-center mt-3 pt-2 border-t border-black text-[10px] font-medium">
        <div>*** TERIMA KASIH ***</div>
        <div>Selamat Belanja Kembali di</div>
        <div className="font-bold text-[11px]">Warung Duniawi</div>
      </div>

      {/* Baris kosong penutup di paling bawah */}
      <div style={{ height: '18px' }}></div>
    </div>
  );
}
