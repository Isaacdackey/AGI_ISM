import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { BCRYPT_COST } from '../src/common/utils/bcrypt-cost';

const prisma = new PrismaClient();

function databaseNameOf(url: string): string | null {
  try {
    return new URL(url).pathname.replace(/^\//, '') || null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('Seeding database...');

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error('Seed refusé en production (définir ALLOW_SEED=true pour forcer)');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL manquant — impossible de seeder');
  }

  // Reset destructif : triple verrou, jamais par défaut.
  if (process.env.SEED_RESET === 'true') {
    const dbName = databaseNameOf(databaseUrl);
    if (!process.env.CONFIRM_WIPE || process.env.CONFIRM_WIPE !== dbName) {
      throw new Error(
        'Reset refusé : définissez CONFIRM_WIPE avec le nom exact de la base (extrait de DATABASE_URL).',
      );
    }
    const resourceCount = await prisma.resource.count();
    if (resourceCount > 0) {
      console.warn(
        `ATTENTION : ${resourceCount} ressource(s) vont être supprimées en base — ` +
          'les objets R2 correspondants NE seront PAS supprimés (nettoyage manuel requis).',
      );
    }
    await prisma.resource.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.school.deleteMany();
    await prisma.campus.deleteMany();
    await prisma.user.deleteMany();
    console.log('Reset destructif effectué.');
  }

  // Admin : email normalisé, jamais de valeur par défaut codée en dur.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!adminEmail) {
    throw new Error('SEED_ADMIN_EMAIL manquant — définissez-le dans backend/.env (jamais en dur dans le code)');
  }
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD manquant — définissez-le dans backend/.env (jamais en dur dans le code)');
  }
  const localPart = adminEmail.split('@')[0] || '';
  const passwordWeak = adminPassword.length < 12 || (localPart.length >= 3 && adminPassword.toLowerCase().includes(localPart));
  if (passwordWeak) {
    const message =
      'Mot de passe admin faible : 12 caractères minimum et sans votre identifiant.';
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    console.warn(`[seed] AVERTISSEMENT (dev uniquement) : ${message}`);
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const adminHashed = await bcrypt.hash(adminPassword, BCRYPT_COST);
    await prisma.user.create({
      data: { email: adminEmail, name: 'Admin', password: adminHashed, role: Role.ADMIN },
    });
    console.log('Compte admin créé.');
  } else {
    console.log('Compte admin déjà présent — inchangé.');
  }
  // Modérateurs : créés uniquement via POST /api/admin/moderators (mot de passe temporaire affiché une seule fois).

  const campus = await prisma.campus.upsert({
    where: { slug: 'campus-baobab' },
    update: {
      name: 'Campus Baobab',
      description: 'Campus principal de l’ISM à Dakar, Sénégal.',
      address: 'Ouest Foire, Dakar, Sénégal',
    },
    create: {
      name: 'Campus Baobab',
      slug: 'campus-baobab',
      description: 'Campus principal de l’ISM à Dakar, Sénégal.',
      address: 'Ouest Foire, Dakar, Sénégal',
    },
  });

  // Source: https://www.groupeism.sn/ecole/* - 5 écoles officielles (hors ISM Executive Education)
  // Descriptions reprises du site de l'école (groupeism.sn), pas de l'AGI.
  const schoolsData = [
    { name: 'École de Droit', slug: 'ecole-de-droit', description: 'Plus de 20 ans au service des métiers du Droit. Forme des juristes de haut niveau (Licence, Master, MBA) en droit des affaires, droit public, notarial, maritime et gouvernance des énergies. Pédagogie interactive, réseau international INU Champollion.', color: '#C1502E' },
    { name: 'École d’Ingénieurs', slug: 'ecole-ingenieurs', description: 'Forme des ingénieurs adaptables aux enjeux sociaux et environnementaux : informatique appliquée, génie logiciel, réseaux, cybersécurité, IA, data, télécoms et modélisation statistique. Projets réels, mobilité internationale.', color: '#2E7D6F' },
    { name: 'École de Management', slug: 'ecole-management', description: 'Forme les managers de l’Afrique de demain : finance, marketing, banque, RH, logistique, QHSE, agrobusiness via pédagogie innovante et immersion entreprise.', color: '#B9975B' },
    { name: 'Madiba Leadership Institute', slug: 'madiba-leadership-institute', description: 'École panafricaine de l’ISM. Forme des leaders africains en science politique, relations internationales, gouvernance, communication et journalisme.', color: '#1B2A4E' },
    { name: 'ISM Digital Campus', slug: 'digital-campus', description: 'École du web de l’ISM : développement, UX/UI, marketing digital, data. 12 campus (France, Réunion, Sénégal). Accélère projets intra/entrepreneuriat.', color: '#C1502E' },
  ];

  for (const s of schoolsData) {
    await prisma.school.upsert({
      where: { slug: s.slug },
      update: { name: s.name, description: s.description, color: s.color, campusId: campus.id },
      create: { ...s, campusId: campus.id },
    });
  }
  console.log('Schools synchronisées (upsert)');

  // Filières officielles issues de https://www.groupeism.sn – aucune donnée inventée
  const subjectsData = [
    // === École de Droit (17 formations === groupeism.sn/ecole/ecole-droit)
    { name: 'Droit des Affaires', slug: 'droit-des-affaires', schoolSlug: 'ecole-de-droit', description: 'Licence Droit des Affaires (100% français ou bilingue) & Master Droit des Affaires' },
    { name: 'Administration Publique', slug: 'administration-publique', schoolSlug: 'ecole-de-droit', description: 'Licence Administration Publique' },
    { name: 'Activités Juridiques : Contentieux et Recouvrement', slug: 'contentieux-recouvrement', schoolSlug: 'ecole-de-droit', description: 'Licence Professionnelle Activités Juridiques : Contentieux et Recouvrement' },
    { name: 'Droit des Affaires Comparé', slug: 'droit-affaires-compare', schoolSlug: 'ecole-de-droit', description: 'Licence Droit des Affaires Comparé – double diplôme ISM x INU Champollion Albi/Toulouse' },
    { name: 'Droit - Gestion Comparé', slug: 'droit-gestion-compare', schoolSlug: 'ecole-de-droit', description: 'Licence Droit - Gestion Comparé – double diplôme INU Champollion' },
    { name: 'Droit Public Comparé', slug: 'droit-public-compare', schoolSlug: 'ecole-de-droit', description: 'Licence Droit Public Comparé – double diplôme INU Champollion' },
    { name: 'Juriste d’Entreprise', slug: 'juriste-entreprise', schoolSlug: 'ecole-de-droit', description: 'Licence Juriste d’Entreprise (uniquement L3)' },
    { name: 'Fiscalité - Droit des Affaires', slug: 'fiscalite-droit-affaires', schoolSlug: 'ecole-de-droit', description: 'Master/MBA Fiscalité - Droit des Affaires' },
    { name: 'Droit Notarial et Gestion du Patrimoine', slug: 'droit-notarial-patrimoine', schoolSlug: 'ecole-de-droit', description: 'Master Droit Notarial et Gestion du Patrimoine' },
    { name: 'Droit de l’Entreprise', slug: 'droit-entreprise', schoolSlug: 'ecole-de-droit', description: 'Master Droit de l’entreprise – diplôme délocalisé INU Champollion' },
    { name: 'Droit des Activités Maritimes & Portuaires', slug: 'droit-maritime-portuaire', schoolSlug: 'ecole-de-droit', description: 'Master Droit des Activités Maritimes & Portuaires / MBA Droit Maritime et Management des Activités Portuaires' },
    { name: 'Passation des Marchés', slug: 'passation-marches', schoolSlug: 'ecole-de-droit', description: 'Master Passation des Marchés' },
    { name: 'Droit et Gouvernance des Énergies et des Mines', slug: 'droit-gouvernance-energies', schoolSlug: 'ecole-de-droit', description: 'MBA Droit et Gouvernance des Énergies et des Mines' },
    { name: 'Juriste de Banque Assurance & Compliance', slug: 'juriste-banque-compliance', schoolSlug: 'ecole-de-droit', description: 'MBA Juriste de Banque Assurance & Compliance' },
    { name: 'Droit International des Affaires', slug: 'droit-international-affaires', schoolSlug: 'ecole-de-droit', description: 'MBA Droit International des Affaires' },

    // === École d’Ingénieurs (17 formations === groupeism.sn/ecole/ecole-dingenieurs)
    { name: 'Informatique Appliquée à la Gestion des Entreprises', slug: 'informatique-gestion-entreprises', schoolSlug: 'ecole-ingenieurs', description: 'Licence Informatique Appliquée à la Gestion des Entreprises' },
    { name: 'Technologie - Transport et Logistique', slug: 'technologie-transport-logistique', schoolSlug: 'ecole-ingenieurs', description: 'Licence Informatique Appliquée spécialité Transport Logistique' },
    { name: 'Génie Logiciel - Réseaux et Systèmes', slug: 'genie-logiciel-reseaux', schoolSlug: 'ecole-ingenieurs', description: 'Licence Génie Logiciel – Réseaux et Systèmes' },
    { name: 'Mathématiques Appliquées, Informatique - Économétrie', slug: 'maths-info-econometrie', schoolSlug: 'ecole-ingenieurs', description: 'Licence Mathématiques Appliquées – Informatique et Économétrie' },
    { name: 'Électronique - Télécommunications et Systèmes Embarqués', slug: 'electronique-telecoms-embarques', schoolSlug: 'ecole-ingenieurs', description: 'Licence Électronique Télécommunications et Systèmes Embarqués' },
    { name: 'Modélisation Statistique - Informatique - Économique et Financière', slug: 'modelisation-stat-info-eco', schoolSlug: 'ecole-ingenieurs', description: 'Licence Modélisation Statistique – Informatique - Économique et Financière' },
    { name: 'Informatique (INU Champollion)', slug: 'informatique-inu-champollion', schoolSlug: 'ecole-ingenieurs', description: 'Licence Informatique – diplôme délocalisé INU Champollion Albi/Toulouse' },
    { name: 'Intelligence Artificielle (PSTB)', slug: 'intelligence-artificielle-pstb', schoolSlug: 'ecole-ingenieurs', description: 'Licence Intelligence Artificielle – délocalisée PSTB' },
    { name: 'Cybersécurité (PSTB)', slug: 'cybersecurite-pstb', schoolSlug: 'ecole-ingenieurs', description: 'Licence Cybersécurité – délocalisée PSTB' },
    { name: 'Management de Projets', slug: 'management-projets', schoolSlug: 'ecole-ingenieurs', description: 'Master Management de Projets' },
    { name: 'Management de Projets Internationaux', slug: 'management-projets-internationaux', schoolSlug: 'ecole-ingenieurs', description: 'Mastère Management de Projets Internationaux – double diplôme Senghor Égypte' },
    { name: 'Data - IA (ESG Paris)', slug: 'data-ia-esg', schoolSlug: 'ecole-ingenieurs', description: 'MBA Data - IA – diplôme délocalisé ESG Paris' },
    { name: 'Management et Sécurité des Systèmes d’Information', slug: 'management-securite-si', schoolSlug: 'ecole-ingenieurs', description: 'MBA Management et Sécurité des Systèmes d’Information' },
    { name: 'Actuariat, Big Data, Assurance Quantitative', slug: 'actuariat-big-data', schoolSlug: 'ecole-ingenieurs', description: 'MBA Actuariat, Big Data, Assurance Quantitative' },
    { name: 'Ingénierie Réseaux et Systèmes Décisionnels', slug: 'ingenierie-reseaux-decisionnels', schoolSlug: 'ecole-ingenieurs', description: 'MBA Ingénierie Réseaux et Systèmes Décisionnels' },
    { name: 'Cybersécurité & Cloud (PST&B)', slug: 'cybersecurite-cloud', schoolSlug: 'ecole-ingenieurs', description: 'Mastère Cybersécurité & Cloud – diplôme délocalisé PST&B' },
    { name: 'Blockchain Strategy (PST&B)', slug: 'blockchain-strategy', schoolSlug: 'ecole-ingenieurs', description: 'Mastère Blockchain Strategy – PST&B' },

    // === École de Management (24 formations === groupeism.sn/ecole/ecole-management)
    { name: 'Marketing et Commerce International', slug: 'marketing-commerce-international', schoolSlug: 'ecole-management', description: 'Licence Gestion Marketing et Commerce International – bilingue français/anglais' },
    { name: 'Management International', slug: 'management-international', schoolSlug: 'ecole-management', description: 'Licence Gestion Management International – bilingue ou full english' },
    { name: 'Comptabilité - Finance', slug: 'comptabilite-finance', schoolSlug: 'ecole-management', description: 'Licence Gestion Comptabilité - Finance' },
    { name: 'Organisation - Gestion des Ressources Humaines', slug: 'org-gestion-rh', schoolSlug: 'ecole-management', description: 'Licence Gestion Ressources Humaines' },
    { name: 'Marketing & Communication', slug: 'marketing-communication', schoolSlug: 'ecole-management', description: 'Licence Gestion Marketing & Communication' },
    { name: 'Qualité, Hygiène, Sécurité et Environnement (QHSE)', slug: 'qhse', schoolSlug: 'ecole-management', description: 'Licence & Master QHSE' },
    { name: 'Management des Organisations Agricoles et Agroalimentaires', slug: 'management-agroalimentaire', schoolSlug: 'ecole-management', description: 'Licence Gestion Agrobusiness' },
    { name: 'Administration des Affaires', slug: 'administration-affaires', schoolSlug: 'ecole-management', description: 'Licence Gestion Administration des Affaires' },
    { name: 'Management des Ressources Humaines', slug: 'management-rh', schoolSlug: 'ecole-management', description: 'Master/MBA Management des Ressources Humaines' },
    { name: 'Gestion de la Chaîne Logistique', slug: 'gestion-chaine-logistique', schoolSlug: 'ecole-management', description: 'MBA Gestion de la Chaîne Logistique' },
    { name: 'Agro-business', slug: 'agro-business', schoolSlug: 'ecole-management', description: 'MBA Agro-business' },
    { name: 'Management des Énergies Pétrolières et Gazières', slug: 'management-energies-petrogazieres', schoolSlug: 'ecole-management', description: 'MBA Management des Énergies Pétrolières et Gazières – Univ. Senghor' },
    { name: 'International Management', slug: 'international-management', schoolSlug: 'ecole-management', description: 'Master International Management – full english' },
    { name: 'Business Administration', slug: 'business-administration', schoolSlug: 'ecole-management', description: 'MBA Business Administration – bilingue' },
    { name: 'RSE et Développement Durable', slug: 'rse-developpement-durable', schoolSlug: 'ecole-management', description: 'MBA RSE et Développement Durable' },
    { name: 'Audit, Contrôle de Gestion et Aide à la Décision', slug: 'audit-controle-gestion', schoolSlug: 'ecole-management', description: 'MBA Audit, Contrôle de Gestion et Aide à la Décision' },
    { name: 'Ingénierie Financière', slug: 'ingenierie-financiere', schoolSlug: 'ecole-management', description: 'MBA Ingénierie Financière' },
    { name: 'Banque Assurance', slug: 'banque-assurance', schoolSlug: 'ecole-management', description: 'MBA Banque Assurance' },
    { name: 'Marché Financier et Trading', slug: 'marche-financier-trading', schoolSlug: 'ecole-management', description: 'MBA Marché Financier et Trading' },
    { name: 'Communication, Créativité et Évènementiel', slug: 'communication-creativite-evenementiel', schoolSlug: 'ecole-management', description: 'MBA Communication, Créativité et Évènementiel' },
    { name: 'Finance Digitale (FinTech)', slug: 'finance-digitale-fintech', schoolSlug: 'ecole-management', description: 'MBA Finance Digitale (FinTech)' },
    { name: 'Management, Vente et Relation Client', slug: 'management-vente-relation-client', schoolSlug: 'ecole-management', description: 'MBA Management, Vente et Relation Client (MRC)' },
    { name: 'Management Aéroportuaire et Aéronautique', slug: 'management-aeroportuaire', schoolSlug: 'ecole-management', description: 'MBA Management Aéroportuaire et des Compagnies Aériennes – Univ. Senghor' },

    // === Madiba Leadership Institute (10 formations === groupeism.sn/ecole/madiba-leadership-institute)
    { name: 'Sciences Politiques et Relations Internationales', slug: 'sciences-po-ri', schoolSlug: 'madiba-leadership-institute', description: 'Licence Sciences Politiques et Relations Internationales (100% français ou bilingue) & Master' },
    { name: 'Action Humanitaire', slug: 'action-humanitaire', schoolSlug: 'madiba-leadership-institute', description: 'Licence Sciences Po RI spécialité Action Humanitaire' },
    { name: 'Journalisme et Métiers de l’Information', slug: 'journalisme-metiers-info', schoolSlug: 'madiba-leadership-institute', description: 'Licence Communication et Médias – Journalisme et Métiers de l’Information' },
    { name: 'Communication et Médias', slug: 'communication-medias', schoolSlug: 'madiba-leadership-institute', description: 'Licence Communication et Médias (100% français ou bilingue)' },
    { name: 'Gouvernance et Management Public', slug: 'gouvernance-management-public', schoolSlug: 'madiba-leadership-institute', description: 'Master Gouvernance et Management Public – double diplôme Univ. Senghor' },
    { name: 'Diplomatie et Géostratégie', slug: 'diplomatie-geostrategie', schoolSlug: 'madiba-leadership-institute', description: 'MBA Diplomatie et Géostratégie' },
    { name: 'Décentralisation et Gouvernance Territoriale', slug: 'decentralisation-gouvernance', schoolSlug: 'madiba-leadership-institute', description: 'MBA Décentralisation et Gouvernance Territoriale' },
    { name: 'Communication, Leadership et Relations Publiques', slug: 'communication-leadership-rp', schoolSlug: 'madiba-leadership-institute', description: 'MBA Communication, Leadership et Relations Publiques (CLPR)' },
    { name: 'Paix et Sécurité', slug: 'paix-securite', schoolSlug: 'madiba-leadership-institute', description: 'MBA Paix et Sécurité' },

    // === ISM Digital Campus (6 formations === groupeism.sn/ecole/ism-digital-campus)
    { name: 'Concepteur et Développeur de Solutions Digitales', slug: 'concepteur-developpeur-digital', schoolSlug: 'digital-campus', description: 'Bachelor & Mastère Concepteur et Développeur de Solutions Digitales' },
    { name: 'Chef de Projet Web et Multimédia', slug: 'chef-projet-web-multimedia', schoolSlug: 'digital-campus', description: 'Bachelor Chef de Projet Web et Multimédia – double diplôme Licence Informatique Gestion Entreprises' },
    { name: 'Marketing Digital & Brand Content', slug: 'marketing-digital-brand-content', schoolSlug: 'digital-campus', description: 'Mastère Marketing Digital & Brand Content' },
    { name: 'Big Data & Data Stratégie', slug: 'big-data-strategie', schoolSlug: 'digital-campus', description: 'Mastère Big Data & Data Stratégie' },
    { name: 'UX Design', slug: 'ux-design', schoolSlug: 'digital-campus', description: 'Mastère UX Design' },
  ];

  for (const subj of subjectsData) {
    const school = await prisma.school.findUniqueOrThrow({ where: { slug: subj.schoolSlug } });
    await prisma.subject.upsert({
      where: { slug: subj.slug },
      update: { name: subj.name, description: subj.description, schoolId: school.id },
      create: { name: subj.name, slug: subj.slug, schoolId: school.id, description: subj.description },
    });
  }
  console.log(`Subjects synchronisés (upsert) : ${subjectsData.length}`);

  console.log('Seed terminé (idempotent) : admin + campus/écoles/matières à jour, ressources jamais touchées.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
