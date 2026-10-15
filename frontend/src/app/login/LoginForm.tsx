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
      className="min-h-screen font-sans flex items-center justify-center bg-cover bg-center p-4 relative overflow-hidden"
      style={{ backgroundImage: "url(/campus.svg)" }}
    >
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />

      <a
        href="/"
        className="absolute top-6 left-6 text-slate-200 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors z-20 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-700/60 shadow-lg"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Halaman Utama
      </a>

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-7 shadow-2xl backdrop-blur-md">
        <div
          className="relative isolate mx-auto mb-6 w-fit max-w-full overflow-hidden rounded-2xl bg-cover bg-center px-7 py-5 text-center text-white shadow-lg"
          style={{ backgroundImage: "url(/portal-access-background.jpg)" }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-br from-red-950/95 via-red-900/85 to-rose-800/75"
          />
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-12 -z-10 h-40 w-40 rounded-full border border-white/15 bg-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -left-8 -z-10 h-44 w-44 rounded-full border border-white/10 bg-red-400/10"
          />
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md sm:text-4xl">
            {details.label}
          </h1>
          <p className="mt-2 text-sm font-medium text-red-50">
            Masuk untuk melanjutkan ke dashboard
          </p>
        </div>

        <div className="text-center">
          <p className="mb-6 text-sm font-semibold text-slate-600">
            Masukkan identitas dan kata sandi Anda
          </p>

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
        </div>
      </section>
    </main>
  );
}
