"use client";
import { useEffect, useRef, useState } from "react";
import { api, resourceDownloadUrl, resourcePreviewUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CONTACT_EMAIL } from "@/lib/contact";
import { Download, Eye, Tag, Calendar, GraduationCap, RefreshCw } from "lucide-react";
import type { Resource } from "@/types";

export default function ResourceDetail({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const [r, setR] = useState<Resource | null>(null);
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);
  const previewBlobRef = useRef<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Tactile (téléphones/tablettes) uniquement : sur PC, le partage Windows
  // s'ouvrirait à la place du téléchargement direct.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia?.('(pointer: coarse)').matches ?? false);
  }, []);
  useEffect(() => { api.resource(params.slug).then(setR).catch(() => {}); }, [params.slug]);
  const loadPreview = () => {
    if (!r) return;
    setPreviewLoading(true); setPreviewError(null);
    const url = resourcePreviewUrl(r.id);
    fetch(url, { credentials: 'include' as RequestCredentials }).then(res => {
      if (!res.ok) throw new Error('Fichier introuvable ou accès refusé');
      return res.blob();
    }).then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = blobUrl;
      setPreviewBlob(blobUrl);
      setPreviewLoading(false);
    }).catch(() => {
      setPreviewError("Impossible de charger l'aperçu du document.");
      setPreviewLoading(false);
    });
  };
  useEffect(() => { if (r) loadPreview(); }, [r]);
  useEffect(() => {
    return () => { if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current); };
  }, []);

  const handleDownload = async () => {
    if (!r) return;
    const url = resourceDownloadUrl(r.id);
    try {
      const res = await fetch(url, { credentials: 'include' as RequestCredentials });
      if (!res.ok) { const t = await res.text(); throw new Error(t || 'Fichier introuvable'); }
      const blob = await res.blob();
      const ext = (r.fileName?.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
      const filename = `${r.slug}.${ext}`;
      // iPhone/Android : Safari ignore souvent l'attribut `download` et ouvre le PDF.
      // Sur tactile uniquement, la Web Share API ouvre la feuille de partage
      // (l'utilisateur choisit "Enregistrer dans Fichiers"). Sur PC on garde
      // le téléchargement direct (sinon Windows ouvre son panneau Partager).
      if (isTouch) {
        try {
          const file = new File([blob], filename, { type: blob.type || 'application/pdf' });
          const nav = navigator as Navigator & { canShare?: (d?: { files?: File[] }) => boolean; share?: (d: { files: File[]; title?: string }) => Promise<void> };
          if (nav.canShare?.({ files: [file] })) {
            await nav.share({ files: [file], title: r.title });
            return;
          }
        } catch (e) {
          // Partage annulé par l'utilisateur : ne pas tomber sur l'ancre.
          if ((e as Error)?.name === 'AbortError') return;
        }
      }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      // Révocation différée : immédiate, certains navigateurs annulent le téléchargement.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch { setPreviewError("Impossible de télécharger le document. Veuillez réessayer."); }
  };

  if (!r) return <div className="py-10 text-center text-[13.5px] text-ink-secondary">Chargement...</div>;
  return (
    <div className="space-y-6 overflow-hidden">
      <Breadcrumbs items={[{ label: "Accueil", href: "/" }, { label: r.school?.name || "", href: `/ecoles/${r.school?.slug || ""}` }, { label: r.subject?.name || "", href: `/filieres/${r.subject?.slug || ""}` }, { label: r.type }, { label: r.title }]} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 overflow-hidden">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-[11.5px] bg-terracotta text-white px-2 py-1 rounded-full shrink-0">{r.type}</span>
              {r.level && <span className="text-[11.5px] bg-gray-warm border border-sand px-2 py-1 rounded-full text-ink-secondary shrink-0">{r.level}</span>}
              <span className="text-[11.5px] bg-gray-warm border border-sand px-2 py-1 rounded-full text-ink-secondary shrink-0">{r.year}</span>
              {isPrivileged && <span className={`text-[11.5px] px-2 py-1 rounded-full shrink-0 ${r.status === 'APPROVED' ? 'bg-green text-white' : 'bg-gold text-white'}`}>{r.status}</span>}
            </div>
            <h1 className="text-[18px] sm:text-[21px] font-bold text-ink font-poppins leading-[1.2] break-words">{r.title}</h1>
            <p className="text-[13.5px] text-ink-secondary mt-2 leading-[1.5] break-words">{r.description}</p>
            <div className="flex flex-wrap gap-2 mt-4 text-[11.5px] text-ink-secondary">
              <span className="flex items-center gap-1"><GraduationCap className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] shrink-0"/>{r.school?.name}</span>
              <span>-</span><span className="break-words">{r.subject?.name}</span>
              <span>-</span><span className="flex items-center gap-1"><Calendar className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] shrink-0"/>{r.semester}</span>
              <span>-</span><span className="flex items-center gap-1"><Download className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] shrink-0"/>{r.downloadCount} téléchargements</span>
            </div>
            {r.tags && r.tags.length > 0 && <div className="flex gap-1.5 mt-3 flex-wrap">{r.tags.map((t: string) => <span key={t} className="text-[11.5px] bg-gray-warm border border-sand px-2 py-1 rounded-full flex items-center gap-1 text-ink-secondary shrink-0"><Tag className="w-3 h-3 shrink-0" />{t}</span>)}</div>}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button onClick={handleDownload} className="bg-terracotta-action text-white px-5 sm:px-6 min-h-[44px] sm:min-h-[48px] h-auto py-3 rounded-full inline-flex items-center justify-center gap-2 font-semibold text-[14px] sm:text-[15px] hover:bg-terracotta-pressed transition w-full sm:w-auto leading-tight"><Download className="w-[16px] h-[16px] shrink-0" /> Télécharger</button>
              <a href={previewBlob || resourcePreviewUrl(r.id)} target="_blank" rel="noopener noreferrer" className="border border-sand text-ink px-5 sm:px-6 min-h-[44px] sm:min-h-[48px] h-auto py-3 rounded-full inline-flex items-center justify-center gap-2 font-semibold text-[14px] sm:text-[15px] hover:border-terracotta-action hover:text-brand-pressed bg-surface transition w-full sm:w-auto leading-tight text-center"><Eye className="w-[16px] h-[16px] shrink-0" /> Aperçu</a>
            </div>
            {isTouch && (
              <p className="text-[11.5px] text-ink-secondary mt-3">
                Sur téléphone, le bouton ouvre la feuille de partage : choisissez « Enregistrer dans Fichiers ».
              </p>
            )}
            <p className="text-[11.5px] text-ink-secondary mt-1">
              Contenu inapproprié ? <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Signalement : ${r.title} (${r.slug})`)}`} className="underline hover:text-brand-pressed">Signaler un contenu</a>
            </p>
          </div>
          <div className="bg-surface rounded-[12px] border border-sand p-2 min-h-[300px] sm:min-h-[400px] flex items-center justify-center overflow-hidden">
            {previewLoading && <div className="py-10 text-ink-secondary text-[13.5px]">Chargement aperçu...</div>}
            {previewError && (
              <div className="text-center py-8 px-4">
                <p className="text-[13.5px] text-red-600 dark:text-red-400">{previewError}</p>
                <button onClick={loadPreview} className="mt-3 inline-flex items-center gap-2 border border-sand px-4 min-h-[40px] rounded-full text-[13.5px] hover:border-inverse"><RefreshCw className="w-4 h-4 shrink-0"/> Réessayer</button>
              </div>
            )}
            {!previewLoading && !previewError && previewBlob && (
              r.mimeType?.startsWith('image/') ? (
                <img src={previewBlob} alt={r.title} className="max-w-full max-h-[500px] sm:max-h-[600px] object-contain rounded-[8px]" />
              ) : (
                <iframe src={previewBlob} className="w-full h-[400px] sm:h-[600px] rounded-[8px] border border-sand" title="Preview" />
              )
            )}
          </div>
        </div>
        <div className="space-y-4 min-w-0">
          <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-5 overflow-hidden">
            <h3 className="font-semibold text-ink mb-3 font-poppins text-[15px]">Informations</h3>
            <dl className="text-[13.5px] space-y-2">
              <div className="flex justify-between gap-2"><dt className="text-ink-secondary shrink-0">École</dt><dd className="font-medium text-ink text-right break-words">{r.school?.name}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-secondary shrink-0">Filière</dt><dd className="font-medium text-ink text-right break-words">{r.subject?.name}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-secondary">Niveau</dt><dd>{r.level||'-'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-secondary">Semestre</dt><dd>{r.semester||'-'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-secondary">Année</dt><dd>{r.year||'-'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-secondary">Taille</dt><dd>{((r.fileSize || 0) / 1024).toFixed(1)} KB</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
