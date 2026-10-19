import type { Metadata } from "next";
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
