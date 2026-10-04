"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Props = { onChange: (filters: any) => void; initial?: any; };

export function Filters({ onChange, initial }: Props) {
  const [campuses, setCampuses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [campusId, setCampusId] = useState(initial?.campusId || "");
  const [schoolId, setSchoolId] = useState(initial?.schoolId || "");
  const [subjectId, setSubjectId] = useState(initial?.subjectId || "");
  const [type, setType] = useState(initial?.type || "");
  const [level, setLevel] = useState(initial?.level || "");
  const [semester, setSemester] = useState(initial?.semester || "");
  const [year, setYear] = useState(initial?.year || "");
  const [search, setSearch] = useState(initial?.search || "");
  const [status, setStatus] = useState(initial?.status || "");
  const { user } = useAuth();
  const isPrivileged = user && (user.role==='ADMIN' || user.role==='MODERATOR');
  const years = Array.from({length: 6}, (_,i)=> new Date().getFullYear() - i);

  useEffect(()=>{ api.campuses().then(setCampuses).catch(()=>{}); },[]);
  useEffect(()=>{
    const q = campusId ? `?campusId=${campusId}` : '';
    api.schools(q).then(setSchools).catch(()=>{});
    setSchoolId("");
  },[campusId]);
  useEffect(()=>{
    if (schoolId) api.subjects(`?schoolId=${schoolId}`).then(setSubjects).catch(()=>{});
    else setSubjects([]);
    setSubjectId("");
  },[schoolId]);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(()=>{ const t=setTimeout(()=>setDebouncedSearch(search),300); return ()=>clearTimeout(t); },[search]);

  useEffect(()=>{ onChange({ campusId, schoolId, subjectId, type, level, semester, year: year?Number(year):undefined, search: debouncedSearch, status: isPrivileged ? status : undefined }); },[campusId, schoolId, subjectId, type, level, semester, year, debouncedSearch, status, isPrivileged]);

  return (
    <div className="bg-white rounded-[12px] border border-sand p-3 sm:p-4 flex flex-wrap gap-2 sm:gap-3">
      <label htmlFor="filters-search" className="sr-only">Recherche titre, tags, école</label>
      <input id="filters-search" placeholder="Recherche titre, tags, école..." value={search} onChange={e=>setSearch(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] flex-1 min-w-[180px] focus:border-terracotta-action focus:ring-1 focus:ring-terracotta-action outline-none bg-white min-h-[40px]" />
      <label htmlFor="filters-campus" className="sr-only">Campus</label>
      <select id="filters-campus" value={campusId} onChange={e=>setCampusId(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none min-h-[40px] flex-1 sm:flex-none min-w-[130px]">
        <option value="">Tous campus</option>
        {campuses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <label htmlFor="filters-school" className="sr-only">École</label>
      <select id="filters-school" value={schoolId} onChange={e=>setSchoolId(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none min-h-[40px] flex-1 sm:flex-none min-w-[130px]">
        <option value="">Toutes écoles</option>
        {schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <label htmlFor="filters-subject" className="sr-only">Matière</label>
      <select id="filters-subject" value={subjectId} onChange={e=>setSubjectId(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none disabled:bg-gray-warm min-h-[40px] flex-1 sm:flex-none min-w-[130px]" disabled={!schoolId}>
        <option value="">Toutes matières</option>
        {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <label htmlFor="filters-type" className="sr-only">Type</label>
      <select id="filters-type" value={type} onChange={e=>setType(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none min-h-[40px] flex-1 sm:flex-none min-w-[120px]">
        <option value="">Tous types</option>
        {["COURS","TD","TP","CONTROLE","EXAMEN","DEVOIR","PROJET","CORRECTION","FICHE_REVISION","ANNALE","AUTRE"].map(t=><option key={t} value={t}>{t}</option>)}
      </select>
      <label htmlFor="filters-level" className="sr-only">Niveau</label>
      <select id="filters-level" value={level} onChange={e=>setLevel(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none min-h-[40px] flex-1 sm:flex-none min-w-[110px]">
        <option value="">Tous niveaux</option>
        {["L1","L2","L3","M1","M2"].map(l=><option key={l} value={l}>{l}</option>)}
      </select>
      <label htmlFor="filters-semester" className="sr-only">Semestre</label>
      <select id="filters-semester" value={semester} onChange={e=>setSemester(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none min-h-[40px] flex-1 sm:flex-none min-w-[120px]">
        <option value="">Tous semestres</option>
        {["S1","S2","S3","S4","S5","S6"].map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <label htmlFor="filters-year" className="sr-only">Année</label>
      <select id="filters-year" value={year} onChange={e=>setYear(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none min-h-[40px] flex-1 sm:flex-none min-w-[120px]">
        <option value="">Toutes années</option>
        {years.map(y=><option key={y} value={String(y)}>{y}</option>)}
      </select>
      {isPrivileged && (
        <>
          <label htmlFor="filters-status" className="sr-only">Statut</label>
          <select id="filters-status" value={status} onChange={e=>setStatus(e.target.value)} className="border border-sand rounded-[8px] px-3 sm:px-4 py-2.5 text-[13.5px] bg-white focus:border-terracotta-action outline-none min-h-[40px] flex-1 sm:flex-none min-w-[120px]">
            <option value="">Tous statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvé</option>
            <option value="REJECTED">Rejeté</option>
          </select>
        </>
      )}
    </div>
  );
}
