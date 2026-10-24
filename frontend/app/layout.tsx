import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Qouq.en",
  description: "Belajar bahasa Inggris gratis. Istirahat boleh, menyerah jangan.",
  manifest: "/manifest.json",
  // Ikon tab browser dan ikon layar utama HP. (app/favicon.ico bawaan Next sebaiknya dihapus.)
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Qouq.en", statusBarStyle: "default" },
};

// Skala layar HP yang benar + warna bilah alamat browser HP mengikuti tema aplikasi.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efea" },
    { media: "(prefers-color-scheme: dark)", color: "#0f2a22" },
  ],
};

// Dijalankan sebelum halaman tampil, supaya tidak berkedip terang lalu gelap.
// Pilihan "Sistem" = tanpa data-theme, jadi warna ikut pengaturan perangkat.
const themeScript = `(function(){try{var t=localStorage.getItem("qouq-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${fraunces.variable} ${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
