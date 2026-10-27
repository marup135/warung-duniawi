import { prisma } from '@/lib/prisma';
import { getSession, createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Sesi login tidak sah atau telah berakhir.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    // Ambil data user saat ini dari database
    const user = await prisma.user.findUnique({
      where: { id: session.userId as string },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User tidak ditemukan di sistem.' },
        { status: 404 }
      );
    }

    // Wajib memasukkan password saat ini untuk keamanan
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Password saat ini wajib diisi untuk konfirmasi keamanan.' },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Password saat ini yang Anda masukkan salah.' },
        { status: 400 }
      );
    }

    const updateData: { email?: string; passwordHash?: string } = {};

    // Jika ingin ubah email
    if (email && email.trim().toLowerCase() !== user.email) {
      const cleanEmail = email.trim().toLowerCase();
      // Pastikan email baru belum dipakai user lain
      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail && existingEmail.id !== user.id) {
        return NextResponse.json(
          { success: false, message: 'Email tersebut sudah digunakan oleh akun lain.' },
          { status: 400 }
        );
      }
      updateData.email = cleanEmail;
    }

    // Jika ingin ubah password
    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, message: 'Password baru minimal harus 6 karakter.' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada perubahan data email atau password.' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Refresh cookie sesi jika email diperbarui
    await createSession({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Kredensial akun (email/password) berhasil diperbarui!',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error: any) {
    console.error('Error updating account credentials:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui akun.' },
      { status: 500 }
    );
  }
}
