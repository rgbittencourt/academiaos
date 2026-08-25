import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadManuscriptDocx, downloadManuscriptLatex } from "@/lib/manuscriptExport";
import { trpc } from "@/lib/trpc";
import { BookOpenCheck, Braces, Download, ExternalLink, FilePenLine, Loader2, RefreshCw, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ManuscriptSection = { id: string; heading: string; content: string; source: "method" | "synthesis" | "manual" };

const defaultSections: ManuscriptSection[] = [
  { id: "introducao", heading: "Introdução", content: "", source: "manual" },
  { id: "metodo", heading: "Método", content: "", source: "method" },
  { id: "resultados", heading: "Resultados e síntese", content: "", source: "synthesis" },
  { id: "discussao", heading: "Discussão", content: "", source: "manual" },
];

export function LapisGrantWorkspace({ lapisProjectId, selections = [] }: { lapisProjectId: number; selections?: any[] }) {
  const utils = trpc.useUtils();
  const opportunities = trpc.lapis.grantOpportunities.useQuery();
  const sync = trpc.lapis.syncOfficialGrants.useMutation({
    onSuccess: async result => { await utils.lapis.grantOpportunities.invalidate(); toast.success(`${result.synced} registro(s) oficial(is) sincronizado(s).`); },
    onError: error => toast.error(error.message),
  });
  const select = trpc.lapis.selectGrantOpportunity.useMutation({ onSuccess: () => void utils.lapis.workspace.invalidate({ lapisProjectId }) });
  const remove = trpc.lapis.removeGrantOpportunitySelection.useMutation({ onSuccess: () => void utils.lapis.workspace.invalidate({ lapisProjectId }) });
  const selectedIds = useMemo(() => new Set(selections.map(item => item.opportunity?.id)), [selections]);

  return <section className="border-t border-slate-100 pt-7">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-bold tracking-[.16em] text-amber-700">EDITAIS OFICIAIS</p><h3 className="mt-1 font-reading text-xl font-black text-[#0A192F]">Fontes verificáveis para grant writing</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A sincronização consulta páginas públicas oficiais de CNPq e CAPES. Cada registro preserva URL e data da consulta; nenhum critério ausente é inferido.</p></div><Button type="button" onClick={() => sync.mutate()} disabled={sync.isPending} variant="outline" className="rounded-none border-slate-300"><RefreshCw className={sync.isPending ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />{sync.isPending ? "Sincronizando" : "Atualizar fontes"}</Button></div>
    {selections.length > 0 && <div className="mt-4 border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold tracking-wide text-amber-900">EDITAIS SELECIONADOS PARA ESTA PROPOSTA</p><div className="mt-3 space-y-2">{selections.map(item => <div key={item.selection?.id ?? item.opportunity?.id} className="flex items-start justify-between gap-3 text-sm text-slate-700"><a href={item.opportunity.sourceUrl} target="_blank" rel="noreferrer" className="font-medium hover:text-amber-800 hover:underline">{item.opportunity.title}</a><Button type="button" size="icon" variant="ghost" onClick={() => remove.mutate({ lapisProjectId, grantOpportunityId: item.opportunity.id })} aria-label="Remover edital selecionado"><X className="h-4 w-4" /></Button></div>)}</div></div>}
    <div className="mt-4 grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-2">{(opportunities.data ?? []).slice(0, 8).map((opportunity: any) => <article key={opportunity.id} className="bg-white p-4"><div className="flex items-center justify-between gap-3"><Badge className="rounded-none bg-[#0A192F] text-[10px] uppercase">{opportunity.provider}</Badge><span className="text-[10px] text-slate-400">consultado em {new Date(opportunity.sourceFetchedAt).toLocaleDateString("pt-BR")}</span></div><h4 className="mt-3 font-reading text-base font-bold leading-6 text-[#0A192F]">{opportunity.title}</h4>{opportunity.summaryLiteral && <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{opportunity.summaryLiteral}</p>}<div className="mt-4 flex items-center justify-between gap-2"><a href={opportunity.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-bold text-amber-800 hover:underline">Fonte oficial <ExternalLink className="ml-1 h-3 w-3" /></a><Button type="button" size="sm" variant={selectedIds.has(opportunity.id) ? "outline" : "default"} disabled={selectedIds.has(opportunity.id) || select.isPending} onClick={() => select.mutate({ lapisProjectId, grantOpportunityId: opportunity.id })} className={selectedIds.has(opportunity.id) ? "rounded-none" : "rounded-none bg-[#0A192F] hover:bg-[#152c4b]"}>{selectedIds.has(opportunity.id) ? "Selecionado" : "Usar no caderno"}</Button></div></article>)}</div>
    {opportunities.data?.length === 0 && <div className="mt-4 border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-500">Nenhum edital ainda foi carregado. Atualize as fontes para consultar os catálogos públicos disponíveis.</div>}
  </section>;
}

export function LapisManuscriptWorkspace({ lapisProjectId, manuscript, notebookTitle }: { lapisProjectId: number; manuscript?: any; notebookTitle: string }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(manuscript?.title ?? notebookTitle);
  const [abstract, setAbstract] = useState(manuscript?.abstract ?? "");
  const [keywords, setKeywords] = useState(manuscript?.keywords ?? "");
  const [sections, setSections] = useState<ManuscriptSection[]>(manuscript?.sections?.length ? manuscript.sections : defaultSections);
  const [status, setStatus] = useState<"draft" | "review" | "ready">(manuscript?.status ?? "draft");
  const [exporting, setExporting] = useState<"docx" | "latex" | null>(null);
  useEffect(() => { if (manuscript) { setTitle(manuscript.title); setAbstract(manuscript.abstract ?? ""); setKeywords(manuscript.keywords ?? ""); setSections(manuscript.sections?.length ? manuscript.sections : defaultSections); setStatus(manuscript.status); } }, [manuscript]);
  const save = trpc.lapis.updateManuscript.useMutation({ onSuccess: async () => { await utils.lapis.workspace.invalidate({ lapisProjectId }); toast.success("Rascunho de manuscrito salvo."); }, onError: error => toast.error(error.message) });
  const updateSection = (index: number, content: string) => setSections(current => current.map((section, position) => position === index ? { ...section, content } : section));
  const exportInput = { title, abstract, keywords, sections };
  const canExport = title.trim().length >= 3;
  const exportLatex = async () => {
    setExporting("latex");
    try {
      await new Promise(resolve => window.setTimeout(resolve, 0));
      downloadManuscriptLatex(exportInput);
      toast.success("Manuscrito exportado em LaTeX.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar o Manuscrito em LaTeX.");
    } finally {
      setExporting(null);
    }
  };
  const exportDocx = async () => {
    setExporting("docx");
    try {
      await new Promise(resolve => window.setTimeout(resolve, 0));
      await downloadManuscriptDocx(exportInput);
      toast.success("Manuscrito exportado em DOCX.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar o Manuscrito em DOCX.");
    } finally {
      setExporting(null);
    }
  };
  return <section className="border-t border-slate-100 pt-7"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-bold tracking-[.16em] text-amber-700">MANUSCRITO</p><h3 className="mt-1 font-reading text-xl font-black text-[#0A192F]">Da proposta ao texto científico</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Estruture um rascunho ligado ao método e à síntese. As seções indicam se a base veio do Método, da Síntese ou de redação manual.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void exportLatex()} disabled={!canExport || !!exporting} aria-busy={exporting === "latex"} className="rounded-none border-slate-300">{exporting === "latex" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Braces className="mr-2 h-4 w-4" />}{exporting === "latex" ? "Preparando LaTeX" : "Exportar LaTeX"}</Button><Button type="button" variant="outline" onClick={() => void exportDocx()} disabled={!canExport || !!exporting} aria-busy={exporting === "docx"} className="rounded-none border-slate-300">{exporting === "docx" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{exporting === "docx" ? "Preparando DOCX" : "Exportar DOCX"}</Button><Button type="button" onClick={() => save.mutate({ lapisProjectId, manuscript: { title, abstract: abstract || undefined, keywords: keywords || undefined, sections, status } })} disabled={save.isPending || !canExport} className="rounded-none bg-[#0A192F] hover:bg-[#152c4b]">{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePenLine className="mr-2 h-4 w-4" />}Salvar manuscrito</Button></div></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="space-y-2"><Label htmlFor="manuscript-title">Título provisório</Label><Input id="manuscript-title" value={title} onChange={event => setTitle(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="manuscript-keywords">Palavras-chave</Label><Input id="manuscript-keywords" value={keywords} onChange={event => setKeywords(event.target.value)} placeholder="Separadas por vírgula" /></div></div><div className="mt-5 space-y-2"><Label htmlFor="manuscript-abstract">Resumo</Label><Textarea id="manuscript-abstract" value={abstract} onChange={event => setAbstract(event.target.value)} className="min-h-28" placeholder="Contexto, objetivo, método proposto e contribuição esperada." /></div><div className="mt-5 grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-2">{sections.map((section, index) => <div key={section.id} className="bg-white p-4"><div className="flex items-center justify-between gap-2"><Label htmlFor={`manuscript-${section.id}`} className="font-reading font-bold text-[#0A192F]">{section.heading}</Label><Badge variant="outline" className="rounded-none text-[9px]">{section.source === "method" ? "MÉTODO" : section.source === "synthesis" ? "SÍNTESE" : "MANUAL"}</Badge></div><Textarea id={`manuscript-${section.id}`} value={section.content} onChange={event => updateSection(index, event.target.value)} className="mt-3 min-h-36" placeholder={`Desenvolva a seção ${section.heading.toLowerCase()}.`} /></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant={status === "draft" ? "default" : "outline"} onClick={() => setStatus("draft")} className={status === "draft" ? "rounded-none bg-[#0A192F]" : "rounded-none"}>Rascunho</Button><Button type="button" size="sm" variant={status === "review" ? "default" : "outline"} onClick={() => setStatus("review")} className={status === "review" ? "rounded-none bg-[#0A192F]" : "rounded-none"}>Em revisão</Button><Button type="button" size="sm" variant={status === "ready" ? "default" : "outline"} onClick={() => setStatus("ready")} className={status === "ready" ? "rounded-none bg-[#0A192F]" : "rounded-none"}>Pronto para revisão</Button></div><div className="mt-4 flex items-start gap-2 border-l-2 border-amber-300 pl-3 text-xs leading-5 text-slate-600"><BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />A etapa Manuscrito organiza a redação; todas as afirmações substantivas devem continuar verificáveis no protocolo, na síntese auditável e nas fontes citadas.</div></section>;
}
