"use client";
import { useEffect, useState } from "react";
import { api, ApiError, apiUpload } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import type { Campus, School, Subject } from "@/types";

type Form = {
  title: string; description: string; type: string; level: string;
  semester: string; year: string; campusId: string; schoolId: string;
  subjectId: string; tags: string;
};

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState<Form>({ title: "", description: "", type: "COURS", level: "L1", semester: "S1", year: "2024", campusId: "", schoolId: "", subjectId: "", tags: "" });
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => { api.campuses().then(setCampuses).catch(() => {}); api.schools().then(setSchools).catch(() => {}); }, []);
  useEffect(() => { if (form.campusId) api.schools(`?campusId=${form.campusId}`).then(setSchools).catch(() => {}); }, [form.campusId]);
  useEffect(() => { if (form.schoolId) api.subjects(`?schoolId=${form.schoolId}`).then(setSubjects).catch(() => { setSubjects([]); }); else setSubjects([]); }, [form.schoolId]);
  useEffect(() => { if (campuses.length && !form.campusId) setForm(f => ({ ...f, campusId: campuses[0].id })); }, [campuses, form.campusId]);

  const isModerator = user && (user.role === 'MODERATOR' || user.role === 'ADMIN');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(false);
    if (!isModerator) { setMsg("Accès réservé aux modérateurs et administrateurs."); return; }
    if (!file) { setMsg("Fichier requis (PDF, PNG, JPEG, WEBP — 10 Mo max)"); return; }
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedMimes.includes(file.type.toLowerCase()) || !allowedExts.includes(ext)) { setMsg("Type non autorisé : PDF, PNG, JPEG, WEBP uniquement (10 Mo max)"); return; }
    if (file.size > 10 * 1024 * 1024) { setMsg("Fichier trop volumineux (10 Mo max)"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, String(v)); });
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    fd.set('tags', JSON.stringify(tags));
    fd.append('file', file);
    try {
      await apiUpload('/resources', fd);
      setOk(true);
      setMsg("Ressource envoyée ! En attente de validation par l'admin.");
      setTimeout(() => router.push('/ressources'), 1500);
    } catch (e: unknown) {
      // Le formulaire est conservé tel quel (aucun reset) pour ne rien perdre.
      if (e instanceof ApiError && e.status === 401) setMsg("Session expirée, reconnectez-vous (formulaire conservé).");
      else if (e instanceof ApiError && e.code === 'PASSWORD_CHANGE_REQUIRED') { router.push('/compte/mot-de-passe'); return; }
      else if (e instanceof ApiError) setMsg(e.message);
      else setMsg("Envoi impossible.");
    }
  };

  if (!user) return <div className="bg-surface rounded-[12px] border border-sand p-6 sm:p-8 text-center text-[13.5px] leading-[1.5] mx-2 sm:mx-auto max-w-2xl">Accès modération : veuillez vous <a href="/login" className="text-brand hover:text-brand-pressed">connecter</a> (MODERATOR / ADMIN). Les étudiants consultent et téléchargent sans connexion.</div>;
  if (!isModerator) return <div className="bg-surface rounded-[12px] border border-sand p-6 sm:p-8 text-center text-[13.5px] leading-[1.5] mx-2 sm:mx-auto max-w-2xl">Accès réservé aux modérateurs et administrateurs. Votre rôle actuel : <b>{user.role}</b>. Les étudiants n&apos;ont pas besoin de se connecter pour consulter.</div>;

  return (
    <div className="max-w-2xl mx-auto bg-surface rounded-[12px] border border-sand p-4 sm:p-8 w-full overflow-hidden">
      <h1 className="text-[18px] sm:text-[21px] font-bold text-ink font-poppins">Déposer une ressource</h1>
      <p className="text-[13.5px] text-ink-secondary leading-[1.5]">PDF, PNG, JPEG, WEBP — 10 Mo max. Dépôt par modérateur, validation par admin avant publication.</p>
      <form onSubmit={submit} className="space-y-4 mt-6">
        <div>
          <label htmlFor="up-title" className="block text-[13px] font-medium text-ink mb-1">Titre *</label>
          <input id="up-title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] focus:border-terracotta-action outline-none" />
        </div>
        <div>
          <label htmlFor="up-desc" className="block text-[13px] font-medium text-ink mb-1">Description</label>
          <textarea id="up-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] focus:border-terracotta-action outline-none min-h-[80px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="up-type" className="block text-[13px] font-medium text-ink mb-1">Type</label>
            <select id="up-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] bg-surface min-h-[44px]">{["COURS", "TD", "TP", "CONTROLE", "EXAMEN", "DEVOIR", "PROJET", "CORRECTION", "FICHE_REVISION", "ANNALE", "AUTRE"].map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div>
            <label htmlFor="up-file" className="block text-[13px] font-medium text-ink mb-1">Fichier *</label>
            <input id="up-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full border border-sand rounded-[8px] px-4 py-2 text-[13.5px] bg-surface min-h-[44px] flex items-center" />
          </div>
        </div>
        {file && <p className="text-[11.5px] text-ink-secondary break-all">Fichier : {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="up-level" className="block text-[13px] font-medium text-ink mb-1">Niveau</label>
            <select id="up-level" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] bg-surface min-h-[44px]">{["L1", "L2", "L3", "M1", "M2"].map(l => <option key={l} value={l}>{l}</option>)}</select>
          </div>
          <div>
            <label htmlFor="up-semester" className="block text-[13px] font-medium text-ink mb-1">Semestre</label>
            <select id="up-semester" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] bg-surface min-h-[44px]">{["S1", "S2", "S3", "S4", "S5", "S6"].map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div>
            <label htmlFor="up-year" className="block text-[13px] font-medium text-ink mb-1">Année</label>
            <input id="up-year" type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] min-h-[44px]" />
          </div>
        </div>
        <div>
          <label htmlFor="up-campus" className="block text-[13px] font-medium text-ink mb-1">Campus *</label>
          <select id="up-campus" required value={form.campusId} onChange={e => setForm({ ...form, campusId: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] bg-surface min-h-[44px]">
            <option value="">Choisir campus</option>
            {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="up-school" className="block text-[13px] font-medium text-ink mb-1">École *</label>
          <select id="up-school" required value={form.schoolId} onChange={e => setForm({ ...form, schoolId: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] bg-surface min-h-[44px]">
            <option value="">Choisir école *</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="up-subject" className="block text-[13px] font-medium text-ink mb-1">Filière *</label>
          <select id="up-subject" required value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px] bg-surface min-h-[44px]">
            <option value="">Choisir filière *</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="up-tags" className="block text-[13px] font-medium text-ink mb-1">Tags (séparés par virgules)</label>
          <input id="up-tags" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="w-full border border-sand rounded-[8px] px-4 py-3 text-[13.5px]" />
        </div>
        {msg && <p role="status" aria-live="polite" className={`text-[13.5px] text-center py-2 border rounded-[8px] break-words px-3 ${ok ? "bg-success/10 border-success text-success" : "bg-sand-light border-sand text-ink"}`}>{msg}</p>}
        <button className="w-full bg-terracotta-action text-white min-h-[44px] sm:min-h-[48px] h-auto py-3 rounded-full font-semibold text-[15px] hover:bg-terracotta-pressed transition">Envoyer pour validation admin</button>
      </form>
    </div>
  );
}
