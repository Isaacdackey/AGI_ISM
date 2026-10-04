import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "Mentions légales — AGI ISM" };

export default function MentionsLegales() {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[12px] border border-sand p-6 sm:p-8 space-y-4 text-[13.5px] leading-[1.6] text-ink">
      <h1 className="text-[20px] font-bold font-poppins">Mentions légales</h1>
      <p className="text-ink-secondary">AGI ISM — Bibliothèque académique (plateforme de partage de ressources pédagogiques).</p>
      <h2 className="font-semibold font-poppins text-[15px]">Éditeur</h2>
      <p>À COMPLÉTER par le propriétaire : raison sociale, adresse, responsable de publication.</p>
      <h2 className="font-semibold font-poppins text-[15px]">Hébergeur</h2>
      <p>À COMPLÉTER par le propriétaire : hébergeur du frontend, de l&apos;API et de la base de données.</p>
      <h2 className="font-semibold font-poppins text-[15px]">Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta hover:underline break-all">{CONTACT_EMAIL}</a></p>
      <h2 className="font-semibold font-poppins text-[15px]">Propriété intellectuelle</h2>
      <p>Les ressources (cours, annales, examens) restent la propriété de leurs auteurs ou ayants droit. Tout contenu signalé comme illicite est retiré sous 72 h après vérification (voir CGU, section signalement).</p>
    </div>
  );
}
