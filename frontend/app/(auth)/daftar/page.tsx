"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthField, { AuthError, SocialRow } from "@/components/auth/AuthField";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function DaftarPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const name = `${first.trim()} ${last.trim()}`.trim();
    if (name.length < 2) return setError("Nama minimal 2 huruf.");
    if (!email.includes("@")) return setError("Format email belum benar.");
    if (password.length < 8) return setError("Kata sandi minimal 8 karakter.");
    if (password !== confirm) return setError("Konfirmasi kata sandi tidak sama.");

    setBusy(true);
    try {
      await register(name, email.trim(), password);
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
        <h2 className="font-serif text-[21px] font-bold leading-tight text-[#f7f1e3] lg:text-[28px]">Mulai perjalananmu.</h2>
        <p className="mt-1 text-[13px] text-[#e6c97f] lg:text-base">Satu akun, satu kata setiap hari.</p>
      </div>

      <div className="flex gap-2 lg:gap-2.5">
        <AuthField id="first" label="Nama" placeholder="Nama" value={first} onChange={setFirst} autoComplete="given-name" />
        <AuthField id="last" label="Nama belakang" placeholder="Nama belakang" value={last} onChange={setLast} autoComplete="family-name" />
      </div>
      <AuthField id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="Email" />
      <AuthField id="password" label="Kata sandi (minimal 8 karakter)" placeholder="Kata sandi" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <AuthField id="confirm" label="Konfirmasi kata sandi" placeholder="Konfirmasi kata sandi" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

      <p className="text-[10.5px] text-[#dde6d4] lg:text-[12px]">
        Dengan melanjutkan, kamu menyetujui <span className="text-[#e6c97f]">Ketentuan Layanan</span> dan{" "}
        <span className="text-[#e6c97f]">Kebijakan Privasi</span>.
      </p>

      <AuthError message={error} />

      <button type="submit" disabled={busy} className="btn h-11 w-full text-sm lg:h-[50px] lg:text-base">
        {busy ? "Membuat akun..." : "Daftar"}
      </button>

      <SocialRow />

      <p className="text-center text-[13px] text-[#dde6d4]">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-[#e6c97f] underline-offset-2 hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
