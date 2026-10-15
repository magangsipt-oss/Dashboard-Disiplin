# SiDisiplin

Struktur awal aplikasi SiDisiplin:

- `frontend/`: aplikasi web Next.js.
- `backend/`: REST API Express dan skema PostgreSQL melalui Prisma.

## Menjalankan frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Buka `http://localhost:3000`. Frontend meneruskan permintaan `/api/*` ke
backend lokal di `http://localhost:5000`. Jalankan backend terlebih dahulu
agar indikator koneksi API di portal menunjukkan status terhubung.

## Menjalankan backend

```powershell
cd backend
npm.cmd install
# Pastikan URL ketiga database sudah diatur di .env.
npm.cmd run dev
```

Backend berjalan di `http://localhost:5000`. Endpoint pemeriksaan:
`http://localhost:5000/api/health`.

Setelah PostgreSQL dan database utama aktif, tabel database utama dapat dibuat
dari folder `backend`:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:push
npm.cmd run prisma:seed
```

`prisma:seed` aman dijalankan berulang kali karena menggunakan `upsert`; data
dummy dengan identity yang sama akan diperbarui, bukan diduplikasi.

## Database mahasiswa terpisah

Buat database PostgreSQL bernama `Mahasiswa` melalui pgAdmin, lalu tambahkan
`MAHASISWA_DATABASE_URL` ke `backend/.env`. Contohnya:

```env
MAHASISWA_DATABASE_URL="postgresql://postgres:password@localhost:5432/Mahasiswa?schema=public"
```

Ganti nama pengguna dan kata sandi sesuai konfigurasi PostgreSQL lokal. Dari
folder `backend`, validasi skema dan buat tabel mahasiswa dengan:

```powershell
npm.cmd run prisma:mahasiswa:validate
npm.cmd run prisma:mahasiswa:generate
npm.cmd run prisma:mahasiswa:push
```

Nama `Mahasiswa` menggunakan huruf besar, jadi buat database persis dengan
nama tersebut di pgAdmin dan pastikan URL di `.env` juga berakhir dengan
`/Mahasiswa?schema=public`.

Tabel `Mahasiswa` memiliki kolom `id`, `NIM`, `Nama`, `Password`, `Jurusan`,
dan `timestamp`. `id` dibuat otomatis sebagai integer berurutan, `NIM`
bertipe integer, `Password` bertipe `VARCHAR(255)`, dan `timestamp` otomatis
diisi waktu pembuatan baris. Simpan password sebagai hash sebelum memasukkan
data akun sungguhan.

### Mengubah tipe tabel mahasiswa yang sudah berisi data

Jika tabel sudah dibuat dengan skema lama (ID UUID dan NIM text), **buat
backup database terlebih dahulu**. Jangan jalankan `prisma:mahasiswa:push`
sebelum migrasi ini karena konversi ID UUID tidak dapat dilakukan otomatis
tanpa kehilangan data.

Di pgAdmin, buka Query Tool yang terhubung ke database `Mahasiswa`, pastikan
`SELECT current_database();` mengembalikan `Mahasiswa`, lalu buka dan jalankan
isi `backend/prisma/mahasiswa-migrate-to-integer.sql`. Skrip ini memberi ID
berurutan baru kepada baris yang ada dan mengonversi NIM menjadi integer.
Setelah berhasil, dari folder `backend` jalankan:

```powershell
npm.cmd run prisma:mahasiswa:validate
npm.cmd run prisma:mahasiswa:generate
npm.cmd run prisma:mahasiswa:push
```

Skrip migrasi mensyaratkan semua NIM berisi angka dan tidak melebihi rentang
integer PostgreSQL (2.147.483.647). Jika ada data yang tidak memenuhi syarat,
migrasi akan gagal dan transaksinya dibatalkan tanpa menerapkan perubahan.

## Database dosen terpisah

Buat database PostgreSQL bernama `Dosen` melalui pgAdmin, lalu tambahkan
`DOSEN_DATABASE_URL` ke `backend/.env`. Gunakan host, port, username, dan
password PostgreSQL yang sama dengan database lokal lain, tetapi nama
database harus `Dosen`, misalnya:

```env
DOSEN_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/Dosen?schema=public"
```

Dari folder `backend`, validasi skema, buat Prisma Client, dan buat tabel
`Dosen` dengan:

```powershell
npm.cmd run prisma:dosen:validate
npm.cmd run prisma:dosen:generate
npm.cmd run prisma:dosen:push
```

Tabel `Dosen` memiliki `id` integer auto-increment, `NIDN` dan `NIP` bertipe
bigint, `Nama`, `Password` `VARCHAR(255)`, dan `timestamp` yang otomatis
mencatat waktu pembuatan baris. `NIDN` dan `NIP` harus unik. Kolom `id`
dibuat otomatis; simpan password sebagai hash, bukan teks biasa.

## Database kemahasiswaan/admin terpisah

Buat database PostgreSQL bernama `Kemahasiswaan` melalui pgAdmin, lalu
tambahkan `KEMAHASISWAAN_DATABASE_URL` ke `backend/.env`. Gunakan koneksi
PostgreSQL lokal yang sama, dengan nama database `Kemahasiswaan`, misalnya:

```env
KEMAHASISWAAN_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/Kemahasiswaan?schema=public"
```

Dari folder `backend`, validasi skema, generate Prisma Client, dan buat tabel
`Kemahasiswaan` dengan:

```powershell
npm.cmd run prisma:kemahasiswaan:validate
npm.cmd run prisma:kemahasiswaan:generate
npm.cmd run prisma:kemahasiswaan:push
```

Tabel `Kemahasiswaan` memiliki `id` integer auto-increment, `NIP` bertipe
bigint dan unik, `Nama`, `Password` `VARCHAR(255)`, serta `timestamp` yang
otomatis mencatat waktu pembuatan baris. Kolom `id` dibuat otomatis; simpan
password sebagai hash, bukan teks biasa.

### Login dan profil dashboard

Frontend mengirim login ke backend. Pilih peran di halaman awal, lalu masuk
menggunakan NIM mahasiswa, NIP/NIDN dosen, atau NIP kemahasiswaan dan password
yang tersimpan di database peran tersebut. Backend membuat sesi cookie
HttpOnly dan dashboard menampilkan profil dari database. Sesi aktif disimpan
di memori backend dan berakhir setelah 8 jam atau ketika backend dimulai ulang.

Password teks biasa yang sudah ada didukung untuk migrasi awal: setelah login
berhasil, backend langsung menggantinya dengan hash scrypt. Password yang sudah
di-hash harus memakai format internal `scrypt$...` yang dihasilkan backend.
Jangan kirim atau menampilkan password dalam respons API.

Database saat ini hanya memiliki data profil pengguna. Statistik poin,
presensi, SKPI, dan aktivitas pada dashboard masih data demo sampai tabel dan
API untuk data tersebut dibuat.

## Prisma

Pastikan PostgreSQL berjalan dan `DATABASE_URL` pada `backend/.env` benar,
lalu jalankan dari folder `backend`:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:validate
```

Jangan commit `backend/.env`; file tersebut berisi konfigurasi lokal dan kredensial database.
