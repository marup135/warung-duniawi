'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeItem {
  id: string;
  name: string;
  barcode: string;
  price: number;
  unit: string;
}

interface ThermalBarcodeProps {
  items: BarcodeItem[]; // Daftar label yang akan dicetak
}

export default function ThermalBarcode({ items }: ThermalBarcodeProps) {
  const svgRefs = useRef<{ [key: string]: SVGSVGElement | null }>({});

  useEffect(() => {
    items.forEach((item, index) => {
      const key = `${item.id}-${index}`;
      const svgEl = svgRefs.current[key];
      if (svgEl && item.barcode) {
        try {
          JsBarcode(svgEl, item.barcode, {
            format: 'CODE128',
            width: 1.8,
            height: 48,
            displayValue: true,
            fontSize: 12,
            font: 'monospace',
            textMargin: 2,
            margin: 0,
          });
        } catch (err) {
          console.error(`Gagal merender barcode ${item.barcode}:`, err);
        }
      }
    });
  }, [items]);

  if (!items || items.length === 0) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div id="printable-barcode" className="barcode-print-container hidden print:block text-black font-mono">
      {items.map((item, index) => {
        const key = `${item.id}-${index}`;
        return (
          <div
            key={key}
            className="barcode-label-card text-center border-b border-dashed border-black pb-4 mb-4 page-break-after-avoid"
          >
            {/* Header Toko */}
            <div className="text-[10px] font-black tracking-wider uppercase">
              WARUNG DUNIAWI
            </div>

            {/* Nama Produk */}
            <div className="text-xs font-black line-clamp-2 px-1 my-0.5">
              {item.name}
            </div>

            {/* Harga Produk Jumbo */}
            <div className="text-sm font-black tracking-tight my-0.5">
              {formatRupiah(item.price)}
              <span className="text-[10px] font-bold text-stone-700"> / {item.unit}</span>
            </div>

            {/* Render Barcode SVG */}
            <div className="flex justify-center my-1">
              <svg
                ref={(el) => {
                  svgRefs.current[key] = el;
                }}
                className="max-w-full"
              ></svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
