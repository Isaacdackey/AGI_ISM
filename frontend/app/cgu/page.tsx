import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "CGU — AGI ISM" };

export default function Cgu() {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[12px] border border-sand p-6 sm:p-8 space-y-4 text-[13.5px] leading-[1.6] text-ink">
      <h1 className="text-[20px] font-bold font-poppins">Conditions générales d&apos;utilisation</h1>
      <h2 className="font-semibold font-poppins text-[15px]">1. Objet</h2>
      <p>La plateforme AGI ISM — Bibliothèque académique permet de consulter, télécharger et (pour les modérateurs) déposer des ressources pédagogiques. La consultation et le téléchargement sont libres, sans compte.</p>
      <h2 className="font-semibold font-poppins text-[15px]">2. Dépôt de ressources</h2>
      <p>Seuls les modérateurs et administrateurs déposent des contenus, qui sont publiés après validation par un administrateur. En déposant, vous garantissez détenir les droits nécessaires.</p>
      <h2 className="font-semibold font-poppins text-[15px]">3. Signalement et retrait (sous 72 h)</h2>
      <p>Tout contenu portant atteinte à vos droits peut être signalé à <a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta hover:underline break-all">{CONTACT_EMAIL}</a> en précisant le titre et le lien de la ressource. Après vérification, le contenu est retiré sous 72 h.</p>
      <h2 className="font-semibold font-poppins text-[15px]">4. Comptes modération</h2>
      <p>Les comptes modérateurs sont créés par l&apos;administrateur. Tout usage abusif entraîne la désactivation du compte.</p>
      <h2 className="font-semibold font-poppins text-[15px]">5. Mentions à compléter</h2>
      <p>À COMPLÉTER par le propriétaire : droit applicable, juridiction compétente, politique de conservation des fichiers.</p>
    </div>
  );
}
