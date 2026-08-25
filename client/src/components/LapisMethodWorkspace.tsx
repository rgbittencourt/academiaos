import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, Clock3, Loader2, Milestone, Plus, Save, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type MethodForm = {
  studyDesign: string;
  setting: string;
  population: string;
  sampling: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  variables: string;
  dataCollection: string;
  analysisPlan: string;
  ethicsConsiderations: string;
};

type MilestoneForm = {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "planned" | "in_progress" | "done";
  sortOrder: number;
};

const emptyMethod: MethodForm = {
  studyDesign: "",
  setting: "",
  population: "",
  sampling: "",
  inclusionCriteria: "",
  exclusionCriteria: "",
  variables: "",
  dataCollection: "",
  analysisPlan: "",
  ethicsConsiderations: "",
};

const dateInputValue = (value: Date | string) => new Date(value).toISOString().slice(0, 10);

function toMethodForm(method: any): MethodForm {
  if (!method) return emptyMethod;
  return {
    studyDesign: method.studyDesign ?? "",
    setting: method.setting ?? "",
    population: method.population ?? "",
    sampling: method.sampling ?? "",
    inclusionCriteria: method.inclusionCriteria ?? "",
    exclusionCriteria: method.exclusionCriteria ?? "",
    variables: method.variables ?? "",
    dataCollection: method.dataCollection ?? "",
    analysisPlan: method.analysisPlan ?? "",
    ethicsConsiderations: method.ethicsConsiderations ?? "",
  };
}

function toMilestoneForm(milestone: any): MilestoneForm {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description ?? "",
    startDate: dateInputValue(milestone.startDate),
    endDate: dateInputValue(milestone.endDate),
    status: milestone.status,
    sortOrder: milestone.sortOrder,
  };
}

function completionLabel(form: MethodForm) {
  const fields = Object.values(form);
  const completed = fields.filter(Boolean).length;
  return { completed, total: fields.length, percentage: Math.round((completed / fields.length) * 100) };
}

export function LapisMethodWorkspace({ lapisProjectId, method, milestones }: { lapisProjectId: number; method: any; milestones: any[] }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<MethodForm>(() => toMethodForm(method));
  const [milestoneRows, setMilestoneRows] = useState<MilestoneForm[]>(() => milestones.map(toMilestoneForm));
  const [methodStatus, setMethodStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const savedMethodSnapshot = useRef(JSON.stringify(toMethodForm(method)));
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", startDate: "", endDate: "" });

  useEffect(() => {
    const next = toMethodForm(method);
    setForm(next);
    savedMethodSnapshot.current = JSON.stringify(next);
    setMethodStatus("saved");
  }, [lapisProjectId, method?.updatedAt]);

  useEffect(() => setMilestoneRows(milestones.map(toMilestoneForm)), [lapisProjectId, milestones]);

  const updateMethod = trpc.lapis.updateMethod.useMutation({
    onSuccess: () => {
      savedMethodSnapshot.current = JSON.stringify(form);
      setMethodStatus("saved");
      utils.lapis.workspace.invalidate({ lapisProjectId });
    },
    onError: error => {
      setMethodStatus("unsaved");
      toast.error(error.message);
    },
  });

  useEffect(() => {
    const snapshot = JSON.stringify(form);
    if (snapshot === savedMethodSnapshot.current) return;
    setMethodStatus("unsaved");
    const timer = window.setTimeout(() => {
      setMethodStatus("saving");
      updateMethod.mutate({ lapisProjectId, method: form });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [form, lapisProjectId, updateMethod]);

  const createMilestone = trpc.lapis.createMilestone.useMutation({
    onSuccess: () => {
      setNewMilestone({ title: "", description: "", startDate: "", endDate: "" });
      utils.lapis.workspace.invalidate({ lapisProjectId });
      toast.success("Marco adicionado ao cronograma.");
    },
    onError: error => toast.error(error.message),
  });
  const updateMilestone = trpc.lapis.updateMilestone.useMutation({
    onSuccess: () => utils.lapis.workspace.invalidate({ lapisProjectId }),
    onError: error => toast.error(error.message),
  });
  const removeMilestone = trpc.lapis.removeMilestone.useMutation({
    onSuccess: () => {
      utils.lapis.workspace.invalidate({ lapisProjectId });
      toast.success("Marco removido do cronograma.");
    },
    onError: error => toast.error(error.message),
  });

  const completion = useMemo(() => completionLabel(form), [form]);
  const setField = (field: keyof MethodForm, value: string) => setForm(current => ({ ...current, [field]: value }));
  const saveMilestone = (row: MilestoneForm) => {
    if (row.title.trim().length < 3 || !row.startDate || !row.endDate) {
      toast.error("Cada marco precisa de título, início e término.");
      return;
    }
    updateMilestone.mutate({ lapisProjectId, milestoneId: row.id, milestone: { ...row, title: row.title.trim(), description: row.description.trim() || undefined, startDate: new Date(`${row.startDate}T12:00:00`), endDate: new Date(`${row.endDate}T12:00:00`) } });
  };

  return <section className="border-y border-slate-200 bg-slate-50 px-5 py-7 md:px-7">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
      <div>
        <p className="text-[10px] font-bold tracking-[.18em] text-amber-700">ETAPA 4 · MÉTODO E PROTOCOLO</p>
        <h3 className="mt-1 font-reading text-xl font-black text-[#0A192F]">Desenhe o estudo antes de executar.</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Defina o desenho, participantes, procedimentos, análise e ética. Este artefato é salvo automaticamente e permanece separado da exploração conceitual.</p>
      </div>
      <div className="flex items-center gap-3"><Badge variant="outline" className="rounded-none border-amber-300 bg-amber-50 text-amber-900">{completion.completed}/{completion.total} campos</Badge><p className="flex items-center gap-1.5 text-xs text-slate-500">{methodStatus === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />Salvando protocolo…</> : methodStatus === "saved" ? <><Check className="h-3.5 w-3.5 text-emerald-600" />Protocolo salvo</> : <><Clock3 className="h-3.5 w-3.5 text-amber-700" />Alterações pendentes</>}</p></div>
    </div>

    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="method-design">Desenho do estudo</Label><Select value={form.studyDesign || "unselected"} onValueChange={value => setField("studyDesign", value === "unselected" ? "" : value)}><SelectTrigger id="method-design" className="h-10 rounded-none bg-white"><SelectValue placeholder="Escolha uma abordagem" /></SelectTrigger><SelectContent><SelectItem value="unselected">Ainda não definido</SelectItem><SelectItem value="qualitative">Qualitativo</SelectItem><SelectItem value="quantitative_observational">Quantitativo observacional</SelectItem><SelectItem value="experimental">Experimental / ensaio</SelectItem><SelectItem value="mixed_methods">Métodos mistos</SelectItem><SelectItem value="case_study">Estudo de caso</SelectItem><SelectItem value="systematic_review">Revisão sistemática</SelectItem><SelectItem value="computational">Computacional / modelagem</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="method-setting">Cenário, unidade ou contexto</Label><Input id="method-setting" value={form.setting} onChange={event => setField("setting", event.target.value)} placeholder="Ex.: laboratório, rede de escolas, base observacional" className="h-10 bg-white" /></div>
      <div className="space-y-2"><Label htmlFor="method-population">População, corpus ou unidade de análise</Label><Textarea id="method-population" value={form.population} onChange={event => setField("population", event.target.value)} className="min-h-28 bg-white" placeholder="Quem ou o que será investigado?" /></div>
      <div className="space-y-2"><Label htmlFor="method-sampling">Amostragem e tamanho esperado</Label><Textarea id="method-sampling" value={form.sampling} onChange={event => setField("sampling", event.target.value)} className="min-h-28 bg-white" placeholder="Estratégia de amostragem, poder, saturação ou critérios de tamanho." /></div>
      <div className="space-y-2"><Label htmlFor="method-inclusion">Critérios de inclusão</Label><Textarea id="method-inclusion" value={form.inclusionCriteria} onChange={event => setField("inclusionCriteria", event.target.value)} className="min-h-28 bg-white" placeholder="Condições mínimas para participação ou seleção." /></div>
      <div className="space-y-2"><Label htmlFor="method-exclusion">Critérios de exclusão</Label><Textarea id="method-exclusion" value={form.exclusionCriteria} onChange={event => setField("exclusionCriteria", event.target.value)} className="min-h-28 bg-white" placeholder="Condições que inviabilizam a inclusão." /></div>
      <div className="space-y-2"><Label htmlFor="method-variables">Variáveis, construtos ou categorias</Label><Textarea id="method-variables" value={form.variables} onChange={event => setField("variables", event.target.value)} className="min-h-28 bg-white" placeholder="Desfechos, exposições, códigos qualitativos ou variáveis de controle." /></div>
      <div className="space-y-2"><Label htmlFor="method-data">Coleta e materiais</Label><Textarea id="method-data" value={form.dataCollection} onChange={event => setField("dataCollection", event.target.value)} className="min-h-28 bg-white" placeholder="Instrumentos, fontes, procedimentos e reprodutibilidade." /></div>
      <div className="space-y-2"><Label htmlFor="method-analysis">Plano de análise</Label><Textarea id="method-analysis" value={form.analysisPlan} onChange={event => setField("analysisPlan", event.target.value)} className="min-h-28 bg-white" placeholder="Técnicas estatísticas, estratégia analítica ou percurso de codificação." /></div>
      <div className="space-y-2"><Label htmlFor="method-ethics">Ética, privacidade e riscos</Label><Textarea id="method-ethics" value={form.ethicsConsiderations} onChange={event => setField("ethicsConsiderations", event.target.value)} className="min-h-28 bg-white" placeholder="Consentimento, CEP, dados sensíveis, segurança e mitigação de riscos." /></div>
    </div>

    <section className="mt-8 border-t border-slate-200 pt-7">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-[10px] font-bold tracking-[.16em] text-amber-700">CRONOGRAMA INTERATIVO</p><h4 className="mt-1 font-reading text-lg font-black text-[#0A192F]">Marcos do protocolo</h4><p className="mt-1 text-sm text-slate-600">Atualize datas e status para manter o plano operacional visível.</p></div><Badge variant="outline" className="w-fit rounded-none border-slate-300 bg-white text-slate-600">{milestoneRows.filter(row => row.status === "done").length} concluído(s)</Badge></div>
      <div className="mt-5 space-y-3">{milestoneRows.length === 0 ? <div className="border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-500">Ainda não há marcos. Adicione entregas como protocolo, coleta, análise, manuscrito ou submissão.</div> : milestoneRows.map((row, index) => <div key={row.id} className="grid gap-3 border border-slate-200 bg-white p-4 lg:grid-cols-[34px_minmax(0,1fr)_150px_130px_130px_40px] lg:items-center"><span className="flex h-8 w-8 items-center justify-center border border-amber-300 bg-amber-50 text-xs font-bold text-amber-900">{index + 1}</span><div className="space-y-2"><Input value={row.title} onChange={event => setMilestoneRows(current => current.map(item => item.id === row.id ? { ...item, title: event.target.value } : item))} onBlur={() => saveMilestone(row)} aria-label={`Título do marco ${index + 1}`} className="h-9 border-slate-200" /><Input value={row.description} onChange={event => setMilestoneRows(current => current.map(item => item.id === row.id ? { ...item, description: event.target.value } : item))} onBlur={() => saveMilestone(row)} aria-label={`Descrição do marco ${index + 1}`} placeholder="Descrição opcional" className="h-8 border-slate-100 text-xs" /></div><Select value={row.status} onValueChange={value => { const next = { ...row, status: value as MilestoneForm["status"] }; setMilestoneRows(current => current.map(item => item.id === row.id ? next : item)); saveMilestone(next); }}><SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planejado</SelectItem><SelectItem value="in_progress">Em curso</SelectItem><SelectItem value="done">Concluído</SelectItem></SelectContent></Select><Input type="date" value={row.startDate} onChange={event => setMilestoneRows(current => current.map(item => item.id === row.id ? { ...item, startDate: event.target.value } : item))} onBlur={() => saveMilestone(row)} aria-label={`Início do marco ${index + 1}`} className="h-9" /><Input type="date" value={row.endDate} onChange={event => setMilestoneRows(current => current.map(item => item.id === row.id ? { ...item, endDate: event.target.value } : item))} onBlur={() => saveMilestone(row)} aria-label={`Término do marco ${index + 1}`} className="h-9" /><Button type="button" size="icon" variant="ghost" onClick={() => removeMilestone.mutate({ lapisProjectId, milestoneId: row.id })} aria-label={`Remover marco ${row.title}`} className="text-slate-400 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button></div>)}</div>
      <div className="mt-4 grid gap-3 border border-dashed border-amber-300 bg-amber-50 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_145px_145px_auto]"><Input value={newMilestone.title} onChange={event => setNewMilestone(current => ({ ...current, title: event.target.value }))} placeholder="Novo marco" className="h-10 bg-white" /><Input value={newMilestone.description} onChange={event => setNewMilestone(current => ({ ...current, description: event.target.value }))} placeholder="Descrição opcional" className="h-10 bg-white" /><Input type="date" value={newMilestone.startDate} onChange={event => setNewMilestone(current => ({ ...current, startDate: event.target.value }))} className="h-10 bg-white" aria-label="Início do novo marco" /><Input type="date" value={newMilestone.endDate} onChange={event => setNewMilestone(current => ({ ...current, endDate: event.target.value }))} className="h-10 bg-white" aria-label="Término do novo marco" /><Button type="button" disabled={createMilestone.isPending} onClick={() => { if (!newMilestone.title.trim() || !newMilestone.startDate || !newMilestone.endDate) { toast.error("Informe título, início e término para o marco."); return; } createMilestone.mutate({ lapisProjectId, milestone: { title: newMilestone.title.trim(), description: newMilestone.description.trim() || undefined, startDate: new Date(`${newMilestone.startDate}T12:00:00`), endDate: new Date(`${newMilestone.endDate}T12:00:00`), status: "planned", sortOrder: milestoneRows.length } }); }} className="rounded-none bg-[#0A192F] hover:bg-[#152c4b]"><Plus className="mr-2 h-4 w-4" />Adicionar</Button></div>
    </section>
  </section>;
}
