# SiDisiplin

Struktur awal aplikasi SiDisiplin:

- `frontend/`: aplikasi web Next.js.
- `backend/`: REST API Express dan skema PostgreSQL melalui Prisma.

## Menjalankan frontend

```powershell
cd frontend
npm install
npm run dev
```

Buka `http://localhost:3000`. Frontend meneruskan permintaan `/api/*` ke
backend lokal di `http://localhost:5000`. Jalankan backend terlebih dahulu
agar indikator koneksi API di portal menunjukkan status terhubung.

## Menjalankan backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Isi DATABASE_URL dan JWT_SECRET pada .env sebelum menghubungkan database.
npm run dev
```

Backend berjalan di `http://localhost:5000`. Endpoint pemeriksaan:
`http://localhost:5000/api/health`.

Setelah PostgreSQL aktif dan `DATABASE_URL` sudah diisi, buat tabel dan data
dummy dari folder `backend`:

```powershell
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

`prisma:seed` aman dijalankan berulang kali karena menggunakan `upsert`; data
dummy dengan identity yang sama akan diperbarui, bukan diduplikasi.

Login, data dashboard, dan formulir dalam UI saat ini adalah demo frontend;
belum terhubung ke autentikasi atau penyimpanan database.

## Prisma

Pastikan PostgreSQL berjalan dan `DATABASE_URL` pada `backend/.env` benar,
lalu jalankan dari folder `backend`:

```powershell
npm run prisma:generate
npm run prisma:validate
```

Jangan commit `backend/.env`; gunakan `.env.example` sebagai templat lokal.
