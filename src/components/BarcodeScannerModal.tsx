'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  subtitle?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Barcode / QR Code',
  subtitle = 'Arahkan kamera HP ke barcode atau QR code produk',
}: BarcodeScannerModalProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'wd-html5-camera-reader';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setScannerError(null);
    setScannedCode(null);
    setIsStarting(true);

    const startScanner = async () => {
      try {
        // Beri jeda kecil agar elemen DOM render sempurna
        await new Promise((r) => setTimeout(r, 200));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(readerElementId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            // Kotak bidik responsif yang lebar agar pas untuk Barcode 1D & QR Code 2D
            return {
              width: Math.floor(minEdge * 0.85),
              height: Math.floor(minEdge * 0.6),
            };
          },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode },
          config,
          (decodedText) => {
            if (!isMounted) return;
            setScannedCode(decodedText);
            // Hentikan kamera dan teruskan kode hasil scan
            html5QrCode
              .stop()
              .catch(() => {})
              .finally(() => {
                onScanSuccess(decodedText);
                onClose();
              });
          },
          () => {
            // Frame scan callback (abaikan bila belum mendeteksi barcode)
          }
        );

        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsStarting(false);
        console.error('Camera scanner init error:', err);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
          setScannerError('Izin akses kamera ditolak. Silakan izinkan browser mengakses kamera.');
        } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
          setScannerError('Kamera tidak ditemukan di perangkat ini.');
        } else if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          setScannerError('Kamera memerlukan koneksi aman (HTTPS). Pastikan web diakses melalui HTTPS.');
        } else {
          setScannerError('Gagal menyalakan kamera: ' + errMsg);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          });
      }
    };
  }, [isOpen, facingMode, onClose, onScanSuccess]);

  const toggleCamera = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
          setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
        });
    } else {
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-stone-400">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer"
            title="Tutup Kamera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Container */}
        <div className="p-4 bg-stone-950 flex-1 flex flex-col items-center justify-center relative min-h-[320px]">
          {/* Elemen target pembaca video html5-qrcode */}
          <div
            id={readerElementId}
            className="w-full h-full rounded-2xl overflow-hidden shadow-inner bg-black"
          />

          {/* Garis Animasi Bidik Laser Scanner */}
          {!scannerError && !scannedCode && !isStarting && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-3/4 h-44 border-2 border-orange-500/80 rounded-2xl relative shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                {/* Siku-siku fokus sudut */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
                {/* Laser scan line animasi bolak-balik */}
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Loading status */}
          {isStarting && !scannerError && (
            <div className="absolute inset-0 bg-stone-950/90 flex flex-col items-center justify-center text-white gap-2 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <span className="font-semibold">Menghubungkan ke kamera HP...</span>
            </div>
          )}

          {/* Error Message Display */}
          {scannerError && (
            <div className="absolute inset-x-4 p-4 bg-red-950/90 border border-red-500/50 rounded-2xl text-red-200 text-xs flex flex-col items-center text-center gap-2 backdrop-blur-xs">
              <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
              <span className="font-semibold">{scannerError}</span>
              <button
                onClick={toggleCamera}
                className="mt-1 px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi / Ganti Kamera
              </button>
            </div>
          )}

          {/* Success Code Pop */}
          {scannedCode && (
            <div className="absolute inset-x-4 p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs flex items-center justify-center gap-2 backdrop-blur-xs font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Kode Terdeteksi: {scannedCode}</span>
            </div>
          )}
        </div>

        {/* Footer Kontrol */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleCamera}
            className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
            <span>Ganti Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

