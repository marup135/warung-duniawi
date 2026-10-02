'use client';

import React from 'react';
import { ShoppingBag, Clock, MapPin, Phone } from 'lucide-react';

interface HeaderProps {
  cartItemCount: number;
  onOpenCart: () => void;
}

export default function Header({ cartItemCount, onOpenCart }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200 shadow-xs">
      {/* Top Announcement Bar */}
      <div className="bg-amber-600 text-amber-50 text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Buka Setiap Hari: 06.00 - 21.00 WIB
        </span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> Siap Melayani Ambil di Tempat
        </span>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-bold text-xl">
            WD
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight leading-none flex items-center gap-2">
              Warung Duniawi
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                Sembako & Harian
              </span>
            </h1>
            <p className="text-xs text-stone-500 mt-0.5 hidden sm:block">
              Segar, Murah, & Lengkap untuk Kebutuhan Sehari-hari
            </p>
          </div>
        </div>

        {/* Action Button (Cart) */}
        <button
          onClick={onOpenCart}
          className="relative flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-md shadow-orange-600/20 transition-all active:scale-95 cursor-pointer"
          aria-label="Buka Keranjang"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-medium">Keranjang</span>
          {cartItemCount > 0 && (
            <span className="bg-white text-orange-600 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-xs">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
