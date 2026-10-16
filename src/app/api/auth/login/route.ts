import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

// Simpan riwayat login gagal sederhana per IP/Email (Rate limiting anti-brute force)
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();

    // Cek status rate limit / lockout
    const attempt = failedAttempts.get(cleanEmail);
    if (attempt && attempt.lockedUntil > now) {
      const waitSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak percobaan gagal. Silakan tunggu ${waitSeconds} detik lagi.`,
        },
        { status: 429 }
      );
    }

    // Cari user di database
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      recordFailedAttempt(cleanEmail);
      return NextResponse.json(
        { success: false, message: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Verifikasi password hash bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      recordFailedAttempt(cleanEmail);
      return NextResponse.json(
        { success: false, message: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Login sukses: Reset catatan gagal
    failedAttempts.delete(cleanEmail);

    // Buat HTTP-Only Secure Cookie Session
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server saat login' },
      { status: 500 }
    );
  }
}

function recordFailedAttempt(identifier: string) {
  const now = Date.now();
  const attempt = failedAttempts.get(identifier) || { count: 0, lockedUntil: 0 };
  attempt.count += 1;

  if (attempt.count >= 5) {
    // Kunci selama 5 menit jika gagal 5x berturut-turut
    attempt.lockedUntil = now + 5 * 60 * 1000;
  }

  failedAttempts.set(identifier, attempt);
}
