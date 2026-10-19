"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthField, { AuthError } from "@/components/auth/AuthField";
import { api, ApiError } from "@/lib/api";

export default function LupaSandiPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) return setError("Format email belum benar.");
    setBusy(true);
    try {
      const res = await api<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3.5">
        <h2 className="font-serif text-[26px] font-bold leading-tight text-[#f7f1e3]">Permintaan diterima</h2>
        <p className="text-[#dde6d4]">{done}</p>
        <Link href="/masuk" className="btn btn-outline w-full border-[rgba(230,201,127,.6)] text-[#e6c97f]">
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
      <div>
        <h2 className="font-serif text-[28px] font-bold leading-tight text-[#f7f1e3]">Lupa kata sandi?</h2>
        <p className="mt-1 text-[#e6c97f]">Tenang saja. Kami bantu atur ulang.</p>
      </div>
      <p className="text-[#dde6d4]">Masukkan email akunmu.</p>

      <AuthField id="email" label="Email akun" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="nama@email.com" />
      <AuthError message={error} />

      <button type="submit" disabled={busy} className="btn w-full">
        {busy ? "Mengirim..." : "Kirim tautan atur ulang"}
      </button>

      <p className="text-center text-[13px] text-[#dde6d4]">
        Ingat kata sandimu?{" "}
        <Link href="/masuk" className="font-semibold text-[#e6c97f] underline-offset-2 hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
