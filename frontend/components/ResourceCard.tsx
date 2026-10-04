import Link from "next/link";
import { FileText, Download, Tag } from "lucide-react";
export function ResourceCard({ r }: { r:any }) {
  const typeColor: Record<string,string> = { COURS:"bg-green text-white", TD:"bg-gray-warm text-ink border border-sand", EXAMEN:"bg-terracotta text-white", CONTROLE:"bg-ink text-white" };
  return (
    <Link href={`/ressources/${r.slug}`} className="bg-white rounded-[12px] border border-sand p-4 hover:border-terracotta-action/30 transition block overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-[11.5px] px-2 py-1 rounded-full font-medium shrink-0 ${typeColor[r.type]||'bg-gray-warm text-ink border border-sand'}`}>{r.type}</span>
        {r.level && <span className="text-[11.5px] bg-gray-warm border border-sand px-2 py-1 rounded-full text-ink-secondary shrink-0">{r.level}</span>}
        {r.semester && <span className="text-[11.5px] bg-gray-warm border border-sand px-2 py-1 rounded-full text-ink-secondary shrink-0">{r.semester}</span>}
        {r.status && r.status!=='APPROVED' && <span className={`text-[11.5px] px-2 py-1 rounded-full font-medium shrink-0 ${r.status==='PENDING'?'bg-gold text-white':'bg-red-500 text-white'}`}>{r.status}</span>}
      </div>
      <h3 className="font-poppins font-semibold text-[15px] text-ink line-clamp-2 leading-[1.3] break-words">{r.title}</h3>
      <p className="text-[13.5px] text-ink-secondary mt-1 line-clamp-2 leading-[1.5] break-words">{r.description}</p>
      <div className="flex items-center gap-2 mt-3 text-[11.5px] text-ink-secondary flex-wrap">
        <span className="truncate">{r.school?.name}</span><span className="shrink-0">-</span><span className="truncate">{r.subject?.name}</span>
      </div>
      <div className="flex items-center gap-3 mt-3 text-[11.5px] text-ink-secondary flex-wrap">
        <span className="flex items-center gap-1 shrink-0"><Download className="w-3 h-3 shrink-0"/>{r.downloadCount}</span>
        <span className="shrink-0">{r.year}</span>
        <span className="flex items-center gap-1 min-w-0"><Tag className="w-3 h-3 shrink-0"/>{r.tags?.slice(0,2).join(', ')}</span>
      </div>
    </Link>
  );
}
