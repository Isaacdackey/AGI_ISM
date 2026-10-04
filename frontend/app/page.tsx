"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ResourceCard } from "@/components/ResourceCard";
import { ArrowRight, BookOpen, GraduationCap, FileText, Users, Sparkles, Library, TrendingUp } from "lucide-react";

export default function Home() {
  const [schools, setSchools] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(()=>{
    api.schools().then(setSchools).catch(()=>{});
    api.resources('?limit=6').then((r:any)=>setResources(r.data||r)).catch(()=>{});
  },[]);

  return (
    <div className="space-y-8 overflow-hidden">
      <section className="bg-ink rounded-[16px] text-white p-6 sm:p-8 md:p-12 border border-sand overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-[11.5px] mb-4 border border-white/10"><Library className="w-4 h-4 shrink-0" /> Année académique 2026-2027</div>
          <h1 className="text-[22px] sm:text-[26px] md:text-[28px] font-bold leading-[1.2] font-poppins break-words">Bibliothèque <span className="text-terracotta">Académique</span><br/>AGI ISM</h1>
          <p className="mt-4 text-white/80 max-w-xl text-[13.5px] sm:text-[14px] leading-[1.6]">Centralisez cours, TD, contrôles, examens et fiches de révision du AGI ISM. Révisez efficacement, partagez vos ressources, réussissez ensemble.</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link href="/ecoles" className="bg-terracotta-action text-white px-5 sm:px-6 min-h-[44px] sm:min-h-[48px] h-auto py-3 rounded-full font-semibold text-[14px] sm:text-[15px] inline-flex items-center justify-center gap-2 hover:bg-terracotta-pressed text-center leading-tight w-full sm:w-auto">Explorer les écoles <ArrowRight className="w-[16px] h-[16px] shrink-0"/></Link>
            <Link href="/ressources" className="bg-white text-ink px-5 sm:px-6 min-h-[44px] sm:min-h-[48px] h-auto py-3 rounded-full font-semibold text-[14px] sm:text-[15px] inline-flex items-center justify-center gap-2 border border-white hover:bg-gray-warm text-center leading-tight w-full sm:w-auto"><Library className="w-[16px] h-[16px] shrink-0" /> Parcourir les ressources</Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-[18px] sm:text-xl font-semibold text-ink flex items-center gap-2"><GraduationCap className="w-5 h-5 text-terracotta shrink-0" /> Écoles & Instituts</h2>
          <Link href="/ecoles" className="text-[13.5px] text-terracotta font-medium flex items-center gap-1 hover:text-terracotta-pressed transition shrink-0">Voir tout <ArrowRight className="w-[16px] h-[16px]"/></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map(s=>(
            <Link key={s.id} href={`/ecoles/${s.slug}`} className="bg-white rounded-[12px] p-5 border border-sand hover:shadow-none transition group">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white mb-3" style={{background: s.color||'#C1502E'}}><GraduationCap className="w-5 h-5"/></div>
              <h3 className="font-poppins font-semibold text-[15px] text-ink group-hover:text-terracotta line-clamp-2">{s.name}</h3>
              <p className="text-[13.5px] text-ink-secondary line-clamp-2 mt-1 leading-[1.5]">{s.description}</p>
              <div className="text-[11.5px] text-ink-secondary mt-3">{s._count?.subjects || 0} matières - {s._count?.resources || 0} ressources</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-[18px] sm:text-xl font-semibold text-ink flex items-center gap-2"><FileText className="w-5 h-5 text-terracotta shrink-0" /> Dernières ressources</h2>
          <Link href="/ressources" className="text-[13.5px] text-terracotta font-medium hover:text-terracotta-pressed transition shrink-0">Voir tout</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(r=><ResourceCard key={r.id} r={r}/>)}
        </div>
      </section>

      <section className="bg-white rounded-[12px] border border-sand p-4 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
        <div><div className="w-12 h-12 mx-auto bg-sand-light rounded-[12px] flex items-center justify-center mb-2 border border-sand"><BookOpen className="w-[20px] h-[20px] text-terracotta"/></div><div className="font-bold text-ink text-xl font-poppins">{schools.length}</div><div className="text-[11.5px] text-ink-secondary">Ecoles</div></div>
        <div><div className="w-12 h-12 mx-auto bg-sand-light rounded-[12px] flex items-center justify-center mb-2 border border-sand"><FileText className="w-[20px] h-[20px] text-green"/></div><div className="font-bold text-ink text-xl font-poppins">{resources.length}+</div><div className="text-[11.5px] text-ink-secondary">Ressources</div></div>
        <div><div className="w-12 h-12 mx-auto bg-sand-light rounded-[12px] flex items-center justify-center mb-2 border border-sand"><GraduationCap className="w-[20px] h-[20px] text-terracotta"/></div><div className="font-bold text-ink text-xl font-poppins">69</div><div className="text-[11.5px] text-ink-secondary">Matières officielles</div></div>
        <div><div className="w-12 h-12 mx-auto bg-sand-light rounded-[12px] flex items-center justify-center mb-2 border border-sand"><Users className="w-[20px] h-[20px] text-ink"/></div><div className="font-bold text-ink text-xl font-poppins">AGI ISM</div><div className="text-[11.5px] text-ink-secondary">Dakar</div></div>
      </section>
    </div>
  );
}
