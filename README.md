# MPLS SKOMDA TWIBBON 

[![Netlify Status](https://api.netlify.com/api/v1/badges/51e551d1-3232-4278-a486-343755681a6d/deploy-status)](https://app.netlify.com/sites/mpls-skomda-2024/deploys)

<!-- ![](public/template.png) -->
<img src="public/template.png" alt="image" width="300" height="300">  

---

# Twibbon
Twibbon adalah sebuah aplikasi yang memungkinkan pengguna untuk membuat dan berbagi twibbon digital yang unik dan kreatif. Aplikasi ini dirancang untuk memudahkan pengguna dalam membuat twibbon yang sesuai dengan kebutuhan mereka, dengan fitur-fitur seperti:
* Membuat twibbon dengan berbagai bentuk dan desain
* Mengunggah gambar dan teks untuk menyesuaikan twibbon
* Berbagi twibbon melalui media sosial dan platform lainnya

# Tujuan
Tujuan dari project Twibbon adalah untuk memberikan kemudahan dan kreativitas dalam membuat twibbon digital yang unik dan menarik. Kami berharap bahwa aplikasi ini dapat membantu pengguna dalam meningkatkan kesadaran dan promosi terhadap berbagai kegiatan dan acara.

# Backend API

Aplikasi ini sekarang dilengkapi dengan Express backend yang menyediakan API untuk manajemen frame twibbon oleh admin. Fitur backend meliputi:

* **Admin Authentication**: Autentikasi menggunakan Bearer token
* **Frame Management API**: Upload, update, dan hapus frame twibbon
* **AWS S3 Integration**: Penyimpanan frame dan metadata di S3
* **Static File Serving**: Melayani file frontend dari direktori public/

## Menjalankan Server

1. Copy file `.env.example` menjadi `.env` dan isi konfigurasi:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Jalankan server:
   ```bash
   npm run server
   ```

Server akan berjalan di `http://localhost:3000` (atau port yang dikonfigurasi di `.env`).

Untuk dokumentasi lengkap API, lihat [src/server/README.md](src/server/README.md).

# Kontribusi
Kami mengundang Anda untuk bergabung dan berkontribusi pada project Twibbon ini. Jika Anda memiliki ide atau kemampuan yang dapat membantu meningkatkan aplikasi ini, silakan bergabung dan berkontribusi melalui GitHub.