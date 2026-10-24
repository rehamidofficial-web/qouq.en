"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthField, { AuthError, SocialRow } from "@/components/auth/AuthField";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function MasukPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || !password) {
      setError("Isi email dan kata sandi dulu.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password, remember);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[9px] lg:gap-3.5">
      <div>
        <h2 className="font-serif text-[21px] font-bold leading-tight text-[#f7f1e3] lg:text-[28px]">Selamat datang kembali.</h2>
        <p className="mt-1 text-[13px] text-[#e6c97f] lg:text-base">Bangkumu masih menunggu.</p>
      </div>

      <AuthField id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="nama@email.com" />
      <AuthField id="password" label="Kata sandi" placeholder="Kata sandi" type="password" value={password} onChange={setPassword} autoComplete="current-password" />

      <div className="flex items-center justify-between text-[11px] lg:text-[13px]">
        <label className="flex items-center gap-2 text-[#dde6d4]">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[#e6c97f]" />
          Ingat saya
        </label>
        <Link href="/lupa-sandi" className="text-[#e6c97f] underline-offset-2 hover:underline">
          Lupa kata sandi?
        </Link>
      </div>

      <AuthError message={error} />

      <button type="submit" disabled={busy} className="btn h-11 w-full text-sm lg:h-[50px] lg:text-base">
        {busy ? "Memeriksa..." : "Masuk"}
      </button>

      <SocialRow />

      <p className="text-center text-[13px] text-[#dde6d4]">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-[#e6c97f] underline-offset-2 hover:underline">
          Daftar
        </Link>
      </p>
    </form>
  );
}
