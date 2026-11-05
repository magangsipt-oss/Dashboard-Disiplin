"use client";

import { useEffect, useState } from "react";
import { History, Pencil, Plus, Scale, Search } from "lucide-react";
import { jsonRequest, studentApi } from "@/lib/api";

// Bobot di API selalu angka negatif (mis. -25 = poin berkurang 25).
const policySeverities = ["RINGAN", "SEDANG", "BERAT"];

const severityBadges = {
  RINGAN: "bg-amber-100 text-amber-900",
  SEDANG: "bg-orange-100 text-orange-900",
  BERAT: "bg-red-100 text-red-800",
  SANGAT_BERAT: "bg-red-700 text-white",
};

const auditActionLabels = {
  ATURAN_POIN_DITAMBAH: "Jenis pelanggaran ditambah",
  ATURAN_POIN_DIUBAH: "Jenis pelanggaran diubah",
  BOBOT_TINGKAT_DIUBAH: "Bobot standar tingkat diubah",
};

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal";

function formatDateTime(value) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function describeChange(entry, severityLabels) {
  const before = entry.nilaiLama ?? {};
  const after = entry.nilaiBaru ?? {};
  const parts = [];
  if (!entry.nilaiLama) {
    return `${after.nama ?? ""} · ${severityLabels[after.severity] ?? after.severity} · ${after.bobotPoin} poin`;
  }
  if (before.nama !== after.nama && after.nama !== undefined) parts.push(`nama "${before.nama}" → "${after.nama}"`);
  if (before.severity !== after.severity) {
    parts.push(`tingkat ${severityLabels[before.severity] ?? before.severity} → ${severityLabels[after.severity] ?? after.severity}`);
  }
  if (before.bobotPoin !== after.bobotPoin) parts.push(`pengurangan ${before.bobotPoin} → ${after.bobotPoin} poin`);
  if (before.aktif !== after.aktif) parts.push(after.aktif ? "diaktifkan" : "dinonaktifkan");
  const subject = after.nama ?? `${severityLabels[after.severity] ?? after.severity}`;
  return `${subject}: ${parts.join(", ") || "tidak ada perubahan nilai"}`;
}

function RuleEditor({ rule, severityLabels, onSaved, onCancel }) {
  const [name, setName] = useState(rule.nama);
  const [severity, setSeverity] = useState(rule.severity);
  const [weight, setWeight] = useState(String(rule.bobotPoin));
  const [active, setActive] = useState(rule.aktif);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const weightValue = Number(weight);
  const isWeightValid = Number.isInteger(weightValue) && weightValue <= -1 && weightValue >= -100;

  async function submit(event) {
    event.preventDefault();
    const changes = {
      ...(name.trim() !== rule.nama ? { nama: name.trim() } : {}),
      ...(severity !== rule.severity ? { severity } : {}),
      ...(weightValue !== rule.bobotPoin ? { bobotPoin: weightValue } : {}),
      ...(active !== rule.aktif ? { aktif: active } : {}),
    };
    if (Object.keys(changes).length === 0) {
      setError("Belum ada perubahan yang disimpan.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await studentApi(`/api/admin/poin/aturan/${rule.id}`, jsonRequest("PATCH", { ...changes, alasan: reason }));
      await onSaved(`Aturan "${name.trim()}" diperbarui.`);
    } catch (saveError) {
      setError(saveError.message);
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Nama pelanggaran
          <input required minLength={3} maxLength={200} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Tingkat
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} className={inputClass}>
            {policySeverities.map((value) => (
              <option key={value} value={value}>{severityLabels[value] ?? value}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Pengurangan poin
          <input
            type="number"
            required
            min={-100}
            max={-1}
            step={1}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className={inputClass}
          />
          <span className={`mt-1 block text-xs font-normal ${isWeightValid ? "text-slate-600" : "text-red-700"}`}>
            {isWeightValid ? `Poin berkurang ${Math.abs(weightValue)}.` : "Isi angka negatif -1 s.d. -100."}
          </span>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-red-800" />
        Aktif (dapat dipilih Dosen PA saat konfirmasi laporan)
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Alasan perubahan
        <textarea
          required
          minLength={5}
          maxLength={1000}
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Contoh: menyesuaikan keputusan rapat Kemahasiswaan tanggal ..."
          className={inputClass}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSaving || !isWeightValid}
          className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "Menyimpan..." : "Simpan perubahan"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          Batal
        </button>
      </div>
    </form>
  );
}

function NewRuleForm({ pillar, levels, severityLabels, onSaved, onCancel }) {
  const defaultWeightFor = (value) => String(levels.find((level) => level.severity === value)?.bobotPoin ?? -5);
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState("RINGAN");
  const [weight, setWeight] = useState(defaultWeightFor("RINGAN"));
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const weightValue = Number(weight);
  const isWeightValid = Number.isInteger(weightValue) && weightValue <= -1 && weightValue >= -100;

  async function submit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await studentApi(
        "/api/admin/poin/aturan",
        jsonRequest("POST", { pillar, nama: name.trim(), severity, bobotPoin: weightValue, alasan: reason }),
      );
      await onSaved(`Jenis pelanggaran "${name.trim()}" ditambahkan.`);
    } catch (saveError) {
      setError(saveError.message);
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-dashed border-red-300 bg-white p-4">
      <p className="text-sm font-bold text-slate-900">Tambah jenis pelanggaran</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Nama pelanggaran
          <input required minLength={3} maxLength={200} value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Plagiarisme" className={inputClass} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Tingkat
          <select
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value);
              setWeight(defaultWeightFor(event.target.value));
            }}
            className={inputClass}
          >
            {policySeverities.map((value) => (
              <option key={value} value={value}>{severityLabels[value] ?? value}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Pengurangan poin
          <input type="number" required min={-100} max={-1} step={1} value={weight} onChange={(event) => setWeight(event.target.value)} className={inputClass} />
          <span className="mt-1 block text-xs font-normal text-slate-600">Awalnya mengikuti bobot standar tingkat.</span>
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Alasan penambahan
        <textarea required minLength={5} maxLength={1000} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
      </label>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSaving || !isWeightValid}
          className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "Menyimpan..." : "Tambah"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          Batal
        </button>
      </div>
    </form>
  );
}

function LevelWeight({ level, severityLabels, onSaved }) {
  const [isEditing, setIsEditing] = useState(false);
  const [weight, setWeight] = useState(String(level.bobotPoin));
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const weightValue = Number(weight);
  const isWeightValid = Number.isInteger(weightValue) && weightValue <= -1 && weightValue >= -100;

  async function submit(event) {
    event.preventDefault();
    if (weightValue === level.bobotPoin) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await studentApi(`/api/admin/poin/tingkat/${level.id}`, jsonRequest("PATCH", { bobotPoin: weightValue, alasan: reason }));
      await onSaved(`Bobot standar tingkat ${severityLabels[level.severity]} diperbarui.`);
    } catch (saveError) {
      setError(saveError.message);
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-slate-500">{severityLabels[level.severity]}</p>
          <p className="text-lg font-extrabold text-slate-900">{level.bobotPoin}</p>
        </div>
        <button type="button" onClick={() => setIsEditing(true)} title="Ubah bobot standar" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-800">
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
      <label className="block text-xs font-semibold text-slate-700">
        {severityLabels[level.severity]}
        <input type="number" required min={-100} max={-1} value={weight} onChange={(event) => setWeight(event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold text-slate-700">
        Alasan
        <input required minLength={5} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
      </label>
      {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isSaving || !isWeightValid} className="rounded-lg bg-red-800 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-400">
          {isSaving ? "..." : "Simpan"}
        </button>
        <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
          Batal
        </button>
      </div>
    </form>
  );
}

export default function AdminPointRules() {
  const [data, setData] = useState(null);
  const [activePillar, setActivePillar] = useState("WAKTU");
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadRules() {
    setIsLoading(true);
    setError("");
    try {
      setData(await studentApi("/api/admin/poin/aturan"));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    studentApi("/api/admin/poin/aturan")
      .then((result) => active && setData(result))
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleSaved(message) {
    setEditingId(null);
    setIsAdding(false);
    await loadRules();
    setNotice(message);
  }

  function changePillar(pillar) {
    setActivePillar(pillar);
    setEditingId(null);
    setIsAdding(false);
    setNotice("");
  }

  const severityLabels = data?.tingkatLabel ?? {};
  const categories = data?.kategori ?? [];
  const rules = (data?.aturan ?? []).filter((rule) => rule.pillar === activePillar);
  const levels = (data?.tingkat ?? []).filter((level) => level.pillar === activePillar);
  const activeCategory = categories.find((category) => category.kode === activePillar);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-6 py-8">
      <header className="rounded-3xl bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#991b1b] p-6 text-white shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Kemahasiswaan</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Pengaturan Pengurangan Poin</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-red-100">
          Tetapkan besar pengurangan poin untuk setiap jenis pelanggaran pada 5 kategori budaya disiplin. Dosen PA memilih jenis pelanggaran ini saat mengonfirmasi laporan, dan poin mahasiswa berkurang sesuai nilai yang berlaku pada saat itu.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <Scale className="h-4 w-4" /> {(data?.aturan ?? []).filter((rule) => rule.aktif).length} jenis pelanggaran aktif
          </span>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {categories.map((category, index) => (
          <button
            key={category.kode}
            type="button"
            onClick={() => changePillar(category.kode)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              activePillar === category.kode
                ? "bg-red-800 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {String(index + 1).padStart(2, "0")} {category.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      {isLoading && !data ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Memuat pengaturan pengurangan poin...</p>
      ) : (
        data && (
          <>
            <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Kategori pelanggaran</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{activeCategory?.label}</h3>
                </div>
                {!isAdding && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(true);
                      setEditingId(null);
                      setNotice("");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900"
                  >
                    <Plus className="h-4 w-4" /> Tambah jenis pelanggaran
                  </button>
                )}
              </div>

              {isAdding && (
                <NewRuleForm
                  pillar={activePillar}
                  levels={levels}
                  severityLabels={severityLabels}
                  onSaved={handleSaved}
                  onCancel={() => setIsAdding(false)}
                />
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Jenis pelanggaran</th>
                      <th className="px-4 py-3">Tingkat</th>
                      <th className="px-4 py-3">Pengurangan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Dipakai</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rules.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada jenis pelanggaran pada kategori ini.</td>
                      </tr>
                    )}
                    {rules.map((rule) =>
                      editingId === rule.id ? (
                        <tr key={rule.id}>
                          <td colSpan={6} className="p-3">
                            <RuleEditor
                              rule={rule}
                              severityLabels={severityLabels}
                              onSaved={handleSaved}
                              onCancel={() => setEditingId(null)}
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr key={rule.id} className={rule.aktif ? "" : "bg-slate-50 text-slate-500"}>
                          <td className="px-4 py-3 font-semibold text-slate-900">{rule.nama}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${severityBadges[rule.severity] ?? "bg-slate-100 text-slate-700"}`}>
                              {severityLabels[rule.severity] ?? rule.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-base font-extrabold text-red-800">{rule.bobotPoin}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${rule.aktif ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>
                              {rule.aktif ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{rule.jumlahDipakai} laporan</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(rule.id);
                                setIsAdding(false);
                                setNotice("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Ubah
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 rounded-xl bg-slate-50/60 p-4">
                <p className="text-sm font-bold text-slate-900">Bobot standar tingkat</p>
                <p className="text-xs text-slate-600">
                  Dipakai sebagai nilai awal saat menambah jenis pelanggaran baru
                  {activePillar === "WAKTU" && " dan untuk potongan ketidakhadiran dari upload absensi Akademik (1 Alpa = Sedang, 2 Alpa atau lebih = Berat)"}.
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {levels.map((level) => (
                    <LevelWeight key={level.id} level={level} severityLabels={severityLabels} onSaved={handleSaved} />
                  ))}
                </div>
              </div>
            </article>

            <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <History className="h-5 w-5 text-red-800" /> Riwayat perubahan
              </h3>
              {data.riwayat.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada perubahan pengaturan.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.riwayat.map((entry) => (
                    <li key={entry.id} className="py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{auditActionLabels[entry.aksi] ?? entry.aksi}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(entry.waktu)} · {entry.oleh}</p>
                      </div>
                      <p className="mt-1 text-slate-700">{describeChange(entry, severityLabels)}</p>
                      {entry.alasan && <p className="mt-1 text-xs italic text-slate-500">Alasan: {entry.alasan}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </>
        )
      )}

      <button
        type="button"
        onClick={loadRules}
        className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Muat ulang</span>
      </button>
    </section>
  );
}
