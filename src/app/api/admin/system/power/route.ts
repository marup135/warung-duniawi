import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    if (!['shutdown', 'reboot'].includes(action)) {
      return NextResponse.json(
        { error: 'Aksi tidak valid. Gunakan "shutdown" atau "reboot".' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const commandPayload = JSON.stringify({ action, timestamp });

    // Tulis trigger flag ke data volume (/app/data/power.flag)
    // Host daemon / watcher dapat memonitor file ini untuk trigger shutdown di Ubuntu host
    const dataDir = path.join(process.cwd(), 'data');
    let flagWritten = false;
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const flagPath = path.join(dataDir, 'power.flag');
      fs.writeFileSync(flagPath, commandPayload, 'utf-8');
      flagWritten = true;
    } catch (e) {
      console.warn('[Power API] Failed writing data/power.flag:', e);
    }

    // 2. Coba jalankan command system jika diizinkan (misal jika container dijalankan dengan izin systemd/dbus)
    const cmd = action === 'shutdown' ? 'shutdown -h now || poweroff || init 0' : 'reboot || init 6';

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(`[Power API] Command execution notice: ${error.message} (File trigger flag written: ${flagWritten})`);
      } else {
        console.log(`[Power API] Execution success: ${stdout || stderr}`);
      }
    });

    return NextResponse.json({
      success: true,
      action,
      flagWritten,
      message:
        action === 'shutdown'
          ? 'Perintah mematikan komputer kasir telah dikirim. Komputer akan segera mati.'
          : 'Perintah mulai ulang (restart) telah dikirim.',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
