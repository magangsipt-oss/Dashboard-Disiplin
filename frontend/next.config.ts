import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan akses mode dev dari HP di jaringan lokal.
  // Wi-Fi dan Tailscale. Ganti bila IP laptop berubah (cek dengan ipconfig).
  allowedDevOrigins: ["192.168.4.27", "100.65.96.8"],
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:5000";

    return [
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
