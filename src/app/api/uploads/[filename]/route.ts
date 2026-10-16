import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Cegah directory traversal attack (keamanan file)
    const sanitizedFilename = path.basename(filename);

    // Cari file di direktori uploads
    const filePath = path.join(process.cwd(), 'public', 'uploads', sanitizedFilename);

    try {
      const fileBuffer = await fs.readFile(filePath);

      // Tentukan Content-Type sesuai ekstensi
      const ext = path.extname(sanitizedFilename).toLowerCase();
      let contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat gambar' }, { status: 500 });
  }
}
