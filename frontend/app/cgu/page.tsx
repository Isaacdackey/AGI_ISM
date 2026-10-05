import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "CGU — AGI ISM" };

export default function Cgu() {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[12px] border border-sand p-6 sm:p-8 space-y-4 text-[13.5px] leading-[1.6] text-ink">
      <h1 className="text-[20px] font-bold font-poppins">Conditions générales d&apos;utilisation</h1>
      <p className="text-ink-secondary">Dernière mise à jour : octobre 2026.</p>

      <h2 className="font-semibold font-poppins text-[15px]">1. Objet</h2>
      <p>
        La plateforme AGI ISM — Bibliothèque académique, proposée par l&apos;Amicale des
        Étudiants Gabonais de l&apos;ISM, permet de consulter et télécharger librement,
        sans compte, des ressources pédagogiques (cours, TD, contrôles, examens, fiches
        de révision). Seuls les modérateurs et administrateurs déposent des contenus,
        publiés après validation par un administrateur.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">2. Accès au service</h2>
      <p>
        L&apos;accès est gratuit et ne nécessite aucune inscription. La plateforme est
        fournie en l&apos;état et au mieux des disponibilités (hébergement mutualisé :
        un premier chargement peut prendre quelques dizaines de secondes après une
        période d&apos;inactivité).
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">3. Dépôt de ressources</h2>
      <p>
        Seuls les modérateurs et administrateurs peuvent déposer des fichiers
        (PDF, PNG, JPEG, WEBP — 10&nbsp;Mo maximum). Chaque dépôt est relu avant
        publication : il reste en attente jusqu&apos;à sa validation (ou son rejet)
        par un administrateur. En déposant, vous garantissez détenir les droits
        nécessaires et que le contenu ne porte atteinte ni aux droits de tiers, ni à
        l&apos;ordre public.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">4. Signalement et retrait (sous 72&nbsp;h)</h2>
      <p>
        Tout contenu portant atteinte à vos droits peut être signalé à{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta hover:underline break-all">
          {CONTACT_EMAIL}
        </a>{" "}
        en précisant le titre et le lien de la ressource. Après vérification, le contenu
        est retiré sous 72&nbsp;h.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">5. Comptes modération</h2>
      <p>
        Les comptes modérateurs sont créés par l&apos;administrateur (mot de passe
        temporaire à changer dès la première connexion). Ils sont strictement
        personnels : tout usage abusif ou partage entraîne la désactivation du compte.
        La déconnexion révoque la session sur tous les appareils.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">6. Données personnelles</h2>
      <p>
        La consultation est anonyme. Les seules données conservées concernent les
        comptes de modération (nom, email, mot de passe chiffré) et les fichiers
        déposés. Un cookie de session strictement nécessaire (`jwt`, HttpOnly, Secure,
        SameSite=Strict) maintient la connexion des modérateurs et administrateurs.
        Pour exercer vos droits (accès, rectification, suppression), écrivez à{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta hover:underline break-all">
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">7. Conservation des fichiers</h2>
      <p>
        Les fichiers sont stockés sur Cloudflare R2 et conservés tant que la ressource
        est publiée. Toute ressource retirée (par l&apos;administrateur ou sur
        signalement fondé) est supprimée du stockage. Aucune durée de conservation
        supplémentaire n&apos;est appliquée au-delà de la publication.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">8. Propriété intellectuelle</h2>
      <p>
        Les ressources restent la propriété de leurs auteurs ou ayants droit. Toute
        reproduction en dehors du cadre pédagogique privé est interdite sans
        autorisation.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">9. Droit applicable et juridiction</h2>
      <p>
        Plateforme exploitée depuis Dakar, Sénégal. Le droit sénégalais s&apos;applique
        et les juridictions de Dakar sont compétentes en cas de litige.
      </p>

      <h2 className="font-semibold font-poppins text-[15px]">10. Évolution des CGU</h2>
      <p>
        Ces conditions peuvent évoluer ; la version en ligne prévaut. En cas de
        modification substantielle, un bandeau d&apos;information sera affiché sur la
        plateforme.
      </p>
    </div>
  );
}
