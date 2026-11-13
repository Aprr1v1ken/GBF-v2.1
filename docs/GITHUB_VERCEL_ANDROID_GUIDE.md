# Panduan Sinkronisasi GitHub, Vercel & Instalasi Aplikasi Android (PWA)

Dokumen ini menjelaskan langkah praktis menyinkronkan aplikasi **SYSJEGER V2.1 Pro (GMIT Betel Fuimelang)** ke repositori GitHub, melakukan deploy ke Vercel, lalu memasangnya langsung sebagai aplikasi Android di HP Anda dan HP Majelis/Admin lainnya.

---

## 1. Unggah (Push) Proyek ke GitHub

1. Buka terminal pada folder root proyek ini di komputer Anda:
   ```bash
   git init
   git add .
   git commit -m "feat: piramida usia Recharts, sinkronisasi offline/online, siap Vercel & Android PWA"
   ```
2. Buat repositori baru di **GitHub** (misalnya `gmit-betel-fuimelang`), lalu hubungkan dan push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<USERNAME_GITHUB_ANDA>/<NAMA_REPO>.git
   git push -u origin main
   ```
3. Workflow GitHub Actions (`.github/workflows/ci-vercel-check.yml`) akan otomatis memverifikasi TypeScript (`npm run lint`), tes otomatis (`tsx --test tests/*.test.ts`), dan build produksi (`npm run build`) setiap kali ada push baru.

---

## 2. Hubungkan & Deploy ke Vercel (Gratis / Otomatis)

1. Buka [https://vercel.com/new](https://vercel.com/new) lalu pilih **Import Git Repository** dari GitHub Anda.
2. Vercel otomatis membaca `vercel.json` dan `package.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Node.js Version**: `22.x` (sudah dikunci di `package.json`)
   - **API Serverless**: `/api/*` otomatis dijalankan oleh `api/index.ts`.
3. **(Disarankan untuk Data Permanen Multi-Perangkat)**: Pada dashboard Vercel > **Project Settings > Environment Variables**, tambahkan:
   - `POSTGRES_URL` = URL database PostgreSQL/Supabase Anda (jika ingin snapshot database server tersimpan permanen antar cold-start Vercel)
   - `SYSJEGER_USE_POSTGRES` = `true`
   - `SESSION_SECRET` = string acak panjang rahasia gereja
   - `GEMINI_API_KEY` = (opsional, untuk fitur AI Rohani)
4. Klik **Deploy**. Setelah selesai, Anda akan mendapatkan tautan HTTPS resmi seperti:
   `https://<nama-proyek-anda>.vercel.app`

> **Catatan**: Google Firebase (`gen-lang-client-0429448286`) juga telah terkonfigurasi dengan `persistentLocalCache` agar admin yang masuk menggunakan **Akun Google (Firebase)** mendapat sinkronisasi awan multi-perangkat (HP Android <-> Laptop) secara otomatis.

---

## 3. Pasang Langsung di HP Android Anda & HP Admin Lain

Setelah URL Vercel (`https://....vercel.app`) aktif:

1. Bagikan URL tersebut ke grup Majelis / Admin (tombol **Salin URL** & **Kirim WA** juga tersedia langsung di menu **Pengaturan Sistem** di dalam aplikasi).
2. Buka tautan tersebut menggunakan **Google Chrome** di HP Android.
3. Ketuk tombol **"Instal Aplikasi"** di bilah atas atau di halaman **Pengaturan**, *atau* ketuk menu **Titik Tiga (⋮)** di pojok kanan atas Chrome → pilih **"Instal Aplikasi" / "Tambahkan ke Layar Utama"**.
4. Ikon resmi **SYSJEGER GMIT Betel Fuimelang** akan terpasang langsung di layar utama HP Android dan berjalan layar penuh (*standalone*) seperti aplikasi Android native, dengan dukungan **Offline Mode + Auto-Sync**.

### Jika Ingin Membuat File `.apk` via Appmint / Web2Apk
Anda juga dapat mengunduh paket ZIP bersih dari `/gmit-betel-fuimelang.zip` (atau tombol unduh di menu **Pengaturan**) dan mengisi kolom **URL server yang sudah Anda deploy** pada Appmint dengan URL Vercel Anda (`https://<nama-proyek-anda>.vercel.app`).
