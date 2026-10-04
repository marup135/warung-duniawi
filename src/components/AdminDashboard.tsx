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
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [posSelectedCategory, setPosSelectedCategory] = useState('all');
  const [cashGivenInput, setCashGivenInput] = useState<string>('');
  const [submittingPos, setSubmittingPos] = useState(false);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);

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

  // Suara Beep Ramah Kasir Minimarket untuk Scan Barcode (Pitch Tinggi)
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime); // Pitch tinggi ala scanner toko
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.log('Audio beep error:', e);
    }
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
    playScanBeep();
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

  // Handler Scan Barcode (Auto-Scan) & Smart Payment Input
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = barcodeInput.trim();
    if (!cleaned) return;

    // 1. Cek apakah ada produk dengan Barcode tersebut
    const matchedProduct = products.find(
      (p) => p.barcode && p.barcode.trim() === cleaned
    );

    if (matchedProduct) {
      handleAddPosCart(matchedProduct);
      setBarcodeInput('');
      setTimeout(() => {
        barcodeRef.current?.focus();
      }, 50);
      return;
    }

    // 2. Jika bukan barcode produk, cek apakah input berupa Angka Nominal Uang Pembeli
    const isNumeric = /^\d+$/.test(cleaned);
    if (isNumeric) {
      const numericVal = Number(cleaned);
      if (posCart.length === 0) {
        alert('Keranjang belanjaan masih kosong! Scan barang terlebih dahulu.');
        setBarcodeInput('');
        setTimeout(() => {
          barcodeRef.current?.focus();
        }, 50);
        return;
      }

      setCashGivenInput(cleaned);
      setBarcodeInput('');

      if (numericVal >= posTotalAmount) {
        // Langsung selesaikan transaksi kasir & cetak struk
        handleCheckoutPos(undefined, numericVal);
      } else {
        alert(`Uang yang dimasukkan (${formatRupiah(numericVal)}) kurang dari total belanja (${formatRupiah(posTotalAmount)}).`);
        setTimeout(() => {
          barcodeRef.current?.focus();
        }, 50);
      }
      return;
    }

    // 3. Jika bukan barcode dan bukan angka nominal
    alert(`Produk dengan Barcode "${cleaned}" tidak ditemukan!`);
    setBarcodeInput('');
    setTimeout(() => {
      barcodeRef.current?.focus();
    }, 50);
  };

  // Total Belanja Kasir
  const posTotalAmount = posCart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const cashGivenNumber = Number(cashGivenInput) || 0;
  const changeAmount = cashGivenNumber >= posTotalAmount ? cashGivenNumber - posTotalAmount : 0;

  // Submit Transaksi Kasir Toko
  const handleCheckoutPos = async (e?: React.FormEvent, customCashPaid?: number) => {
    if (e) e.preventDefault();
    if (posCart.length === 0) {
      alert('Keranjang kasir masih kosong!');
      return;
    }

    const cashPaid = customCashPaid !== undefined ? customCashPaid : cashGivenNumber;
    const computedChange = cashPaid >= posTotalAmount ? cashPaid - posTotalAmount : 0;

    if (cashPaid < posTotalAmount) {
      alert(`Uang yang diterima (${formatRupiah(cashPaid)}) kurang dari total belanja (${formatRupiah(posTotalAmount)})!`);
      return;
    }

    setSubmittingPos(true);
    try {
      const payload = {
        items: posCart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        amountPaid: cashPaid,
        changeAmount: computedChange,
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
        scanBufferRef.current = '';
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

  // Buffer untuk menangkap scan barcode & input angka keyboard global
  const scanBufferRef = useRef('');

  // GLOBAL KEYBOARD SHORTCUT UNTUK KASIR ZERO-MOUSE & AUTO-SCANNER
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'pos') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isOtherInputFocused =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT';

      // Jika sedang fokus di input modal pencarian manual F2 atau modal edit, abaikan
      if (isOtherInputFocused && activeEl?.id !== 'pos-cash-input') {
        return;
      }

      // 0. TOMBOL F2 -> BUKA / TUTUP MODAL PENCARIAN BARANG MANUAL
      if (e.key === 'F2') {
        e.preventDefault();
        setIsManualSearchOpen((prev) => !prev);
        return;
      }

      // 1. INPUT ANGKA (0-9 / Numpad)
      if (e.key >= '0' && e.key <= '9') {
        if (activeEl?.id !== 'pos-cash-input') {
          e.preventDefault();
          scanBufferRef.current += e.key;
          setCashGivenInput(scanBufferRef.current);
        } else {
          scanBufferRef.current += e.key;
        }
        return;
      }

      // 2. TOMBOL BACKSPACE -> HAPUS ANGKA TERAKHIR
      if (e.key === 'Backspace') {
        if (activeEl?.id !== 'pos-cash-input') {
          e.preventDefault();
          scanBufferRef.current = scanBufferRef.current.slice(0, -1);
          setCashGivenInput(scanBufferRef.current);
        } else {
          scanBufferRef.current = scanBufferRef.current.slice(0, -1);
        }
        return;
      }

      // 3. TOMBOL 'c' / 'C' / 'Escape' -> RESET INPUT UANG
      if (e.key === 'c' || e.key === 'C' || e.key === 'Escape') {
        e.preventDefault();
        scanBufferRef.current = '';
        setCashGivenInput('');
        return;
      }

      // 4. TOMBOL SPASI (Space) -> SET UANG PAS
      if (e.code === 'Space') {
        if (activeEl?.id !== 'pos-cash-input') {
          e.preventDefault();
        }
        if (posTotalAmount > 0) {
          scanBufferRef.current = String(posTotalAmount);
          setCashGivenInput(String(posTotalAmount));
        }
        return;
      }

      // 5. TOMBOL ENTER -> PROCESS SCAN OR CHECKOUT
      if (e.key === 'Enter') {
        e.preventDefault();
        const inputString = (scanBufferRef.current || cashGivenInput || '').trim();

        if (!inputString && posCart.length > 0 && cashGivenNumber >= posTotalAmount) {
          handleCheckoutPos();
          scanBufferRef.current = '';
          return;
        }

        if (!inputString) return;

        // Cek 1: Apakah input matches Barcode Produk?
        const matchedProduct = products.find(
          (p) => p.barcode && p.barcode.trim() === inputString
        );

        if (matchedProduct) {
          // Berhasil scan barang! Tambah ke keranjang & reset input uang
          handleAddPosCart(matchedProduct);
          scanBufferRef.current = '';
          setCashGivenInput('');
          return;
        }

        // Cek 2: Jika panjang string >= 7 (Barcode EAN-8/13 yang tidak terdaftar di DB)
        if (inputString.length >= 7) {
          alert(`Produk dengan Barcode "${inputString}" tidak ditemukan!`);
          scanBufferRef.current = '';
          setCashGivenInput('');
          return;
        }

        // Cek 3: Input berupa nominal uang pembeli (misal 10000, 20000, 50000)
        const cashVal = Number(inputString) || cashGivenNumber;
        if (posCart.length > 0 && cashVal >= posTotalAmount) {
          handleCheckoutPos(undefined, cashVal);
          scanBufferRef.current = '';
        } else if (posCart.length === 0) {
          alert('Keranjang belanjaan masih kosong!');
          scanBufferRef.current = '';
          setCashGivenInput('');
        } else if (cashVal < posTotalAmount) {
          alert(`Uang yang diterima (${formatRupiah(cashVal)}) kurang dari total belanja (${formatRupiah(posTotalAmount)})!`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, activeTab, posTotalAmount, cashGivenNumber, posCart, products, cashGivenInput]);

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
        {/* TAB KASIR POS TOKO (DESAIN SANGAT SIMPLE, FOCUS MODE - ULTRA CLEAN) */}
        {/* ========================================================================= */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* SISI KIRI: BARCODE SCANNER & MONITOR DAFTAR BELANJAAN (LUAS & BERSIH) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-200 shadow-md space-y-5">
              {/* Tabel / Daftar Item Belanjaan Kasir (Luas & Mudah Dibaca Orang Tua) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h3 className="font-black text-stone-800 text-base flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-orange-600" /> Daftar Barang ({posCart.reduce((a, b) => a + b.quantity, 0)} item)
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsManualSearchOpen(true)}
                      className="text-xs text-stone-700 font-extrabold hover:text-stone-900 cursor-pointer bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5 text-orange-600" /> Cari Manual (F2)
                    </button>
                    {posCart.length > 0 && (
                      <button
                        onClick={() => {
                          setPosCart([]);
                          setCashGivenInput('');
                          scanBufferRef.current = '';
                        }}
                        className="text-xs text-red-600 font-extrabold hover:text-red-800 cursor-pointer bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200"
                      >
                        Reset Belanjaan
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-h-[360px] max-h-[460px] overflow-y-auto pr-1 space-y-2">
                  {posCart.length > 0 ? (
                    posCart.map((item, idx) => (
                      <div
                        key={item.product.id}
                        className="bg-stone-50 p-4 rounded-2xl border-2 border-stone-200 flex items-center justify-between gap-3 hover:border-stone-300 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="w-7 h-7 bg-stone-200 text-stone-700 rounded-lg text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-black text-stone-900 text-base leading-snug">
                              {item.product.name}
                            </h4>
                            <div className="text-xs text-stone-500 font-bold">
                              {formatRupiah(item.product.price)} / {item.product.unit}
                            </div>
                          </div>
                        </div>

                        {/* Qty & Subtotal */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-300">
                            <button
                              onClick={() =>
                                handleUpdatePosQuantity(
                                  item.product.id,
                                  item.quantity - 1
                                )
                              }
                              className="w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-900 font-black text-base flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-black text-stone-900 text-base">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleUpdatePosQuantity(
                                  item.product.id,
                                  item.quantity + 1
                                )
                              }
                              className="w-8 h-8 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-black text-base flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right min-w-[100px]">
                            <span className="text-[10px] font-bold text-stone-400 block uppercase">Subtotal</span>
                            <span className="font-black text-stone-900 text-base">
                              {formatRupiah(item.product.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-400 space-y-2 border-2 border-dashed border-stone-200 rounded-3xl">
                      <Barcode className="w-12 h-12 text-stone-300 animate-bounce" />
                      <p className="font-extrabold text-sm text-stone-600">
                        Belum ada barang di-scan.
                      </p>
                      <p className="text-xs text-stone-400">
                        Arahkan scanner ke produk untuk otomatis menambah item.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SISI KANAN: MONITOR PEMBAYARAN JUMBO & KEMBALIAN (SANGAT JELAS) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-200 shadow-xl space-y-5">
              <div className="border-b border-stone-200 pb-3">
                <h3 className="font-black text-stone-900 text-lg flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-orange-600" /> Ringkasan Pembayaran
                </h3>
              </div>

              <form onSubmit={handleCheckoutPos} className="space-y-4">
                {/* DISPLAY TOTAL BELANJA JUMBO (40px) */}
                <div className="bg-stone-900 text-white p-5 rounded-2xl space-y-1 shadow-inner border border-stone-800">
                  <span className="text-xs text-amber-400 font-black block uppercase tracking-wider">
                    TOTAL BELANJA TOKO
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
                    {formatRupiah(posTotalAmount)}
                  </div>
                </div>

                {/* DISPLAY UANG DITERIMA */}
                <div>
                  <label className="block text-xs font-extrabold text-stone-700 mb-1 flex items-center justify-between">
                    <span>UANG DITERIMA DARI PEMBELI (Rp):</span>
                    <span className="text-[11px] text-stone-400 font-normal">(Ketik angka di keyboard)</span>
                  </label>
                  <input
                    id="pos-cash-input"
                    type="number"
                    value={cashGivenInput}
                    onChange={(e) => {
                      setCashGivenInput(e.target.value);
                      scanBufferRef.current = e.target.value;
                    }}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-2xl font-black text-stone-900 text-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                  {/* Preset Tombol Uang Cepat */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[10000, 20000, 50000, 100000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => {
                          setCashGivenInput(String(nominal));
                          scanBufferRef.current = String(nominal);
                        }}
                        className="py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-black text-stone-800 border border-stone-300 cursor-pointer active:scale-95"
                      >
                        {nominal / 1000}rb
                      </button>
                    ))}
                  </div>
                </div>

                {/* DISPLAY UANG KEMBALIAN JUMBO */}
                <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl flex items-center justify-between text-emerald-950 shadow-xs">
                  <div>
                    <span className="text-xs font-black uppercase text-emerald-800 block">UANG KEMBALIAN</span>
                    <span className="text-2xl font-black text-emerald-700">
                      {formatRupiah(changeAmount)}
                    </span>
                  </div>
                  {cashGivenNumber > 0 && cashGivenNumber < posTotalAmount && (
                    <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2.5 py-1 rounded-lg">
                      Uang Kurang!
                    </span>
                  )}
                </div>

                {/* TOMBOL BAYAR UTAMA */}
                <button
                  type="submit"
                  disabled={submittingPos || posCart.length === 0}
                  className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-40"
                >
                  {submittingPos ? 'Memproses...' : 'BAYAR & CETAK STRUK [ENTER]'} <Printer className="w-6 h-6" />
                </button>

                {/* PANDUAN KEYBOARD SHORTCUT RAMAH KASIR */}
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1.5 text-xs text-amber-950 font-bold">
                  <div className="text-[11px] font-black uppercase text-amber-900 tracking-wider">
                    ⚡ PETUNJUK TOMBOL KEYBOARD KASIR:
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-stone-700 font-semibold text-[11px]">
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">Input Barcode/Uang</kbd> : Scan/Ketik</div>
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">Space</kbd> : Uang Pas</div>
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">Enter</kbd> : Bayar & Struk</div>
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">F2</kbd> : Cari Manual</div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL PENCARIAN MANUAL (F2) FOR UNBARCODED ITEMS */}
        {isManualSearchOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="font-black text-stone-900 text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-orange-600" /> Pencarian Manual Produk (F2)
                </h3>
                <button
                  onClick={() => setIsManualSearchOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    autoFocus
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    placeholder="Cari nama barang atau barcode..."
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {filteredPosProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      handleAddPosCart(product);
                      setIsManualSearchOpen(false);
                    }}
                    disabled={!product.inStock}
                    className="bg-stone-50 border border-stone-200 p-3 rounded-2xl text-left shadow-2xs hover:border-orange-500 hover:bg-orange-50/20 transition-all cursor-pointer flex flex-col justify-between h-28"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-orange-600 uppercase block">
                        {product.category.name}
                      </span>
                      <h4 className="font-extrabold text-stone-900 text-xs line-clamp-2 mt-0.5">
                        {product.name}
                      </h4>
                    </div>
                    <div className="font-black text-stone-900 text-sm">
                      {formatRupiah(product.price)}
                    </div>
                  </button>
                ))}
              </div>
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
