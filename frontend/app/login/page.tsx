"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { ApiError, api } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!email.includes("@")) { setErr("Veuillez saisir une adresse email valide."); return; }
    if (!password) { setErr("Veuillez saisir votre mot de passe."); return; }
    try {
      await login(email, password);
      const { user } = await api.me();
      router.push(user?.mustChangePassword ? "/compte/mot-de-passe" : "/");
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 429) { setErr("Trop de tentatives, réessayez dans quelques minutes."); return; }
        if (e.status === 0) { setErr("Connexion impossible, vérifiez votre réseau."); return; }
        setErr("Identifiants invalides. Vérifiez votre email et mot de passe.");
        return;
      }
      setErr("Identifiants invalides. Veuillez réessayer.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-[12px] border border-sand p-6 sm:p-8 mt-4 sm:mt-8 w-full">
      <h1 className="text-[20px] sm:text-[21px] font-bold text-ink font-poppins">Espace modération</h1>
      <p className="text-[13.5px] text-ink-secondary mt-1 leading-[1.5]">Réservé aux modérateurs et administrateurs. Les étudiants consultent et téléchargent sans connexion.</p>
      <p className="text-[11.5px] text-ink-secondary mt-1">Utilisez les identifiants fournis par l&apos;administrateur.</p>
      <form onSubmit={submit} className="space-y-4 mt-6">
        <div>
          <label htmlFor="login-email" className="block text-[13px] font-medium text-ink mb-1">Email</label>
          <input id="login-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] focus:border-terracotta-action focus:ring-1 focus:ring-terracotta-action outline-none" />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-[13px] font-medium text-ink mb-1">Mot de passe</label>
          <div className="relative">
            <input id="login-password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full border border-sand rounded-[8px] px-4 py-3 pr-11 text-[13.5px] focus:border-terracotta-action focus:ring-1 focus:ring-terracotta-action outline-none" />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-warm text-ink-secondary" aria-label={show ? "Masquer mot de passe" : "Voir mot de passe"}>
              {show ? <EyeOff className="w-[18px] h-[18px] shrink-0" /> : <Eye className="w-[18px] h-[18px] shrink-0" />}
            </button>
          </div>
        </div>
        {err && (
          <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-[8px] px-3 py-2.5 text-[13.5px] leading-[1.4]">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="break-words">{err}</span>
          </div>
        )}
        <button type="submit" className="w-full bg-terracotta-action text-white min-h-[44px] sm:min-h-[48px] h-auto py-3 rounded-full font-semibold text-[15px] hover:bg-terracotta-pressed transition">Se connecter</button>
      </form>
      <p className="text-[11.5px] text-center mt-4 text-ink-secondary">Création de compte réservée à l&apos;administrateur.</p>
    </div>
  );
}
