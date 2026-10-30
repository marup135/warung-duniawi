import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function POST(req: Request) {
  try {
    const { volume } = await req.json();

    if (typeof volume !== 'number' || volume < 0 || volume > 100) {
      return NextResponse.json(
        { error: 'Volume harus berupa angka antara 0 dan 100.' },
        { status: 400 }
      );
    }

    const clampedVolume = Math.round(Math.min(100, Math.max(0, volume)));
    const timestamp = new Date().toISOString();
    const commandPayload = JSON.stringify({ volume: clampedVolume, timestamp });

    // 1. Tulis trigger flag ke data volume (/app/data/volume.flag)
    // Sinyal ini dapat dibaca oleh host volume daemon jika berjalan di container
    const dataDir = path.join(process.cwd(), 'data');
    let flagWritten = false;
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const flagPath = path.join(dataDir, 'volume.flag');
      fs.writeFileSync(flagPath, commandPayload, 'utf-8');
      flagWritten = true;
    } catch (e) {
      console.warn('[Volume API] Gagal menulis data/volume.flag:', e);
    }

    // 2. Eksekusi perintah audio host Linux jika memiliki akses audio (ALSA / PulseAudio / PipeWire)
    // - WirePlumber (modern PipeWire di Ubuntu 22.04 / 24.04): wpctl set-volume @DEFAULT_AUDIO_SINK@ X
    // - PulseAudio / PipeWire compat: pactl set-sink-volume @DEFAULT_SINK@ X%
    // - ALSA direct: amixer -D pulse sset Master X% || amixer sset Master X% || amixer set Master X%
    const normalizedDecimal = (clampedVolume / 100).toFixed(2);
    const audioCmd = [
      `wpctl set-volume @DEFAULT_AUDIO_SINK@ ${normalizedDecimal}`,
      `pactl set-sink-volume @DEFAULT_SINK@ ${clampedVolume}%`,
      `amixer -D pulse sset Master ${clampedVolume}%`,
      `amixer sset Master ${clampedVolume}%`,
      `amixer set Master ${clampedVolume}%`,
      `amixer set PCM ${clampedVolume}%`
    ].join(' || ');

    exec(audioCmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(`[Volume API] Notice audio command: ${error.message} (Flag written: ${flagWritten})`);
      } else {
        console.log(`[Volume API] Audio set to ${clampedVolume}%: ${stdout || stderr}`);
      }
    });

    return NextResponse.json({
      success: true,
      volume: clampedVolume,
      flagWritten,
      message: `Volume berhasil diatur ke ${clampedVolume}%`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
