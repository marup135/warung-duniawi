import { getSession, deleteSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET: Cek status session user saat ini
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

// POST: Logout dan hapus cookie HTTP-Only
export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true, message: 'Logout berhasil' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Gagal logout' }, { status: 500 });
  }
}
