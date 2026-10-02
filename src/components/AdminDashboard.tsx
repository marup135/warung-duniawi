'use client';

import React, { useState, useEffect, useRef } from 'react';
import ThermalReceipt from '@/components/ThermalReceipt';
import {
  Store,
  Bell,
  CheckCircle,
  Clock,
  PackageCheck,
  AlertCircle,
  RefreshCw,
  LogOut,
  Plus,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Printer,
  Trash2,
  Search,
  Tag,
  X,
  Barcode,
  ShoppingBag,
  Calculator,
  UserCheck,
  Minus,
  Check,
  Mail,
  Lock,
} from 'lucide-react';

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
  amountPaid?: number | null;
  changeAmount?: number | null;
  orderSource?: string | null;
  notes?: string | null;
  items: OrderItem[];
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  barcode?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  inStock: boolean;
  isFeatured?: boolean;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  _count?: {
    products: number;
  };
}

interface PosCartItem {
  product: Product;
  quantity: number;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'pos' | 'products' | 'categories'>('pos');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<Order | null>(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const previousOrderCountRef = useRef<number>(0);

  // Products State & Search Filter
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Quick Price Edit State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<number>(0);

  // Modal Product Baru & Edit
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategoryId, setNewProdCategoryId] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('pcs');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImg, setNewProdImg] = useState('');

  // Category Management State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');

  // --- KASIR POS TOKO STATE (Untuk Bapak/Kasir) ---
  const [posCart, setPosCart] = useState<PosCartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [posSelectedCategory, setPosSelectedCategory] = useState('all');
  const [cashGivenInput, setCashGivenInput] = useState<string>('');
  const [submittingPos, setSubmittingPos] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Auto Focus Barcode Input ketika Kasir dibuka
  useEffect(() => {
    if (isAuthenticated && activeTab === 'pos') {
      setTimeout(() => {
        barcodeRef.current?.focus();
      }, 200);
    }
  }, [isAuthenticated, activeTab]);

  // Cek Auth Session Lokal
  useEffect(() => {
    const savedAuth = localStorage.getItem('wd_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Login Email & Password Pengelola
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Email: warungduniawi@gmail.com / admin@warungduniawi.com / admin
    // Password: admin123 / duniawi
    const isValidEmail =
      emailInput.toLowerCase().includes('admin') ||
      emailInput.toLowerCase().includes('warung') ||
      emailInput.toLowerCase() === 'duniawi';
    const isValidPass = passwordInput === 'admin123' || passwordInput === 'duniawi';

    if (isValidEmail && isValidPass) {
      setIsAuthenticated(true);
      localStorage.setItem('wd_admin_auth', 'true');
    } else {
      alert('Email atau Password salah! (Contoh: admin@warungduniawi.com / admin123)');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('wd_admin_auth');
  };

  // Suara Chime Audio "Ting!"
  const playChimeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
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

  // Fetch Admin Categories
  const fetchAdminCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin categories:', err);
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
    if (isAuthenticated) {
      fetchProducts();
      fetchAdminCategories();
    }
  }, [isAuthenticated]);

  // --- POS KASIR HANDLERS ---
  const handleAddPosCart = (product: Product) => {
    setPosCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdatePosQuantity = (productId: string, quantity: number) => {
    setPosCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  };

  // Handler Scan Barcode
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedProduct = products.find(
      (p) => p.barcode && p.barcode.trim() === barcodeInput.trim()
    );

    if (matchedProduct) {
      handleAddPosCart(matchedProduct);
      setBarcodeInput('');
    } else {
      alert(`Produk dengan Barcode "${barcodeInput}" tidak ditemukan!`);
      setBarcodeInput('');
    }
  };

  // Total Belanja Kasir
  const posTotalAmount = posCart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const cashGivenNumber = Number(cashGivenInput) || 0;
  const changeAmount = cashGivenNumber >= posTotalAmount ? cashGivenNumber - posTotalAmount : 0;

  // Submit Transaksi Kasir Toko
  const handleCheckoutPos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (posCart.length === 0) {
      alert('Keranjang kasir masih kosong!');
      return;
    }

    if (cashGivenNumber < posTotalAmount) {
      alert('Uang yang diterima kasir kurang dari total belanja!');
      return;
    }

    setSubmittingPos(true);
    try {
      const payload = {
        items: posCart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        amountPaid: cashGivenNumber,
        changeAmount,
        notes: 'Transaksi Kasir Toko (Offline)',
      };

      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        const newOrder: Order = json.data;
        setPosCart([]);
        setCashGivenInput('');
        fetchOrders();
        // Langsung cetak struk kasir
        handlePrintReceipt(newOrder);
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal memproses transaksi kasir');
    } finally {
      setSubmittingPos(false);
    }
  };

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

  // Open Edit Modal untuk Produk
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setNewProdName(prod.name);
    setNewProdCategoryId(prod.categoryId);
    setNewProdPrice(String(prod.price));
    setNewProdUnit(prod.unit);
    setNewProdBarcode(prod.barcode || '');
    setNewProdDesc(prod.description || '');
    setNewProdImg(prod.imageUrl || '');
    setIsAddProductOpen(true);
  };

  // Open Modal Tambah Produk Baru
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setNewProdName('');
    setNewProdCategoryId(categories[0]?.id || '');
    setNewProdPrice('');
    setNewProdUnit('pcs');
    setNewProdBarcode('');
    setNewProdDesc('');
    setNewProdImg('');
    setIsAddProductOpen(true);
  };

  // Submit Form Produk (Tambah / Full Edit)
  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingProduct;
      const method = isEdit ? 'PUT' : 'POST';
      const payload: any = {
        name: newProdName,
        categoryId: newProdCategoryId,
        price: Number(newProdPrice),
        unit: newProdUnit,
        barcode: newProdBarcode,
        description: newProdDesc,
        imageUrl: newProdImg,
      };

      if (isEdit) {
        payload.productId = editingProduct.id;
      }

      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddProductOpen(false);
        fetchProducts();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal menyimpan produk.');
    }
  };

  // Hapus Produk dari Database
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${productName}" dari database?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products?id=${productId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchProducts();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal menghapus produk.');
    }
  };

  // Tambah Kategori Baru
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName, icon: newCatIcon }),
      });
      const json = await res.json();
      if (json.success) {
        setNewCatName('');
        fetchAdminCategories();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal menambah kategori');
    }
  };

  // Hapus Kategori
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Hapus kategori "${categoryName}"? Produk di dalamnya wajib dipindah atau dihapus dulu.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories?id=${categoryId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchAdminCategories();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal menghapus kategori.');
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filtered Products untuk Halaman POS Kasir
  const filteredPosProducts = products.filter((prod) => {
    const matchCat =
      posSelectedCategory === 'all' || prod.categoryId === posSelectedCategory;
    const matchSearch =
      !posSearchQuery ||
      prod.name.toLowerCase().includes(posSearchQuery.toLowerCase()) ||
      (prod.barcode && prod.barcode.includes(posSearchQuery));
    return matchCat && matchSearch;
  });

  // Filtered Products untuk Halaman Admin Inventory
  const filteredAdminProducts = products.filter((prod) => {
    const matchCat =
      selectedCategoryFilter === 'all' || prod.categoryId === selectedCategoryFilter;
    const matchSearch =
      !productSearch ||
      prod.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (prod.barcode && prod.barcode.includes(productSearch));
    return matchCat && matchSearch;
  });

  // Preset Gambar Bawaan Warung Sederhana
  const sampleImagePresets = [
    { label: '🌶️ Bumbu Dapur', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=500&q=80' },
    { label: '🌻 Minyak Goreng', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80' },
    { label: '🥚 Telur Ayam', url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=500&q=80' },
    { label: '🍜 Indomie / Mie', url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80' },
    { label: '🚬 Rokok', url: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=500&q=80' },
    { label: '🍦 Es Krim', url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=500&q=80' },
    { label: '🍞 Roti / Snack', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80' },
    { label: '🥤 Minuman Segar', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80' },
    { label: '🧼 Sabun / Kebersihan', url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80' },
  ];

  // Tampilan Form Login Email & Password Pengelola
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-stone-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-orange-600 text-white font-black text-2xl rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-orange-600/20">
              WD
            </div>
            <h2 className="text-2xl font-black text-stone-900">
              Akses Kasir & Admin
            </h2>
            <p className="text-xs text-stone-500">
              Masukkan Email dan Password resmi pengelola Warung Duniawi.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-stone-500" /> Email Admin / Kasir
              </label>
              <input
                type="text"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@warungduniawi.com"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-stone-500" /> Password Akses
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan password (admin123)"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
            >
              Masuk ke Dashboard Kasir
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans pb-16">
      {/* Top Navbar Dashboard */}
      <header className="sticky top-0 z-30 bg-stone-900 text-white px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 font-extrabold text-sm rounded-xl flex items-center justify-center text-white">
              WD
            </div>
            <h1 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
              Kasir Toko & Admin Warung
              {pendingCount > 0 && (
                <span className="bg-orange-500 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full animate-bounce">
                  {pendingCount} Order Web
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
              onClick={handleLogout}
              className="p-2 text-red-400 hover:bg-red-950/40 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-stone-200 mb-4 overflow-x-auto">
          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('pos')}
              className={`pb-3 text-sm font-black cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap px-2 ${
                activeTab === 'pos'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Calculator className="w-5 h-5 text-orange-600" /> KASIR TOKO (POS)
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-3 text-sm font-extrabold cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap px-2 ${
                activeTab === 'orders'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Clock className="w-4 h-4" /> Pesanan Web Online
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`pb-3 text-sm font-extrabold cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap px-2 ${
                activeTab === 'products'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Store className="w-4 h-4" /> Kelola Produk ({products.length})
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`pb-3 text-sm font-extrabold cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap px-2 ${
                activeTab === 'categories'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Tag className="w-4 h-4" /> Kategori Warung
            </button>
          </div>

          {activeTab === 'orders' && (
            <button
              onClick={fetchOrders}
              className="mb-2 px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
          {activeTab === 'products' && (
            <button
              onClick={handleOpenAddProduct}
              className="mb-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Produk
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB KASIR POS TOKO (DESAIN RAMAH BAPAK / ORANG TUA - SIMPEL & TOMBOL BESAR) */}
        {/* ========================================================================= */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SISI KIRI: KATALOG PRODUK & BARCODE SCANNER */}
            <div className="lg:col-span-7 space-y-4">
              {/* Box Barcode Scanner Input */}
              <form
                onSubmit={handleBarcodeSubmit}
                className="bg-amber-500 text-stone-900 p-4 rounded-3xl shadow-md flex items-center gap-3"
              >
                <Barcode className="w-8 h-8 text-stone-900 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-stone-900 leading-none mb-1">
                    Scan Barcode Produk / Scan USB Scanner
                  </label>
                  <input
                    ref={barcodeRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan atau ketik kode barcode (e.g. 899...)..."
                    className="w-full px-3.5 py-2.5 bg-white text-stone-900 rounded-xl font-bold text-sm focus:outline-none shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer self-end"
                >
                  Cari / Scan
                </button>
              </form>

              {/* Filter Kategori & Search Cepat */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    placeholder="Cari barang kasir..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm font-bold shadow-2xs"
                  />
                </div>
                <select
                  value={posSelectedCategory}
                  onChange={(e) => setPosSelectedCategory(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-extrabold text-stone-800"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid Produk Kasir (Tombol Besar & Mudah Diklik) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredPosProducts.map((product) => {
                  const cartItem = posCart.find((i) => i.product.id === product.id);
                  const qty = cartItem ? cartItem.quantity : 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddPosCart(product)}
                      disabled={!product.inStock}
                      className={`relative bg-white border-2 p-3 rounded-2xl text-left shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer flex flex-col justify-between h-36 ${
                        qty > 0
                          ? 'border-orange-500 bg-orange-50/30 ring-2 ring-orange-400/20'
                          : 'border-stone-200 hover:border-stone-400'
                      } ${!product.inStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {qty > 0 && (
                        <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                          {qty}
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-bold text-orange-600 uppercase block leading-none">
                          {product.category.name}
                        </span>
                        <h4 className="font-extrabold text-stone-900 text-sm leading-tight line-clamp-2 mt-1">
                          {product.name}
                        </h4>
                      </div>

                      <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400 font-bold leading-none">
                          /{product.unit}
                        </span>
                        <span className="font-black text-stone-900 text-sm sm:text-base">
                          {formatRupiah(product.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SISI KANAN: STRUK TRANSAKSI KASIR & KALKULATOR KEMBALIAN */}
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-stone-200 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-3">
                  <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-orange-600" /> Kasir Toko Offine
                  </h3>
                  {posCart.length > 0 && (
                    <button
                      onClick={() => setPosCart([])}
                      className="text-xs text-red-500 font-bold hover:text-red-700"
                    >
                      Reset Belanjaan
                    </button>
                  )}
                </div>

                {/* List Item Belanjaan Kasir */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {posCart.length > 0 ? (
                    posCart.map((item) => (
                      <div
                        key={item.product.id}
                        className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex-1 pr-2">
                          <h5 className="font-bold text-stone-900 line-clamp-1">
                            {item.product.name}
                          </h5>
                          <span className="text-[10px] text-stone-500 font-semibold">
                            {formatRupiah(item.product.price)} / {item.product.unit}
                          </span>
                        </div>

                        {/* Control Qty Kasir */}
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-stone-200">
                          <button
                            onClick={() =>
                              handleUpdatePosQuantity(
                                item.product.id,
                                item.quantity - 1
                              )
                            }
                            className="w-5 h-5 bg-stone-100 rounded text-stone-700 font-bold flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-bold text-stone-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdatePosQuantity(
                                item.product.id,
                                item.quantity + 1
                              )
                            }
                            className="w-5 h-5 bg-orange-600 text-white rounded font-bold flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-stone-400 text-xs">
                      Klik produk atau scan barcode untuk menambah barang kasir.
                    </div>
                  )}
                </div>
              </div>

              {/* Ringkasan Total & Hitung Kembalian Otomatis */}
              <form onSubmit={handleCheckoutPos} className="space-y-3 pt-3 border-t border-stone-200">
                <div className="bg-stone-900 text-white p-4 rounded-2xl space-y-1">
                  <span className="text-xs text-stone-400 font-bold block uppercase">
                    Total Belanja Toko
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">
                    {formatRupiah(posTotalAmount)}
                  </div>
                </div>

                {/* Input Uang Dibayar */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Uang Diterima dari Pembeli (Rp)
                  </label>
                  <input
                    type="number"
                    value={cashGivenInput}
                    onChange={(e) => setCashGivenInput(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-extrabold text-stone-900 text-base focus:ring-2 focus:ring-orange-500"
                  />
                  {/* Preset Tombol Uang Pas Cepat */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[10000, 20000, 50000, 100000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setCashGivenInput(String(nominal))}
                        className="py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-[11px] font-bold text-stone-700 border border-stone-300"
                      >
                        {nominal / 1000}rb
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kembalian Otomatis */}
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-emerald-900 font-bold text-sm">
                  <span>UANG KEMBALIAN:</span>
                  <span className="text-lg font-black text-emerald-700">
                    {formatRupiah(changeAmount)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submittingPos || posCart.length === 0}
                  className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-40"
                >
                  {submittingPos ? 'Memproses...' : 'BAYAR & CETAK STRUK'} <Printer className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: LIST ONLINE ORDERS WEB */}
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
                <h3 className="font-bold text-stone-800">Belum Ada Pesanan Web</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Pesanan baru dari pembeli online akan muncul di sini secara otomatis.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: KELOLA PRODUK & STOK (SUPERADMIN FULL CRUD) */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Search & Filter Admin */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Cari nama produk / barcode..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 w-full sm:w-auto"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Table Products */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-stone-50 border-b border-stone-200 font-extrabold text-xs text-stone-500 uppercase tracking-wider grid grid-cols-12 gap-2">
                <div className="col-span-5 sm:col-span-4">Nama Produk</div>
                <div className="col-span-3 sm:col-span-3">Harga</div>
                <div className="col-span-4 sm:col-span-5 text-right">Stok & Aksi Superadmin</div>
              </div>

              <div className="divide-y divide-stone-100">
                {filteredAdminProducts.length > 0 ? (
                  filteredAdminProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-stone-50/80 transition-colors text-xs sm:text-sm"
                    >
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-10 h-10 rounded-lg object-cover border border-stone-200 hidden sm:block"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-sm hidden sm:block">
                            📦
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-stone-900 leading-tight">
                            {prod.name}
                          </h4>
                          <span className="text-[10px] text-stone-400 font-medium block">
                            {prod.category.name} ({prod.unit})
                          </span>
                          {prod.barcode && (
                            <span className="text-[9px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              BC: {prod.barcode}
                            </span>
                          )}
                        </div>
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
                              title="Edit Harga Cepat"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="col-span-4 sm:col-span-5 text-right flex items-center justify-end gap-2">
                        {/* Toggle Stok */}
                        <button
                          onClick={() => handleToggleStock(prod.id, prod.inStock)}
                          className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
                            prod.inStock
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                          title="Ubah Status Stok"
                        >
                          {prod.inStock ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" /> <span className="hidden sm:inline">Ada</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-red-600" /> <span className="hidden sm:inline">Habis</span>
                            </>
                          )}
                        </button>

                        {/* Full Edit Button */}
                        <button
                          onClick={() => handleOpenEditProduct(prod)}
                          className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl cursor-pointer border border-stone-200"
                          title="Full Edit Produk"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer border border-red-200"
                          title="Hapus Produk dari Database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-stone-400 text-xs">
                    Tidak ada produk yang cocok.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: KELOLA KATEGORI WARUNG */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Tambah Kategori */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs h-fit space-y-4">
              <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-600" /> Tambah Kategori Baru
              </h3>
              <form onSubmit={handleAddCategorySubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nama Kategori *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Contoh: Bumbu Dapur & Sambal"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Icon Emoji
                  </label>
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    placeholder="📦 / 🌶️ / 🧼"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Kategori
                </button>
              </form>
            </div>

            {/* List Kategori */}
            <div className="md:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-stone-50 border-b border-stone-200 font-extrabold text-xs text-stone-500 uppercase tracking-wider flex justify-between">
                <span>Kategori</span>
                <span>Jumlah Produk & Aksi</span>
              </div>

              <div className="divide-y divide-stone-100">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.icon || '📦'}</span>
                      <h4 className="font-extrabold text-stone-900">{cat.name}</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-500 font-medium bg-stone-100 px-2.5 py-1 rounded-full">
                        {cat._count?.products || 0} Produk
                      </span>

                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 cursor-pointer"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Tambah / Full Edit Produk (Dengan Pilihan Gambar Preset Mudah) */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full p-6 rounded-3xl border border-stone-200 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-stone-900 text-lg">
                {editingProduct ? 'Edit Produk Lengkap' : 'Tambah Produk Baru'}
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="space-y-3 text-xs">
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
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    required
                    value={newProdCategoryId}
                    onChange={(e) => setNewProdCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-bold"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Kode Barcode (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    placeholder="Scan / ketik barcode"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-mono"
                  />
                </div>
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
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-bold"
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
                    placeholder="pcs / kg / bungkus / sak"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
              </div>

              {/* URL Gambar & Opsi Gambar Preset Bawaan */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  URL Foto Produk
                </label>
                <input
                  type="url"
                  value={newProdImg}
                  onChange={(e) => setNewProdImg(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                />

                {/* Preset Gambar Cepat */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] text-stone-500 font-bold block">
                    Atau Pilih Foto Preset Bawaan Warung:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {sampleImagePresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewProdImg(preset.url)}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-semibold cursor-pointer ${
                          newProdImg === preset.url
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
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
                  placeholder="Misal: Beras pulen wangi kualitas super"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  {editingProduct ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Komponen Cetak Struk Kasir Thermal */}
      <ThermalReceipt order={selectedPrintOrder} />
    </div>
  );
}
