import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { preregistrationReadiness, preregistrationSnapshot, type PreregistrationDraft } from "@/lib/preregistration";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Download, FileLock2, Loader2, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const blankDraft: PreregistrationDraft = {
  title: "", researchQuestion: "", hypotheses: "", studyDesign: "", primaryOutcomes: "", secondaryOutcomes: "", samplingPlan: "", dataCollection: "", analysisPlan: "", exclusionRules: "", ethicsAndTransparency: "", deviations: "", status: "draft",
};

const fields: Array<{ key: Exclude<keyof PreregistrationDraft, "title" | "studyDesign" | "status">; label: string; hint: string; required?: boolean }> = [
  { key: "researchQuestion", label: "Pergunta de pesquisa", hint: "Defina a pergunta que será avaliada antes da coleta.", required: true },
  { key: "hypotheses", label: "Hipóteses ou objetivos confirmatórios", hint: "Diferencie hipóteses pré-especificadas de exploração posterior.", required: true },
  { key: "primaryOutcomes", label: "Desfechos primários", hint: "Indique medidas, unidades e o momento de avaliação.", required: true },
  { key: "secondaryOutcomes", label: "Desfechos secundários", hint: "Registre os desfechos complementares, se aplicável." },
  { key: "samplingPlan", label: "Plano de amostragem", hint: "População, tamanho de amostra, recrutamento e perdas esperadas.", required: true },
  { key: "dataCollection", label: "Coleta e gestão de dados", hint: "Instrumentos, procedimento, responsabilidades e controles de qualidade.", required: true },
  { key: "analysisPlan", label: "Plano de análise", hint: "Modelos, comparações, covariáveis, dados ausentes e análises de sensibilidade.", required: true },
  { key: "exclusionRules", label: "Regras de exclusão e tratamento de dados", hint: "Defina critérios antes de observar os resultados." },
  { key: "ethicsAndTransparency", label: "Ética e transparência", hint: "Situação ética, consentimento, compartilhamento e limitações de acesso." },
  { key: "deviations", label: "Desvios e versionamento", hint: "Explique como desvios futuros serão registrados e justificados." },
];

function asDraft(record: any, project: any): PreregistrationDraft {
  if (!record) return { ...blankDraft, title: project?.title ?? "", researchQuestion: project?.researchQuestion ?? "", studyDesign: project?.method?.studyDesign ?? "" };
  return {
    title: record.title ?? "", researchQuestion: record.researchQuestion ?? "", hypotheses: record.hypotheses ?? "", studyDesign: record.studyDesign ?? "", primaryOutcomes: record.primaryOutcomes ?? "", secondaryOutcomes: record.secondaryOutcomes ?? "", samplingPlan: record.samplingPlan ?? "", dataCollection: record.dataCollection ?? "", analysisPlan: record.analysisPlan ?? "", exclusionRules: record.exclusionRules ?? "", ethicsAndTransparency: record.ethicsAndTransparency ?? "", deviations: record.deviations ?? "", status: record.status === "review" ? "review" : "draft",
  };
}

function downloadSnapshot(draft: PreregistrationDraft, projectId: number, record: any) {
  const snapshot = preregistrationSnapshot(draft, { lapisProjectId: projectId, integrityHash: record?.integrityHash, registeredAt: record?.registeredAt });
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `academiaos-prereg-${draft.title.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "") || "protocolo"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function PreregWorkspace() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: projects = [], isLoading: projectsLoading } = trpc.lapis.projects.useQuery(undefined, { enabled: !!user });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: workspace, isLoading: workspaceLoading } = trpc.lapis.workspace.useQuery({ lapisProjectId: selectedId ?? 0 }, { enabled: !!selectedId && !!user });
  const [draft, setDraft] = useState<PreregistrationDraft>(blankDraft);
  const initializedProject = useRef<number | null>(null);

  useEffect(() => { if (!selectedId && projects[0]) setSelectedId(projects[0].id); }, [projects, selectedId]);
  useEffect(() => {
    if (!workspace?.project || workspace.project.id === initializedProject.current) return;
    setDraft(asDraft(workspace.preregistration, { ...workspace.project, method: workspace.method }));
    initializedProject.current = workspace.project.id;
  }, [workspace]);

  const isLocked = workspace?.preregistration?.status === "locked";
  const readiness = preregistrationReadiness(draft);
  const save = trpc.lapis.updatePreregistration.useMutation({
    onSuccess: ({ integrityHash }) => { utils.lapis.workspace.invalidate({ lapisProjectId: selectedId ?? 0 }); toast.success(`Pré-registro salvo. Integridade: ${integrityHash.slice(0, 12)}…`); },
    onError: error => toast.error(error.message),
  });
  const lock = trpc.lapis.lockPreregistration.useMutation({
    onSuccess: () => { utils.lapis.workspace.invalidate({ lapisProjectId: selectedId ?? 0 }); toast.success("Pré-registro bloqueado. Alterações exigem uma nova versão."); },
    onError: error => toast.error(error.message),
  });
  const devilReview = trpc.lapis.generateDevilsAdvocateReview.useMutation({
    onSuccess: () => { utils.lapis.workspace.invalidate({ lapisProjectId: selectedId ?? 0 }); toast.success("Revisão crítica registrada e vinculada ao hash atual do protocolo."); },
    onError: error => toast.error(error.message),
  });

  const update = (key: keyof PreregistrationDraft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const saveDraft = () => { if (!selectedId) return; save.mutate({ lapisProjectId: selectedId, preregistration: draft }); };
  const lockDraft = () => { if (!selectedId || !readiness.complete) return; lock.mutate({ lapisProjectId: selectedId }); };
  const activeDevilReview = (workspace?.devilReviews ?? []).filter((entry: any) => entry.preregistrationHash === workspace?.preregistration?.integrityHash).slice(-1)[0] as any;

  if (projectsLoading) return <DashboardLayout><div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-700" /></div></DashboardLayout>;

  return <DashboardLayout><main className="mx-auto max-w-[1440px] px-5 py-7 md:px-10 md:py-9">
    <section className="border border-slate-200 bg-white px-6 py-7 md:px-8"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-700">3. Método · Pré-registro</p><h1 className="mt-2 font-reading text-3xl font-black tracking-tight text-[#0A192F] md:text-4xl">Prereg</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Congele as decisões confirmatórias antes da coleta. Este espaço organiza o protocolo, sinaliza lacunas e registra um hash de integridade ao salvar.</p></div><div className="min-w-64"><Label htmlFor="prereg-project" className="text-xs font-bold text-slate-600">Caderno Lapis</Label><select id="prereg-project" value={selectedId ?? ""} onChange={event => { initializedProject.current = null; setSelectedId(Number(event.target.value)); }} className="mt-2 h-10 w-full border border-slate-300 bg-white px-3 text-sm text-[#0A192F]" aria-label="Selecionar caderno Lapis"><option value="" disabled>Selecione um caderno</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div></div></section>
    {!projects.length ? <section className="mt-6 border border-amber-200 bg-amber-50 p-8"><h2 className="font-reading text-xl font-bold text-[#0A192F]">Comece pelo Lapis</h2><p className="mt-2 text-sm leading-6 text-slate-600">Crie um caderno de concepção para vincular a pergunta, o método e o pré-registro.</p><Button className="mt-5 rounded-none bg-[#0A192F]" onClick={() => window.location.assign("/lapis")}>Abrir Lapis</Button></section> : workspaceLoading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-700" /></div> : <>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]"><form onSubmit={event => { event.preventDefault(); saveDraft(); }} className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-6 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-700">Protocolo confirmatório</p><h2 className="mt-1 font-reading text-xl font-bold text-[#0A192F]">Versão de trabalho</h2></div>{isLocked ? <Badge className="rounded-none bg-emerald-100 text-emerald-800"><FileLock2 className="mr-1 h-3.5 w-3.5" />Bloqueado</Badge> : <Badge variant="outline" className="rounded-none border-amber-300 text-amber-800">{draft.status === "review" ? "Em revisão" : "Rascunho"}</Badge>}</div></div><div className="space-y-6 px-6 py-6"><div className="grid gap-5 md:grid-cols-[1fr_200px]"><div className="space-y-2"><Label htmlFor="prereg-title">Título do registro</Label><Input id="prereg-title" required minLength={3} disabled={isLocked} value={draft.title} onChange={event => update("title", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="prereg-status">Estado de trabalho</Label><select id="prereg-status" disabled={isLocked} value={draft.status} onChange={event => update("status", event.target.value)} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm"><option value="draft">Rascunho</option><option value="review">Em revisão</option></select></div></div><div className="space-y-2"><Label htmlFor="prereg-design">Desenho do estudo <span className="text-amber-700">*</span></Label><Input id="prereg-design" disabled={isLocked} value={draft.studyDesign} onChange={event => update("studyDesign", event.target.value)} placeholder="Ex.: coorte prospectiva, ensaio controlado, estudo qualitativo" /></div>{fields.map(field => <div className="space-y-2" key={field.key}><Label htmlFor={`prereg-${field.key}`}>{field.label} {field.required && <span className="text-amber-700">*</span>}</Label><Textarea id={`prereg-${field.key}`} disabled={isLocked} value={draft[field.key]} onChange={event => update(field.key, event.target.value)} placeholder={field.hint} className="min-h-24" /></div>)}<div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5"><Button type="submit" disabled={isLocked || save.isPending} className="rounded-none bg-[#0A192F] hover:bg-[#152c4b]">{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar versão</Button><Button type="button" variant="outline" onClick={() => selectedId && downloadSnapshot(draft, selectedId, workspace?.preregistration)} className="rounded-none"><Download className="mr-2 h-4 w-4" />Exportar snapshot</Button><Button type="button" variant="outline" disabled={isLocked || !workspace?.preregistration || !readiness.complete || lock.isPending} onClick={lockDraft} className="rounded-none border-amber-300 text-amber-900 hover:bg-amber-50">{lock.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}Bloquear versão</Button></div></div></form>
        <aside className="space-y-6"><section className="border border-[#0A192F] bg-[#0A192F] p-6 text-white"><ShieldCheck className="h-5 w-5 text-amber-300" /><p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-amber-300">Integridade do protocolo</p>{workspace?.preregistration?.integrityHash ? <><p className="mt-3 break-all font-mono text-xs text-slate-200">SHA-256 · {workspace.preregistration.integrityHash}</p><p className="mt-3 text-xs leading-5 text-slate-300">{isLocked ? "Versão bloqueada em " : "Última versão salva: "}{workspace.preregistration.registeredAt ? new Date(workspace.preregistration.registeredAt).toLocaleString("pt-BR") : "ainda editável"}.</p></> : <p className="mt-3 text-sm leading-6 text-slate-300">Salve o rascunho para gerar o identificador de integridade.</p>}</section><section className="border border-amber-200 bg-amber-50 p-6"><div className="flex items-center gap-2 text-amber-800"><CheckCircle2 className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.16em]">Prontidão para bloqueio</p></div>{readiness.complete ? <p className="mt-3 text-sm font-semibold text-emerald-800">Campos confirmatórios preenchidos.</p> : <><p className="mt-3 text-sm leading-6 text-slate-700">Antes de bloquear, complete:</p><ul className="mt-3 space-y-1 text-xs leading-5 text-slate-600">{readiness.missing.map(item => <li key={item}>• {item}</li>)}</ul></>}</section><section className="border border-slate-200 bg-white p-6"><div className="flex gap-2 text-slate-700"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" /><p className="text-[10px] font-bold uppercase tracking-[.16em]">Advogado do Diabo metodológico</p></div><p className="mt-3 text-xs leading-5 text-slate-600">Uma revisão crítica ligada ao hash atual para antecipar questões sobre coerência, vieses, confundimento e flexibilidade analítica. Não é acusação, avaliação ética ou parecer por pares.</p><Button type="button" variant="outline" disabled={!workspace?.preregistration || devilReview.isPending} onClick={() => selectedId && devilReview.mutate({ lapisProjectId: selectedId })} className="mt-4 w-full rounded-none border-[#0A192F] text-[#0A192F]">{devilReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}Revisar protocolo</Button>{activeDevilReview?.review ? <div className="mt-4 border-t border-slate-200 pt-4"><p className="text-xs font-semibold leading-5 text-[#0A192F]">{activeDevilReview.review.summary}</p><ul className="mt-3 space-y-3">{activeDevilReview.review.findings?.map((finding: any, index: number) => <li key={`${finding.protocolField}-${index}`} className="border-l-2 border-amber-400 pl-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">{finding.concern}</span><br />{finding.recommendation}</li>)}</ul><p className="mt-3 text-[11px] leading-4 text-slate-500">Vinculada ao hash {activeDevilReview.preregistrationHash?.slice(0, 12)}… · {activeDevilReview.model}</p></div> : null}</section><section className="border border-slate-200 bg-white p-6"><div className="flex gap-2 text-slate-700"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" /><p className="text-[10px] font-bold uppercase tracking-[.16em]">Escopo atual</p></div><p className="mt-3 text-xs leading-5 text-slate-600">O Prereg preserva um protocolo interno e exporta um snapshot verificável. O depósito público, a atribuição de DOI e o aceite por uma plataforma externa continuam sob controle do pesquisador.</p></section></aside></section></>}
  </main></DashboardLayout>;
}

export default function Prereg() { return <PreregWorkspace />; }
