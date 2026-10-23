'use client';

import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Store,
  Truck,
  CreditCard,
  CheckCircle2,
  MapPin,
  Sparkles,
  Info,
} from 'lucide-react';
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
  const [pickupMethod, setPickupMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  if (!isOpen) return null;

  const itemsSubtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const isDelivery = pickupMethod === 'DELIVERY';
  const freeShippingThreshold = 100000;
  const isFreeShipping = itemsSubtotal >= freeShippingThreshold;
  const shippingFee = isDelivery ? (isFreeShipping ? 0 : 2000) : 0;
  const totalAmount = itemsSubtotal + shippingFee;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - itemsSubtotal);

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

    if (isDelivery && !deliveryAddress.trim()) {
      alert('Mohon isi detail alamat / patokan rumah di KP. Pamundayan 1.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName,
        customerPhone,
        pickupMethod,
        deliveryAddress: isDelivery ? deliveryAddress : null,
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
    setDeliveryAddress('');
    setNotes('');
    setPickupMethod('PICKUP');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Dim */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container: 100% lebar di mobile, max-w-md di desktop tanpa offset pl-10 */}
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-md flex">
        <div className="w-full bg-[#FAF8F5] shadow-2xl flex flex-col h-full overflow-hidden">
          {/* Drawer Header */}
          <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h2 className="font-extrabold text-stone-900 text-base sm:text-lg">
                Keranjang Belanja
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              aria-label="Tutup Keranjang"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
            {completedOrder ? (
              /* Success Nota Digital */
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 text-center space-y-4 shadow-sm animate-in fade-in">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Pesanan Terkirim!
                  </span>
                  <h3 className="text-xl font-black text-stone-900 mt-2">
                    {completedOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Terima kasih <span className="font-bold text-stone-800">{completedOrder.customerName}</span>, pesanan Anda sedang disiapkan warung!
                  </p>
                </div>

                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between font-semibold text-stone-700">
                    <span>Metode Pengambilan:</span>
                    <span className="text-amber-800 font-extrabold flex items-center gap-1">
                      {completedOrder.pickupMethod === 'DELIVERY' ? (
                        <>
                          <Truck className="w-3.5 h-3.5 text-orange-600" /> Diantar (KP. Pamundayan 1)
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-amber-700" /> Ambil di Warung
                        </>
                      )}
                    </span>
                  </div>

                  {completedOrder.deliveryAddress && (
                    <div className="flex flex-col text-stone-700 pt-1 border-t border-amber-200/60">
                      <span className="font-semibold text-stone-500 text-[11px]">Alamat / Patokan:</span>
                      <span className="font-bold text-stone-900 mt-0.5">{completedOrder.deliveryAddress}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-stone-700">
                    <span>Pembayaran:</span>
                    <span className="text-stone-900 font-medium">
                      {completedOrder.pickupMethod === 'DELIVERY' ? 'COD (Tunai / QRIS saat diantar)' : 'QRIS / Tunai di Kasir'}
                    </span>
                  </div>

                  {completedOrder.shippingFee > 0 && (
                    <div className="flex justify-between font-semibold text-stone-700">
                      <span>Ongkos Kirim:</span>
                      <span className="text-stone-900">{formatRupiah(completedOrder.shippingFee)}</span>
                    </div>
                  )}

                  <div className="border-t border-amber-200 pt-2 flex justify-between font-extrabold text-stone-900 text-sm">
                    <span>Total Bayar:</span>
                    <span className="text-orange-600 font-black">{formatRupiah(completedOrder.totalAmount)}</span>
                  </div>
                </div>

                {/* Ringkasan Item Nota */}
                <div className="text-left text-xs space-y-1.5 pt-2">
                  <span className="font-bold text-stone-500 block mb-1">Detail Item:</span>
                  {completedOrder.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-stone-700">
                      <span>
                        {it.quantity}x {it.product?.name || 'Produk'}
                      </span>
                      <span className="font-semibold">{formatRupiah(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleResetModal}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-md cursor-pointer"
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
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Kosongkan
                    </button>
                  </div>

                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center justify-between gap-2.5 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-11 h-11 rounded-xl object-cover border border-stone-100 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-stone-100 rounded-xl flex items-center justify-center text-base shrink-0">
                            📦
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-xs sm:text-sm leading-tight truncate">
                            {item.product.name}
                          </h4>
                          <span className="text-xs text-orange-600 font-black block mt-0.5">
                            {formatRupiah(item.product.price)}
                          </span>
                        </div>
                      </div>

                      {/* Control Qty */}
                      <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-1 shrink-0">
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity - 1)
                          }
                          className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-stone-700 shadow-2xs text-xs font-bold cursor-pointer"
                          aria-label="Kurangi"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-black text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="w-6 h-6 bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-xs text-xs font-bold cursor-pointer"
                          aria-label="Tambah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form Informasi Pemesan */}
                <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4 pt-2">
                  <div className="border-t border-stone-200 pt-4 space-y-3.5">
                    <h3 className="font-black text-stone-900 text-sm">
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
                          className="w-full px-3 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                          className="w-full px-3 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* Opsi Pengambilan: Ambil di Warung vs Diantar */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-bold text-stone-700">
                        Opsi Pengambilan
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Tombol Ambil di Warung */}
                        <button
                          type="button"
                          onClick={() => setPickupMethod('PICKUP')}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
                            pickupMethod === 'PICKUP'
                              ? 'bg-amber-50 border-orange-500 text-orange-950 shadow-xs ring-2 ring-orange-500/20'
                              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <Store className={`w-5 h-5 ${pickupMethod === 'PICKUP' ? 'text-orange-600' : 'text-stone-400'}`} />
                          <span>Ambil di Warung</span>
                        </button>

                        {/* Tombol Diantar ke Rumah */}
                        <button
                          type="button"
                          onClick={() => setPickupMethod('DELIVERY')}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold border transition-all cursor-pointer relative ${
                            pickupMethod === 'DELIVERY'
                              ? 'bg-amber-50 border-orange-500 text-orange-950 shadow-xs ring-2 ring-orange-500/20'
                              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <Truck className={`w-5 h-5 ${pickupMethod === 'DELIVERY' ? 'text-orange-600' : 'text-stone-400'}`} />
                          <span>Diantar ke Rumah</span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-300">
                            KP. Pamundayan 1
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Khusus jika Diantar ke Rumah: Banner Gamifikasi Free Ongkir & Form Alamat */}
                    {isDelivery && (
                      <div className="space-y-3 p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl animate-in fade-in slide-in-from-top-2">
                        {/* Info Wilayah & Promo Ongkir */}
                        <div className="flex items-start gap-2 text-xs">
                          <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-orange-950 block">
                              Pengantaran Khusus KP. Pamundayan 1
                            </span>
                            <span className="text-[11px] text-orange-800">
                              Ongkir Rp 2.000 (Gratis Ongkir min. belanja Rp 100.000).
                            </span>
                          </div>
                        </div>

                        {/* Gamifikasi Free Ongkir Bar */}
                        <div className="p-2.5 bg-white rounded-xl border border-orange-200 shadow-2xs space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-bold">
                            {isFreeShipping ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> Selamat! Anda Dapat FREE ONGKIR
                              </span>
                            ) : (
                              <span className="text-stone-700">
                                Belanja lagi <span className="text-orange-600 font-black">{formatRupiah(amountNeededForFreeShipping)}</span> untuk Free Ongkir
                              </span>
                            )}
                            <span className="text-stone-500 text-[10px]">
                              {isFreeShipping ? 'Rp 0' : 'Rp 2.000'}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (itemsSubtotal / freeShippingThreshold) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Input Alamat / Patokan */}
                        <div>
                          <label className="block text-xs font-bold text-stone-800 mb-1">
                            Alamat / Patokan Rumah di KP. Pamundayan 1 <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            required
                            rows={2}
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Misal: RT 02 / RW 01, Gang Melati samping Mushola Al-Huda (Pagar Hitam)"
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Catatan Tambahan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Misal: Bawa kembalian uang Rp 50.000"
                        className="w-full px-3 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Metode Bayar Card */}
                  <div className="p-3 bg-white border border-stone-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-stone-800">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>{isDelivery ? 'Bayar di Tempat (COD)' : 'Bayar di Kasir Warung'}</span>
                    </div>
                    <p className="text-stone-500 text-[11px] pl-6 leading-relaxed">
                      {isDelivery
                        ? 'Siapkan uang tunai atau bayar via scan QRIS saat barang sampai di rumah Anda.'
                        : 'Tersedia pembayaran QRIS, Tunai, atau Transfer saat Anda mengambil barang di warung.'}
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

          {/* Drawer Footer Sticky */}
          {cart.length > 0 && !completedOrder && (
            <div className="p-4 sm:p-5 bg-white border-t border-stone-200 space-y-3 shrink-0">
              {/* Rincian Subtotal & Ongkir */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-stone-500">
                  <span>Subtotal Belanja:</span>
                  <span className="font-semibold text-stone-700">{formatRupiah(itemsSubtotal)}</span>
                </div>
                {isDelivery && (
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Ongkos Kirim (KP. Pamundayan 1):</span>
                    {isFreeShipping ? (
                      <span className="text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                        GRATIS
                      </span>
                    ) : (
                      <span className="font-bold text-stone-800">{formatRupiah(shippingFee)}</span>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-stone-100 text-sm">
                  <span className="text-stone-800 font-bold">Total Tagihan:</span>
                  <span className="text-xl font-black text-orange-600">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full py-3 sm:py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-extrabold text-sm sm:text-base shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
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
