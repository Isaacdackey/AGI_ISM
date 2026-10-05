"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Search, BookOpen, Upload, LogIn, LogOut, LayoutDashboard, GraduationCap, Library } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const router = useRouter();
  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-sand overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 md:px-[22px] flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="Amicale des Étudiants Gabonais de l'ISM" width={36} height={36} className="w-9 h-9 rounded-full object-cover bg-white border border-sand shrink-0" priority />
          <div className="hidden sm:block">
            <div className="font-poppins font-semibold text-ink leading-none text-[15px]">AGI ISM</div>
            <div className="text-[11.5px] text-ink-secondary -mt-0.5 whitespace-nowrap">Bibliothèque Académique</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 ml-6 text-[13.5px] font-medium shrink-0">
          <Link href="/ecoles" className="hover:text-brand-pressed flex items-center gap-1.5 text-ink"><GraduationCap className="w-[16px] h-[16px]" /> Écoles</Link>
          <Link href="/filieres" className="hover:text-brand-pressed flex items-center gap-1.5 text-ink"><BookOpen className="w-[16px] h-[16px]" /> Filières</Link>
          <Link href="/ressources" className="hover:text-brand-pressed flex items-center gap-1.5 text-ink"><Library className="w-[16px] h-[16px]" /> Ressources</Link>
        </nav>
        <form onSubmit={onSearch} role="search" className="order-last md:order-none w-full md:flex-1 md:max-w-md md:ml-auto flex items-center bg-gray-warm rounded-[8px] px-3 py-2 md:py-1.5 border border-sand min-w-0">
          <Search className="w-[16px] h-[16px] text-ink-secondary shrink-0" />
          <label htmlFor="header-search" className="sr-only">Rechercher</label>
          <input id="header-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher cours, TD, examens..." className="bg-transparent outline-none flex-1 min-w-0 px-2 text-[13.5px] placeholder:text-ink-secondary w-full" />
        </form>
        <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
          <ThemeToggle />
          {user && (user.role==='ADMIN' || user.role==='MODERATOR') && (
            <Link href="/upload" className="hidden md:inline-flex items-center gap-1.5 bg-terracotta-action text-white px-4 h-[44px] md:h-[48px] rounded-full text-[14px] md:text-[15px] font-semibold hover:bg-terracotta-pressed whitespace-nowrap"><Upload className="w-[16px] h-[16px]"/> Déposer</Link>
          )}
          {user ? (
            <>
              {(user.role==='ADMIN'||user.role==='MODERATOR') && <Link href="/admin" aria-label="Administration" className="p-2 rounded-full hover:bg-gray-warm border border-transparent hover:border-sand shrink-0"><LayoutDashboard className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-ink"/></Link>}
              <span className="hidden lg:inline text-[13.5px] text-ink max-w-[120px] truncate">{user.name} <span className="text-[11.5px] text-ink-secondary">({user.role})</span></span>
              <Link href="/compte/mot-de-passe" className="hidden sm:inline text-[13px] text-ink-secondary hover:text-brand-pressed whitespace-nowrap">Mot de passe</Link>
              <button onClick={logout} aria-label="Se déconnecter" className="p-2 hover:bg-gray-warm rounded-full border border-transparent hover:border-sand shrink-0"><LogOut className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-ink"/></button>
            </>
          ) : (
            <Link href="/login" className="inline-flex items-center gap-1.5 border border-sand text-ink px-3 md:px-4 h-9 md:h-[48px] rounded-full text-[13px] md:text-[15px] font-semibold hover:border-terracotta-action hover:text-brand-pressed bg-surface whitespace-nowrap shrink-0">
              <LogIn className="w-[16px] h-[16px] shrink-0"/>
              <span className="hidden sm:inline">Espace modération</span>
              <span className="sm:hidden">Connexion</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
