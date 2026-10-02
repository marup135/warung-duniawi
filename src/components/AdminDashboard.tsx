'use client';

import React, { useState, useEffect, useRef } from 'react';
import ThermalReceipt from '@/components/ThermalReceipt';
import { Store, Bell, CheckCircle, Clock, PackageCheck, AlertCircle, RefreshCw, LogOut, Plus, ToggleLeft, ToggleRight, Edit3, Printer } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: {
    name: string;
    unit: string;
    imageUrl?: string | null;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pickupMethod: string;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  notes?: string | null;
  items: OrderItem[];
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  inStock: boolean;
  category: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');

  // Orders & Thermal Print State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<Order | null>(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const previousOrderCountRef = useRef<number>(0);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<number>(0);

  // Modal Product Baru
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategoryId, setNewProdCategoryId] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('pcs');
  const [newProdDesc, setNewProdDesc] = useState('');

  // Password kasir bawaan sederhana: admin123
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123' || password === 'duniawi') {
      setIsAuthenticated(true);
    } else {
      alert('Password salah. Gunakan: admin123');
    }
  };

  // Suara Chime Audio "Ting!"
  const playChimeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  // Trigger Print Receipt
  const handlePrintReceipt = (order: Order) => {
    setSelectedPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      const json = await res.json();
      if (json.success) {
        const fetchedOrders: Order[] = json.data;
        setOrders(fetchedOrders);

        const currentPending = fetchedOrders.filter((o) => o.status === 'PENDING').length;
        setPendingCount(currentPending);

        // Jika ada pesanan baru dibanding ref sebelumnya, bunyikan bel audio & optional auto print
        if (
          previousOrderCountRef.current > 0 &&
          fetchedOrders.length > previousOrderCountRef.current
        ) {
          playChimeSound();
          if (autoPrintEnabled && fetchedOrders[0]) {
            handlePrintReceipt(fetchedOrders[0]);
          }
        }
        previousOrderCountRef.current = fetchedOrders.length;
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Products & Categories
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      const json = await res.json();
      if (json.success) {
        setProducts(json.data.products);
        setCategories(json.data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Polling Real-time Pesanan Setiap 5 Detik
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const interval = setInterval(() => {
        fetchOrders();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'products') {
      fetchProducts();
    }
  }, [isAuthenticated, activeTab]);

  // Update Status Order
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });
      const json = await res.json();
      if (json.success) {
        fetchOrders();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal mengupdate status pesanan.');
    }
  };

  // Toggle Stok Produk
  const handleToggleStock = async (productId: string, currentStock: boolean) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, inStock: !currentStock }),
      });
      const json = await res.json();
      if (json.success) {
        fetchProducts();
      }
    } catch (err) {
      alert('Gagal merubah stok');
    }
  };

  // Quick Edit Harga Produk
  const handleSavePrice = async (productId: string) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, price: newPriceValue }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingPriceId(null);
        fetchProducts();
      }
    } catch (err) {
      alert('Gagal menyimpan harga');
    }
  };

  // Submit Tambah Produk Baru
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName,
          categoryId: newProdCategoryId,
          price: Number(newProdPrice),
          unit: newProdUnit,
          description: newProdDesc,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddProductOpen(false);
        setNewProdName('');
        setNewProdPrice('');
        fetchProducts();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal menambah produk.');
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Tampilan Login Screen jika Belum Authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-stone-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-orange-600 text-white font-black text-2xl rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-orange-600/20">
              WD
            </div>
            <h2 className="text-2xl font-black text-stone-900">
              Kasir Warung Duniawi
            </h2>
            <p className="text-xs text-stone-500">
              Masukkkan password khusus pengelola warung.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Password Kasir
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password (admin123)"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
            >
              Masuk Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900">
      {/* Top Navbar Dashboard */}
      <header className="sticky top-0 z-30 bg-stone-900 text-white px-4 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 font-extrabold text-sm rounded-xl flex items-center justify-center text-white">
              WD
            </div>
            <h1 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
              Kasir & Admin Warung
              {pendingCount > 0 && (
                <span className="bg-orange-500 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full animate-bounce">
                  {pendingCount} Barus
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={playChimeSound}
              className="p-2 text-stone-300 hover:text-white bg-stone-800 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              title="Tes Suara Bel Notif"
            >
              <Bell className="w-4 h-4 text-amber-400" /> <span className="hidden sm:inline">Tes Bel</span>
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="p-2 text-red-400 hover:bg-red-950/40 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-stone-200 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-3 text-sm font-extrabold cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Clock className="w-4 h-4" /> Pesanan Masuk
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`pb-3 text-sm font-extrabold cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'products'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Store className="w-4 h-4" /> Kelola Produk & Stok
            </button>
          </div>

          {activeTab === 'orders' ? (
            <button
              onClick={fetchOrders}
              className="mb-2 px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          ) : (
            <button
              onClick={() => setIsAddProductOpen(true)}
              className="mb-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Produk
            </button>
          )}
        </div>

        {/* TAB 1: LIST ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {loadingOrders ? (
              <div className="text-center py-12 text-stone-400">
                Memuat data pesanan...
              </div>
            ) : orders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((order) => {
                  const isPending = order.status === 'PENDING';
                  const isProcessing = order.status === 'PROCESSING';
                  const isCompleted = order.status === 'COMPLETED';

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-3xl p-5 border shadow-xs flex flex-col justify-between transition-all ${
                        isPending
                          ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/30'
                          : isProcessing
                          ? 'border-blue-300 bg-blue-50/10'
                          : 'border-stone-200 opacity-80'
                      }`}
                    >
                      <div>
                        {/* Order Card Header */}
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                          <div>
                            <span className="text-xs font-extrabold text-orange-600 block">
                              {order.orderNumber}
                            </span>
                            <h3 className="font-extrabold text-stone-900 text-base">
                              {order.customerName}
                            </h3>
                            <span className="text-xs text-stone-500 font-medium">
                              WA: {order.customerPhone}
                            </span>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border inline-block ${
                                isPending
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                                  : isProcessing
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}
                            >
                              {isPending
                                ? 'Baru / Menunggu'
                                : isProcessing
                                ? 'Sedang Disiapkan'
                                : 'Selesai'}
                            </span>
                            <span className="text-[11px] text-stone-400 block mt-1">
                              {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} WIB
                            </span>
                          </div>
                        </div>

                        {/* Detail Items */}
                        <div className="space-y-2 py-1 text-xs">
                          {order.items.map((it) => (
                            <div
                              key={it.id}
                              className="flex justify-between items-center text-stone-800"
                            >
                              <span className="font-semibold">
                                {it.quantity}x {it.product.name}
                              </span>
                              <span className="font-extrabold text-stone-900">
                                {formatRupiah(it.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="mt-3 p-2 bg-stone-100 rounded-xl text-xs text-stone-600 italic">
                            Catatan: &quot;{order.notes}&quot;
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 font-bold block leading-none">
                            Total Tagihan
                          </span>
                          <span className="text-lg font-black text-stone-900">
                            {formatRupiah(order.totalAmount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePrintReceipt(order)}
                            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-stone-200 shadow-2xs"
                            title="Cetak Struk Thermal"
                          >
                            <Printer className="w-3.5 h-3.5 text-stone-700" /> Struk
                          </button>

                          {isPending && (
                            <button
                              onClick={() =>
                                handleUpdateOrderStatus(order.id, 'PROCESSING')
                              }
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs cursor-pointer"
                            >
                              Proses
                            </button>
                          )}
                          {(isPending || isProcessing) && (
                            <button
                              onClick={() =>
                                handleUpdateOrderStatus(order.id, 'COMPLETED')
                              }
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs cursor-pointer"
                            >
                              Selesai
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
                <div className="text-4xl mb-2">📋</div>
                <h3 className="font-bold text-stone-800">Belum Ada Pesanan</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Pesanan baru dari pembeli akan muncul di sini secara otomatis.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KELOLA PRODUK & STOK */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 font-extrabold text-xs text-stone-500 uppercase tracking-wider grid grid-cols-12 gap-2">
              <div className="col-span-5 sm:col-span-4">Nama Produk</div>
              <div className="col-span-3 sm:col-span-3">Harga</div>
              <div className="col-span-4 sm:col-span-5 text-right">Status Stok</div>
            </div>

            <div className="divide-y divide-stone-100">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-stone-50/80 transition-colors text-xs sm:text-sm"
                >
                  <div className="col-span-5 sm:col-span-4">
                    <h4 className="font-bold text-stone-900 leading-tight">
                      {prod.name}
                    </h4>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {prod.category.name} ({prod.unit})
                    </span>
                  </div>

                  <div className="col-span-3 sm:col-span-3">
                    {editingPriceId === prod.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={newPriceValue}
                          onChange={(e) => setNewPriceValue(Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-stone-100 border rounded text-xs font-bold"
                        />
                        <button
                          onClick={() => handleSavePrice(prod.id)}
                          className="px-2 py-1 bg-orange-600 text-white rounded text-[10px] font-bold"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-stone-900">
                          {formatRupiah(prod.price)}
                        </span>
                        <button
                          onClick={() => {
                            setEditingPriceId(prod.id);
                            setNewPriceValue(prod.price);
                          }}
                          className="text-stone-400 hover:text-orange-600 p-1"
                          title="Edit Harga"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="col-span-4 sm:col-span-5 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleStock(prod.id, prod.inStock)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
                        prod.inStock
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {prod.inStock ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-600" /> Tersedia
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-red-600" /> Stok Habis
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Tambah Produk Baru */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl border border-stone-200 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-stone-900 text-lg">
              Tambah Produk Baru
            </h3>
            <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Misal: Beras Pandan Wangi 5kg"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Kategori *
                </label>
                <select
                  required
                  value={newProdCategoryId}
                  onChange={(e) => setNewProdCategoryId(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Harga (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="75000"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Unit Satuan
                  </label>
                  <input
                    type="text"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    placeholder="pcs / kg / bungkus"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Opsional"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow-md"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Komponen Cetak Struk Kasir Thermal (Hidden di layar normal, visible saat Print) */}
      <ThermalReceipt order={selectedPrintOrder} />
    </div>
  );
}
