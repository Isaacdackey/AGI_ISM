"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BookOpen, FileText } from "lucide-react";

export default function SchoolDetail({ params }: { params: { slug: string } }) {
  const [school, setSchool] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  useEffect(()=>{
    api.school(params.slug).then(s=>{
      setSchool(s);
      if (s) api.subjects(`?schoolId=${s.id}`).then(setSubjects).catch(()=>{});
    }).catch(()=>{});
  },[params.slug]);
  if (!school) return <div className="py-10 text-center text-[13.5px] text-ink-secondary">Chargement...</div>;
  return (
    <div className="space-y-6 overflow-hidden">
      <Breadcrumbs items={[{label:"Accueil",href:"/"},{label:"Écoles",href:"/ecoles"},{label:school.name}]} />
      <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[12px] flex items-center justify-center text-white shrink-0" style={{background:school.color}}><BookOpen className="w-6 h-6 sm:w-7 sm:h-7 shrink-0"/></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] sm:text-2xl font-bold text-ink font-poppins leading-tight break-words">{school.name}</h1>
          <p className="text-[13.5px] sm:text-[14px] text-ink-secondary mt-1 leading-[1.5]">{school.description}</p>
          <p className="text-[11.5px] sm:text-[12px] text-ink-secondary mt-2">{school.campus?.name} - {subjects.length} matières</p>
        </div>
      </div>
      <h2 className="text-[18px] sm:text-lg font-semibold text-ink font-poppins">Matières</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(sub=>(
          <Link key={sub.id} href={`/matieres/${sub.slug}`} className="bg-surface rounded-[12px] border border-sand p-4 hover:shadow-sm hover:border-terracotta-action/20 transition overflow-hidden">
            <h3 className="font-semibold text-ink text-[15px] leading-tight line-clamp-2">{sub.name}</h3>
            <p className="text-[13.5px] text-ink-secondary line-clamp-2 mt-1 leading-[1.5]">{sub.description}</p>
            <div className="text-[11.5px] text-ink-secondary mt-2 flex items-center gap-1"><FileText className="w-3 h-3 shrink-0"/>{sub._count?.resources||0} ressources</div>
          </Link>
        ))}
        {subjects.length===0 && <p className="text-ink-secondary text-[13.5px] col-span-full">Aucune matière pour cette école.</p>}
      </div>
    </div>
  );
}
