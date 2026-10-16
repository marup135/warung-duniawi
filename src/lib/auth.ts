import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.SESSION_SECRET || 'warung-duniawi-super-secret-key-2026-auth-token-447';
const key = new TextEncoder().encode(SECRET_KEY);

export const COOKIE_NAME = 'wd_session';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  [key: string]: any;
}

// Enkripsi session ke JWT
export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Aktif 7 hari
    .sign(key);
}

// Dekripsi & verifikasi JWT
export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

// Set session cookie HTTP-Only
export async function createSession(user: { id: string; email: string; name: string; role: string }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionToken = await encrypt({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  return sessionToken;
}

// Dapatkan session dari cookie saat ini
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await decrypt(token);
}

// Hapus session cookie (Logout)
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
