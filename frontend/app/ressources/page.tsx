"use client";
import { useEffect, useState, Suspense } from "react";
import { api } from "@/lib/api";
import { Filters } from "@/components/Filters";
import { ResourceCard } from "@/components/ResourceCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useRouter, useSearchParams } from "next/navigation";

function RessourcesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resources, setResources] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<any>({});
  const [page, setPage] = useState(Number(searchParams.get('page'))||1);
  const limit = 12;
  useEffect(()=>{
    const init:any={};
    ['campusId','schoolId','subjectId','type','level','semester','year','search','status'].forEach(k=>{ const v=searchParams.get(k); if(v) init[k]=v; });
    if(Object.keys(init).length) setFilters(init);
  },[]);
  const fetchData = (f:any, p:number) => {
    const params = new URLSearchParams();
    if (f.search) params.set('search', f.search);
    if (f.campusId) params.set('campusId', f.campusId);
    if (f.schoolId) params.set('schoolId', f.schoolId);
    if (f.subjectId) params.set('subjectId', f.subjectId);
    if (f.type) params.set('type', f.type);
    if (f.level) params.set('level', f.level);
    if (f.semester) params.set('semester', f.semester);
    if (f.year) params.set('year', String(f.year));
    if (f.status) params.set('status', f.status);
    params.set('page', String(p));
    params.set('limit', String(limit));
    api.resources(`?${params.toString()}`).then((res:any)=>{
      setResources(res.data||[]); setTotal(res.total||0); setTotalPages(res.totalPages||1);
    }).catch(()=>{});
  };
  const handleFilters = (f:any) => { setFilters(f); setPage(1); };
  useEffect(()=>{
    fetchData(filters, page);
    const qp = new URLSearchParams();
    Object.entries(filters).forEach(([k,v])=>{ if(v) qp.set(k, String(v)); });
    if(page!==1) qp.set('page', String(page));
    const qs = qp.toString();
    router.replace(qs ? `/ressources?${qs}` : '/ressources', { scroll: false } as any);
  },[filters, page]);
  return (
    <div className="space-y-6 overflow-hidden">
      <Breadcrumbs items={[{label:"Accueil",href:"/"},{label:"Ressources"}]} />
      <h1 className="text-[20px] sm:text-[21px] font-bold text-ink font-poppins">Ressources</h1>
      <Filters onChange={handleFilters} />
      <div className="text-[11.5px] text-ink-secondary">{total} ressource(s) trouvée(s) - page {page}/{totalPages}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map(r=><ResourceCard key={r.id} r={r}/>)}
        {resources.length===0 && <p className="col-span-full text-center text-ink-secondary text-[13.5px] py-8 bg-surface rounded-[12px] border border-sand">Aucune ressource pour ces filtres.</p>}
      </div>
      {totalPages>1 && (
        <div className="flex gap-2 justify-center items-center flex-wrap">
          <button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-4 min-h-[40px] border border-sand rounded-full bg-surface text-[13.5px] disabled:opacity-50 hover:border-inverse transition shrink-0">Précédent</button>
          <span className="px-2 sm:px-4 py-2 text-[13.5px] text-ink whitespace-nowrap">Page {page} / {totalPages}</span>
          <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-4 min-h-[40px] border border-sand rounded-full bg-surface text-[13.5px] disabled:opacity-50 hover:border-inverse transition shrink-0">Suivant</button>
        </div>
      )}
    </div>
  );
}
export default function RessourcesPage(){ return <Suspense><RessourcesContent/></Suspense>; }
