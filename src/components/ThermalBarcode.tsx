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
          const cleanBarcode = item.barcode.trim();
          // Jika 13 digit angka murni, gunakan EAN13 resmi. Selain itu gunakan CODE128.
          const isEAN13 = /^\d{13}$/.test(cleanBarcode);

          JsBarcode(svgEl, cleanBarcode, {
            format: isEAN13 ? 'EAN13' : 'CODE128',
            width: 1.5, // Lebar batang tajam dan tidak bleed di kertas 58mm
            height: 52, // Cukup tinggi agar laser scanner mudah melintang
            displayValue: true,
            fontSize: 11,
            font: 'monospace',
            textMargin: 3,
            margin: 10, // Memberikan Quiet Zone (area putih kiri-kanan) wajib untuk scanner
            background: '#ffffff',
            lineColor: '#000000',
            flat: true,
          });
        } catch (err) {
          // Fallback ke CODE128 jika checksum EAN-13 gagal
          try {
            JsBarcode(svgEl, item.barcode.trim(), {
              format: 'CODE128',
              width: 1.5,
              height: 52,
              displayValue: true,
              fontSize: 11,
              font: 'monospace',
              textMargin: 3,
              margin: 10,
              background: '#ffffff',
              lineColor: '#000000',
            });
          } catch (fallbackErr) {
            console.error(`Gagal merender barcode ${item.barcode}:`, fallbackErr);
          }
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
