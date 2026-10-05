"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GraduationCap } from "lucide-react";

export default function EcolesPage() {
  const [schools, setSchools] = useState<any[]>([]);
  useEffect(()=>{ api.schools().then(setSchools).catch(()=>{}); },[]);
  return (
    <div className="space-y-6 overflow-hidden">
      <Breadcrumbs items={[{label:"Accueil",href:"/"},{label:"Écoles"}]} />
      <div className="space-y-2">
        <h1 className="text-[20px] sm:text-2xl font-bold text-ink flex items-center gap-2 font-poppins"><GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-brand shrink-0" /> Écoles & Instituts - AGI ISM</h1>
        <p className="text-[13.5px] sm:text-[14px] text-ink-secondary leading-[1.5]">Les 5 écoles officielles du AGI ISM. Sélectionnez une école pour découvrir ses filières et ressources.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {schools.map(s=>(
          <Link key={s.id} href={`/ecoles/${s.slug}`} className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 hover:shadow-sm hover:border-terracotta-action/20 flex gap-3 sm:gap-4 transition overflow-hidden">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[12px] flex items-center justify-center text-white shrink-0" style={{background:s.color}}><GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"/></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-poppins font-semibold text-ink text-[15px] sm:text-[16px] leading-tight line-clamp-2">{s.name}</h3>
              <p className="text-[13.5px] text-ink-secondary mt-1 line-clamp-2 leading-[1.5]">{s.description}</p>
              <div className="text-[11.5px] text-ink-secondary mt-2">{s._count?.subjects} filières - {s._count?.resources} ressources</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
