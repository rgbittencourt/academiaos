import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpenText, CheckCircle2, ChevronRight, GraduationCap, Lightbulb, Loader2, Network, Sparkles, Target } from "lucide-react";
import React, { type ReactNode, useEffect, useMemo, useState } from "react";

export type LapisAnalysisKind = "gaps" | "originality" | "grant" | "feasibility";

type AnalysisEvidence = { sourceId: string; sourceLabel: string; sourceText: string };

export type LapisAnalysisRecord = {
  kind: LapisAnalysisKind;
  status: string;
  content?: string | null;
  errorMessage?: string | null;
  evidence?: unknown;
};

type LapisAnalysisNavigatorProps = {
  analyses: LapisAnalysisRecord[];
  isGenerating: boolean;
  generatingKind?: LapisAnalysisKind;
  notebookTitle: string;
  onGenerate: (kind: LapisAnalysisKind) => void;
  grantWorkspace: ReactNode;
  originalityWorkspace?: ReactNode;
};

const modules = [
  { kind: "gaps" as const, hash: "lapis-lacunas", shortLabel: "Lacunas", title: "Detector de lacunas de pesquisa", Icon: Network, description: "Mapeia perguntas não respondidas, resultados contraditórios e subpopulações ainda pouco estudadas a partir do caderno e da literatura associada." },
  { kind: "originality" as const, hash: "lapis-originalidade", shortLabel: "Originalidade", title: "Verificador de originalidade conceitual", Icon: Target, description: "Contrasta a proposta com o corpus associado para explicitar proximidades, diferenciais e pontos que exigem verificação externa." },
  { kind: "grant" as const, hash: "lapis-editais", shortLabel: "Editais & grants", title: "Assistente de grant writing", Icon: BookOpenText, description: "Organiza uma minuta alinhada ao edital selecionado, conectando problema, contribuição, abordagem e critérios declarados." },
  { kind: "feasibility" as const, hash: "lapis-viabilidade", shortLabel: "Viabilidade", title: "Estimador de viabilidade", Icon: GraduationCap, description: "Cruza recursos, dados, equipe, riscos e requisitos metodológicos informados para apoiar decisões de execução." },
];

function moduleFromHash(hash: string): LapisAnalysisKind | "overview" {
  return modules.find(module => `#${module.hash}` === hash)?.kind ?? "overview";
}

function moduleHash(kind: LapisAnalysisKind | "overview") {
  return kind === "overview" ? "lapis-visao-geral" : modules.find(module => module.kind === kind)?.hash ?? "lapis-visao-geral";
}

export function LapisAnalysisNavigator({ analyses, isGenerating, generatingKind, notebookTitle, onGenerate, grantWorkspace, originalityWorkspace }: LapisAnalysisNavigatorProps) {
  const [activeKind, setActiveKind] = useState<LapisAnalysisKind | "overview">(() => moduleFromHash(window.location.hash));
  const analysesByKind = useMemo(() => new Map(analyses.map(analysis => [analysis.kind, analysis])), [analyses]);
  const activeModule = activeKind === "overview" ? null : modules.find(module => module.kind === activeKind) ?? null;
  const activeAnalysis = activeModule ? analysesByKind.get(activeModule.kind) : null;

  useEffect(() => {
    const updateFromHash = () => setActiveKind(moduleFromHash(window.location.hash));
    window.addEventListener("hashchange", updateFromHash);
    updateFromHash();
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, []);

  const selectModule = (kind: LapisAnalysisKind | "overview") => {
    setActiveKind(kind);
    const nextHash = moduleHash(kind);
    if (window.location.hash !== `#${nextHash}`) window.location.hash = nextHash;
  };

  return <section className="border-t border-slate-100 pt-7" aria-labelledby="lapis-modules-heading">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-bold tracking-[.16em] text-amber-700">MÓDULOS LAPIS</p><h3 id="lapis-modules-heading" className="mt-1 font-reading text-xl font-black text-[#0A192F]">Concepção assistida por evidências</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Cada módulo trabalha sobre o mesmo caderno, preservando o vínculo entre ideia, literatura, fontes e decisões.</p></div><Badge variant="outline" className="w-fit rounded-none border-amber-300 bg-amber-50 text-amber-900">fontes rastreáveis</Badge></div>
    <nav aria-label="Submenus do Lapis" className="mt-5 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-5"><button type="button" onClick={() => selectModule("overview")} className={`min-h-16 px-4 py-3 text-left transition-colors ${activeKind === "overview" ? "bg-[#0A192F] text-white" : "bg-white text-[#0A192F] hover:bg-amber-50"}`}><span className="block text-xs font-bold">Visão do caderno</span><span className={`mt-1 block text-[11px] ${activeKind === "overview" ? "text-amber-200" : "text-slate-500"}`}>Contexto comum</span></button>{modules.map(module => { const isActive = activeKind === module.kind; const Icon = module.Icon; return <button key={module.kind} type="button" onClick={() => selectModule(module.kind)} className={`min-h-16 px-4 py-3 text-left transition-colors ${isActive ? "bg-[#0A192F] text-white" : "bg-white text-[#0A192F] hover:bg-amber-50"}`}><span className="flex items-center gap-2 text-xs font-bold"><Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-300" : "text-amber-700"}`} />{module.shortLabel}</span><span className={`mt-1 block text-[11px] ${isActive ? "text-amber-200" : "text-slate-500"}`}>{analysesByKind.get(module.kind)?.status === "ready" ? "análise disponível" : "a preparar"}</span></button>; })}</nav>

    {activeKind === "overview" ? <div className="mt-5 grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-2">{modules.map(module => { const analysis = analysesByKind.get(module.kind); const Icon = module.Icon; return <div key={module.kind} className="bg-white p-5"><Icon className="h-4 w-4 text-amber-700" /><h4 className="mt-5 font-reading font-bold text-[#0A192F]">{module.title}</h4><p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p><Button type="button" onClick={() => selectModule(module.kind)} variant="outline" className="mt-5 rounded-none border-slate-300 text-xs text-[#0A192F] hover:bg-amber-50">Abrir módulo<ChevronRight className="ml-2 h-3.5 w-3.5 text-amber-700" /></Button>{analysis?.status === "ready" && <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Análise disponível para revisão</p>}</div>; })}</div> : activeModule ? <div id={moduleHash(activeModule.kind)} className="mt-5 border border-slate-200 bg-white"><div className="border-b border-amber-100 bg-amber-50/60 px-5 py-5 md:px-7"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><activeModule.Icon className="h-5 w-5 text-amber-700" /><h4 className="mt-4 font-reading text-2xl font-black text-[#0A192F]">{activeModule.title}</h4><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{activeModule.description}</p></div><Badge className="w-fit rounded-none border-0 bg-white text-slate-600">Caderno: {notebookTitle}</Badge></div></div>
      <div className="space-y-5 px-5 py-6 md:px-7">{activeModule.kind === "grant" && <div className="border-b border-slate-100 pb-6">{grantWorkspace}<p className="mt-4 text-xs leading-5 text-slate-500">Os conectores oficiais atualmente disponíveis cobrem CNPq e CAPES. FAPs brasileiras, NIH, Horizon Europe e ERC permanecem como fontes a verificar até que conectores oficiais específicos sejam disponibilizados.</p></div>}{activeModule.kind === "originality" && <><div className="border-l-2 border-amber-300 bg-amber-50/50 px-4 py-3 text-xs leading-5 text-slate-700">O contraste é rastreável ao caderno e ao corpus associado. Registros de projetos, dissertações e outras fontes externas devem ser confirmados pelo pesquisador quando não houver conector oficial ativo.</div>{originalityWorkspace}</>}<div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#0A192F]">Análise auditável</p><p className="mt-1 text-xs leading-5 text-slate-500">A geração mantém as evidências utilizadas quando elas estão disponíveis.</p></div><Button type="button" onClick={() => onGenerate(activeModule.kind)} disabled={isGenerating || activeAnalysis?.status === "generating"} variant="outline" className="rounded-none border-slate-300 text-xs text-[#0A192F] hover:bg-amber-50">{(isGenerating && generatingKind === activeModule.kind) || activeAnalysis?.status === "generating" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-700" />}{(isGenerating && generatingKind === activeModule.kind) || activeAnalysis?.status === "generating" ? "Análise em processamento" : activeAnalysis?.status === "ready" ? "Atualizar análise" : "Gerar análise"}</Button></div>{activeAnalysis?.status === "error" && <p className="text-sm leading-6 text-red-700">{activeAnalysis.errorMessage ?? "Não foi possível gerar esta análise."}</p>}{activeAnalysis?.status === "ready" && <div className="border-t border-slate-100 pt-5"><p className="whitespace-pre-line text-sm leading-7 text-slate-700">{activeAnalysis.content}</p>{Array.isArray(activeAnalysis.evidence) && activeAnalysis.evidence.length > 0 && <details className="mt-5 border-l-2 border-amber-300 pl-4"><summary className="cursor-pointer text-xs font-bold text-amber-800">Ver evidências utilizadas ({activeAnalysis.evidence.length})</summary><div className="mt-3 space-y-3">{(activeAnalysis.evidence as AnalysisEvidence[]).map((evidence, index) => <blockquote key={`${evidence.sourceId}-${index}`} className="text-xs leading-5 text-slate-600"><span className="block font-bold text-slate-700">{evidence.sourceLabel}</span>“{evidence.sourceText}”</blockquote>)}</div></details>}</div>}<Button type="button" variant="ghost" onClick={() => selectModule("overview")} className="px-0 text-xs font-bold text-[#0A192F] hover:bg-transparent hover:text-amber-800"><Lightbulb className="mr-2 h-3.5 w-3.5" />Voltar à visão do caderno</Button></div></div> : null}
  </section>;
}
