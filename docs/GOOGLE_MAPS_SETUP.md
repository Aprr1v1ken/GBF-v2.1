# Penyiapan Google Maps Production

Aplikasi mendukung dua tingkat konfigurasi Google Maps JavaScript API:

| Variabel Vite/Vercel | Status | Fungsi |
| --- | --- | --- |
| `VITE_GOOGLE_MAPS_API_KEY` | Diperlukan untuk peta interaktif | Memuat Google Maps pada pemilih rayon dan peta pelayanan. |
| `VITE_GOOGLE_MAPS_MAP_ID` | Opsional, disarankan | Mengaktifkan `AdvancedMarker` dengan Map ID milik project gereja. Jika kosong, aplikasi memakai marker SVG standar dan tetap dapat berfungsi. |

Jangan gunakan `DEMO_MAP_ID` untuk production. Jangan menaruh nilai key di source code, Git, atau chat. Input latitude/longitude manual tetap tersedia tanpa konfigurasi apa pun.

## 1. Siapkan Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dengan akun yang dikelola admin gereja.
2. Pilih atau buat project, lalu aktifkan billing sesuai ketentuan Google Maps Platform.
3. Aktifkan **Maps JavaScript API**.
4. Di **Credentials**, buat **API key** untuk browser.
5. Batasi key tersebut:
   - **Application restrictions:** HTTP referrers.
   - Tambahkan `https://gmit-betel-fuimelang.vercel.app/*` dan domain produksi lain yang benar-benar dipakai.
   - Untuk development lokal, tambahkan origin lokal hanya bila diperlukan.
   - **API restrictions:** batasi ke **Maps JavaScript API** (dan API Google lain hanya jika memang dipakai).
6. Opsional untuk Advanced Marker: buka **Map management**, buat **Map ID** untuk peta JavaScript. Map ID bukan rahasia, tetapi harus berasal dari project yang benar dan sesuai jenis peta.

Kredensial browser akan terlihat oleh browser pengguna seperti semua implementasi Maps JavaScript API; pembatasan referrer dan API di atas tetap wajib.

## 2. Pasang di Vercel

Pada project **`gmit-betel-fuimelang`**, buka **Settings → Environment Variables** dan tambahkan:

- `VITE_GOOGLE_MAPS_API_KEY` = key yang baru dibuat.
- `VITE_GOOGLE_MAPS_MAP_ID` = Map ID production, atau biarkan kosong untuk marker standar.

Pilih environment **Production** (dan Preview/Development hanya jika referrer terkait sudah diizinkan). Simpan melalui dashboard, lalu lakukan **Redeploy** karena variabel `VITE_` disuntikkan saat build.

## 3. Verifikasi

1. Buka **Peta Pelayanan** dan pastikan peta serta marker gereja/rayon tampil.
2. Klik marker dan pastikan InfoWindow terbaca serta tombol rute bekerja.
3. Buka pengaturan rayon, pilih titik pada peta, simpan, lalu muat ulang untuk memastikan koordinat tersimpan.
4. Uji juga input manual. Koordinat harus berasal dari lokasi yang dipilih/diverifikasi pengguna; aplikasi tidak mengarang titik rayon.
5. Jika Google menolak key, periksa referrer, status billing, Maps JavaScript API, dan kuota pada Google Cloud Console. Jangan mengganti key dengan kredensial dari layanan lain.
