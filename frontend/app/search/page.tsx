"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { api } from "@/lib/api";
import { ResourceCard } from "@/components/ResourceCard";
import { Filters } from "@/components/Filters";

function SearchContent() {
  const sp = useSearchParams();
  const q = sp.get('q') || "";
  const [resources, setResources] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<any>({ search: q });
  useEffect(()=>{ setFilters((f:any)=>({...f, search:q})); },[q]);
  useEffect(()=>{
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.campusId) params.set('campusId', filters.campusId);
    if (filters.schoolId) params.set('schoolId', filters.schoolId);
    if (filters.subjectId) params.set('subjectId', filters.subjectId);
    if (filters.type) params.set('type', filters.type);
    if (filters.level) params.set('level', filters.level);
    if (filters.semester) params.set('semester', filters.semester);
    if (filters.year) params.set('year', String(filters.year));
    if (filters.status) params.set('status', filters.status);
    params.set('limit','12');
    api.resources(`?${params.toString()}`).then((r:any)=>{ setResources(r.data||[]); setTotal(r.total||0); }).catch(()=>{});
  },[filters]);
  return (
    <div className="space-y-6 overflow-hidden">
      <h1 className="text-[18px] sm:text-[21px] font-bold text-ink font-poppins break-words leading-tight">Recherche : {q || filters.search || '-'} <span className="text-[11.5px] text-ink-secondary font-normal">({total})</span></h1>
      <Filters onChange={setFilters} initial={{search:q}} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map(r=><ResourceCard key={r.id} r={r}/>)}
        {resources.length===0 && <p className="text-ink-secondary col-span-full text-center py-10 bg-white rounded-[12px] border border-sand text-[13.5px]">Aucun résultat.</p>}
      </div>
    </div>
  );
}
export default function SearchPage(){ return <Suspense><SearchContent/></Suspense>; }
