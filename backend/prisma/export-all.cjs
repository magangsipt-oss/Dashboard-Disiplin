const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function exportDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found in .env');
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('Connected to PostgreSQL database...');

  // 1. Fetch Mahasiswa
  const resMhs = await client.query('SELECT * FROM "Mahasiswa" ORDER BY "ID" ASC');
  const mahasiswaRows = resMhs.rows;

  // 2. Fetch Dosen
  const resDosen = await client.query('SELECT * FROM "Dosen" ORDER BY "ID" ASC');
  const dosenRows = resDosen.rows;

  // 3. Fetch Kemahasiswaan
  const resKem = await client.query('SELECT * FROM "Kemahasiswaan" ORDER BY "ID" ASC');
  const kemahasiswaanRows = resKem.rows;

  // 4. Fetch Akademik
  const resAka = await client.query('SELECT * FROM "Akademik" ORDER BY "ID" ASC');
  const akademikRows = resAka.rows;

  // 5. Fetch PerubahanPoin
  let pointChangeRows = [];
  try {
    const resPoin = await client.query('SELECT * FROM "PerubahanPoin" ORDER BY "id" ASC');
    pointChangeRows = resPoin.rows;
  } catch (e) {
    console.log('PerubahanPoin query skipped:', e.message);
  }

  // 6. Fetch Permohonan_DPA
  let advisorRequestRows = [];
  try {
    const resAdv = await client.query('SELECT * FROM "Permohonan_DPA" ORDER BY "ID" ASC');
    advisorRequestRows = resAdv.rows;
  } catch (e) {
    console.log('Permohonan_DPA query skipped:', e.message);
  }

  await client.end();

  const exportedAt = new Date().toISOString();

  // Map to standard transfer-data snapshot format
  const mahasiswaSnapshot = mahasiswaRows.map((r) => ({
    id: r.ID,
    nim: r.NIM,
    nama: r.Nama_Lengkap || r.Nama,
    noHandphone: r.No_Handphone || null,
    email: r.Email || null,
    password: r.Password,
    jurusan: r.PRODI || r.Jurusan,
    angkatan: r.Angkatan !== null && r.Angkatan !== undefined ? Number(r.Angkatan) : null,
    namaSmta: r.Nama_SMTA || null,
    pointScore: r.Poin !== null && r.Poin !== undefined ? Number(r.Poin) : 100,
    timestamp: r.Timestamp ? new Date(r.Timestamp).toISOString() : exportedAt,
  }));

  const dosenSnapshot = dosenRows.map((r) => ({
    id: r.ID,
    email: r.Email || null,
    nuptk: r.NUPTK ? String(r.NUPTK) : null,
    nidn: r.NIDN ? String(r.NIDN) : r.NUPTK ? String(r.NUPTK) : "0",
    nip: r.NIP ? String(r.NIP) : r.NUPTK ? String(r.NUPTK) : "0",
    nama: r.Nama,
    password: r.Password,
    timestamp: r.Timestamp ? new Date(r.Timestamp).toISOString() : exportedAt,
  }));

  const kemahasiswaanSnapshot = kemahasiswaanRows.map((r) => ({
    id: r.ID,
    email: r.Email || null,
    nama: r.Nama,
    password: r.Password,
    timestamp: r.Timestamp ? new Date(r.Timestamp).toISOString() : exportedAt,
  }));

  const akademikSnapshot = akademikRows.map((r) => ({
    id: r.ID,
    email: r.Email || null,
    nama: r.Nama,
    password: r.Password,
    timestamp: r.Timestamp ? new Date(r.Timestamp).toISOString() : exportedAt,
  }));

  const pointChangesSnapshot = pointChangeRows.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    type: r.type,
    delta: r.delta,
    scoreAfter: r.scoreAfter,
    reason: r.reason,
    recordedByIdentity: r.recordedByIdentity,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : exportedAt,
  }));

  const advisorRequestsSnapshot = advisorRequestRows.map((r) => ({
    id: r.ID || r.id,
    studentId: r.Mahasiswa_ID || r.studentId,
    dosenId: r.Dosen_ID || r.dosenId,
    status: r.Status || r.status,
    createdAt: r.Pengajuan || r.createdAt ? new Date(r.Pengajuan || r.createdAt).toISOString() : exportedAt,
    reviewedAt: r.Di_Setujui || r.reviewedAt ? new Date(r.Di_Setujui || r.reviewedAt).toISOString() : null,
  }));

  // Helper to stringify rows for raw tables format
  function formatTableRows(rows) {
    return rows.map((r) => {
      const formatted = { ...r };
      for (const k of Object.keys(formatted)) {
        if (formatted[k] instanceof Date) {
          formatted[k] = formatted[k].toISOString();
        } else if (typeof formatted[k] === 'bigint') {
          formatted[k] = formatted[k].toString();
        }
      }
      return formatted;
    });
  }

  const output = {
    formatVersion: 4,
    exportedAt,
    sourceDatabase: 'dashboard_disiplin',
    mahasiswa: mahasiswaSnapshot,
    dosen: dosenSnapshot,
    kemahasiswaan: kemahasiswaanSnapshot,
    akademik: akademikSnapshot,
    pointChanges: pointChangesSnapshot,
    advisorRequests: advisorRequestsSnapshot,
    tables: {
      Mahasiswa: {
        columns: resMhs.fields.map((f) => f.name),
        rows: formatTableRows(mahasiswaRows),
      },
      PerubahanPoin: {
        columns: pointChangeRows.length > 0 ? Object.keys(pointChangeRows[0]) : ['id', 'studentId', 'type', 'delta', 'scoreAfter', 'reason', 'recordedByIdentity', 'createdAt'],
        rows: formatTableRows(pointChangeRows),
      },
      Dosen: {
        columns: resDosen.fields.map((f) => f.name),
        rows: formatTableRows(dosenRows),
      },
      Kemahasiswaan: {
        columns: resKem.fields.map((f) => f.name),
        rows: formatTableRows(kemahasiswaanRows),
      },
      Akademik: {
        columns: resAka.fields.map((f) => f.name),
        rows: formatTableRows(akademikRows),
      },
    },
  };

  const targetPath = path.resolve(__dirname, 'database-data.json');
  fs.writeFileSync(targetPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`Database exported successfully to ${targetPath}`);
  console.log(`Summary:`);
  console.log(`- Mahasiswa: ${mahasiswaSnapshot.length} rows`);
  console.log(`- Dosen: ${dosenSnapshot.length} rows`);
  console.log(`- Kemahasiswaan: ${kemahasiswaanSnapshot.length} rows`);
  console.log(`- Akademik: ${akademikSnapshot.length} rows`);
  console.log(`- PerubahanPoin: ${pointChangesSnapshot.length} rows`);
  console.log(`- Permohonan_DPA: ${advisorRequestsSnapshot.length} rows`);
}

exportDatabase().catch(console.error);

