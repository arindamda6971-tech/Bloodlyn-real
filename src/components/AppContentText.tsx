import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppFaq } from "@/lib/app-content";

/** A page written in Admin: plain text, a paragraph per blank line, line breaks kept. */
export function AppPageText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={cn("space-y-4 text-sm leading-relaxed text-slate-600", className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

/** FAQ questions from Admin, each opening to its answer. */
export function AppFaqList({ faqs, className }: { faqs: AppFaq[]; className?: string }) {
  if (!faqs.length) return null;
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm", className)}>
      {faqs.map((f, idx) => (
        <details key={f.id} className={cn("group", idx !== faqs.length - 1 && "border-b border-slate-50")}>
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-left [&::-webkit-details-marker]:hidden">
            <span className="flex-1 text-sm font-bold text-slate-900">{f.question}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <p className="whitespace-pre-line px-4 pb-4 text-[13px] leading-relaxed text-slate-600">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
