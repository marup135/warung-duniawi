#!/bin/bash
# ==============================================================================
# SCRIPT SETUP KIOSK SAFE SHUTDOWN (SYSTEMD PATH WATCHER)
# Project: Warung Duniawi
# Menghubungkan tombol "Matikan Komputer Kasir" di Web ke Host Ubuntu Server
# ==============================================================================

set -e

echo "=== [1/4] Memeriksa Hak Akses Root ==="
if [ "$EUID" -ne 0 ]; then
  echo "Error: Harap jalankan script ini dengan sudo!"
  echo "Contoh: sudo bash setup-kiosk-power.sh"
  exit 1
fi

echo "=== [2/4] Membuat Systemd Service (kiosk-power.service) ==="
cat << 'EOF' > /etc/systemd/system/kiosk-power.service
[Unit]
Description=Warung Duniawi Kiosk Web Safe Shutdown Service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'rm -f /var/lib/docker/volumes/warungduniawi_sqlite_data/_data/power.flag && /sbin/shutdown -h now'
EOF

echo "=== [3/4] Membuat Systemd Path Watcher (kiosk-power.path) ==="
cat << 'EOF' > /etc/systemd/system/kiosk-power.path
[Unit]
Description=Monitor Warung Duniawi Power Flag Trigger

[Path]
PathModified=/var/lib/docker/volumes/warungduniawi_sqlite_data/_data/power.flag
Unit=kiosk-power.service

[Install]
WantedBy=multi-user.target
EOF

echo "=== [4/4] Mengaktifkan & Menjalankan Service ==="
systemctl daemon-reload
systemctl enable --now kiosk-power.path

echo ""
echo "=============================================================================="
echo "✅ SUKSES! Kiosk Safe Shutdown Watcher telah aktif."
echo "Status Path Unit:"
systemctl status kiosk-power.path --no-pager
echo "=============================================================================="
echo "Sekarang saat tombol 'Matikan Komputer Kasir' diklik di web kasir,"
echo "Ubuntu host akan langsung mati dengan aman dalam 1 detik."
echo "=============================================================================="
