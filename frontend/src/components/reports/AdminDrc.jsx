"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ChevronDown, ClipboardCheck, FileText, Mail, Pencil, Trash2, Users } from "lucide-react";
import { jsonRequest, studentApi } from "@/lib/api";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { DrcActivityDetails, DrcThemeTable, drcThemes, drcTypeLabels, DrcSection } from "@/lib/drc";

const emptyForm = {
  judul: "Seminar Refreshment Kedisiplinan Mahasiswa",
  jenis: "SEMINAR",
  semester: "",
  tanggal: "",
  jamMulai: "08:00",
  jamSelesai: "12:00",
  lokasi: "",
  tema: drcThemes.map((item) => item.kode),
  deskripsi: "",
  targetProdi: [],
  targetAngkatan: [],
};

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";

function chipClass(selected) {
  return `rounded-xl px-3 py-2 text-sm font-bold ${
    selected ? "bg-red-800 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
  }`;
}

// Dropdown target: "Semua" = array kosong; mencentang item tertentu mempersempit target.
function TargetDropdown({ label, allLabel, emptyLabel, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (event.type === "keydown" ? event.key === "Escape" : !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function toggle(value) {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : options.filter((item) => item === value || selected.includes(item));
    // Semua item dicentang sama dengan "Semua".
    onChange(next.length === options.length ? [] : next);
  }

  const summary = selected.length === 0 ? allLabel : selected.join(", ");
  const rowClass = "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50";

  return (
    <div ref={containerRef} className="relative">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`${inputClass} flex items-center justify-between gap-2 bg-white text-left`}
      >
        <span className="truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-2">
          {selected.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">{selected.length} dipilih</span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <label className={`${rowClass} font-bold text-slate-900`}>
            <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} className="h-4 w-4 accent-red-800" />
            {allLabel}
          </label>
          {options.length > 0 && <div className="my-1 border-t border-slate-100" />}
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">{emptyLabel}</p>
          ) : (
            options.map((option) => (
              <label key={option} className={`${rowClass} text-slate-700`}>
                <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} className="h-4 w-4 accent-red-800" />
                {option}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Jumlah mahasiswa yang akan menerima pemberitahuan untuk target saat ini.
function useRecipientPreview(targetProdi, targetAngkatan) {
  const [preview, setPreview] = useState(null);
  const prodiKey = targetProdi.join(",");
  const angkatanKey = targetAngkatan.join(",");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ prodi: prodiKey, angkatan: angkatanKey });
    const timer = window.setTimeout(() => {
      studentApi(`/api/admin/drc/penerima?${params}`)
        .then((result) => active && setPreview(result))
        .catch(() => active && setPreview(null));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [prodiKey, angkatanKey]);

  return preview;
}

function formFromActivity(activity) {
  return {
    judul: activity.judul,
    jenis: activity.jenis,
    semester: activity.semester,
    tanggal: activity.tanggal,
    jamMulai: activity.jamMulai,
    jamSelesai: activity.jamSelesai,
    lokasi: activity.lokasi,
    tema: activity.tema,
    deskripsi: activity.deskripsi ?? "",
    targetProdi: activity.targetProdi ?? [],
    targetAngkatan: activity.targetAngkatan ?? [],
  };
}

function describeNotification(notifikasi, action) {
  if (!notifikasi?.penerima) return `Kegiatan DRC berhasil ${action}.`;
  return `Kegiatan DRC berhasil ${action}. Pemberitahuan dikirim ke ${notifikasi.penerima} mahasiswa (${notifikasi.denganEmail} lewat email).`;
}

function DrcForm({ editing, options, onSaved, onCancel }) {
  const [form, setForm] = useState(editing ? formFromActivity(editing) : emptyForm);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const preview = useRecipientPreview(form.targetProdi, form.targetAngkatan);
  const willNotify = !editing || notifyStudents;
  // Target lama yang tersimpan tetap ditampilkan walau sudah tidak ada di database.
  const prodiChoices = [...new Set([...options.prodi, ...form.targetProdi])].sort((a, b) => a.localeCompare(b, "id"));
  const angkatanChoices = [...new Set([...options.angkatan, ...form.targetAngkatan])].sort((a, b) => b - a);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleTheme(kode) {
    setForm((current) => ({
      ...current,
      tema: current.tema.includes(kode)
        ? current.tema.filter((item) => item !== kode)
        : drcThemes.map((item) => item.kode).filter((item) => item === kode || current.tema.includes(item)),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (form.tema.length === 0) {
      setError("Pilih minimal satu tema DRC.");
      return;
    }
    if (form.jamMulai >= form.jamSelesai) {
      setError("Jam selesai harus setelah jam mulai.");
      return;
    }
    if (
      willNotify &&
      preview?.penerima === 0 &&
      !window.confirm("Belum ada mahasiswa yang cocok dengan prodi/angkatan yang dipilih, jadi tidak ada yang menerima pemberitahuan. Tetap simpan?")
    ) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const result = editing
        ? await studentApi(`/api/admin/drc/${editing.id}`, jsonRequest("PATCH", { ...form, beritahuMahasiswa: notifyStudents }))
        : await studentApi("/api/admin/drc", jsonRequest("POST", form));
      await onSaved(describeNotification(result.notifikasi, editing ? "diperbarui" : "ditambahkan"));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{editing ? "Ubah Kegiatan DRC" : "Tambah Kegiatan DRC"}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {editing
            ? "Perbarui informasi kegiatan. Mahasiswa dapat diberi tahu tentang perubahannya."
            : "Setelah disimpan, mahasiswa sesuai prodi dan angkatan yang dipilih langsung menerima pemberitahuan di portal dan email."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Judul kegiatan
          <input required minLength={3} maxLength={200} value={form.judul} onChange={(event) => update("judul", event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Jenis kegiatan
          <select value={form.jenis} onChange={(event) => update("jenis", event.target.value)} className={inputClass}>
            {Object.entries(drcTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Semester
          <input required minLength={3} maxLength={50} placeholder="Ganjil 2026/2027" value={form.semester} onChange={(event) => update("semester", event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Tanggal
          <input type="date" required value={form.tanggal} onChange={(event) => update("tanggal", event.target.value)} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-slate-700">
            Jam mulai (WITA)
            <input type="time" required value={form.jamMulai} onChange={(event) => update("jamMulai", event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Jam selesai (WITA)
            <input type="time" required value={form.jamSelesai} onChange={(event) => update("jamSelesai", event.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Lokasi
          <input required minLength={3} maxLength={200} placeholder="Auditorium Kampus" value={form.lokasi} onChange={(event) => update("lokasi", event.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="space-y-4 rounded-xl border border-red-100 bg-red-50/40 p-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Peserta wajib & penerima pemberitahuan</h4>
          <p className="mt-0.5 text-xs text-slate-600">Hanya mahasiswa dari prodi dan angkatan yang dipilih yang wajib ikut dan menerima pemberitahuan.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TargetDropdown
            label="Program studi"
            allLabel="Semua prodi"
            emptyLabel="Belum ada data prodi mahasiswa."
            options={prodiChoices}
            selected={form.targetProdi}
            onChange={(value) => update("targetProdi", value)}
          />
          <TargetDropdown
            label="Angkatan"
            allLabel="Semua angkatan"
            emptyLabel="Belum ada data angkatan mahasiswa."
            options={angkatanChoices}
            selected={form.targetAngkatan}
            onChange={(value) => update("targetAngkatan", value)}
          />
        </div>
        {preview && (
          <p className={`flex items-center gap-2 text-sm font-semibold ${preview.penerima === 0 ? "text-amber-800" : "text-slate-700"}`}>
            <Users className="h-4 w-4" />
            {preview.penerima === 0
              ? "Belum ada mahasiswa yang cocok dengan pilihan ini."
              : `${preview.penerima} mahasiswa cocok (${preview.denganEmail} memiliki email).`}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">Tema yang dibahas</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {drcThemes.map((item) => {
            const selected = form.tema.includes(item.kode);
            return (
              <button
                key={item.kode}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTheme(item.kode)}
                className={chipClass(selected)}
              >
                {item.tema}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block text-sm font-semibold text-slate-700">
        Keterangan tambahan (opsional)
        <textarea
          rows={3}
          maxLength={2000}
          placeholder="Contoh: wajib membawa KTM dan alat tulis, memakai seragam lengkap."
          value={form.deskripsi}
          onChange={(event) => update("deskripsi", event.target.value)}
          className={inputClass}
        />
      </label>

      {editing && (
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={notifyStudents} onChange={(event) => setNotifyStudents(event.target.checked)} className="h-4 w-4 accent-red-800" />
          Beri tahu mahasiswa peserta tentang perubahan ini (portal + email)
        </label>
      )}

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {editing && (
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Batal
          </button>
        )}
        <button type="submit" disabled={isSaving} className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60">
          {isSaving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan & Umumkan"}
        </button>
      </div>
    </form>
  );
}

function formatUploadTime(value) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

// Peserta wajib: siapa yang sudah mengunggah bukti kehadiran dan siapa yang tidak.
function DrcParticipants({ activity }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("hadir");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    studentApi(`/api/admin/drc/${activity.id}/peserta`)
      .then((result) => active && setData(result))
      .catch((loadError) => active && setError(loadError.message));
    return () => {
      active = false;
    };
  }, [activity.id]);

  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>;
  if (!data) return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Memuat peserta...</p>;

  const absentLabel = activity.sudahLewat ? "Tidak mengikuti" : "Belum unggah bukti";
  const keyword = search.trim().toLowerCase();
  const rows = (tab === "hadir" ? data.sudahUnggah : data.belumUnggah).filter(
    (student) => !keyword || student.nama.toLowerCase().includes(keyword) || String(student.nim).includes(keyword),
  );
  const tabClass = (selected) =>
    `rounded-xl px-3 py-2 text-sm font-bold ${selected ? "bg-red-800 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={tab === "hadir"} onClick={() => setTab("hadir")} className={tabClass(tab === "hadir")}>
            Sudah unggah bukti ({data.sudahUnggah.length})
          </button>
          <button type="button" aria-pressed={tab === "absen"} onClick={() => setTab("absen")} className={tabClass(tab === "absen")}>
            {absentLabel} ({data.belumUnggah.length})
          </button>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama atau NIM"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-60"
        />
      </div>
      <p className="text-xs text-slate-500">{data.jumlahTarget} mahasiswa wajib mengikuti kegiatan ini.</p>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {keyword ? "Tidak ada mahasiswa yang cocok." : tab === "hadir" ? "Belum ada bukti yang diunggah." : "Semua peserta sudah mengunggah bukti."}
        </p>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">NIM</th>
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">Prodi / Angkatan</th>
                {tab === "hadir" && <th className="px-3 py-2">Diunggah</th>}
                {tab === "hadir" && <th className="px-3 py-2 text-right">Bukti</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((student) => (
                <tr key={student.id}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-700">{student.nim}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">
                    {student.nama}
                    {student.diluarTarget && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">di luar target</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{student.jurusan} · {student.angkatan ?? "-"}</td>
                  {tab === "hadir" && (
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {formatUploadTime(student.bukti.updatedAt)}
                      {student.bukti.catatan && <p className="text-slate-500">{student.bukti.catatan}</p>}
                    </td>
                  )}
                  {tab === "hadir" && (
                    <td className="px-3 py-2 text-right">
                      <a href={`/api/drc/bukti/${student.bukti.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-red-800 hover:underline">
                        <FileText className="h-3.5 w-3.5" /> Lihat
                      </a>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminDrcCard({ activity, onEdit, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const message = activity.sudahLewat
      ? `Hapus kegiatan "${activity.judul}"?`
      : `Hapus kegiatan "${activity.judul}"? Mahasiswa peserta akan menerima pemberitahuan pembatalan.`;
    if (!window.confirm(message)) return;
    setIsDeleting(true);
    setError("");
    try {
      const result = await studentApi(`/api/admin/drc/${activity.id}`, { method: "DELETE" });
      await onDeleted(
        result.notifikasi?.penerima
          ? `Kegiatan DRC dihapus. Pemberitahuan pembatalan dikirim ke ${result.notifikasi.penerima} mahasiswa.`
          : "Kegiatan DRC dihapus.",
      );
    } catch (deleteError) {
      setError(deleteError.message);
      setIsDeleting(false);
    }
  }

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {drcTypeLabels[activity.jenis] ?? activity.jenis} · Semester {activity.semester}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{activity.judul}</h3>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${activity.sudahLewat ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>
          {activity.sudahLewat ? "Selesai" : "Akan datang"}
        </span>
      </div>
      <DrcActivityDetails activity={activity} />
      {showParticipants && <DrcParticipants activity={activity} />}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          aria-expanded={showParticipants}
          onClick={() => setShowParticipants((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <ClipboardCheck className="h-4 w-4" /> {showParticipants ? "Tutup Peserta" : "Peserta & Bukti"}
        </button>
        <button type="button" onClick={() => onEdit(activity)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <Pencil className="h-4 w-4" /> Ubah
        </button>
        <button type="button" disabled={isDeleting} onClick={remove} className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-60">
          <Trash2 className="h-4 w-4" /> {isDeleting ? "Menghapus..." : "Hapus"}
        </button>
      </div>
    </article>
  );
}

export default function AdminDrc() {
  const [data, setData] = useState({
    kegiatan: [],
    pilihan: { prodi: [], angkatan: [] },
    jumlahMahasiswa: 0,
    jumlahMahasiswaEmail: 0,
  });
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadActivities() {
    setError("");
    try {
      setData(await studentApi("/api/admin/drc"));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useAutoRefresh(loadActivities);

  useEffect(() => {
    let active = true;
    studentApi("/api/admin/drc")
      .then((result) => active && setData(result))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleChanged(message) {
    setSuccess(message);
    setEditing(null);
    setFormKey((key) => key + 1);
    await loadActivities();
  }

  function startEditing(activity) {
    setSuccess("");
    setEditing(activity);
    setFormKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const upcoming = data.kegiatan.filter((activity) => !activity.sudahLewat);
  const past = data.kegiatan.filter((activity) => activity.sudahLewat);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="rounded-3xl bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#991b1b] p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Kemahasiswaan</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">DRC – Disiplin Refresh Competency</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100">
          Umumkan seminar atau kegiatan DRC yang wajib diikuti mahasiswa setiap awal semester. Pilih prodi dan angkatan peserta; mereka langsung menerima pemberitahuan portal dan email.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <Users className="h-4 w-4" /> {data.jumlahMahasiswa} mahasiswa terdaftar
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <Mail className="h-4 w-4" /> {data.jumlahMahasiswaEmail} memiliki email
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <CalendarPlus className="h-4 w-4" /> {upcoming.length} kegiatan akan datang
          </span>
        </div>
      </header>

      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <DrcForm key={formKey} editing={editing} options={data.pilihan} onSaved={handleChanged} onCancel={() => startEditing(null)} />

      <DrcSection title="Garis Besar Materi DRC" description="Lima tema kedisiplinan yang menjadi dasar setiap kegiatan DRC.">
        <DrcThemeTable />
      </DrcSection>

      <DrcSection title="Kegiatan Akan Datang" description="Kegiatan yang sedang atau akan berlangsung beserta peserta wajibnya.">
        {isLoading ? (
          <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Memuat kegiatan DRC...</p>
        ) : upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
            Belum ada kegiatan DRC yang dijadwalkan.
          </p>
        ) : (
          upcoming.map((activity) => (
            <AdminDrcCard key={activity.id} activity={activity} onEdit={startEditing} onDeleted={handleChanged} />
          ))
        )}
      </DrcSection>

      {past.length > 0 && (
        <DrcSection title="Riwayat Kegiatan" description="Kegiatan DRC yang sudah selesai.">
          {past.map((activity) => (
            <AdminDrcCard key={activity.id} activity={activity} onEdit={startEditing} onDeleted={handleChanged} />
          ))}
        </DrcSection>
      )}
    </section>
  );
}
