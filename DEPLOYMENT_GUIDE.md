# ==============================================================================
# PANDUAN DEPLOYMENT HOME SERVER & DOMAIN NORTHWEST (warungduniawi.com)
# ==============================================================================

Project: Warung Duniawi (Sembako & Kebutuhan Harian)
Server Target: Home Server Ubuntu + Docker (Port 3001)
Domain: warungduniawi.com (Registered via Northwest)

--------------------------------------------------------------------------------
1. CARA DEPLOY DOCKER DI HOME SERVER UBUNTU
--------------------------------------------------------------------------------

Langkah 1: Clone atau Copy Folder Repository ini ke Home Server Ubuntu Anda
   git clone <URL_REPO_WARUNGDUNIAWI> /home/ubuntu/warungduniawi
   cd /home/ubuntu/warungduniawi

Langkah 2: Jalankan Docker Compose
   docker compose up -d --build

   - Container 'warungduniawi-web' akan otomatis di-build.
   - Aplikasi berjalan di localhost Port 3001 (sehingga tidak bentrok dengan Talysa di Port 3000).
   - Data SQLite tersimpan aman secara persisten di volume Docker `warungduniawi_sqlite_data`.

--------------------------------------------------------------------------------
2. KONFIGURASI REVERSE PROXY NGINX / NGINX PROXY MANAGER DI HOME SERVER
--------------------------------------------------------------------------------

Jika Anda menggunakan Nginx biasa di Ubuntu, tambahkan konfigurasi block server berikut
di `/etc/nginx/sites-available/warungduniawi.conf`:

server {
    listen 80;
    server_name warungduniawi.com www.warungduniawi.com;

    location / {
        proxy_pass http://127.0.0.1:3001; # Arahkan ke Port Warung Duniawi
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

Lalu aktifkan site & reload Nginx:
    sudo ln -s /etc/nginx/sites-available/warungduniawi.conf /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx

(Atau jika menggunakan Nginx Proxy Manager / Cloudflare Tunnel GUI, cukup tambahkan Proxy Host `warungduniawi.com` -> `http://localhost:3001`).

--------------------------------------------------------------------------------
3. KONFIGURASI DNS DOMAIN DI PANEL NORTHWEST (warungduniawi.com)
--------------------------------------------------------------------------------

1. Masuk ke Dashboard Northwest -> Domains -> warungduniawi.com -> DNS Management / Host Records.
2. Tambahkan A Record:
   - Type: A Record
   - Host: @
   - Value: <IP_PUBLIK_HOME_SERVER_ANDA>
   - TTL: Automatic / 300
3. Tambahkan CNAME Record untuk WWW:
   - Type: CNAME
   - Host: www
   - Value: warungduniawi.com
   - TTL: Automatic / 300

--------------------------------------------------------------------------------
4. AKTIFKAN CERTBOT SSL (HTTPS GRATIS) DI HOME SERVER
--------------------------------------------------------------------------------
Jalankan certbot untuk mendapatkan HTTPS resmi:
   sudo certbot --nginx -d warungduniawi.com -d www.warungduniawi.com

Selamat! Website Warung Duniawi kini aktif di https://warungduniawi.com !
==============================================================================
