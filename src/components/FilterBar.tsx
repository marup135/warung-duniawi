'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

interface FilterBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function FilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Search Input Box */}
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari minyak, telur, rokok, es krim, roti, atau minuman..."
          className="w-full pl-11 pr-10 py-3 bg-white border border-stone-300 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-xs text-sm sm:text-base transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer snap-start flex items-center gap-1.5 border ${
            selectedCategory === 'all'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <span>🛒</span> Semua Produk
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer snap-start flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
              }`}
            >
              <span>{cat.icon || '📦'}</span> {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
