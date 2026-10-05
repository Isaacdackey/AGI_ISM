"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import type { Moderator, Paginated, Resource, School, Subject } from "@/types";

type EditingResource = {
  id: string;
  title: string;
  description: string;
  type: string;
  level: string;
  semester: string;
  year: string;
  tags: string;
};

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ schools: number; subjects: number; resources: number; pending: number } | null>(null);
  const [pending, setPending] = useState<Resource[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSchool, setNewSchool] = useState({ name: "", slug: "", description: "", campusId: "" });
  const [newSubject, setNewSubject] = useState({ name: "", slug: "", schoolId: "" });
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [newMod, setNewMod] = useState({ name: "", email: "" });
  const [modMsg, setModMsg] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showTemp, setShowTemp] = useState(false);
  const [msg, setMsg] = useState("");

  // Ressources (tous statuts, paginées, filtrables)
  const [resList, setResList] = useState<Resource[]>([]);
  const [resPage, setResPage] = useState(1);
  const [resTotalPages, setResTotalPages] = useState(1);
  const [resStatus, setResStatus] = useState("");
  const [resSearch, setResSearch] = useState("");
  const [resSchool, setResSchool] = useState("");
  const [editing, setEditing] = useState<EditingResource | null>(null);

  // Écoles / matières : édition inline
  const [editSchoolId, setEditSchoolId] = useState<string | null>(null);
  const [editSchool, setEditSchool] = useState({ name: "", description: "" });
  const [editSubjectId, setEditSubjectId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState({ name: "", description: "" });

  const reload = () => setRefresh(x => x + 1);
  const fail = (e: unknown, fallback: string) => {
    setMsg(e instanceof ApiError ? e.message : fallback);
  };

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
    api.pending().then(setPending).catch(() => {});
    api.schools().then(setSchools).catch(() => {});
    api.subjects().then(setSubjects).catch(() => {});
    api.campuses().then(setCampuses).catch(() => {});
    if (user?.role === 'ADMIN') api.moderators().then(setModerators).catch(() => {});
  }, [refresh, user?.role]);

  useEffect(() => {
    const q = new URLSearchParams({ limit: '10', page: String(resPage) });
    if (resStatus) q.set('status', resStatus);
    if (resSearch.trim()) q.set('search', resSearch.trim());
    if (resSchool) q.set('schoolId', resSchool);
    api.resources(`?${q.toString()}`).then((r: Paginated<Resource>) => {
      setResList(r.data || []);
      setResTotalPages(r.totalPages || 1);
    }).catch(() => {});
  }, [refresh, resPage, resStatus, resSearch, resSchool]);

  const canEdit = (r: Resource) => user?.role === 'ADMIN' || r.uploadedBy?.id === user?.id;

  const doAction = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg("");
    try {
      await fn();
      setMsg(ok);
      reload();
    } catch (e: unknown) { fail(e, "Action impossible."); }
  };

  const approve = (id: string) => doAction(() => api.approveResource(id), "Ressource approuvée.");
  const reject = (id: string) => doAction(() => api.rejectResource(id), "Ressource rejetée.");
  const delResource = (id: string, title: string) => {
    if (!window.confirm(`Supprimer « ${title} » ?`)) return;
    doAction(() => api.deleteResource(id), "Ressource supprimée.");
  };

  const createSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    await doAction(() => api.createSchool(newSchool), "École créée.");
    setNewSchool({ name: "", slug: "", description: "", campusId: "" });
  };
  const createSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    await doAction(() => api.createSubject(newSubject), "Matière créée.");
    setNewSubject({ name: "", slug: "", schoolId: "" });
  };
  const saveSchool = async (id: string) => {
    await doAction(() => api.updateSchool(id, editSchool), "École modifiée.");
    setEditSchoolId(null);
  };
  const delSchool = (id: string, name: string) => {
    if (!window.confirm(`Supprimer l’école « ${name} » ? (Refusée si des ressources existent.)`)) return;
    doAction(() => api.deleteSchool(id), "École supprimée.");
  };
  const saveSubject = async (id: string) => {
    await doAction(() => api.updateSubject(id, editSubject), "Matière modifiée.");
    setEditSubjectId(null);
  };
  const delSubject = (id: string, name: string) => {
    if (!window.confirm(`Supprimer la matière « ${name} » ? (Refusée si des ressources existent.)`)) return;
    doAction(() => api.deleteSubject(id), "Matière supprimée.");
  };

  const saveResource = async () => {
    if (!editing) return;
    const payload = {
      title: editing.title,
      description: editing.description,
      type: editing.type,
      level: editing.level || undefined,
      semester: editing.semester || undefined,
      year: editing.year ? Number(editing.year) : undefined,
      tags: editing.tags.split(",").map(t => t.trim()).filter(Boolean),
    };
    await doAction(() => api.updateResource(editing.id, payload), "Ressource modifiée.");
    setEditing(null);
  };

  const createModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setModMsg(""); setTempPassword(null);
    try {
      const res = await api.createModerator(newMod) as { user: { email: string }; temporaryPassword: string };
      setTempPassword(res.temporaryPassword);
      setModMsg(`Modérateur créé : ${res.user.email} — copiez le mot de passe ci-dessous, il ne sera plus affiché.`);
      setNewMod({ name: "", email: "" });
      api.moderators().then(setModerators).catch(() => {});
    } catch (err: unknown) { setModMsg(err instanceof ApiError ? err.message : "Création impossible."); }
  };

  const toggleModerator = async (m: Moderator) => {
    setModMsg("");
    try {
      if (m.isActive) await api.disableModerator(m.id);
      else await api.enableModerator(m.id);
      api.moderators().then(setModerators).catch(() => {});
    } catch (err: unknown) { setModMsg(err instanceof ApiError ? err.message : "Action impossible."); }
  };

  const resetModPassword = async (m: Moderator) => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${m.email} ? L'ancien sera révoqué.`)) return;
    setModMsg(""); setTempPassword(null);
    try {
      const res = await api.resetModeratorPassword(m.id) as { temporaryPassword: string };
      setTempPassword(res.temporaryPassword);
      setModMsg(`Mot de passe réinitialisé pour ${m.email} — copiez-le ci-dessous, il ne sera plus affiché.`);
    } catch (err: unknown) { setModMsg(err instanceof ApiError ? err.message : "Action impossible."); }
  };

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) return <div className="bg-surface rounded-[12px] border border-sand p-6 sm:p-8 text-center text-[13.5px] leading-[1.5]">Accès réservé aux modérateurs/admins. <Link href="/login" className="text-brand hover:text-brand-pressed">Se connecter</Link></div>;

  return (
    <div className="space-y-6 overflow-hidden">
      <h1 className="text-[20px] sm:text-[21px] font-bold text-ink font-poppins">Administration</h1>
      {msg && <p role="status" aria-live="polite" className="text-[13.5px] text-center py-2 bg-sand-light border border-sand rounded-[8px] break-words px-3">{msg}</p>}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface rounded-[12px] border border-sand p-4 text-center"><div className="text-xl sm:text-2xl font-bold text-brand font-poppins">{stats.schools}</div><div className="text-[11.5px] text-ink-secondary">Écoles</div></div>
          <div className="bg-surface rounded-[12px] border border-sand p-4 text-center"><div className="text-xl sm:text-2xl font-bold text-success font-poppins">{stats.subjects}</div><div className="text-[11.5px] text-ink-secondary">Matières</div></div>
          <div className="bg-surface rounded-[12px] border border-sand p-4 text-center"><div className="text-xl sm:text-2xl font-bold text-ink font-poppins">{stats.resources}</div><div className="text-[11.5px] text-ink-secondary">Ressources</div></div>
          <div className="bg-surface rounded-[12px] border border-sand p-4 text-center"><div className="text-xl sm:text-2xl font-bold text-brand font-poppins">{stats.pending}</div><div className="text-[11.5px] text-ink-secondary">En attente</div></div>
        </div>
      )}

      <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 overflow-hidden">
        <h2 className="font-semibold text-ink mb-3 font-poppins text-[14px] sm:text-[15px] leading-tight">Ressources en attente ({pending.length}) - dépôt modérateur, validation admin</h2>
        {user.role !== 'ADMIN' && <p className="text-[11.5px] text-ink-secondary mb-3">En tant que modérateur vous déposez, seul l&apos;admin peut approuver/rejeter.</p>}
        <div className="space-y-3">
          {pending.map(r => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-sand rounded-[12px] p-3 overflow-hidden">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[13.5px] text-ink break-words leading-tight">{r.title} <span className="text-[11.5px] bg-gray-warm border border-sand px-2 py-0.5 rounded-full text-ink-secondary whitespace-nowrap">{r.type}</span></div>
                <div className="text-[11.5px] text-ink-secondary break-words">{r.school?.name} - {r.subject?.name} - {r.level} {r.semester}</div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link href={`/ressources/${r.slug}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-sand rounded-full text-[11.5px] bg-surface hover:border-inverse hover:text-ink transition min-h-[32px] inline-flex items-center">Voir</Link>
                {user.role === 'ADMIN' ? (
                  <>
                    <button onClick={() => approve(r.id)} className="px-3 py-1.5 bg-green text-white rounded-full text-[11.5px] hover:opacity-90 transition min-h-[32px]">Approuver</button>
                    <button onClick={() => reject(r.id)} className="px-3 py-1.5 bg-terracotta-action text-white rounded-full text-[11.5px] hover:bg-terracotta-pressed transition min-h-[32px]">Rejeter</button>
                  </>
                ) : (
                  <span className="text-[11.5px] text-ink-secondary px-2 py-1">En attente admin</span>
                )}
                {canEditModerator(user, r) && <button onClick={() => delResource(r.id, r.title)} className="px-3 py-1.5 bg-gray-warm border border-sand rounded-full text-[11.5px] hover:bg-sand transition min-h-[32px]">Supprimer</button>}
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-[13.5px] text-ink-secondary">Aucune ressource en attente.</p>}
        </div>
      </div>

      <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 overflow-hidden space-y-3">
        <h2 className="font-semibold text-ink font-poppins text-[14px] sm:text-[15px]">Toutes les ressources</h2>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="admin-res-status" className="sr-only">Filtrer par statut</label>
          <select id="admin-res-status" value={resStatus} onChange={e => { setResStatus(e.target.value); setResPage(1); }} className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] bg-surface min-h-[40px]">
            <option value="">Tous statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvées</option>
            <option value="REJECTED">Rejetées</option>
          </select>
          <label htmlFor="admin-res-school" className="sr-only">Filtrer par école</label>
          <select id="admin-res-school" value={resSchool} onChange={e => { setResSchool(e.target.value); setResPage(1); }} className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] bg-surface min-h-[40px]">
            <option value="">Toutes écoles</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label htmlFor="admin-res-search" className="sr-only">Rechercher</label>
          <input id="admin-res-search" value={resSearch} onChange={e => { setResSearch(e.target.value); setResPage(1); }} placeholder="Recherche..." className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] min-h-[40px] flex-1 min-w-[140px]" />
        </div>
        <div className="space-y-2">
          {resList.map(r => (
            <div key={r.id} className="border border-sand rounded-[8px] px-3 py-2">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-[13.5px] text-ink break-words font-medium">{r.title}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11.5px] bg-gray-warm border border-sand px-2 py-0.5 rounded-full">{r.status}</span>
                  {canEditModerator(user, r) && (
                    <>
                      <button onClick={() => setEditing({ id: r.id, title: r.title, description: r.description || "", type: r.type, level: r.level || "", semester: r.semester || "", year: r.year ? String(r.year) : "", tags: (r.tags || []).join(", ") })} className="px-3 py-1 border border-sand rounded-full text-[11.5px] hover:border-inverse min-h-[32px]">Modifier</button>
                      <button onClick={() => delResource(r.id, r.title)} className="px-3 py-1 bg-gray-warm border border-sand rounded-full text-[11.5px] hover:bg-sand min-h-[32px]">Supprimer</button>
                    </>
                  )}
                </span>
              </div>
              {editing && editing.id === r.id && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <label htmlFor={`edit-title-${r.id}`} className="sr-only">Titre</label>
                  <input id={`edit-title-${r.id}`} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] min-h-[40px]" />
                  <label htmlFor={`edit-type-${r.id}`} className="sr-only">Type</label>
                  <select id={`edit-type-${r.id}`} value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] bg-surface min-h-[40px]">
                    {["COURS", "TD", "TP", "CONTROLE", "EXAMEN", "DEVOIR", "PROJET", "CORRECTION", "FICHE_REVISION", "ANNALE", "AUTRE"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label htmlFor={`edit-desc-${r.id}`} className="sr-only">Description</label>
                  <input id={`edit-desc-${r.id}`} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Description" className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] min-h-[40px] sm:col-span-2" />
                  <label htmlFor={`edit-tags-${r.id}`} className="sr-only">Tags séparés par virgules</label>
                  <input id={`edit-tags-${r.id}`} value={editing.tags} onChange={e => setEditing({ ...editing, tags: e.target.value })} placeholder="Tags (virgules)" className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] min-h-[40px] sm:col-span-2" />
                  <div className="flex gap-2 sm:col-span-2">
                    <button onClick={saveResource} className="px-4 py-2 bg-inverse text-white rounded-full text-[12px] font-semibold min-h-[40px]">Enregistrer</button>
                    <button onClick={() => setEditing(null)} className="px-4 py-2 border border-sand rounded-full text-[12px] min-h-[40px]">Annuler</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {resList.length === 0 && <p className="text-[13.5px] text-ink-secondary">Aucune ressource.</p>}
        </div>
        <div className="flex items-center justify-between">
          <button disabled={resPage <= 1} onClick={() => setResPage(p => Math.max(1, p - 1))} className="px-4 py-2 border border-sand rounded-full text-[12px] disabled:opacity-40 min-h-[40px]">Précédent</button>
          <span className="text-[12px] text-ink-secondary">Page {resPage} / {resTotalPages}</span>
          <button disabled={resPage >= resTotalPages} onClick={() => setResPage(p => p + 1)} className="px-4 py-2 border border-sand rounded-full text-[12px] disabled:opacity-40 min-h-[40px]">Suivant</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 space-y-3 overflow-hidden">
          <h3 className="font-semibold font-poppins text-[15px] text-ink">Écoles ({schools.length})</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {schools.map(s => (
              <div key={s.id} className="border border-sand rounded-[8px] px-3 py-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[13.5px] text-ink break-words font-medium">{s.name}</span>
                  <span className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditSchoolId(s.id); setEditSchool({ name: s.name, description: s.description || "" }); }} className="px-2 py-1 border border-sand rounded-full text-[11.5px] min-h-[32px]" aria-label={`Modifier ${s.name}`}>Modifier</button>
                    {user.role === 'ADMIN' && <button onClick={() => delSchool(s.id, s.name)} className="px-2 py-1 bg-gray-warm border border-sand rounded-full text-[11.5px] min-h-[32px]" aria-label={`Supprimer ${s.name}`}>Suppr.</button>}
                  </span>
                </div>
                {editSchoolId === s.id && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label htmlFor={`school-name-${s.id}`} className="sr-only">Nom de l&apos;école</label>
                    <input id={`school-name-${s.id}`} value={editSchool.name} onChange={e => setEditSchool({ ...editSchool, name: e.target.value })} className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] min-h-[40px]" />
                    <label htmlFor={`school-desc-${s.id}`} className="sr-only">Description de l&apos;école</label>
                    <input id={`school-desc-${s.id}`} value={editSchool.description} onChange={e => setEditSchool({ ...editSchool, description: e.target.value })} className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] min-h-[40px]" />
                    <div className="flex gap-2">
                      <button onClick={() => saveSchool(s.id)} className="px-3 py-1.5 bg-inverse text-white rounded-full text-[12px] min-h-[36px]">OK</button>
                      <button onClick={() => setEditSchoolId(null)} className="px-3 py-1.5 border border-sand rounded-full text-[12px] min-h-[36px]">Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {user.role === 'ADMIN' && (
            <form onSubmit={createSchool} className="space-y-2 border-t border-sand pt-3">
              <h4 className="font-semibold font-poppins text-[13.5px] text-ink">Créer une école</h4>
              <label htmlFor="new-school-name" className="sr-only">Nom de la nouvelle école</label>
              <input id="new-school-name" required placeholder="Nom" value={newSchool.name} onChange={e => setNewSchool({ ...newSchool, name: e.target.value })} className="w-full border border-sand rounded-[8px] px-3 py-2.5 text-[13.5px] min-h-[44px]" />
              <label htmlFor="new-school-slug" className="sr-only">Slug de la nouvelle école</label>
              <input id="new-school-slug" required placeholder="Slug (ex: ecole-xyz)" value={newSchool.slug} onChange={e => setNewSchool({ ...newSchool, slug: e.target.value })} className="w-full border border-sand rounded-[8px] px-3 py-2.5 text-[13.5px] min-h-[44px]" />
              <label htmlFor="new-school-campus" className="sr-only">Campus de la nouvelle école</label>
              <select id="new-school-campus" required value={newSchool.campusId} onChange={e => setNewSchool({ ...newSchool, campusId: e.target.value })} className="w-full border border-sand rounded-[8px] px-3 py-2.5 text-[13.5px] bg-surface min-h-[44px]">
                <option value="">Campus</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="w-full bg-inverse text-white min-h-[44px] py-2 rounded-full text-[14px] font-semibold">Créer école</button>
            </form>
          )}
        </div>

        <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 space-y-3 overflow-hidden">
          <h3 className="font-semibold font-poppins text-[15px] text-ink">Matières</h3>
          <label htmlFor="admin-subject-school" className="sr-only">Filtrer les matières par école</label>
          <select id="admin-subject-school" value={newSubject.schoolId} onChange={e => setNewSubject({ ...newSubject, schoolId: e.target.value })} className="w-full border border-sand rounded-[8px] px-3 py-2.5 text-[13.5px] bg-surface min-h-[44px]">
            <option value="">Toutes écoles</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {subjects.filter(s => !newSubject.schoolId || s.schoolId === newSubject.schoolId).map(s => (
              <div key={s.id} className="border border-sand rounded-[8px] px-3 py-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[13.5px] text-ink break-words font-medium">{s.name}</span>
                  <span className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditSubjectId(s.id); setEditSubject({ name: s.name, description: s.description || "" }); }} className="px-2 py-1 border border-sand rounded-full text-[11.5px] min-h-[32px]" aria-label={`Modifier ${s.name}`}>Modifier</button>
                    {user.role === 'ADMIN' && <button onClick={() => delSubject(s.id, s.name)} className="px-2 py-1 bg-gray-warm border border-sand rounded-full text-[11.5px] min-h-[32px]" aria-label={`Supprimer ${s.name}`}>Suppr.</button>}
                  </span>
                </div>
                {editSubjectId === s.id && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label htmlFor={`subject-name-${s.id}`} className="sr-only">Nom de la matière</label>
                    <input id={`subject-name-${s.id}`} value={editSubject.name} onChange={e => setEditSubject({ ...editSubject, name: e.target.value })} className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] min-h-[40px]" />
                    <label htmlFor={`subject-desc-${s.id}`} className="sr-only">Description de la matière</label>
                    <input id={`subject-desc-${s.id}`} value={editSubject.description} onChange={e => setEditSubject({ ...editSubject, description: e.target.value })} className="border border-sand rounded-[8px] px-3 py-2 text-[13.5px] min-h-[40px]" />
                    <div className="flex gap-2">
                      <button onClick={() => saveSubject(s.id)} className="px-3 py-1.5 bg-inverse text-white rounded-full text-[12px] min-h-[36px]">OK</button>
                      <button onClick={() => setEditSubjectId(null)} className="px-3 py-1.5 border border-sand rounded-full text-[12px] min-h-[36px]">Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {user.role === 'ADMIN' && (
            <form onSubmit={createSubject} className="space-y-2 border-t border-sand pt-3">
              <h4 className="font-semibold font-poppins text-[13.5px] text-ink">Créer une matière</h4>
              <label htmlFor="new-subject-name" className="sr-only">Nom de la nouvelle matière</label>
              <input id="new-subject-name" required placeholder="Nom" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} className="w-full border border-sand rounded-[8px] px-3 py-2.5 text-[13.5px] min-h-[44px]" />
              <label htmlFor="new-subject-slug" className="sr-only">Slug de la nouvelle matière</label>
              <input id="new-subject-slug" required placeholder="Slug (ex: maths-l1)" value={newSubject.slug} onChange={e => setNewSubject({ ...newSubject, slug: e.target.value })} className="w-full border border-sand rounded-[8px] px-3 py-2.5 text-[13.5px] min-h-[44px]" />
              <button className="w-full bg-inverse text-white min-h-[44px] py-2 rounded-full text-[14px] font-semibold">Créer matière (école du filtre)</button>
            </form>
          )}
        </div>
      </div>

      {user.role === 'ADMIN' && (
        <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 overflow-hidden space-y-4">
          <h3 className="font-semibold font-poppins text-[15px] text-ink">Gestion des modérateurs (ADMIN uniquement)</h3>
          <form onSubmit={createModerator} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label htmlFor="new-mod-name" className="sr-only">Nom complet du modérateur</label>
            <input id="new-mod-name" required placeholder="Nom complet" value={newMod.name} onChange={e => setNewMod({ ...newMod, name: e.target.value })} className="border border-sand rounded-[8px] px-3 py-2.5 text-[13.5px] min-h-[44px]" />
            <label htmlFor="new-mod-email" className="sr-only">Email du modérateur</label>
            <input id="new-mod-email" required type="email" placeholder="Email modérateur" value={newMod.email} onChange={e => setNewMod({ ...newMod, email: e.target.value })} className="border border-sand rounded-[8px] px-3 py-2.5 text-[13.5px] min-h-[44px]" />
            <button className="bg-terracotta-action text-white rounded-full text-[14px] font-semibold hover:bg-terracotta-pressed transition min-h-[44px]">Créer modérateur</button>
          </form>
          {modMsg && <p role="status" className="text-[13.5px] text-center py-2 bg-sand-light border border-sand rounded-[8px] break-words px-3">{modMsg}</p>}
          {tempPassword && (
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 dark:border-amber-800 rounded-[8px] p-3">
              <p className="text-[13.5px] font-semibold text-amber-800 dark:text-amber-200">Mot de passe temporaire (affiché une seule fois) :</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-surface border border-amber-200 dark:border-amber-800 rounded px-3 py-2 text-[13.5px] break-all select-all">{showTemp ? tempPassword : '••••••••••••'}</code>
                <button onClick={() => setShowTemp(v => !v)} className="px-3 py-2 bg-surface border border-amber-200 dark:border-amber-800 rounded-full text-[12px] shrink-0" aria-label={showTemp ? "Masquer le mot de passe" : "Révéler le mot de passe"}>{showTemp ? 'Masquer' : 'Révéler'}</button>
                <button onClick={() => { navigator.clipboard.writeText(tempPassword); setTimeout(() => { setTempPassword(null); setShowTemp(false); }, 30000); }} className="px-3 py-2 bg-inverse text-white rounded-full text-[12px] shrink-0">Copier</button>
              </div>
              <p className="text-[11.5px] text-amber-700 dark:text-amber-300 mt-1">Transmettez-le hors canal, il s&apos;effacera après copie (30s).</p>
            </div>
          )}
          <div>
            <h4 className="text-[13.5px] font-semibold text-ink mb-2">Modérateurs existants ({moderators.length})</h4>
            <div className="space-y-2">
              {moderators.map((m: Moderator) => (
                <div key={m.id} className="flex flex-wrap justify-between items-center gap-2 border border-sand rounded-[8px] px-3 py-2">
                  <span className="text-[13.5px] text-ink break-words">{m.name} <span className="text-ink-secondary">— {m.email}</span></span>
                  <span className="flex items-center gap-2">
                    <span className={`text-[11.5px] px-2 py-0.5 rounded-full border ${m.isActive ? "bg-success/10 border-success text-success" : "bg-gray-warm border-sand text-ink-secondary"}`}>{m.isActive ? "Actif" : "Désactivé"}</span>
                    <button onClick={() => toggleModerator(m)} className="px-2 py-1 border border-sand rounded-full text-[11.5px] min-h-[32px]">{m.isActive ? "Désactiver" : "Activer"}</button>
                    <button onClick={() => resetModPassword(m)} className="px-2 py-1 border border-sand rounded-full text-[11.5px] min-h-[32px]">Reset mdp</button>
                  </span>
                </div>
              ))}
              {moderators.length === 0 && <p className="text-[13.5px] text-ink-secondary">Aucun modérateur.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function canEditModerator(user: { id: string; role: string } | null, r: Resource) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return r.uploadedBy?.id === user.id;
}
