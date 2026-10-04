"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError, api } from "@/lib/api";

export default function ChangePasswordPage() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setOk(false);
    if (newPassword.length < 12) { setMsg("Nouveau mot de passe : 12 caractères minimum."); return; }
    if (newPassword !== confirm) { setMsg("La confirmation ne correspond pas."); return; }
    try {
      await api.changePassword({ currentPassword, newPassword });
      await refresh();
      setOk(true);
      setMsg("Mot de passe modifié.");
      setTimeout(() => router.push("/"), 1200);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 0) setMsg("Connexion impossible, vérifiez votre réseau.");
      else if (e instanceof ApiError) setMsg(e.message);
      else setMsg("Erreur inattendue.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-[12px] border border-sand p-6 sm:p-8 mt-4 sm:mt-8 w-full">
      <h1 className="text-[20px] sm:text-[21px] font-bold text-ink font-poppins">Changer mon mot de passe</h1>
      <p className="text-[13.5px] text-ink-secondary mt-1 leading-[1.5]">12 caractères minimum, différent de l&apos;ancien, sans votre identifiant.</p>
      <form onSubmit={submit} className="space-y-4 mt-6">
        <div>
          <label htmlFor="pwd-current" className="block text-[13px] font-medium text-ink mb-1">Mot de passe actuel</label>
          <input id="pwd-current" type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] focus:border-terracotta-action outline-none" />
        </div>
        <div>
          <label htmlFor="pwd-new" className="block text-[13px] font-medium text-ink mb-1">Nouveau mot de passe</label>
          <input id="pwd-new" type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] focus:border-terracotta-action outline-none" />
        </div>
        <div>
          <label htmlFor="pwd-confirm" className="block text-[13px] font-medium text-ink mb-1">Confirmation</label>
          <input id="pwd-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] focus:border-terracotta-action outline-none" />
        </div>
        {msg && (
          <p role="status" aria-live="polite" className={`text-[13.5px] text-center py-2 border rounded-[8px] break-words px-3 ${ok ? "bg-green/10 border-green text-green" : "bg-red-50 border-red-200 text-red-700"}`}>{msg}</p>
        )}
        <button type="submit" className="w-full bg-terracotta-action text-white min-h-[44px] sm:min-h-[48px] h-auto py-3 rounded-full font-semibold text-[15px] hover:bg-terracotta-pressed transition">Valider</button>
      </form>
    </div>
  );
}
