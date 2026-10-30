'use client';

import React, { useState, useEffect, useRef } from 'react';
import ThermalReceipt from '@/components/ThermalReceipt';
import ThermalBarcode from '@/components/ThermalBarcode';
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
  Upload,
  Image as ImageIcon,
  Loader2,
  Download,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Power,
  RotateCw,
  Monitor,
  ShieldAlert,
  FileText,
  FileUp,
  Video,
  Play,
  ExternalLink,
  ArrowLeft,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
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
  deliveryAddress?: string | null;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  shippingFee?: number | null;
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
  const [activeTab, setActiveTab] = useState<'orders' | 'pos' | 'products' | 'categories' | 'barcodes' | 'settings'>('pos');

  // Kiosk Brightness & Hardware Settings State
  const [screenBrightness, setScreenBrightness] = useState<number>(100);
  const [speakerVolume, setSpeakerVolume] = useState<number>(70);
  const speakerVolumeRef = useRef<number>(70);
  const [powerActionModal, setPowerActionModal] = useState<'shutdown' | 'reboot' | null>(null);
  const [powerExecuting, setPowerExecuting] = useState(false);
  const [powerExecutedState, setPowerExecutedState] = useState<'shutdown' | 'reboot' | null>(null);

  // Inisialisasi Kecerahan Layar & Volume Speaker dari localStorage
  useEffect(() => {
    try {
      const savedBrightness = localStorage.getItem('wd_kiosk_brightness');
      if (savedBrightness) {
        const val = Number(savedBrightness);
        if (val >= 30 && val <= 100) {
          setScreenBrightness(val);
          if (document.documentElement) {
            document.documentElement.style.filter = val < 100 ? `brightness(${val}%)` : '';
          }
        }
      }

      const savedVolume = localStorage.getItem('wd_kiosk_volume');
      if (savedVolume !== null) {
        const vol = Number(savedVolume);
        if (vol >= 0 && vol <= 100) {
          setSpeakerVolume(vol);
          speakerVolumeRef.current = vol;
        }
      }
    } catch {
      // localStorage fallback
    }
    return () => {
      if (document.documentElement) {
        document.documentElement.style.filter = '';
      }
    };
  }, []);

  // Update kecerahan layar & simpan ke localStorage
  const handleUpdateBrightness = (val: number) => {
    const clamped = Math.min(100, Math.max(30, val));
    setScreenBrightness(clamped);
    if (document.documentElement) {
      document.documentElement.style.filter = clamped < 100 ? `brightness(${clamped}%)` : '';
    }
    try {
      localStorage.setItem('wd_kiosk_brightness', String(clamped));
    } catch {
      // fallback
    }
  };

  // Update volume speaker host Linux & trigger chime preview
  const handleUpdateVolume = async (val: number, previewSound = true) => {
    const clamped = Math.round(Math.min(100, Math.max(0, val)));
    setSpeakerVolume(clamped);
    speakerVolumeRef.current = clamped;

    try {
      localStorage.setItem('wd_kiosk_volume', String(clamped));
    } catch {
      // fallback
    }

    // Play chime preview jika volume > 0
    if (previewSound && clamped > 0) {
      playChimeSound(clamped);
    }

    // Kirim perintah ke backend host Ubuntu
    try {
      await fetch('/api/admin/system/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: clamped }),
      });
    } catch (e) {
      console.warn('Gagal sinkron volume ke server host:', e);
    }
  };

  // Eksekusi Daya (Shutdown / Reboot)
  const handleExecutePowerAction = async (action: 'shutdown' | 'reboot') => {
    setPowerExecuting(true);
    try {
      const res = await fetch('/api/admin/system/power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPowerExecutedState(action);
        setPowerActionModal(null);
      } else {
        alert(data.error || 'Gagal mengirim sinyal ke sistem host.');
      }
    } catch {
      alert('Koneksi terputus atau gagal menghubungi server.');
    } finally {
      setPowerExecuting(false);
    }
  };

  // Barcode Label Print State
  const [barcodePrintList, setBarcodePrintList] = useState<{ product: Product; count: number }[]>([]);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<string>('');
  const [barcodeLabelQty, setBarcodeLabelQty] = useState<number>(1);
  const [printableBarcodeItems, setPrintableBarcodeItems] = useState<
    { id: string; name: string; barcode: string; price: number; unit: string }[]
  >([]);
  const [activePrintMode, setActivePrintMode] = useState<'receipt' | 'barcode' | null>(null);

  // Modal Tambah Barcode Baru State
  const [isAddBarcodeOpen, setIsAddBarcodeOpen] = useState(false);
  const [newBarcodeName, setNewBarcodeName] = useState('');
  const [newBarcodePrice, setNewBarcodePrice] = useState('');
  const [newBarcodeUnit, setNewBarcodeUnit] = useState('kg');
  const [newBarcodeCode, setNewBarcodeCode] = useState('');
  const [newBarcodeCategoryId, setNewBarcodeCategoryId] = useState('');
  const [newBarcodeQty, setNewBarcodeQty] = useState(1);
  const [savingBarcode, setSavingBarcode] = useState(false);

  // Generator Barcode Internal Acak (Standar EAN-13 resmi: prefix 20 + 10 digit unik + 1 digit checksum)
  const generateInternalBarcode = () => {
    // 10 digit data (prefix 20 untuk in-store retail barcode + 8 digit acak/timestamp)
    const timestampPart = Date.now().toString().slice(-6); // 6 digit
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit
    const base12 = `20${timestampPart}${randomPart}`; // total 12 digit

    // Hitung Checksum EAN-13 resmi (Modulus 10)
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(base12[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checksum = (10 - (sum % 10)) % 10;
    return `${base12}${checksum}`; // Total 13 digit EAN-13 valid yang langsung dibaca semua scanner
  };

  // Buka modal Tambah Barcode Baru
  const handleOpenAddBarcodeModal = () => {
    setIsAddBarcodeOpen(true);
    setNewBarcodeName('');
    setNewBarcodePrice('');
    setNewBarcodeUnit('kg');
    setNewBarcodeCode(generateInternalBarcode());
    setNewBarcodeCategoryId(categories[0]?.id || '');
    setNewBarcodeQty(1);
  };


  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<Order | null>(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const autoPrintEnabledRef = useRef<boolean>(true);
  const previousOrderCountRef = useRef<number>(0);
  const printedOrderIdsRef = useRef<Set<string>>(new Set());

  // Load status Auto-Print dari localStorage saat mount (Default: AKTIF)
  useEffect(() => {
    const savedAutoPrint = localStorage.getItem('wd_auto_print_enabled');
    if (savedAutoPrint !== null) {
      const isEnabled = savedAutoPrint === 'true';
      setAutoPrintEnabled(isEnabled);
      autoPrintEnabledRef.current = isEnabled;
    } else {
      // Default jika belum pernah diset: langsung aktifkan auto-print
      setAutoPrintEnabled(true);
      autoPrintEnabledRef.current = true;
      localStorage.setItem('wd_auto_print_enabled', 'true');
    }
  }, []);

  // Simpan status Auto-Print ke localStorage
  const handleToggleAutoPrint = () => {
    setAutoPrintEnabled((prev) => {
      const nextVal = !prev;
      autoPrintEnabledRef.current = nextVal;
      localStorage.setItem('wd_auto_print_enabled', String(nextVal));
      return nextVal;
    });
  };



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
  const [uploadingImage, setUploadingImage] = useState(false);
  const productNameInputRef = useRef<HTMLInputElement>(null);

  // Focus input Nama Produk secara aman saat modal produk dibuka
  useEffect(() => {
    if (isAddProductOpen) {
      const timer = setTimeout(() => {
        productNameInputRef.current?.focus({ preventScroll: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isAddProductOpen]);

  // Modal Import CSV State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Bulk Selection & Batch Delete Products State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Account Settings (Ubah Email & Password) State
  const [currentAccountEmail, setCurrentAccountEmail] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [currentAccountPassword, setCurrentAccountPassword] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccessMsg, setAccountSuccessMsg] = useState<string | null>(null);
  const [accountErrorMsg, setAccountErrorMsg] = useState<string | null>(null);

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

  // Quick Add Product State (F2 Shortcut)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddPrice, setQuickAddPrice] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const quickPriceInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Buka Modal Tambah Produk Cepat (F2)
  const handleOpenQuickAdd = () => {
    setIsQuickAddOpen(true);
    setQuickAddPrice('');
    setQuickAddName('');
    setTimeout(() => {
      quickPriceInputRef.current?.focus();
    }, 50);
  };

  // Submit Tambah Produk Cepat (F2) langsung masuk keranjang kasir
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(quickAddPrice);
    if (!priceNum || priceNum <= 0) {
      alert('Masukkan harga produk yang valid!');
      return;
    }

    const itemName = quickAddName.trim() || 'Barang Lain-lain';
    const manualProduct: Product = {
      id: `manual-${Date.now()}`,
      name: itemName,
      price: priceNum,
      unit: 'item',
      categoryId: categories[0]?.id || 'lain-lain',
      inStock: true,
      category: {
        id: categories[0]?.id || 'lain-lain',
        name: categories[0]?.name || 'Lain-lain',
      },
    };

    handleAddPosCart(manualProduct);
    setIsQuickAddOpen(false);
    setQuickAddPrice('');
    setQuickAddName('');
    scanBufferRef.current = '';
  };


  const [loginError, setLoginError] = useState('');
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Cek Auth Session Server-side
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const json = await res.json();
        if (json.authenticated) {
          setIsAuthenticated(true);
          if (json.user?.email) {
            setCurrentAccountEmail(json.user.email);
            setNewAccountEmail(json.user.email);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setCheckingSession(false);
      }
    };
    checkUserSession();
  }, []);

  // Login Email & Password Pengelola ke Server API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setSubmittingLogin(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          password: passwordInput,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAuthenticated(true);
        if (json.user?.email) {
          setCurrentAccountEmail(json.user.email);
          setNewAccountEmail(json.user.email);
        }
        setPasswordInput('');
      } else {
        setLoginError(json.message || 'Login gagal');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan koneksi server');
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/session', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
  };

  // Suara Beep Ramah Kasir Minimarket untuk Scan Barcode (Pitch Tinggi)
  const playScanBeep = (volOverride?: number) => {
    try {
      const vol = typeof volOverride === 'number' ? volOverride : speakerVolumeRef.current;
      if (vol <= 0) return; // Mute

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      const baseGain = 0.2;
      const targetGain = baseGain * (vol / 100);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime); // Pitch tinggi ala scanner toko
      gain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.log('Audio beep error:', e);
    }
  };

  // Suara Chime Audio "Ting!"
  const playChimeSound = (volOverride?: number) => {
    try {
      const vol = typeof volOverride === 'number' ? volOverride : speakerVolumeRef.current;
      if (vol <= 0) return; // Mute

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      const baseGain = 0.35;
      const targetGain = baseGain * (vol / 100);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  // Trigger Print Receipt Struk Kasir
  const handlePrintReceipt = (order: Order) => {
    // 1. Isolasi total: mode cetak struk kasir & kosongkan barcode
    setActivePrintMode('receipt');
    setPrintableBarcodeItems([]);
    setSelectedPrintOrder(order);

    // 2. Beri waktu 250ms agar React selesai render komponen ThermalReceipt ke DOM
    setTimeout(() => {
      // Pasang listener pembersih setelah print selesai/batal
      const cleanupAfterPrint = () => {
        setSelectedPrintOrder(null);
        setActivePrintMode(null);
        window.removeEventListener('afterprint', cleanupAfterPrint);
      };
      window.addEventListener('afterprint', cleanupAfterPrint);

      window.print();
    }, 250);
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

        // Deteksi pesanan baru yang belum pernah dicatat/dicetak
        if (previousOrderCountRef.current === 0) {
          // Saat pertama kali dashboard dibuka: catat semua order yang sudah ada
          fetchedOrders.forEach((o) => printedOrderIdsRef.current.add(o.id));
        } else {
          // Cari pesanan baru yang belum tercatat di printedOrderIdsRef
          const newOrders = fetchedOrders.filter((o) => !printedOrderIdsRef.current.has(o.id));
          if (newOrders.length > 0) {
            playChimeSound();

            newOrders.forEach((o) => printedOrderIdsRef.current.add(o.id));

            // Jika Auto-Print AKTIF, cetak otomatis pesanan baru yang berstatus PENDING
            const pendingNewOrders = newOrders.filter((o) => o.status === 'PENDING');
            if (pendingNewOrders.length > 0 && autoPrintEnabledRef.current) {
              console.log('[Auto-Print] Mencetak pesanan baru otomatis:', pendingNewOrders[0].orderNumber);
              handlePrintReceipt(pendingNewOrders[0]);
            }
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
          name: item.product.name,
          price: item.product.price,
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
  const barcodeScanBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // GLOBAL KEYBOARD SHORTCUT UNTUK KASIR ZERO-MOUSE & AUTO-SCANNER
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'pos') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isOtherInputFocused =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT';

      // Jika sedang fokus di modal tambah cepat F2 atau modal lainnya, abaikan global listener
      if (isOtherInputFocused && activeEl?.id !== 'pos-cash-input') {
        if (e.key === 'Escape') {
          setIsQuickAddOpen(false);
          setIsManualSearchOpen(false);
        }
        return;
      }

      // Deteksi Scanner Fisik: Scanner barcode menembakkan karakter sangat cepat (< 50ms per karakter)
      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Reset buffer scanner jika jeda ketikan > 200ms (artinya ketikan tangan manusia, bukan laser barcode)
      if (diff > 200) {
        barcodeScanBufferRef.current = '';
      }

      // 0. TOMBOL F2 -> BUKA MODAL TAMBAH PRODUK CEPAT (HARGA UTAMA, NAMA OPSIONAL)
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenQuickAdd();
        return;
      }

      // 0.1 TOMBOL F4 atau F11 -> FOKUS KE KOTAK UANG PEMBELI
      if (e.key === 'F4' || e.key === 'F11') {
        e.preventDefault();
        cashInputRef.current?.focus();
        cashInputRef.current?.select();
        return;
      }

      // 0.2 TOMBOL F3 -> BUKA / TUTUP PENCARIAN KATALOG LENGKAP
      if (e.key === 'F3') {
        e.preventDefault();
        setIsManualSearchOpen((prev) => !prev);
        return;
      }

      // 1. INPUT KARAKTER (0-9 / Huruf jika ada)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Simpan selalu ke buffer scanner barcode berkecepatan tinggi
        barcodeScanBufferRef.current += e.key;

        // Jika bukan di kotak input uang kasir dan input berupa angka, masukkan juga ke input uang
        if (activeEl?.id !== 'pos-cash-input' && e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          scanBufferRef.current += e.key;
          setCashGivenInput(scanBufferRef.current);
        } else if (activeEl?.id === 'pos-cash-input' && e.key >= '0' && e.key <= '9') {
          scanBufferRef.current += e.key;
        }
        return;
      }

      // 2. TOMBOL BACKSPACE -> HAPUS ANGKA TERAKHIR
      if (e.key === 'Backspace') {
        barcodeScanBufferRef.current = '';
        if (activeEl?.id !== 'pos-cash-input') {
          e.preventDefault();
          scanBufferRef.current = scanBufferRef.current.slice(0, -1);
          setCashGivenInput(scanBufferRef.current);
        } else {
          scanBufferRef.current = scanBufferRef.current.slice(0, -1);
        }
        return;
      }

      // 3. TOMBOL 'Delete' -> KOSONGKAN KERANJANG KASIR & RESET SEMUA TOTAL
      if (e.key === 'Delete') {
        e.preventDefault();
        barcodeScanBufferRef.current = '';
        scanBufferRef.current = '';
        setCashGivenInput('');
        setPosCart([]);
        return;
      }

      // 4. TOMBOL 'c' / 'C' / 'Escape' -> RESET INPUT UANG
      if (e.key === 'c' || e.key === 'C' || e.key === 'Escape') {
        e.preventDefault();
        barcodeScanBufferRef.current = '';
        scanBufferRef.current = '';
        setCashGivenInput('');
        return;
      }

      // 4. TOMBOL SPASI (Space) -> SET UANG PAS
      if (e.code === 'Space') {
        barcodeScanBufferRef.current = '';
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

        // Ambil prioritas string barcode scanner jika ada buffer scanner, atau fallback ke scanBuffer/cashGiven
        const scannedCode = barcodeScanBufferRef.current.trim();
        const manualCode = (scanBufferRef.current || cashGivenInput || '').trim();
        const rawInput = scannedCode || manualCode;

        barcodeScanBufferRef.current = ''; // Langsung reset buffer barcode

        if (!rawInput && posCart.length > 0 && cashGivenNumber >= posTotalAmount) {
          handleCheckoutPos();
          scanBufferRef.current = '';
          return;
        }

        if (!rawInput) return;

        // Normalisasi angka saja (buang karakter aneh jika scanner mengirim prefix/suffix)
        const cleanDigits = rawInput.replace(/\D/g, '');

        // Cek 1: Apakah input matches Barcode Produk?
        // Cocokkan secara eksak ATAU cocokkan 12 digit awal (toleransi EAN-13 vs EAN-12)
        const matchedProduct = products.find((p) => {
          if (!p.barcode) return false;
          const pCode = p.barcode.trim();
          const pDigits = pCode.replace(/\D/g, '');

          // Cocok persis
          if (pCode === rawInput || pDigits === cleanDigits) return true;

          // Toleransi digit checksum EAN-13 (12 digit awal sama persis)
          if (
            (cleanDigits.length === 13 && pDigits.length === 12 && cleanDigits.startsWith(pDigits)) ||
            (cleanDigits.length === 12 && pDigits.length === 13 && pDigits.startsWith(cleanDigits))
          ) {
            return true;
          }

          return false;
        });

        if (matchedProduct) {
          // Berhasil scan barang! Tambah ke keranjang & reset input uang
          handleAddPosCart(matchedProduct);
          scanBufferRef.current = '';
          setCashGivenInput('');
          return;
        }

        // Cek 2: Jika panjang string >= 7 (Barcode EAN-8/13 yang tidak terdaftar di DB)
        if (cleanDigits.length >= 7) {
          alert(`Produk dengan Barcode "${rawInput}" tidak ditemukan!`);
          scanBufferRef.current = '';
          setCashGivenInput('');
          return;
        }

        // Cek 3: Input berupa nominal uang pembeli (misal 10000, 20000, 50000)
        const cashVal = Number(manualCode) || cashGivenNumber;
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
        // Otomatis kembalikan layar ke paling atas agar tombol "+ Tambah Produk" langsung terlihat
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal menyimpan produk.');
    }
  };

  // Hapus Produk dari Database
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${productName}" dari database? Jika produk pernah ada di riwayat transaksi kasir/online, data item transaksinya akan ikut dibersihkan.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products?id=${productId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Produk berhasil dihapus!');
        setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
        fetchProducts();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal menghapus produk.');
    }
  };

  // Hapus Massal Produk yang Dipilih (Batch Delete)
  const handleBatchDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;

    if (
      !confirm(
        `PERINGATAN: Apakah Anda yakin ingin menghapus ${selectedProductIds.length} produk yang dipilih secara permanen dari database?`
      )
    ) {
      return;
    }

    setBatchDeleting(true);
    try {
      const res = await fetch(`/api/admin/products?ids=${selectedProductIds.join(',')}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert(json.message || `${selectedProductIds.length} produk berhasil dihapus!`);
        setSelectedProductIds([]);
        fetchProducts();
      } else {
        alert(json.message || 'Gagal menghapus produk terpilih.');
      }
    } catch {
      alert('Terjadi kesalahan koneksi saat menghapus produk terpilih.');
    } finally {
      setBatchDeleting(false);
    }
  };

  // Simpan Perubahan Email & Password Akun Pengelola
  const handleUpdateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountSuccessMsg(null);
    setAccountErrorMsg(null);

    if (newAccountPassword && newAccountPassword !== confirmNewPassword) {
      setAccountErrorMsg('Konfirmasi password baru tidak cocok!');
      return;
    }

    if (newAccountPassword && newAccountPassword.length < 6) {
      setAccountErrorMsg('Password baru minimal harus 6 karakter!');
      return;
    }

    setSavingAccount(true);
    try {
      const res = await fetch('/api/auth/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAccountEmail,
          currentPassword: currentAccountPassword,
          newPassword: newAccountPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAccountSuccessMsg(data.message);
        setCurrentAccountEmail(newAccountEmail);
        setCurrentAccountPassword('');
        setNewAccountPassword('');
        setConfirmNewPassword('');
      } else {
        setAccountErrorMsg(data.message || 'Gagal memperbarui akun.');
      }
    } catch {
      setAccountErrorMsg('Terjadi kesalahan koneksi server.');
    } finally {
      setSavingAccount(false);
    }
  };

  // Hapus Pesanan Satuan (Online Web)
  const handleDeleteSingleOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Hapus pesanan "${orderNumber}" dari riwayat pesanan?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/orders?id=${orderId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchOrders();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal menghapus pesanan.');
    }
  };

  // Bersihkan Riwayat Pesanan Online (Completed & Cancelled)
  const handleClearOnlineOrders = async (mode: 'completed_online' | 'all_online') => {
    const promptText = mode === 'completed_online'
      ? 'Hapus semua pesanan online yang statusnya sudah SELESAI / BATAL?'
      : 'PERINGATAN: Apakah Anda yakin ingin menghapus SELURUH riwayat pesanan web online?';

    if (!confirm(promptText)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/orders?mode=${mode}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchOrders();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Gagal membersihkan riwayat pesanan.');
    }
  };

  // Download / Ekspor Database Seluruh Produk ke File CSV
  const handleExportProductsCsv = () => {
    window.open('/api/admin/products/export', '_blank');
  };

  // Unduh Contoh Template CSV Impor Produk
  const handleDownloadCsvTemplate = () => {
    const headers = ['Barcode', 'Nama Produk', 'Kategori', 'Harga', 'Satuan', 'Status Stok', 'Deskripsi'];
    const sampleRows = [
      ['"899123456789"', '"Beras Premium 5kg"', '"Sembako & Dapur"', '75000', '"sak"', '"Tersedia"', '"Beras pulen kualitas super"'],
      ['"899987654321"', '"Minyak Goreng 2L"', '"Sembako & Dapur"', '34000', '"pouch"', '"Tersedia"', '"Minyak kelapa sawit murni"'],
      ['""', '"Telur Ayam Negeri"', '"Sembako & Dapur"', '28000', '"kg"', '"Tersedia"', '"Telur segar pilihan"'],
    ];
    const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...sampleRows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template-impor-produk-warungduniawi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit File CSV Impor Produk ke API
  const handleImportCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert('Pilih file CSV terlebih dahulu!');
      return;
    }

    setImportingCsv(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult(data.message);
        fetchProducts();
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setImportResult(null);
        }, 2500);
      } else {
        alert(data.message || 'Gagal mengimpor file CSV.');
      }
    } catch {
      alert('Terjadi kesalahan saat mengunggah file CSV.');
    } finally {
      setImportingCsv(false);
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

  // Upload Foto Produk ke Server (/public/uploads)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (JPG, PNG, WebP, dll)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto maksimal 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.url) {
        setNewProdImg(json.url);
      } else {
        alert(json.message || 'Gagal mengunggah foto');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Terjadi kesalahan saat mengunggah foto');
    } finally {
      setUploadingImage(false);
      // Reset input value agar file yang sama bisa dipilih ulang bila perlu
      e.target.value = '';
    }
  };

  // Loading screen saat cek sesi awal
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
          <p className="text-sm font-semibold text-stone-600">Memverifikasi sesi kasir...</p>
        </div>
      </div>
    );
  }

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
              Portal internal operasional Warung Duniawi.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-stone-500" /> Email Admin / Kasir
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="nama@email.com"
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
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingLogin}
              className={`w-full py-3.5 rounded-xl text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                submittingLogin
                  ? 'bg-orange-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 active:scale-98 cursor-pointer'
              }`}
            >
              {submittingLogin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk ke Dashboard Kasir</span>
              )}
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
            {/* Tombol Toggle Auto-Print Struk Pesanan Masuk */}
            <button
              onClick={handleToggleAutoPrint}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                autoPrintEnabled
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:text-white border-stone-700'
              }`}
              title="Cetak struk secara otomatis saat ada pesanan online baru"
            >
              <Printer className={`w-3.5 h-3.5 ${autoPrintEnabled ? 'text-white' : 'text-stone-400'}`} />
              <span>Auto-Print:</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                autoPrintEnabled ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-700 text-stone-400'
              }`}>
                {autoPrintEnabled ? 'AKTIF' : 'MATI'}
              </span>
            </button>

            <button
              onClick={() => playChimeSound()}
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

            <button
              onClick={() => setActiveTab('barcodes')}
              className={`pb-3 text-sm font-extrabold cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap px-2 ${
                activeTab === 'barcodes'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Barcode className="w-4 h-4 text-orange-600" /> Cetak Barcode Produk
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 text-sm font-extrabold cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap px-2 ${
                activeTab === 'settings'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Settings className="w-4 h-4 text-stone-600" /> Pengaturan & Kios
            </button>
          </div>

          {activeTab === 'orders' && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => handleClearOnlineOrders('completed_online')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Hapus semua pesanan online yang sudah Selesai atau Batal"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" /> Bersihkan Riwayat Selesai
              </button>
              <button
                onClick={fetchOrders}
                className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          )}
          {activeTab === 'barcodes' && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => handleOpenAddBarcodeModal()}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> + Tambah Barcode Baru
              </button>
            </div>
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
                      onClick={handleOpenQuickAdd}
                      className="text-xs text-white font-black bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> + Barang Manual (F2)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManualSearchOpen(true)}
                      className="text-xs text-stone-700 font-extrabold hover:text-stone-900 cursor-pointer bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-300 flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5 text-orange-600" /> Katalog (F3)
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
                        Reset
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
                    ref={cashInputRef}
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
                    ⚡ TOMBOL SHORTCUT KEYBOARD KASIR:
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-stone-700 font-semibold text-[11px]">
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">F2</kbd> : + Barang Manual</div>
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">F4</kbd> : Uang Pembeli</div>
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">Space</kbd> : Uang Pas</div>
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">Delete</kbd> : Kosongkan Keranjang</div>
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">Esc / C</kbd> : Reset Uang</div>
                    <div>• <kbd className="bg-white px-1.5 py-0.5 border rounded font-mono font-bold text-stone-900 shadow-2xs">Enter</kbd> : Bayar & Struk</div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL INPUT BARANG CEPAT (F2) - KHUSUS BARANG TANPA BARCODE / NON-KATALOG */}
        {/* ========================================================================= */}
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 border-2 border-orange-500 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 font-black flex items-center justify-center text-lg">
                    F2
                  </div>
                  <div>
                    <h3 className="font-black text-stone-900 text-base leading-tight">
                      Tambah Barang Cepat
                    </h3>
                    <p className="text-xs text-stone-500">
                      Cukup masukkan harga, nama opsional
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                {/* 1. INPUT HARGA UTAMA (OTOMATIS FOKUS DI SINI) */}
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1 flex items-center justify-between">
                    <span>HARGA BARANG (Rp) *</span>
                    <span className="text-[11px] text-orange-600 font-extrabold">(Wajib Diisi)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 font-black text-stone-400 text-lg">Rp</span>
                    <input
                      ref={quickPriceInputRef}
                      type="number"
                      required
                      autoFocus
                      value={quickAddPrice}
                      onChange={(e) => setQuickAddPrice(e.target.value)}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3 bg-orange-50/50 border-2 border-orange-400 rounded-2xl font-black text-stone-900 text-2xl focus:ring-4 focus:ring-orange-500/20 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* 2. INPUT NAMA BARANG (OPSIONAL) */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>NAMA BARANG (OPSIONAL):</span>
                    <span className="text-[11px] text-stone-400 font-normal">Boleh Dikosongkan</span>
                  </label>
                  <input
                    type="text"
                    value={quickAddName}
                    onChange={(e) => setQuickAddName(e.target.value)}
                    placeholder="Contoh: Es Batu, Kerupuk, Rokok Eceran (Default: Barang Lain-lain)"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                </div>

                {/* TOMBOL AKSI CEPAT */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="w-1/3 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm rounded-xl cursor-pointer"
                  >
                    Batal (Esc)
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-sm rounded-xl shadow-md shadow-orange-600/20 cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-5 h-5" /> Masukkan ke Kasir [Enter]
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL PENCARIAN MANUAL KATALOG (F3) */}
        {isManualSearchOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="font-black text-stone-900 text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-orange-600" /> Katalog Lengkap Produk (F3)
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
                            <div className="mt-1">
                              {order.pickupMethod === 'DELIVERY' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300">
                                  🛵 DIANTAR (KP. Pamundayan 1)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                                  🏪 AMBIL DI WARUNG
                                </span>
                              )}
                            </div>
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

                        {/* Detail Alamat Jika Diantar */}
                        {order.pickupMethod === 'DELIVERY' && order.deliveryAddress && (
                          <div className="mb-3 p-2.5 bg-orange-50/80 border border-orange-200 rounded-2xl text-xs">
                            <span className="font-extrabold text-orange-950 block text-[11px]">
                              📍 Patokan/Alamat Rumah:
                            </span>
                            <p className="text-stone-800 font-semibold mt-0.5">
                              {order.deliveryAddress}
                            </p>
                          </div>
                        )}

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
                            Total Tagihan {order.shippingFee && order.shippingFee > 0 ? `(Termasuk Ongkir ${formatRupiah(order.shippingFee)})` : ''}
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

                          {isCompleted && (
                            <button
                              onClick={() => handleDeleteSingleOrder(order.id, order.orderNumber)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer border border-red-200 shadow-2xs"
                              title="Hapus Pesanan Ini dari Riwayat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
            {/* SUB-HEADER AKSI PRODUK (TAMBAH, EKSPOR, IMPOR) */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-stone-900 text-lg flex items-center gap-2">
                  <Store className="w-5 h-5 text-orange-600" /> Katalog & Stok Produk
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Total <strong>{products.length} produk</strong> terdaftar di etalase dan kasir toko.
                </p>
              </div>

              {/* Action Buttons: Tambah, Ekspor, Impor */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-700/20 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> + Tambah Produk Baru
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  title="Impor produk massal dari file CSV / Excel"
                >
                  <FileUp className="w-4 h-4 text-amber-700" /> Impor (CSV)
                </button>

                <button
                  type="button"
                  onClick={handleExportProductsCsv}
                  className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  title="Unduh seluruh database produk ke file CSV / Excel"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Ekspor (CSV)
                </button>
              </div>
            </div>

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

            {/* BATCH ACTION BAR (MUNCUL JIKA ADA PRODUK TERPILIH) */}
            {selectedProductIds.length > 0 && (
              <div className="bg-amber-500 text-stone-950 p-3.5 px-5 rounded-2xl flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5 font-black text-xs sm:text-sm">
                  <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">
                    {selectedProductIds.length}
                  </span>
                  <span>Produk terpilih untuk dihapus</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds([])}
                    className="px-3 py-1.5 bg-amber-600/50 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                  <button
                    type="button"
                    disabled={batchDeleting}
                    onClick={handleBatchDeleteProducts}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    {batchDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus {selectedProductIds.length} Produk Terpilih</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* List Table Products */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-stone-50 border-b border-stone-200 font-extrabold text-xs text-stone-500 uppercase tracking-wider grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      filteredAdminProducts.length > 0 &&
                      filteredAdminProducts.every((p) => selectedProductIds.includes(p.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = Array.from(
                          new Set([...selectedProductIds, ...filteredAdminProducts.map((p) => p.id)])
                        );
                        setSelectedProductIds(allIds);
                      } else {
                        const filteredIds = new Set(filteredAdminProducts.map((p) => p.id));
                        setSelectedProductIds(selectedProductIds.filter((id) => !filteredIds.has(id)));
                      }
                    }}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
                    title="Pilih Semua Produk di Tampilan Ini"
                  />
                  <span>Nama Produk</span>
                </div>
                <div className="col-span-3 sm:col-span-3">Harga</div>
                <div className="col-span-3 sm:col-span-4 text-right">Stok & Aksi Superadmin</div>
              </div>

              <div className="divide-y divide-stone-100">
                {filteredAdminProducts.length > 0 ? (
                  filteredAdminProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className={`p-4 grid grid-cols-12 gap-2 items-center hover:bg-stone-50/80 transition-colors text-xs sm:text-sm ${
                        selectedProductIds.includes(prod.id) ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(prod.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds((prev) => [...prev, prod.id]);
                            } else {
                              setSelectedProductIds((prev) => prev.filter((id) => id !== prod.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600 shrink-0"
                        />
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-10 h-10 rounded-lg object-cover border border-stone-200 hidden sm:block shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-sm hidden sm:block shrink-0">
                            📦
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 leading-tight truncate">
                            {prod.name}
                          </h4>
                          <span className="text-[10px] text-stone-400 font-medium block">
                            {prod.category.name} ({prod.unit})
                          </span>
                          {prod.barcode && (
                            <span className="text-[9px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded mt-0.5 inline-block truncate max-w-full">
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

        {/* ========================================================================= */}
        {/* TAB 5: KELOLA & CETAK LABEL BARCODE PRODUK TOKO (TERSINKRON DATABASE) */}
        {/* ========================================================================= */}
        {activeTab === 'barcodes' && (
          <div className="space-y-6">
            {/* Header Deskripsi & Aksi Cepat */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-3xl border border-orange-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-stone-900 text-lg flex items-center gap-2">
                  <Barcode className="w-6 h-6 text-orange-600" /> Cetak & Kelola Barcode Toko
                </h3>
                <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">
                  Semua barang yang dibuat di sini otomatis <strong>tersimpan ke database produk</strong>. Jika stiker di wadah barang (telur/terigu) sudah usang, Anda bisa mencetak ulang kapan saja hanya dengan 1 klik.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddBarcodeModal}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-2xl shadow-md shadow-orange-600/20 cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" /> + Buat Barcode Baru
              </button>
            </div>

            {/* Tabel Daftar Produk dengan Barcode Tersimpan */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-stone-50 border-b border-stone-200 font-extrabold text-xs text-stone-600 uppercase tracking-wider grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 sm:col-span-4">Nama Produk & Barcode</div>
                <div className="col-span-3 sm:col-span-3">Harga Satuan</div>
                <div className="col-span-4 sm:col-span-5 text-right">Aksi Cetak Label Thermal</div>
              </div>

              <div className="divide-y divide-stone-100">
                {products.filter((p) => Boolean(p.barcode)).length > 0 ? (
                  products
                    .filter((p) => Boolean(p.barcode))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-stone-50/80 transition-colors text-xs sm:text-sm"
                      >
                        <div className="col-span-5 sm:col-span-4">
                          <h4 className="font-bold text-stone-900 leading-tight">{item.name}</h4>
                          <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <Barcode className="w-3.5 h-3.5 text-stone-400" />
                            <span className="font-bold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded">
                              {item.barcode}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-3 sm:col-span-3">
                          <span className="font-black text-stone-900">{formatRupiah(item.price)}</span>
                          <span className="text-stone-500 text-[11px] font-medium"> / {item.unit}</span>
                        </div>

                        <div className="col-span-4 sm:col-span-5 text-right flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Cetak 1 Lembar Cepat
                              setActivePrintMode('barcode');
                              setSelectedPrintOrder(null);
                              setPrintableBarcodeItems([
                                {
                                  id: item.id,
                                  name: item.name,
                                  barcode: item.barcode!,
                                  price: item.price,
                                  unit: item.unit,
                                },
                              ]);
                              setTimeout(() => {
                                const cleanup = () => {
                                  setPrintableBarcodeItems([]);
                                  setActivePrintMode(null);
                                  window.removeEventListener('afterprint', cleanup);
                                };
                                window.addEventListener('afterprint', cleanup);
                                window.print();
                              }, 300);
                            }}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                            title="Cetak 1 lembar label sekarang"
                          >
                            <Printer className="w-3.5 h-3.5" /> Cetak (1x)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const qtyPrompt = prompt(`Berapa lembar label barcode "${item.name}" yang ingin dicetak?`, '5');
                              const count = Number(qtyPrompt);
                              if (count && count > 0) {
                                const list = [];
                                for (let i = 0; i < count; i++) {
                                  list.push({
                                    id: item.id,
                                    name: item.name,
                                    barcode: item.barcode!,
                                    price: item.price,
                                    unit: item.unit,
                                  });
                                }
                                setActivePrintMode('barcode');
                                setSelectedPrintOrder(null);
                                setPrintableBarcodeItems(list);
                                setTimeout(() => {
                                  const cleanup = () => {
                                    setPrintableBarcodeItems([]);
                                    setActivePrintMode(null);
                                    window.removeEventListener('afterprint', cleanup);
                                  };
                                  window.addEventListener('afterprint', cleanup);
                                  window.print();
                                }, 300);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl border border-stone-200 cursor-pointer hidden sm:flex items-center gap-1"
                            title="Cetak dalam jumlah banyak"
                          >
                            Cetak Banyak...
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-16 text-stone-400">
                    <div className="text-4xl mb-2">🏷️</div>
                    <p className="text-xs font-bold text-stone-600">Belum ada barcode yang tersimpan.</p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Klik tombol &quot;+ Buat Barcode Baru&quot; di atas untuk membuat barcode produk curah seperti Telur atau Terigu.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: PENGATURAN KIOSK & SISTEM HARDWARE (KECERAHAN & DAYA SERVER) */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl">
            {/* Header Pengaturan Kios */}
            <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white p-6 rounded-3xl border border-stone-700 shadow-md flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-black text-xl flex items-center gap-2.5">
                  <Monitor className="w-6 h-6 text-orange-400" /> Pengaturan Layar & Komputer Kasir
                </h3>
                <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
                  Pusat kendali kenyamanan layar kasir dan manajemen daya komputer warung (Ubuntu Kiosk Server).
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-stone-800/80 px-3.5 py-2 rounded-2xl border border-stone-700 text-xs font-bold text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Kiosk Online</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MODUL 1: KONTROL KECERAHAN LAYAR */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 font-black flex items-center justify-center">
                      <Sun className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 text-base leading-tight">
                        Kecerahan Layar Kios
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Atur redup/terang agar mata tidak lelah
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                    {screenBrightness}%
                  </span>
                </div>

                {/* Slider Kecerahan */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-stone-500">
                    <span className="flex items-center gap-1"><Moon className="w-3.5 h-3.5 text-stone-400" /> Redup (30%)</span>
                    <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-amber-500" /> Terang (100%)</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    step={5}
                    value={screenBrightness}
                    onChange={(e) => handleUpdateBrightness(Number(e.target.value))}
                    className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                </div>

                {/* Tombol Preset Cepat */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-black uppercase text-stone-400 tracking-wider">
                    Pilihan Cepat (1-Klik):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateBrightness(100)}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        screenBrightness === 100
                          ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <Sun className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                      <span className="block font-black text-xs">Siang Hari</span>
                      <span className="text-[10px] opacity-80">100% Terang</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateBrightness(75)}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        screenBrightness === 75
                          ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <Sun className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                      <span className="block font-black text-xs">Sore / Lampu</span>
                      <span className="text-[10px] opacity-80">75% Nyaman</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateBrightness(50)}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        screenBrightness === 50
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <Moon className="w-5 h-5 mx-auto mb-1 text-indigo-300" />
                      <span className="block font-black text-xs">Malam Hari</span>
                      <span className="text-[10px] opacity-80">50% Redup</span>
                    </button>
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-[11px] text-stone-500 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kecerahan ini otomatis tersimpan di memori browser perangkat kasir.</span>
                </div>
              </div>

              {/* MODUL 2: KONTROL VOLUME SUARA SPEAKER KIOS */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center">
                      {speakerVolume === 0 ? (
                        <VolumeX className="w-5 h-5 text-blue-600" />
                      ) : speakerVolume < 50 ? (
                        <Volume1 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 text-base leading-tight">
                        Volume Suara Speaker Kios
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Atur kenyaringan musik dan suara bel pesanan
                      </p>
                    </div>
                  </div>
                  <span className={`text-lg font-black px-3 py-1 rounded-xl border ${
                    speakerVolume === 0
                      ? 'text-stone-500 bg-stone-100 border-stone-200'
                      : 'text-blue-600 bg-blue-50 border-blue-200'
                  }`}>
                    {speakerVolume === 0 ? 'Mute' : `${speakerVolume}%`}
                  </span>
                </div>

                {/* Slider Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-stone-500">
                    <span className="flex items-center gap-1"><VolumeX className="w-3.5 h-3.5 text-stone-400" /> Senyap (0%)</span>
                    <span className="flex items-center gap-1"><Volume2 className="w-3.5 h-3.5 text-blue-500" /> Maksimal (100%)</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={speakerVolume}
                    onChange={(e) => handleUpdateVolume(Number(e.target.value), false)}
                    onMouseUp={() => handleUpdateVolume(speakerVolume, true)}
                    onTouchEnd={() => handleUpdateVolume(speakerVolume, true)}
                    className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Tombol Preset Cepat Volume */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-black uppercase text-stone-400 tracking-wider">
                    Pilihan Cepat (1-Klik):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateVolume(0, false)}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        speakerVolume === 0
                          ? 'bg-stone-700 text-white border-stone-700 shadow-md'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <VolumeX className="w-5 h-5 mx-auto mb-1 text-stone-400" />
                      <span className="block font-black text-xs">Mute</span>
                      <span className="text-[10px] opacity-80">0% Hening</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateVolume(40, true)}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        speakerVolume === 40
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <Volume1 className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                      <span className="block font-black text-xs">Santai</span>
                      <span className="text-[10px] opacity-80">40% Sedang</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateVolume(80, true)}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        speakerVolume === 80
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      <Volume2 className="w-5 h-5 mx-auto mb-1 text-indigo-300" />
                      <span className="block font-black text-xs">Keras</span>
                      <span className="text-[10px] opacity-80">80% Jelas</span>
                    </button>
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-[11px] text-stone-500 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sinkron dengan speaker host Ubuntu.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => playChimeSound()}
                    className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer text-[11px]"
                  >
                    Tes Suara
                  </button>
                </div>
              </div>

              {/* MODUL 3: MANAJEMEN DAYA SERVER KOMPUTER KASIR */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 font-black flex items-center justify-center">
                      <Power className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 text-base leading-tight">
                        Kendali Daya Server Kasir
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Matikan komputer dengan aman saat toko tutup
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Jangan langsung mencabut stopkontak atau saklar listrik saat komputer masih aktif agar database pesanan dan data warung tidak rusak. Gunakan tombol di bawah ini:
                  </p>

                  <div className="space-y-3 pt-1">
                    {/* Tombol Shutdown */}
                    <button
                      type="button"
                      onClick={() => setPowerActionModal('shutdown')}
                      className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 transition-all"
                    >
                      <Power className="w-5 h-5" />
                      <span>MATIKAN KOMPUTER KASIR (SHUTDOWN)</span>
                    </button>

                    {/* Tombol Reboot */}
                    <button
                      type="button"
                      onClick={() => setPowerActionModal('reboot')}
                      className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl font-bold text-xs border border-stone-300 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                    >
                      <RotateCw className="w-4 h-4 text-stone-600" />
                      <span>Mulai Ulang Sistem (Restart / Reboot)</span>
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Petunjuk Mematikan Komputer:</span>
                  </div>
                  <p className="leading-snug">
                    Setelah tombol &quot;Matikan Komputer&quot; diklik, tunggu 5-10 detik sampai lampu monitor atau CPU mati, lalu saklar stopkontak warung boleh dimatikan.
                  </p>
                </div>
              </div>
            </div>

            {/* MODUL 3: HIBURAN & MUSIK TOKO (YOUTUBE RESMI) */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 font-black flex items-center justify-center">
                    <Video className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-stone-900 text-base leading-tight flex items-center gap-2">
                      Hiburan & Musik Toko (YouTube)
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Resmi</span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Buka Home YouTube resmi untuk memutar musik, murottal, atau video pengiring jaga warung
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Play className="w-4 h-4 text-red-600 fill-red-600" />
                    <span>Petunjuk Navigasi & Musik Background:</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-stone-600">
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span><strong>Musik Tetap Menyala di Background:</strong> Tekan <kbd className="px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded font-mono font-bold text-[10px]">Ctrl + Tab</kbd> untuk kembali ke kasir sambil musik terus berputar.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-red-500 font-black">✓</span>
                      <span><strong>Tutup YouTube & Matikan Musik:</strong> Tekan <kbd className="px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded font-mono font-bold text-[10px]">Ctrl + W</kbd> untuk menutup tab YouTube seketika.</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => window.open('https://www.youtube.com', '_blank')}
                  className="w-full sm:w-auto px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Home YouTube Resmi</span>
                </button>
              </div>
            </div>

            {/* MODUL 3: KEAMANAN AKUN (UBAH EMAIL & PASSWORD LOGIN) */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 font-black flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-stone-900 text-base leading-tight">
                    Ubah Email & Password Login
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Perbarui data akses masuk kasir & superadmin agar warung tetap aman
                  </p>
                </div>
              </div>

              {accountSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{accountSuccessMsg}</span>
                </div>
              )}

              {accountErrorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{accountErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdateAccountSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email Baru */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-400" /> Email Login Admin
                    </label>
                    <input
                      type="email"
                      required
                      value={newAccountEmail}
                      onChange={(e) => setNewAccountEmail(e.target.value)}
                      placeholder="admin@warungduniawi.com"
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Email saat ini: <strong>{currentAccountEmail || 'Sedang dimuat...'}</strong>
                    </span>
                  </div>

                  {/* Password Saat Ini (Wajib Konfirmasi) */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-orange-600" /> Password Saat Ini *
                    </label>
                    <input
                      type="password"
                      required
                      value={currentAccountPassword}
                      onChange={(e) => setCurrentAccountPassword(e.target.value)}
                      placeholder="Ketik password lama Anda"
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Wajib dimasukkan untuk keamanan perubahan
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-stone-100">
                  {/* Password Baru (Opsional) */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-stone-400" /> Password Baru (Opsional)
                    </label>
                    <input
                      type="password"
                      value={newAccountPassword}
                      onChange={(e) => setNewAccountPassword(e.target.value)}
                      placeholder="Kosongkan jika tidak ingin ganti"
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Minimal 6 karakter
                    </span>
                  </div>

                  {/* Konfirmasi Password Baru */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-stone-400" /> Ulangi Password Baru
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Ulangi password baru di sini"
                      disabled={!newAccountPassword}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500 disabled:opacity-40"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingAccount}
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md shadow-orange-600/20 cursor-pointer active:scale-98 flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan Perubahan...</span>
                      </>
                    ) : (
                      <span>Simpan Perubahan Akun</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* PANDUAN HARDWARE SERVER & BIOS RAMAH ORANG RUMAH */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-3">
              <h4 className="font-black text-stone-900 text-sm flex items-center gap-2">
                💡 Tips Praktis untuk Orang Rumah / Kasir Warung
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-600">
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block">⚡ Menghidupkan Otomatis (Auto Power-On):</span>
                  <p className="leading-relaxed">
                    Di BIOS komputer (tekan F2/Del saat baru nyala), aktifkan menu <em>&quot;Restore on AC/Power Loss: Power On&quot;</em>. Cukup nyalakan saklar stopkontak listrik toko di pagi hari, komputer kasir akan langsung menyala sendiri tanpa perlu cari tombol power kecil di casing.
                  </p>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block">🔌 Tombol Power Fisik Casing:</span>
                  <p className="leading-relaxed">
                    Sistem Ubuntu kasir telah diatur agar saat tombol power casing ditekan 1x (tekan pendek), komputer akan langsung memproses shutdown aman otomatis layaknya mematikan TV.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Tambah / Full Edit Produk (Terkunci di Atas Layar & Internal Scroll) */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white max-w-lg w-full max-h-[85vh] rounded-3xl border border-stone-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Sticky) */}
            <div className="flex justify-between items-center p-5 border-b border-stone-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-stone-900 text-lg">
                  {editingProduct ? 'Edit Produk Lengkap' : 'Tambah Produk Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable Internal) */}
            <form onSubmit={handleSaveProductSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Produk *
                </label>
                <input
                  ref={productNameInputRef}
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Misal: Beras Pandan Wangi 5kg"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500 font-medium"
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-stone-700">
                      Kode Barcode
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewProdBarcode(generateInternalBarcode())}
                      className="text-[10px] font-black text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 cursor-pointer flex items-center gap-1"
                      title="Buat barcode internal otomatis untuk telur/terigu/beras curah"
                    >
                      <Sparkles className="w-3 h-3" /> Auto
                    </button>
                  </div>
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

              {/* Upload Foto Produk */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Foto Produk
                </label>

                {/* Upload Box & Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      uploadingImage
                        ? 'bg-stone-100 border-stone-300 text-stone-400 cursor-not-allowed'
                        : 'bg-orange-50/50 border-orange-300 hover:bg-orange-100/50 text-orange-700'
                    }`}>
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-xs font-bold">Sedang Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-orange-600" />
                          <span className="text-xs font-bold">Pilih / Ambil Foto (Maks 5MB)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>

                    {newProdImg && (
                      <button
                        type="button"
                        onClick={() => setNewProdImg('')}
                        className="px-3 py-3 bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-500 rounded-xl text-xs font-bold border border-stone-200 transition-colors cursor-pointer"
                        title="Hapus Foto"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>

                  {/* Preview Foto */}
                  {newProdImg ? (
                    <div className="relative w-full h-32 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center group">
                      <img
                        src={newProdImg}
                        alt="Preview Produk"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-1 right-2 bg-stone-900/60 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs">
                        Foto Aktif
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-2 text-stone-400 text-xs">
                      <ImageIcon className="w-4 h-4 text-stone-400 shrink-0" />
                      <span>Belum ada foto yang dipilih. Silakan klik tombol di atas untuk upload.</span>
                    </div>
                  )}
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

              {/* Modal Footer (Sticky di Bawah) */}
              <div className="flex gap-2 pt-3 border-t border-stone-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md cursor-pointer active:scale-98"
                >
                  {editingProduct ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Barcode Baru (Tersimpan ke Produk & Langsung Cetak Struk Thermal) */}
      {isAddBarcodeOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl border border-stone-200 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base leading-tight">
                    Tambah Barcode Produk
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Untuk sembako curah (Telur, Terigu, Beras, dll)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBarcodeOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newBarcodeName.trim() || !newBarcodePrice) {
                  alert('Nama produk dan harga wajib diisi!');
                  return;
                }

                setSavingBarcode(true);
                try {
                  const res = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: newBarcodeName.trim(),
                      price: Number(newBarcodePrice),
                      unit: newBarcodeUnit.trim() || 'pcs',
                      barcode: newBarcodeCode.trim(),
                      categoryId: newBarcodeCategoryId || categories[0]?.id,
                      inStock: true,
                    }),
                  });

                  const json = await res.json();
                  if (json.success) {
                    const savedProduct = json.data;
                    setIsAddBarcodeOpen(false);
                    // Langsung masukkan produk baru ke memori array kasir agar saat discan langsung terbaca
                    setProducts((prev) => [savedProduct, ...prev.filter((p) => p.id !== savedProduct.id)]);
                    fetchProducts();

                    // Siapkan item untuk dicetak langsung ke printer thermal
                    const listToPrint = [];
                    const qty = Math.max(1, newBarcodeQty);
                    for (let i = 0; i < qty; i++) {
                      listToPrint.push({
                        id: savedProduct.id,
                        name: savedProduct.name,
                        barcode: savedProduct.barcode,
                        price: savedProduct.price,
                        unit: savedProduct.unit,
                      });
                    }

                    setActivePrintMode('barcode');
                    setSelectedPrintOrder(null);
                    setPrintableBarcodeItems(listToPrint);

                    // Beri jeda 300ms agar DOM selesai render lalu langsung print
                    setTimeout(() => {
                      const cleanup = () => {
                        setPrintableBarcodeItems([]);
                        setActivePrintMode(null);
                        window.removeEventListener('afterprint', cleanup);
                      };
                      window.addEventListener('afterprint', cleanup);
                      window.print();
                    }, 300);
                  } else {
                    alert(json.message);
                  }
                } catch (err) {
                  alert('Gagal menyimpan barcode produk.');
                } finally {
                  setSavingBarcode(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Nama Barang */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nama Barang Curah / Eceran *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newBarcodeName}
                  onChange={(e) => setNewBarcodeName(e.target.value)}
                  placeholder="Contoh: Telur Ayam Negeri 1kg / Terigu Segitiga 1kg"
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Harga & Satuan */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newBarcodePrice}
                    onChange={(e) => setNewBarcodePrice(e.target.value)}
                    placeholder="28000"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={newBarcodeUnit}
                    onChange={(e) => setNewBarcodeUnit(e.target.value)}
                    placeholder="kg / bungkus / pcs"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Nomor Barcode Acak Unik Otomatis */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-stone-700">
                    Nomor Barcode (Otomatis Acak & Belum Terpakai)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewBarcodeCode(generateInternalBarcode())}
                    className="text-[10px] font-black text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Acak Ulang
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newBarcodeCode}
                  onChange={(e) => setNewBarcodeCode(e.target.value)}
                  className="w-full p-2.5 bg-stone-100 border border-stone-300 rounded-xl text-stone-900 font-mono font-black tracking-wider text-center text-sm"
                />
              </div>

              {/* Jumlah Label Cetak Awal */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Jumlah Label yang Langsung Dicetak
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 5, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setNewBarcodeQty(qty)}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        newBarcodeQty === qty
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {qty}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddBarcodeOpen(false)}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingBarcode}
                  className="w-2/3 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-md shadow-orange-600/20 cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
                >
                  {savingBarcode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Simpan & Cetak Label</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Komponen Cetak Struk Kasir Thermal (HANYA dirender jika activePrintMode === 'receipt' dan order ada) */}
      {activePrintMode === 'receipt' && selectedPrintOrder && (
        <ThermalReceipt order={selectedPrintOrder} />
      )}

      {/* Komponen Cetak Label Barcode Thermal (HANYA dirender jika activePrintMode === 'barcode' dan items ada) */}
      {activePrintMode === 'barcode' && printableBarcodeItems.length > 0 && (
        <ThermalBarcode items={printableBarcodeItems} />
      )}
      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI DAYA (SHUTDOWN / REBOOT) */}
      {/* ========================================================================= */}
      {powerActionModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-3xl border-2 border-red-500 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Power className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-stone-900 text-lg">
                {powerActionModal === 'shutdown'
                  ? 'Matikan Komputer Kasir?'
                  : 'Mulai Ulang (Restart) Komputer?'}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                {powerActionModal === 'shutdown'
                  ? 'Pastikan semua transaksi kasir hari ini sudah selesai sebelum mematikan sistem.'
                  : 'Sistem komputer kasir akan direstart dan kembali menyala dalam 1-2 menit.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={powerExecuting}
                onClick={() => setPowerActionModal(null)}
                className="w-1/2 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={powerExecuting}
                onClick={() => handleExecutePowerAction(powerActionModal)}
                className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-md shadow-red-600/20 cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
              >
                {powerExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, {powerActionModal === 'shutdown' ? 'Matikan Sekarang' : 'Restart'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN PENUTUP SISTEM SAAT SHUTDOWN SEDANG BERJALAN */}
      {/* ========================================================================= */}
      {powerExecutedState && (
        <div className="fixed inset-0 z-50 bg-stone-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center">
            <Power className="w-8 h-8 animate-pulse text-red-500" />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-black tracking-tight">
              {powerExecutedState === 'shutdown'
                ? 'Sistem Sedang Dimatikan dengan Aman'
                : 'Sistem Sedang Memulai Ulang (Restart)'}
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed">
              {powerExecutedState === 'shutdown' ? (
                <>
                  Database dan aplikasi sedang ditutup dengan rapi.
                  <span className="block mt-2 font-bold text-amber-400">
                    Tunggu 5-10 detik sampai lampu monitor atau PC mati, lalu saklar listrik boleh dimatikan.
                  </span>
                </>
              ) : (
                'Komputer kasir sedang restart. Halaman ini akan otomatis kembali aktif setelah sistem siap.'
              )}
            </p>
          </div>

          {powerExecutedState === 'reboot' && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-xl text-xs font-bold text-stone-200 cursor-pointer"
            >
              Refresh Halaman
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL IMPOR PRODUK MASSAL (CSV / EXCEL) */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl border border-stone-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal Impor */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base leading-tight">
                    Impor Produk Massal (CSV)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Tambah atau update puluhan produk sekaligus
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Card */}
            <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-amber-900 block">Belum punya formatnya?</span>
                <p className="text-[11px] text-amber-700">Unduh contoh template kolom CSV resmi.</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Template
              </button>
            </div>

            {/* Form Upload CSV */}
            <form onSubmit={handleImportCsvSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-2">
                  Pilih File CSV Produk (.csv)
                </label>
                <label
                  className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                    importFile
                      ? 'border-emerald-400 bg-emerald-50/40 text-emerald-900'
                      : 'border-stone-300 hover:border-orange-400 bg-stone-50/70 text-stone-600'
                  }`}
                >
                  <FileText className={`w-8 h-8 mb-2 ${importFile ? 'text-emerald-600' : 'text-stone-400'}`} />
                  {importFile ? (
                    <div className="text-center space-y-0.5">
                      <span className="font-bold text-sm text-stone-900 block truncate max-w-[260px]">
                        {importFile.name}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        ({(importFile.size / 1024).toFixed(1)} KB) • Siap diimpor
                      </span>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <span className="font-extrabold text-stone-800 text-sm block">
                        Klik untuk memilih file CSV
                      </span>
                      <span className="text-[11px] text-stone-400 block">
                        Format CSV dengan pemisah koma (,) atau titik koma (;)
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                        setImportResult(null);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Hasil Notifikasi Laporan */}
              {importResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importResult}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={importingCsv}
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFile(null);
                    setImportResult(null);
                  }}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={importingCsv || !importFile}
                  className="w-2/3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-md shadow-amber-600/20 cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {importingCsv ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang Mengimpor...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      <span>Mulai Impor Produk</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
