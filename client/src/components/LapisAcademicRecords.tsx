import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

type AcademicRecord = { source: "openalex" | "osf"; externalId: string; title: string; description?: string | null; year?: number | null; url?: string | null; recordType?: "work" | "project" | "registration" };
type SearchHistory = { id: number; queryText: string; criteriaText: string; resultCount: number; queriedAt: Date | string; sources: unknown; results: unknown };

function asRecords(value: unknown): AcademicRecord[] {
  return Array.isArray(value) ? value.filter((item): item is AcademicRecord => !!item && typeof item === "object" && "externalId" in item && "title" in item) : [];
}

export function LapisAcademicRecords({ lapisProjectId, initialQuery, searches }: { lapisProjectId: number; initialQuery: string; searches: SearchHistory[] }) {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState(initialQuery);
  const [criteria, setCriteria] = useState("Identificar trabalhos, projetos e registros públicos potencialmente próximos à proposta.");
  const mutation = trpc.lapis.searchAcademicRecords.useMutation({
    onSuccess: result => {
      utils.lapis.workspace.invalidate({ lapisProjectId });
      toast.success(`${result.records.length} registro(s) consultado(s) com proveniência salva.`);
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!query.trim() && initialQuery.trim()) setQuery(initialQuery);
  }, [initialQuery, query]);

  const latest = searches[0];
  const records = latest ? asRecords(latest.results) : [];
  return <section className="border border-amber-200 bg-amber-50/40 p-4 md:p-5" aria-labelledby="academic-records-heading">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-800" /><p className="text-[10px] font-bold tracking-[.16em] text-amber-800">VERIFICAÇÃO EXTERNA RASTREÁVEL</p></div><h5 id="academic-records-heading" className="mt-2 font-reading text-lg font-black text-[#0A192F]">Buscar registros acadêmicos</h5><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600">Consulta pública em OpenAlex e OSF para apoiar a avaliação de proximidade conceitual. Os resultados indicam correspondências potenciais, não confirmam duplicidade nem substituem a avaliação do pesquisador.</p></div>{latest && <Badge variant="outline" className="w-fit rounded-none border-amber-300 bg-white text-xs text-amber-900">última consulta: {new Date(latest.queriedAt).toLocaleDateString("pt-BR")}</Badge>}</div>
    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><div className="space-y-1.5"><Label htmlFor="record-search-query" className="text-xs">Termos de consulta</Label><Input id="record-search-query" value={query} onChange={event => setQuery(event.target.value)} minLength={3} placeholder="Ex.: qualidade do sono e desempenho cognitivo" className="h-10 rounded-none bg-white" /></div><Button type="button" onClick={() => mutation.mutate({ lapisProjectId, query, criteria })} disabled={mutation.isPending || query.trim().length < 3} className="self-end rounded-none bg-[#0A192F] text-white hover:bg-[#152c4b]">{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Consultar registros</Button></div>
    <div className="mt-3 space-y-1.5"><Label htmlFor="record-search-criteria" className="text-xs">Critério de comparação</Label><Textarea id="record-search-criteria" value={criteria} onChange={event => setCriteria(event.target.value)} className="min-h-18 rounded-none bg-white text-xs" /></div>
    {latest ? <div className="mt-5 border-t border-amber-200 pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[#0A192F]">Resultado persistido: {latest.resultCount} registro(s)</p><p className="text-[11px] text-slate-500">Consulta: {latest.queryText}</p></div><p className="mt-1 text-[11px] leading-5 text-slate-500">Critério: {latest.criteriaText}</p>{records.length ? <div className="mt-3 space-y-2">{records.slice(0, 6).map(record => <article key={`${record.source}-${record.externalId}`} className="border border-amber-100 bg-white px-3 py-3"><div className="flex flex-col justify-between gap-2 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><Badge className="rounded-none border-0 bg-slate-100 text-[10px] uppercase text-slate-600">{record.source}</Badge><Badge variant="outline" className="rounded-none border-slate-200 text-[10px] text-slate-500">{record.recordType ?? "registro"}</Badge>{record.year && <span className="text-[11px] text-slate-500">{record.year}</span>}</div><p className="mt-2 text-sm font-bold text-[#0A192F]">{record.title}</p>{record.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{record.description}</p>}</div>{record.url && <a href={record.url} target="_blank" rel="noreferrer" className="inline-flex h-fit items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950">Abrir fonte<ExternalLink className="h-3.5 w-3.5" /></a>}</div></article>)}</div> : <p className="mt-3 text-xs leading-5 text-slate-600">Nenhum registro foi devolvido pelas fontes disponíveis. A consulta e o estado de cada fonte permanecem na trilha do caderno.</p>}</div> : <p className="mt-4 text-xs leading-5 text-slate-600">Ainda não há consultas registradas neste caderno. A busca será salva com termos, critérios, fontes consultadas, data e resultados.</p>}
  </section>;
}
