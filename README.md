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

Buka `http://localhost:3000`.

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

## Prisma

Pastikan PostgreSQL berjalan dan `DATABASE_URL` pada `backend/.env` benar,
lalu jalankan dari folder `backend`:

```powershell
npm run prisma:generate
npm run prisma:validate
```

Jangan commit `backend/.env`; gunakan `.env.example` sebagai templat lokal.
