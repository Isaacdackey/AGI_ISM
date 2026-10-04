"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function MatieresPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [filterSchool, setFilterSchool] = useState("");
  useEffect(()=>{ api.schools().then(setSchools).catch(()=>{}); },[]);
  useEffect(()=>{
    const q = filterSchool ? `?schoolId=${filterSchool}` : "";
    api.subjects(q).then(setSubjects).catch(()=>{});
  },[filterSchool]);
  return (
    <div className="space-y-6 overflow-hidden">
      <Breadcrumbs items={[{label:"Accueil",href:"/"},{label:"Matières"}]} />
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <h1 className="text-[20px] sm:text-2xl font-bold text-ink font-poppins">Matières</h1>
        <select value={filterSchool} onChange={e=>setFilterSchool(e.target.value)} className="border border-sand rounded-full px-4 py-2 sm:py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none min-h-[40px] w-full sm:w-auto">
          <option value="">Toutes écoles</option>
          {schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(s=>(
          <Link key={s.id} href={`/matieres/${s.slug}`} className="bg-white rounded-[12px] border border-sand p-4 hover:shadow-sm hover:border-terracotta-action/20 transition overflow-hidden">
            <h3 className="font-semibold text-ink text-[15px] leading-tight line-clamp-2">{s.name}</h3>
            <p className="text-[11.5px] text-ink-secondary">{s.school?.name}</p>
            <p className="text-[13.5px] text-ink-secondary mt-1 line-clamp-2 leading-[1.5]">{s.description}</p>
          </Link>
        ))}
        {subjects.length===0 && <p className="text-[13.5px] text-ink-secondary col-span-full text-center py-8 bg-white rounded-[12px] border border-sand">Aucune matière trouvée.</p>}
      </div>
    </div>
  );
}
