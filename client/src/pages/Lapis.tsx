import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { LapisAnalysisNavigator } from "@/components/LapisAnalysisNavigator";
import { LapisAcademicRecords } from "@/components/LapisAcademicRecords";
import { LapisManuscriptWorkspace } from "@/components/LapisGrantAndManuscript";
import { LapisGrantWorkspace } from "@/components/LapisGrantAndManuscript";
import { LapisMethodWorkspace } from "@/components/LapisMethodWorkspace";
import { buildReticulaUrl, deriveReticulaCoordinates } from "@/lib/reticulaCoordinates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { lapisDraftForPendingExit, lapisDraftStorageKey, lapisExportFilename, lapisExportSections, lapisHasPendingChanges, lapisNeedsAnalysisRefresh, lapisNormalizeReviewProjectId, lapisReadyForAutosave, lapisResearchFlow, lapisShouldRestoreDraft, lapisShouldWarnBeforeUnload, restoreLapisDraftRecord, serializeLapisDraft, type LapisNotebookForm } from "@/lib/lapisNotebook";
import { trpc } from "@/lib/trpc";
import { jsPDF } from "jspdf";
import { ArrowRight, Check, Circle, Clock3, Download, ExternalLink, FilePenLine, FolderPlus, GraduationCap, Lightbulb, Loader2, Save, Trash2 } from "lucide-react";
import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type LapisForm = LapisNotebookForm;

const blankForm: LapisForm = {
  title: "",
  researchIdea: "",
  problemStatement: "",
  researchQuestion: "",
  targetAgency: "",
  resources: "",
  reviewProjectId: null,
};

function readLocalDraft(lapisProjectId: number) {
  try {
    return restoreLapisDraftRecord(window.localStorage.getItem(lapisDraftStorageKey(lapisProjectId)), lapisProjectId);
  } catch {
    return null;
  }
}

function writeLocalDraft(lapisProjectId: number, form: LapisForm) {
  try {
    window.localStorage.setItem(lapisDraftStorageKey(lapisProjectId), serializeLapisDraft(lapisProjectId, form));
  } catch {
    // A sincronização remota continua disponível caso o armazenamento local seja bloqueado.
  }
}

function clearLocalDraft(lapisProjectId: number) {
  try {
    const key = lapisDraftStorageKey(lapisProjectId);
    window.localStorage.removeItem(key);
  } catch {
    window.localStorage.removeItem(lapisDraftStorageKey(lapisProjectId));
  }
}

export function LapisExitGuard({ lapisProjectId, form, persistedSnapshot, isSyncing }: { lapisProjectId: number | null; form: LapisForm; persistedSnapshot: string; isSyncing: boolean }) {
  useEffect(() => {
    if (!lapisProjectId) return;
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      const exitDraft = lapisDraftForPendingExit(lapisProjectId, form, persistedSnapshot, isSyncing);
      if (!exitDraft) return;
      try {
        window.localStorage.setItem(lapisDraftStorageKey(lapisProjectId), exitDraft);
      } catch {
        writeLocalDraft(lapisProjectId, form);
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [form, isSyncing, lapisProjectId, persistedSnapshot]);

  return null;
}

function projectToForm(project: {
  title: string;
  researchIdea: string;
  problemStatement: string | null;
  researchQuestion: string | null;
  targetAgency: string | null;
  resources: string | null;
  reviewProjectId: number | null;
}): LapisForm {
  return {
    title: project.title,
    researchIdea: project.researchIdea,
    problemStatement: project.problemStatement ?? "",
    researchQuestion: project.researchQuestion ?? "",
    targetAgency: project.targetAgency ?? "",
    resources: project.resources ?? "",
    reviewProjectId: lapisNormalizeReviewProjectId(project.reviewProjectId),
  };
}

function addPdfSection(doc: jsPDF, title: string, text: string, startY: number) {
  let y = startY;
  const ensureSpace = (height: number) => {
    if (y + height > 278) {
      doc.addPage();
      y = 22;
    }
  };
  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 25, 47);
  doc.text(title, 18, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const lines = doc.splitTextToSize(text, 174) as string[];
  ensureSpace(lines.length * 5 + 3);
  doc.text(lines, 18, y);
  return y + lines.length * 5 + 6;
}

function NewLapisProjectDialog({ onCreated }: { onCreated: (lapisProjectId: number) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LapisForm>(blankForm);
  const utils = trpc.useUtils();
  const create = trpc.lapis.createProject.useMutation({
    onSuccess: ({ lapisProjectId }) => {
      utils.lapis.projects.invalidate();
      toast.success("Projeto de concepção criado. Vamos maturar a ideia com método.");
      setOpen(false);
      setForm(blankForm);
      onCreated(lapisProjectId);
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ ...form, reviewProjectId: form.reviewProjectId ?? undefined });
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button className="rounded-none bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"><FolderPlus className="mr-2 h-4 w-4" />Novo projeto Lapis</Button>
    </DialogTrigger>
    <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-reading text-2xl text-[#0A192F]">Da ideia à proposta madura</DialogTitle>
        <DialogDescription>Registre a hipótese embrionária. Depois, o Lapis ajudará a investigar lacunas, originalidade, aderência a editais e viabilidade.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4 pt-2" onSubmit={submit}>
        <div className="space-y-2"><Label htmlFor="lapis-title">Título de trabalho</Label><Input id="lapis-title" required minLength={3} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Ex.: Ondas internas e redes neurais explicáveis" /></div>
        <div className="space-y-2"><Label htmlFor="lapis-idea">Ideia de pesquisa</Label><Textarea id="lapis-idea" required minLength={20} value={form.researchIdea} onChange={event => setForm(current => ({ ...current, researchIdea: event.target.value }))} className="min-h-32" placeholder="Descreva o fenômeno, a oportunidade e a contribuição que pretende investigar." /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="lapis-question">Pergunta de pesquisa</Label><Textarea id="lapis-question" value={form.researchQuestion} onChange={event => setForm(current => ({ ...current, researchQuestion: event.target.value }))} className="min-h-24" placeholder="Que pergunta deve ser respondida?" /></div><div className="space-y-2"><Label htmlFor="lapis-problem">Problema e relevância</Label><Textarea id="lapis-problem" value={form.problemStatement} onChange={event => setForm(current => ({ ...current, problemStatement: event.target.value }))} className="min-h-24" placeholder="Por que esta pergunta importa?" /></div></div>
        <Button type="submit" disabled={create.isPending} className="w-full bg-[#0A192F] hover:bg-[#152c4b]">{create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePenLine className="mr-2 h-4 w-4" />}Abrir espaço de concepção</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

export function ResearchFlow({ hasQuestion, hasReviewProject }: { hasQuestion: boolean; hasReviewProject: boolean }) {
  const steps = lapisResearchFlow(hasQuestion, hasReviewProject);

  return <section className="border-b border-slate-200 bg-white px-4 py-5 md:px-8 lg:px-10"><div className="mx-auto max-w-[1440px]"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-bold tracking-[.18em] text-amber-700">CICLO DE PESQUISA</p><h2 className="mt-1 font-reading text-lg font-black text-[#0A192F]">Da hipótese à evidência rastreável</h2></div><p className="text-xs leading-5 text-slate-500">{hasQuestion ? "A pergunta está pronta para orientar a revisão." : "Registre uma pergunta para liberar a passagem à literatura."}</p></div><div className="mt-5 grid grid-cols-2 gap-y-5 sm:grid-cols-6">{steps.map((step, index) => { const stateClass = step.state === "done" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : step.state === "active" ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-400"; return <div className="relative flex items-center gap-3 sm:flex-col sm:items-start" key={step.label}>{index > 0 && <span className="absolute -left-5 top-5 hidden h-px w-5 bg-slate-300 sm:block" />}<span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${stateClass}`}>{step.state === "done" ? <Check className="h-5 w-5" /> : step.state === "active" ? <Clock3 className="h-5 w-5" /> : <Circle className="h-3 w-3" />}</span><div><p className={`text-sm font-bold ${step.state === "future" ? "text-slate-400" : "text-[#0A192F]"}`}>{step.label}</p><p className="text-xs text-slate-500">{step.detail}</p></div></div>; })}</div></div></section>;
}

export function LapisAutosaveScheduler({ lapisProjectId, form, persistedSnapshot, onPersist }: { lapisProjectId: number | null; form: LapisForm; persistedSnapshot: string; onPersist: () => void }) {
  useEffect(() => {
    if (!lapisProjectId || !lapisReadyForAutosave(form) || JSON.stringify(form) === persistedSnapshot) return;
    const timer = window.setTimeout(onPersist, 1200);
    return () => window.clearTimeout(timer);
  }, [form, lapisProjectId, onPersist, persistedSnapshot]);

  return null;
}

export function LapisSaveStatus({ state }: { state: "saved" | "saving" | "unsaved" }) {
  return <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">{state === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />Salvando alterações…</> : state === "saved" ? <><Check className="h-3.5 w-3.5 text-emerald-600" />Salvo automaticamente</> : <><Clock3 className="h-3.5 w-3.5 text-amber-700" />Alterações serão salvas automaticamente</>}</p>;
}

type LapisAnalysisForExport = { kind: "gaps" | "originality" | "grant" | "feasibility"; status: string; content: string };

export function exportLapisNotebookPdf(form: LapisForm, analyses: LapisAnalysisForExport[], createDocument: () => any = () => new jsPDF({ unit: "mm", format: "a4" })) {
  const doc = createDocument();
  doc.setFillColor(10, 25, 47);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AcademiaOS · Lapis", 18, 17);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Caderno de concepção de pesquisa", 18, 23);
  let y = 43;
  doc.setTextColor(10, 25, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(form.title, 174) as string[];
  doc.text(titleLines, 18, y);
  y += titleLines.length * 7 + 8;
  const exportContent = lapisExportSections(form, analyses);
  exportContent.base.forEach(section => { y = addPdfSection(doc, section.title, section.text, y); });
  if (exportContent.completedAnalyses.length) {
    y = addPdfSection(doc, "Análises Lapis", "Os textos abaixo foram gerados a partir do caderno e, quando associado, do corpus do Cartographer.", y);
    exportContent.completedAnalyses.forEach(section => { y = addPdfSection(doc, section.title, section.text, y); });
  }
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exportado em ${new Date().toLocaleString("pt-BR")}`, 18, 287);
  const filename = lapisExportFilename(form.title);
  doc.save(filename);
  return filename;
}

export function LapisPdfExportButton({ form, analyses, createDocument }: { form: LapisForm; analyses: LapisAnalysisForExport[]; createDocument?: () => any }) {
  return <Button type="button" onClick={() => { exportLapisNotebookPdf(form, analyses, createDocument); toast.success("PDF do caderno preparado para download."); }} variant="outline" className="rounded-none border-slate-300 text-[#0A192F] hover:bg-amber-50"><Download className="mr-2 h-4 w-4" />Exportar PDF</Button>;
}

export function LapisCartographerCta({ hasQuestion, onNavigate }: { hasQuestion: boolean; onNavigate: () => void }) {
  return <div className="flex flex-col justify-between gap-3 border-y border-amber-100 bg-amber-50 px-4 py-4 md:flex-row md:items-center"><div><p className="text-xs font-bold text-[#0A192F]">Próxima etapa: mapear evidências no Cartographer</p><p className="mt-1 text-xs leading-5 text-slate-600">{hasQuestion ? "Sua pergunta já pode orientar uma revisão de literatura." : "Defina a pergunta de pesquisa para orientar a busca."}</p></div><Button type="button" disabled={!hasQuestion} onClick={onNavigate} className="rounded-none bg-[#0A192F] text-white hover:bg-[#152c4b]"><ArrowRight className="mr-2 h-4 w-4" />Ir para Cartographer</Button></div>;
}

export function LapisReticulaCoordinatesDialog({ form, disabled }: { form: LapisForm; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [coordinates, setCoordinates] = useState(() => deriveReticulaCoordinates(form));

  useEffect(() => {
    if (open) setCoordinates(deriveReticulaCoordinates(form));
  }, [form.researchIdea, form.researchQuestion, form.title, open]);

  const updateCoordinate = (field: "theme" | "subject" | "discipline", value: string) => {
    setCoordinates(current => ({ ...current, [field]: value }));
  };

  const reticulaUrl = buildReticulaUrl(coordinates);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button type="button" disabled={disabled} variant="outline" className="rounded-none border-amber-300 text-[#0A192F] hover:bg-amber-50"><ExternalLink className="mr-2 h-4 w-4" />Abrir Retícula</Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-reading text-2xl text-[#0A192F]">Coordenadas para o Retícula</DialogTitle>
        <DialogDescription>Esta prévia transforma o caderno Lapis em coordenadas de descoberta. Revise os três campos antes de abrir o atlas; o Retícula será aberto em outra aba e não executará a busca automaticamente.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2"><Label htmlFor="reticula-theme">Tema central</Label><Input id="reticula-theme" value={coordinates.theme} onChange={event => updateCoordinate("theme", event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="reticula-subject">Assunto</Label><Textarea id="reticula-subject" value={coordinates.subject} onChange={event => updateCoordinate("subject", event.target.value)} className="min-h-24" /></div>
        <div className="space-y-2"><Label htmlFor="reticula-discipline">Disciplina</Label><Input id="reticula-discipline" value={coordinates.discipline} onChange={event => updateCoordinate("discipline", event.target.value)} /><p className="text-xs leading-5 text-slate-500">{coordinates.disciplineRationale}</p></div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-none">Cancelar</Button><Button asChild type="button" className="rounded-none bg-[#0A192F] hover:bg-[#152c4b]"><a href={reticulaUrl} target="_blank" rel="noreferrer" onClick={() => { setOpen(false); toast.success("Coordenadas enviadas ao Retícula para sua revisão."); }}><ExternalLink className="mr-2 h-4 w-4" />Abrir Retícula com coordenadas</a></Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}

export function LapisWorkspace({ onNavigateToCartographer = () => { window.location.href = "/discover"; } }: { onNavigateToCartographer?: () => void }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: projects = [], isLoading } = trpc.lapis.projects.useQuery(undefined, { enabled: !!user });
  const { data: reviewProjects = [] } = trpc.cartographer.projects.useQuery(undefined, { enabled: !!user });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<LapisForm>(blankForm);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isRemovingNotebook, setIsRemovingNotebook] = useState(false);
  const lastPersistedSnapshot = useRef(JSON.stringify(blankForm));
  const latestFormSnapshot = useRef(JSON.stringify(blankForm));
  const selectedProject = projects.find(project => project.id === selectedId) ?? null;
  const selectedProjectUpdatedAt = selectedProject?.updatedAt == null ? undefined : new Date(selectedProject.updatedAt).getTime();
  const { data: workspace } = trpc.lapis.workspace.useQuery({ lapisProjectId: selectedId ?? 0 }, { enabled: !!selectedId && !!user && !isRemovingNotebook });
  const hasGeneratingAnalysis = lapisNeedsAnalysisRefresh(workspace?.analyses ?? []);

  useEffect(() => {
    if (!selectedId && projects[0]) setSelectedId(projects[0].id);
  }, [projects, selectedId]);

  useEffect(() => {
    if (selectedProject) {
      const persistedForm = projectToForm(selectedProject);
      const localDraft = readLocalDraft(selectedProject.id);
      const shouldRestoreDraft = !!localDraft && lapisShouldRestoreDraft(localDraft.updatedAt, selectedProject.updatedAt);
      const nextForm = shouldRestoreDraft ? localDraft.form : persistedForm;
      if (localDraft && !shouldRestoreDraft) clearLocalDraft(selectedProject.id);
      setForm(nextForm);
      lastPersistedSnapshot.current = JSON.stringify(persistedForm);
      latestFormSnapshot.current = JSON.stringify(nextForm);
      setSaveState(shouldRestoreDraft ? "unsaved" : "saved");
    }
  }, [selectedProject?.id, selectedProject?.reviewProjectId, selectedProjectUpdatedAt]);

  useEffect(() => {
    latestFormSnapshot.current = JSON.stringify(form);
    if (!selectedId) return;
    if (lapisHasPendingChanges(form, lastPersistedSnapshot.current)) writeLocalDraft(selectedId, form);
    else clearLocalDraft(selectedId);
  }, [form, selectedId]);

  const update = trpc.lapis.updateProject.useMutation({
    onError: error => {
      setSaveState("unsaved");
      toast.error(error.message);
    },
  });
  const removeProject = trpc.lapis.removeProject.useMutation({
    onMutate: async ({ lapisProjectId }) => {
      setIsRemovingNotebook(true);
      await utils.lapis.workspace.cancel({ lapisProjectId });
    },
    onSuccess: () => {
      if (selectedId) clearLocalDraft(selectedId);
      setSelectedId(null);
      setForm(blankForm);
      lastPersistedSnapshot.current = JSON.stringify(blankForm);
      latestFormSnapshot.current = JSON.stringify(blankForm);
      setSaveState("saved");
      utils.lapis.projects.invalidate();
      toast.success("Caderno Lapis removido, incluindo as análises associadas.");
    },
    onError: error => {
      setIsRemovingNotebook(false);
      toast.error(error.message);
    },
  });

  const persistProject = useCallback((source: "manual" | "auto", formToPersist: LapisForm = form) => {
    if (!selectedId || !lapisReadyForAutosave(formToPersist)) return;
    const snapshot = JSON.stringify(formToPersist);
    setSaveState("saving");
    update.mutate({ lapisProjectId: selectedId, project: { ...formToPersist, reviewProjectId: lapisNormalizeReviewProjectId(formToPersist.reviewProjectId) ?? undefined, status: "maturing" } }, {
      onSuccess: () => {
        lastPersistedSnapshot.current = snapshot;
        if (latestFormSnapshot.current === snapshot) {
          clearLocalDraft(selectedId);
          setSaveState("saved");
        } else {
          setSaveState("unsaved");
        }
        utils.lapis.projects.invalidate();
        utils.lapis.workspace.invalidate({ lapisProjectId: selectedId });
        if (source === "manual") toast.success("Caderno Lapis salvo.");
      },
    });
  }, [form, selectedId, update, utils.lapis.projects, utils.lapis.workspace]);

  const updateReviewProject = (value: string) => {
    const nextForm = {
      ...form,
      reviewProjectId: value === "unassigned" ? null : lapisNormalizeReviewProjectId(Number(value)),
    };
    latestFormSnapshot.current = JSON.stringify(nextForm);
    setForm(nextForm);
    persistProject("auto", nextForm);
  };

  useEffect(() => {
    if (!selectedId || !lapisReadyForAutosave(form)) return;
    const snapshot = JSON.stringify(form);
    if (snapshot === lastPersistedSnapshot.current) return;
    setSaveState("unsaved");
  }, [form, persistProject, selectedId]);

  useEffect(() => {
    if (!selectedId || !hasGeneratingAnalysis) return;
    const refreshWorkspace = () => utils.lapis.workspace.invalidate({ lapisProjectId: selectedId });
    const interval = window.setInterval(refreshWorkspace, 1500);
    return () => window.clearInterval(interval);
  }, [hasGeneratingAnalysis, selectedId, utils.lapis.workspace]);

  const generateAnalysis = trpc.lapis.generateAnalysis.useMutation({
    onSuccess: () => {
      if (selectedId) utils.lapis.workspace.invalidate({ lapisProjectId: selectedId });
      toast.success("Análise Lapis concluída com fontes rastreáveis.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    persistProject("manual");
  };

  if (isLoading) return <div className="paper-grid min-h-screen p-8"><div className="mx-auto max-w-6xl animate-pulse space-y-5"><div className="h-8 w-64 bg-slate-200" /><div className="h-80 bg-white" /></div></div>;

  const hasQuestion = form.researchQuestion.trim().length > 3;

  return <><LapisExitGuard lapisProjectId={selectedId} form={form} persistedSnapshot={lastPersistedSnapshot.current} isSyncing={update.isPending} /><LapisAutosaveScheduler lapisProjectId={selectedId} form={form} persistedSnapshot={lastPersistedSnapshot.current} onPersist={() => persistProject("auto")} /><div className="paper-grid min-h-screen">
    <header className="border-b border-slate-200 bg-white px-6 py-6 md:px-10"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-[10px] font-bold tracking-[.2em] text-amber-700">LAPIS · CONCEPÇÃO DE PESQUISA</p><h1 className="mt-2 font-reading text-3xl font-black text-[#0A192F] md:text-4xl">Transforme uma hipótese em projeto.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Organize a ideia, o problema, a pergunta e os recursos antes de acionar as análises de lacuna, originalidade, edital e viabilidade.</p></div><NewLapisProjectDialog onCreated={setSelectedId} /></div></header>
    <ResearchFlow hasQuestion={hasQuestion} hasReviewProject={Boolean(form.reviewProjectId)} />
    <main className="mx-auto grid max-w-[1440px] gap-0 px-4 py-6 md:px-8 lg:grid-cols-[285px_minmax(0,1fr)] lg:px-10 lg:py-9">
      <aside className="border border-slate-200 bg-white lg:border-r-0"><div className="border-b border-slate-100 px-5 py-4"><p className="text-[10px] font-bold tracking-[.16em] text-slate-400">CADERNOS DE CONCEPÇÃO</p></div><div className="p-2">{projects.length === 0 ? <p className="p-4 text-sm leading-6 text-slate-500">Ainda não há ideias registradas. Crie um caderno para começar.</p> : projects.map(project => <button key={project.id} onClick={() => setSelectedId(project.id)} className={`mb-1 w-full border px-4 py-4 text-left transition-colors ${project.id === selectedId ? "border-amber-300 bg-amber-50" : "border-transparent hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><p className="truncate font-reading text-sm font-bold text-[#0A192F]">{project.title}</p><Badge className="rounded-none border-0 bg-slate-100 text-[9px] uppercase text-slate-600">{project.status === "ready" ? "maduro" : project.status === "maturing" ? "em maturação" : "rascunho"}</Badge></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{project.researchIdea}</p></button>)}</div></aside>
      <section className="border border-slate-200 bg-white p-5 md:p-8 lg:border-l-0">{!selectedProject ? <div className="flex min-h-[480px] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center bg-[#0A192F]"><Lightbulb className="h-6 w-6 text-amber-300" /></div><h2 className="mt-6 font-reading text-2xl font-black text-[#0A192F]">Toda boa proposta começa com uma pergunta clara.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">Abra um caderno Lapis para registrar a ideia e construir suas premissas de investigação.</p><div className="mt-6"><NewLapisProjectDialog onCreated={setSelectedId} /></div></div> : <form onSubmit={submit} className="space-y-7"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start"><div><p className="text-[10px] font-bold tracking-[.18em] text-amber-700">CADERNO ATIVO</p><h2 className="mt-1 font-reading text-2xl font-black text-[#0A192F]">Base de concepção</h2><LapisSaveStatus state={saveState} /></div><div className="flex flex-wrap gap-2"><LapisPdfExportButton form={form} analyses={(workspace?.analyses ?? []).map(analysis => ({ kind: analysis.kind, status: analysis.status, content: analysis.content ?? "" }))} /><LapisReticulaCoordinatesDialog form={form} disabled={!hasQuestion} /><Button type="submit" disabled={update.isPending} className="rounded-none bg-[#0A192F] hover:bg-[#152c4b]">{update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar agora</Button><AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="outline" disabled={removeProject.isPending} className="rounded-none border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="mr-2 h-4 w-4" />Excluir caderno</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este caderno?</AlertDialogTitle><AlertDialogDescription>Esta ação remove o caderno de concepção e as quatro análises associadas. Ela não remove o projeto Cartographer vinculado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel type="button">Cancelar</AlertDialogCancel><AlertDialogAction type="button" onClick={() => selectedId && removeProject.mutate({ lapisProjectId: selectedId })} className="bg-red-700 text-white hover:bg-red-800">{removeProject.isPending ? "Excluindo…" : "Excluir caderno"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div>
        <div className="space-y-2"><Label htmlFor="workspace-title">Título de trabalho</Label><Input id="workspace-title" required minLength={3} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className="h-11" /></div><div className="space-y-2"><Label htmlFor="workspace-idea">Ideia central</Label><Textarea id="workspace-idea" required minLength={20} value={form.researchIdea} onChange={event => setForm(current => ({ ...current, researchIdea: event.target.value }))} className="min-h-32" /></div><div className="grid gap-6 xl:grid-cols-2"><div className="space-y-2"><Label htmlFor="workspace-problem">Problema e relevância</Label><Textarea id="workspace-problem" value={form.problemStatement} onChange={event => setForm(current => ({ ...current, problemStatement: event.target.value }))} className="min-h-28" placeholder="Que consequência científica ou social esta investigação enfrenta?" /></div><div className="space-y-2"><Label htmlFor="workspace-question">Pergunta de pesquisa</Label><Textarea id="workspace-question" value={form.researchQuestion} onChange={event => setForm(current => ({ ...current, researchQuestion: event.target.value }))} className="min-h-28" placeholder="Que resposta a pesquisa pretende produzir?" /></div></div><div className="grid gap-6 xl:grid-cols-2"><div className="space-y-2"><Label htmlFor="workspace-agency">Agência ou edital-alvo</Label><Input id="workspace-agency" value={form.targetAgency} onChange={event => setForm(current => ({ ...current, targetAgency: event.target.value }))} placeholder="Ex.: CNPq, CAPES, FAPESP, Horizon Europe" /></div><div className="space-y-2"><Label htmlFor="workspace-review">Projeto Cartographer associado</Label><Select value={form.reviewProjectId?.toString() ?? "unassigned"} onValueChange={updateReviewProject}><SelectTrigger id="workspace-review" aria-label="Projeto Cartographer associado" className="h-10 w-full rounded-none border-slate-200 bg-white text-slate-700 focus-visible:ring-amber-400"><SelectValue placeholder="Ainda não associar revisão" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Ainda não associar revisão</SelectItem>{reviewProjects.map(project => <SelectItem key={project.id} value={project.id.toString()}>{project.name}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-2"><Label htmlFor="workspace-resources">Recursos, dados e parceiros disponíveis</Label><Textarea id="workspace-resources" value={form.resources} onChange={event => setForm(current => ({ ...current, resources: event.target.value }))} className="min-h-24" placeholder="Descreva equipe, equipamentos, bases de dados, orçamento e parcerias já disponíveis." /><p className="text-xs leading-5 text-slate-500">Rascunhos locais são protegidos neste dispositivo mesmo antes de os campos obrigatórios estarem completos.</p></div>
        <LapisMethodWorkspace lapisProjectId={selectedProject.id} method={workspace?.method} milestones={workspace?.milestones ?? []} />
        <LapisCartographerCta hasQuestion={hasQuestion} onNavigate={onNavigateToCartographer} />
        <LapisAnalysisNavigator analyses={workspace?.analyses ?? []} isGenerating={generateAnalysis.isPending} generatingKind={generateAnalysis.variables?.kind} notebookTitle={form.title} onGenerate={kind => generateAnalysis.mutate({ lapisProjectId: selectedProject.id, kind })} grantWorkspace={<LapisGrantWorkspace lapisProjectId={selectedProject.id} selections={workspace?.grantSelections ?? []} />} originalityWorkspace={<LapisAcademicRecords lapisProjectId={selectedProject.id} initialQuery={form.researchQuestion || form.researchIdea} searches={workspace?.academicRecordSearches ?? []} />} /><LapisManuscriptWorkspace lapisProjectId={selectedProject.id} manuscript={workspace?.manuscript} notebookTitle={form.title} /></form>}</section>
    </main>
  </div></>;
}

export default function Lapis() {
  return <DashboardLayout><LapisWorkspace /></DashboardLayout>;
}
