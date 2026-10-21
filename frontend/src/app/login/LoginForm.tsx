"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, GraduationCap, ShieldCheck } from "lucide-react";

export type LoginRole = "mhs" | "dosen" | "admin";

const roleDetails: Record<
  LoginRole,
  { label: string; identityLabel: string; identityPlaceholder: string }
> = {
  mhs: {
    label: "Mahasiswa",
    identityLabel: "NIM (Nomor Induk Mahasiswa)",
    identityPlaceholder: "Masukkan NIM Anda",
  },
  dosen: {
    label: "Dosen PA",
    identityLabel: "NIP atau NIDN",
    identityPlaceholder: "Masukkan nomor identitas",
  },
  admin: {
    label: "Admin Kemahasiswaan",
    identityLabel: "NIP Kemahasiswaan",
    identityPlaceholder: "Masukkan nomor identitas",
  },
};

export default function LoginForm({ role }: { role: LoginRole }) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const details = roleDetails[role];
  const RoleIcon = role === "dosen" ? GraduationCap : ShieldCheck;

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
      const responseText = await response.text();
      let data: unknown = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : response.status >= 500
              ? "Layanan login sedang tidak tersedia. Pastikan backend berjalan, lalu coba kembali."
              : "Login gagal. Periksa identitas dan kata sandi.";
        throw new Error(message);
      }

      if (typeof data !== "object" || data === null || !("profile" in data)) {
        throw new Error(
          "Respons layanan login tidak valid. Pastikan backend berjalan, lalu coba kembali.",
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
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center p-4 font-sans"
      style={{ backgroundImage: "url(/portal-access-background.jpg)" }}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

      <section className="relative z-10 w-full max-w-[380px] rounded-2xl border border-slate-200/80 bg-white/95 px-6 py-6 shadow-xl backdrop-blur-sm sm:px-7 sm:py-7">
        <header className="mb-5 text-center">
          {role === "mhs" ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-2.5 h-9 w-9 text-red-700"
            >
              <circle cx="12" cy="7" r="4" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2H5Z" />
            </svg>
          ) : (
            <RoleIcon
              aria-hidden="true"
              className="mx-auto mb-2.5 h-9 w-9 text-orange-700"
              strokeWidth={1.8}
            />
          )}
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Login {details.label}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Masukkan identitas dan kata sandi Anda
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          <div>
            <label
              htmlFor="identity"
              className="mb-1.5 block text-xs font-bold text-slate-700"
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
              className="w-full rounded-xl border border-slate-200 bg-blue-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-bold text-slate-700"
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
              className="w-full rounded-xl border border-slate-200 bg-blue-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {error && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-1 w-full rounded-xl bg-gradient-to-r from-red-800 to-red-700 py-2.5 text-sm font-bold text-white shadow-md shadow-red-900/15 transition hover:from-red-900 hover:to-red-800 disabled:cursor-wait disabled:opacity-60"
          >
            {isLoggingIn ? "Memeriksa akun..." : "Masuk Dashboard"}
          </button>
        </form>

        <a
          href="/"
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-800 to-red-700 py-2.5 text-sm font-bold text-white shadow-md shadow-red-900/15 transition hover:from-red-900 hover:to-red-800"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Kembali ke Menu Utama
        </a>
      </section>
    </main>
  );
}
