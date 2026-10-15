import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>SiDisiplin</h1>
      <p>Struktur frontend dan backend berhasil disiapkan.</p>
      <Link href="/login">Masuk</Link>
    </main>
  );
}
