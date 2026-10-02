'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import FilterBar from '@/components/FilterBar';
import ProductCard, { ProductItem } from '@/components/ProductCard';
import CartDrawer from '@/components/CartDrawer';
import { ShoppingBag, Store, Sparkles, PhoneCall, ArrowRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
}

export default function CatalogView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Fetch catalog data dari API Next.js
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/products');
        const json = await res.json();
        if (json.success) {
          setCategories(json.data.categories);
          setProducts(json.data.products);
        }
      } catch (err) {
        console.error('Gagal memuat katalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // Filter produk berdasarkan kategori dan pencarian
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCat =
        selectedCategory === 'all' || prod.category.slug === selectedCategory;
      const matchQuery =
        !searchQuery ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.description &&
          prod.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Total item & total harga di keranjang
  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const totalCartPrice = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handlers Keranjang
  const handleAddToCart = (product: ProductItem) => {
    setCart((prev) => {
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

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-28 text-stone-900 font-sans">
      {/* Header Sticky */}
      <Header
        cartItemCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        {/* Banner Hero Warung Cerah */}
        <div className="mb-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
            <Store className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Warung Sembako & Harian Modern
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Belanja Sembako Tanpa Antre di Warung Duniawi!
            </h2>
            <p className="mt-2 text-stone-100 text-sm sm:text-base leading-relaxed font-medium">
              Pilih minyak, telur, rokok, es krim, roti, dan minuman langsung dari HP Anda. Ambil pesanan tanpa perlu nunggu lama di kasir.
            </p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <FilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Catalog Grid View */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="h-64 bg-stone-200/70 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(
                (item) => item.product.id === product.id
              );
              const qty = cartItem ? cartItem.quantity : 0;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={qty}
                  onAddToCart={handleAddToCart}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-xs my-4 p-6">
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-stone-800">
              Produk Tidak Ditemukan
            </h3>
            <p className="text-stone-500 text-sm mt-1 max-w-md mx-auto">
              Coba cari dengan kata kunci lain seperti &quot;minyak&quot;, &quot;rokok&quot;, &quot;es krim&quot;, atau klik tombol &quot;Semua Produk&quot;.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              Tampilkan Semua Produk
            </button>
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar (Sangat ramah Mobile HP) */}
      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between transition-all active:scale-98 cursor-pointer border border-stone-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 text-white font-extrabold text-sm w-9 h-9 rounded-xl flex items-center justify-center shadow-xs">
                {totalCartCount}
              </div>
              <div className="text-left">
                <span className="text-xs text-stone-400 font-medium block leading-none">
                  Total Belanja
                </span>
                <span className="text-base font-extrabold text-white">
                  {formatRupiah(totalCartPrice)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-orange-400 font-bold text-sm bg-orange-950/60 px-3 py-1.5 rounded-xl border border-orange-500/30">
              Lihat Keranjang <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Component */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={() => setCart([])}
      />

      {/* Footer Info Warung */}
      <footer className="mt-16 bg-stone-900 text-stone-300 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <h4 className="text-lg font-bold text-white">Warung Duniawi</h4>
            <p className="text-xs text-stone-400 mt-1">
              Mitra Belanja Sembako & Kebutuhan Sehari-hari Keluarga Anda.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-stone-400">
              <PhoneCall className="w-4 h-4 text-orange-500" /> Hubungi Warung: 0812-3456-7890
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
