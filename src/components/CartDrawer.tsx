'use client';

import React, { useState } from 'react';
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight, Store, Truck, CreditCard, CheckCircle2 } from 'lucide-react';
import { CartItem } from './CatalogView';
import confetti from 'canvas-confetti';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onClearCart,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  if (!isOpen) return null;

  const totalAmount = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Mohon isi Nama dan Nomor WhatsApp Anda.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName,
        customerPhone,
        notes,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setCompletedOrder(json.data);
        onClearCart();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        alert(json.message || 'Gagal memproses pesanan.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setCompletedOrder(null);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Dim */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="px-5 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h2 className="font-extrabold text-stone-900 text-lg">
                Keranjang Belanja
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {completedOrder ? (
              /* Success Nota Digital */
              <div className="bg-white p-6 rounded-3xl border border-stone-200 text-center space-y-4 shadow-sm animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Pesanan Terkirim!
                  </span>
                  <h3 className="text-xl font-extrabold text-stone-900 mt-2">
                    {completedOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Terima kasih <span className="font-bold text-stone-800">{completedOrder.customerName}</span>, pesanan Anda sedang disiapkan warung!
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between font-semibold text-stone-700">
                    <span>Metode Pengambilan:</span>
                    <span className="text-amber-700 font-bold">Ambil di Warung</span>
                  </div>
                  <div className="flex justify-between font-semibold text-stone-700">
                    <span>Pembayaran di Kasir:</span>
                    <span className="text-stone-900">QRIS / Tunai / Transfer</span>
                  </div>
                  <div className="border-t border-amber-200 pt-2 flex justify-between font-extrabold text-stone-900 text-sm">
                    <span>Total Bayar:</span>
                    <span className="text-orange-600">{formatRupiah(completedOrder.totalAmount)}</span>
                  </div>
                </div>

                {/* Ringkasan Item Nota */}
                <div className="text-left text-xs space-y-1.5 pt-2">
                  <span className="font-bold text-stone-500 block mb-1">Detail Item:</span>
                  {completedOrder.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-stone-700">
                      <span>{it.quantity}x {it.product.name}</span>
                      <span className="font-semibold">{formatRupiah(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleResetModal}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-md"
                >
                  Belanja Lagi
                </button>
              </div>
            ) : cart.length > 0 ? (
              <>
                {/* List Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                    <span>Daftar Barang ({cart.length})</span>
                    <button
                      onClick={onClearCart}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Kosongkan
                    </button>
                  </div>

                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-white p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-100"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-lg">
                            📦
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm leading-tight line-clamp-1">
                            {item.product.name}
                          </h4>
                          <span className="text-xs text-orange-600 font-extrabold block mt-0.5">
                            {formatRupiah(item.product.price)}
                          </span>
                        </div>
                      </div>

                      {/* Control Qty */}
                      <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-1">
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity - 1)
                          }
                          className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-stone-700 shadow-2xs text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-extrabold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="w-6 h-6 bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-xs text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form Informasi Pemesan */}
                <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4 pt-2">
                  <div className="border-t border-stone-200 pt-4">
                    <h3 className="font-extrabold text-stone-900 text-sm mb-3">
                      Informasi Pemesan
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Nama Anda <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Contoh: Budi Prasetyo"
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          No. WhatsApp <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Contoh: 081234567890"
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Catatan Tambahan (Opsional)
                        </label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Misal: Es krim jangan digabung barang panas"
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Opsi Pengambilan */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-700">
                      Opsi Pengambilan
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-orange-50 border-2 border-orange-500 rounded-xl flex items-center gap-2 text-xs font-bold text-orange-900">
                        <Store className="w-4 h-4 text-orange-600" /> Ambil di Warung
                      </div>
                      <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-between text-xs text-stone-400 opacity-60 cursor-not-allowed">
                        <span className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Diantar</span>
                        <span className="text-[9px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-bold">SOON</span>
                      </div>
                    </div>
                  </div>

                  {/* Metode Bayar */}
                  <div className="p-3 bg-white border border-stone-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-stone-800">
                      <CreditCard className="w-4 h-4 text-emerald-600" /> Bayar di Kasir Warung
                    </div>
                    <p className="text-stone-500 text-[11px] pl-6">
                      Tersedia pembayaran QRIS, Tunai, atau Transfer saat Anda mengambil barang.
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🛒</div>
                <h3 className="font-bold text-stone-800">Keranjang Masih Kosong</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Pilih barang kebutuhan Anda dari katalog warung.
                </p>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && !completedOrder && (
            <div className="p-5 bg-white border-t border-stone-200 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-600 font-semibold">Total Belanja:</span>
                <span className="text-xl font-black text-orange-600">
                  {formatRupiah(totalAmount)}
                </span>
              </div>
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-extrabold text-base shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Kirim Pesanan Sekarang'} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
