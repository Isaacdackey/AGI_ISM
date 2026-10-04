import Link from "next/link";
import { ChevronRight } from "lucide-react";
export function Breadcrumbs({ items }: { items: { label:string, href?:string }[] }) {
  return (
    <nav className="flex items-center gap-1 text-[11.5px] sm:text-[12px] text-ink-secondary flex-wrap leading-tight">
      {items.map((it,i)=>(
        <span key={i} className="flex items-center gap-1 min-w-0">
          {i>0 && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 shrink-0"/>}
          {it.href ? <Link href={it.href} className="hover:text-terracotta-pressed hover:underline transition truncate">{it.label}</Link> : <span className="text-ink font-medium truncate">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
