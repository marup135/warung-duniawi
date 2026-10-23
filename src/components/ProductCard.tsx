'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Check, AlertCircle } from 'lucide-react';

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  unit: string;
  imageUrl?: string | null;
  inStock: boolean;
  isFeatured: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ProductCardProps {
  product: ProductItem;
  quantityInCart: number;
  onAddToCart: (product: ProductItem) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

export default function ProductCard({
  product,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
}: ProductCardProps) {
  // Format harga ke rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="group relative bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:border-orange-200 transition-all duration-300 flex flex-col h-full">
      {/* Badge Featured / Promo */}
      {product.isFeatured && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-amber-500 text-stone-900 font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-lg shadow-sm">
          Favorit Warung
        </div>
      )}

      {/* Product Image Box */}
      <div className="relative w-full h-36 sm:h-44 bg-stone-100 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
              !product.inStock ? 'opacity-50 grayscale' : ''
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-stone-300">
            📦
          </div>
        )}

        {/* Overlay jika Stok Habis */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
            <span className="bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Stok Habis
            </span>
          </div>
        )}
      </div>

      {/* Product Info & Price Box */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-orange-600">
            {product.category.name}
          </span>
          <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-2 mt-0.5 group-hover:text-orange-600 transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-stone-500 text-[11px] sm:text-xs mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price & Action Area */}
        <div className="mt-3 pt-2.5 sm:pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-stone-400 font-medium block leading-none">
              /{product.unit}
            </span>
            <span className="text-sm sm:text-lg font-black text-stone-900 truncate block">
              {formatRupiah(product.price)}
            </span>
          </div>

          {/* Quantity Controls */}
          {product.inStock ? (
            quantityInCart > 0 ? (
              <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-xl p-0.5 sm:p-1 shrink-0">
                <button
                  onClick={() => onUpdateQuantity(product.id, quantityInCart - 1)}
                  className="w-6 h-6 sm:w-7 sm:h-7 bg-white text-stone-700 hover:bg-orange-100 rounded-lg flex items-center justify-center transition-colors cursor-pointer border border-stone-200"
                  aria-label="Kurangi kuantitas"
                >
                  <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <span className="w-4 sm:w-6 text-center font-black text-stone-900 text-xs sm:text-sm">
                  {quantityInCart}
                </span>
                <button
                  onClick={() => onUpdateQuantity(product.id, quantityInCart + 1)}
                  className="w-6 h-6 sm:w-7 sm:h-7 bg-orange-600 text-white hover:bg-orange-700 rounded-lg flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                  aria-label="Tambah kuantitas"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAddToCart(product)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-emerald-700/20 flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Beli
              </button>
            )
          ) : (
            <button
              disabled
              className="px-2.5 py-1.5 bg-stone-100 text-stone-400 rounded-xl text-[11px] sm:text-xs font-semibold cursor-not-allowed shrink-0"
            >
              Kosong
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
