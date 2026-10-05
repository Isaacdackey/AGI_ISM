import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "Mentions légales — AGI ISM" };

const INSTAGRAM_URL = "https://www.instagram.com/kazi_prod29";

export default function MentionsLegales() {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[12px] border border-sand p-6 sm:p-8 space-y-4 text-[13.5px] leading-[1.6] text-ink">
      <h1 className="text-[20px] font-bold font-poppins">Mentions légales</h1>
      <p className="text-ink-secondary">
        AGI ISM — Bibliothèque académique : plateforme de partage de ressources pédagogiques
        (cours, TD, contrôles, examens, fiches de révision), proposée par l&apos;Amicale
        des Étudiants Gabonais de l&apos;ISM, Dakar, Sénégal.
        La consultation et le téléchargement sont libres et gratuits, sans compte.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">Éditeur &amp; responsable de publication</h2>
      <p>
        Exploitation : Amicale des Étudiants Gabonais de l&apos;ISM.
        <br />
        Conception et maintenance : <strong>Kazi&nbsp;Prod</strong>.
        <br />
        Instagram :{" "}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-terracotta hover:underline break-all">
          @kazi_prod29
        </a>
        <br />
        Email :{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta hover:underline break-all">
          {CONTACT_EMAIL}
        </a>
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">Hébergement</h2>
      <ul className="list-disc pl-5 space-y-1 text-ink-secondary">
        <li>Application (site + API) : Render, Frankfurt, UE.</li>
        <li>Base de données PostgreSQL : Neon.</li>
        <li>Stockage des fichiers : Cloudflare R2.</li>
      </ul>

      <h2 className="font-semibold font-poppins text-[15px]">Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta hover:underline break-all">
          {CONTACT_EMAIL}
        </a>
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">Données personnelles &amp; cookies</h2>
      <p>
        La consultation est anonyme : aucun compte étudiant, aucune mesure d&apos;audience
        intrusive. Seuls les modérateurs et administrateurs disposent d&apos;un compte
        (email + mot de passe chiffré). Un cookie de session strictement nécessaire
        (`jwt`, HttpOnly, Secure, SameSite=Strict) maintient leur connexion — aucun cookie
        publicitaire ou tiers. Les fichiers déposés (PDF, images) sont conservés pour la
        diffusion pédagogique ; toute demande de suppression ou d&apos;accès s&apos;effectue
        par email à l&apos;adresse ci-dessus.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">Propriété intellectuelle</h2>
      <p>
        Les ressources restent la propriété de leurs auteurs ou ayants droit. En déposant un
        contenu, les modérateurs garantissent détenir les droits nécessaires. Tout contenu
        signalé comme illicite est retiré sous 72&nbsp;h après vérification (voir CGU,
        section signalement).
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">Droit applicable</h2>
      <p className="text-ink-secondary">
        Plateforme exploitée depuis Dakar, Sénégal. En cas de litige, le droit sénégalais
        s&apos;applique et les juridictions de Dakar sont compétentes.
      </p>
    </div>
  );
}
