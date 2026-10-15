"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";

export type LoginRole = "mhs" | "dosen" | "admin";

const roleDetails: Record<
  LoginRole,
  { label: string; identityLabel: string; identityPlaceholder: string }
> = {
  mhs: {
    label: "Mahasiswa",
    identityLabel: "NIM (Nomor Induk Mahasiswa)",
    identityPlaceholder: "misal: 202401001",
  },
  dosen: {
    label: "Dosen PA",
    identityLabel: "NIP atau NIDN",
    identityPlaceholder: "masukkan nomor identitas",
  },
  admin: {
    label: "Admin Kemahasiswaan",
    identityLabel: "NIP Kemahasiswaan",
    identityPlaceholder: "masukkan nomor identitas",
  },
};

export default function LoginForm({ role }: { role: LoginRole }) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const details = roleDetails[role];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, identity, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "Login gagal. Periksa identitas dan kata sandi.",
        );
      }

      router.replace("/");
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Tidak dapat menghubungi layanan login.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4 relative overflow-hidden"
      style={{ backgroundImage: "url(/campus.svg)" }}
    >
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />

      <a
        href="/"
        className="absolute top-6 left-6 text-slate-200 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors z-20 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-700/60 shadow-lg"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Halaman Utama
      </a>

      <section className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/80 relative z-10">
        <div className="text-center mb-6">
          <div className="h-14 w-auto flex items-center justify-center p-2 bg-white rounded-2xl shadow-md border border-slate-200 mx-auto mb-3">
            <img
              src="/sidisiplin-mark.svg"
              alt="Logo Poltek Simas Berau"
              className="h-10 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Masuk Portal SiDisiplin
          </h1>
          <p className="text-red-800 text-xs mt-1.5 uppercase tracking-wider font-extrabold bg-red-50 py-1.5 px-3 rounded-full inline-block border border-red-200/50">
            Peran: {details.label}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="identity"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              {details.identityLabel}
            </label>
            <input
              id="identity"
              type="text"
              required
              autoComplete="username"
              placeholder={details.identityPlaceholder}
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-800 text-sm bg-slate-50 font-medium"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Kata Sandi
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-800 text-sm bg-slate-50 font-medium"
            />
          </div>

          {error && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 bg-red-800 hover:bg-red-900 disabled:cursor-wait disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-lg transition-all mt-2"
          >
            {isLoggingIn ? "Memeriksa akun..." : "Masuk ke Dashboard"}
          </button>
        </form>
      </section>
    </main>
  );
}
