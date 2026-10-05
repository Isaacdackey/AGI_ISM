"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ResourceCard } from "@/components/ResourceCard";
import Link from "next/link";

export default function SubjectPage({ params }: { params: { slug: string } }) {
  const [subject, setSubject] = useState<any>(null);
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [filterType, setFilterType] = useState("");

  useEffect(()=>{ api.subject(params.slug).then(setSubject).catch(()=>{}); },[params.slug]);
  useEffect(()=>{
    if (!subject) return;
    const q = `?subjectId=${subject.id}` + (filterType?`&type=${filterType}`:"");
    api.resources(q).then((res:any)=>{
      const data = res.data || res;
      const g: Record<string,any[]> = {};
      data.forEach((r:any)=>{ (g[r.type]=g[r.type]||[]).push(r); });
      setGrouped(g);
    }).catch(()=>{});
  },[subject, filterType]);

  if (!subject) return <div className="py-10 text-center text-[13.5px] text-ink-secondary">Chargement...</div>;
  const types = ["COURS","TD","TP","CONTROLE","EXAMEN","DEVOIR","PROJET","CORRECTION","FICHE_REVISION","ANNALE","AUTRE"];
  return (
    <div className="space-y-6 overflow-hidden">
      <Breadcrumbs items={[{label:"Accueil",href:"/"},{label:"Écoles",href:"/ecoles"},{label:subject.school?.name, href:`/ecoles/${subject.school?.slug}`},{label:subject.name}]} />
      <div className="bg-surface rounded-[12px] border border-sand p-4 sm:p-6 overflow-hidden">
        <h1 className="text-[20px] sm:text-[21px] font-bold text-ink font-poppins leading-tight break-words">{subject.name}</h1>
        <p className="text-[13.5px] text-ink-secondary mt-1 leading-[1.5] break-words">{subject.school?.name} - {subject.description}</p>
        <div className="flex gap-2 mt-4 flex-wrap">
          <button onClick={()=>setFilterType("")} className={`px-3 py-2 rounded-full text-[13.5px] border min-h-[36px] sm:min-h-[40px] transition shrink-0 ${!filterType?"bg-inverse text-white border-inverse":"bg-surface border-sand hover:border-inverse text-ink"}`}>Tous</button>
          {types.map(t=>(
            <button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 sm:py-2 rounded-full text-[12px] sm:text-[13.5px] border min-h-[36px] sm:min-h-[40px] transition shrink-0 ${filterType===t?"bg-terracotta-action text-white border-terracotta-action hover:bg-terracotta-pressed":"bg-surface border-sand hover:border-terracotta-action hover:text-brand-pressed text-ink"}`}>{t}</button>
          ))}
        </div>
      </div>
      {Object.entries(grouped).length===0 && <p className="text-ink-secondary bg-surface rounded-[12px] border border-sand p-6 text-center text-[13.5px]">Aucune ressource pour ce filtre.</p>}
      {Object.entries(grouped).map(([type, list])=>(
        <div key={type}>
          <h2 className="font-semibold text-ink mb-3 font-poppins text-[15px] sm:text-[16px]">{type} <span className="text-ink-secondary font-normal">({list.length})</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(r=><ResourceCard key={r.id} r={r}/>)}
          </div>
        </div>
      ))}
    </div>
  );
}
