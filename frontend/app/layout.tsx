import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/Header";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "AGI ISM - Bibliothèque Académique", description: "Bibliothèque numérique du AGI ISM Dakar" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-white min-h-screen flex flex-col overflow-x-hidden">
        <AuthProvider>
          <Header />
          <main className="max-w-[1440px] mx-auto px-4 md:px-[24px] py-6 pb-8 w-full flex-1 min-w-0">{children}</main>
          <footer className="mt-auto border-t border-sand bg-white">
            <div className="max-w-[1440px] mx-auto px-4 md:px-[24px] py-8 flex flex-col md:flex-row justify-between gap-6 text-[11.5px] text-ink-secondary">
              <div>
                <div className="font-poppins font-semibold text-ink text-[13.5px]">AGI ISM</div>
                <div>Dakar - Sénégal</div>
                <div className="mt-1">Bibliothèque académique numérique</div>
              </div>
              <div className="flex flex-col gap-1 md:items-end md:text-right">
                <div>2026-2027 AGI ISM. Tous droits réservés.</div>
                <div>Réalisé par <span className="font-semibold text-ink">Kazi OTP</span></div>
                <div>Contact : <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-ink hover:text-terracotta-pressed hover:underline break-all">{CONTACT_EMAIL}</a></div>
                <div className="flex gap-3 md:justify-end">
                  <Link href="/mentions-legales" className="hover:text-terracotta-pressed hover:underline">Mentions légales</Link>
                  <Link href="/cgu" className="hover:text-terracotta-pressed hover:underline">CGU</Link>
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
