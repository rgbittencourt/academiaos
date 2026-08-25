export type LapisNotebookForm = {
  title: string;
  researchIdea: string;
  problemStatement: string;
  researchQuestion: string;
  targetAgency: string;
  resources: string;
  reviewProjectId: number | null;
};

export type LapisExportAnalysis = {
  kind: "gaps" | "originality" | "grant" | "feasibility";
  status: string;
  content: string | null;
};

export type LapisLocalDraft = { lapisProjectId: number; form: LapisNotebookForm; updatedAt: number };

export function lapisDraftStorageKey(lapisProjectId: number) {
  return `academiaos:lapis:local-draft:${lapisProjectId}`;
}

export function lapisNormalizeReviewProjectId(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function serializeLapisDraft(lapisProjectId: number, form: LapisNotebookForm, updatedAt = Date.now()) {
  const normalizedForm = { ...form, reviewProjectId: lapisNormalizeReviewProjectId(form.reviewProjectId) };
  return JSON.stringify({ lapisProjectId, form: normalizedForm, updatedAt } satisfies LapisLocalDraft);
}

export function restoreLapisDraftRecord(raw: string | null, lapisProjectId: number): LapisLocalDraft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Partial<LapisLocalDraft>;
    const form = draft.form;
    const updatedAt = draft.updatedAt;
    const valid = draft.lapisProjectId === lapisProjectId && form && typeof updatedAt === "number" && Number.isFinite(updatedAt) && typeof form.title === "string" && typeof form.researchIdea === "string" && typeof form.problemStatement === "string" && typeof form.researchQuestion === "string" && typeof form.targetAgency === "string" && typeof form.resources === "string" && (typeof form.reviewProjectId === "number" || form.reviewProjectId === null);
    if (!valid) return null;
    const recoveredForm = form as LapisNotebookForm;
    return {
      lapisProjectId,
      updatedAt: updatedAt as number,
      form: { ...recoveredForm, reviewProjectId: lapisNormalizeReviewProjectId(recoveredForm.reviewProjectId) },
    };
  } catch {
    return null;
  }
}

export function restoreLapisDraft(raw: string | null, lapisProjectId: number): LapisNotebookForm | null {
  return restoreLapisDraftRecord(raw, lapisProjectId)?.form ?? null;
}

export function lapisShouldRestoreDraft(draftUpdatedAt: number, persistedUpdatedAt: Date | string | number | null | undefined) {
  if (!Number.isFinite(draftUpdatedAt)) return false;
  const persistedTimestamp = typeof persistedUpdatedAt === "number"
    ? persistedUpdatedAt
    : persistedUpdatedAt == null
      ? Number.NaN
      : new Date(persistedUpdatedAt).getTime();
  return !Number.isFinite(persistedTimestamp) || draftUpdatedAt > persistedTimestamp;
}

export function lapisReadyForAutosave(form: LapisNotebookForm) {
  return form.title.trim().length >= 3 && form.researchIdea.trim().length >= 20;
}

export function lapisHasPendingChanges(form: LapisNotebookForm, persistedSnapshot: string) {
  return JSON.stringify(form) !== persistedSnapshot;
}

export function lapisShouldWarnBeforeUnload(form: LapisNotebookForm, persistedSnapshot: string, isSyncing: boolean) {
  return isSyncing || lapisHasPendingChanges(form, persistedSnapshot);
}

export function lapisDraftForPendingExit(lapisProjectId: number, form: LapisNotebookForm, persistedSnapshot: string, isSyncing: boolean, updatedAt = Date.now()) {
  return lapisShouldWarnBeforeUnload(form, persistedSnapshot, isSyncing)
    ? serializeLapisDraft(lapisProjectId, form, updatedAt)
    : null;
}

export function lapisNeedsAnalysisRefresh(analyses: Array<{ status: string }>) {
  return analyses.some(analysis => analysis.status === "generating");
}

export function lapisResearchFlow(hasQuestion: boolean, hasReviewProject: boolean) {
  return [
    { label: "Concepção", detail: "Lapis", state: hasQuestion ? "done" : "active" },
    { label: "Literatura", detail: "Cartographer", state: hasQuestion && hasReviewProject ? "done" : hasQuestion ? "active" : "future" },
    { label: "Método", detail: "Protocolo e cronograma", state: hasQuestion ? "active" : "future" },
    { label: "Pré-registro", detail: "Prereg", state: hasQuestion ? "active" : "future" },
    { label: "Análise", detail: "Lacunas, edital e viabilidade", state: hasQuestion ? "active" : "future" },
    { label: "Escrita", detail: "Manuscrito rastreável", state: hasQuestion ? "active" : "future" },
  ] as const;
}

export function lapisExportFilename(title: string) {
  const safeTitle = title.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "");
  return `lapis-${safeTitle || "caderno"}.pdf`;
}

export function lapisExportSections(form: LapisNotebookForm, analyses: LapisExportAnalysis[]) {
  const value = (text: string) => text.trim() || "Não informado.";
  const analysisTitles = {
    gaps: "Lacunas de pesquisa",
    originality: "Originalidade conceitual",
    grant: "Minuta para edital",
    feasibility: "Viabilidade",
  } as const;
  const base = [
    { title: "Ideia central", text: value(form.researchIdea) },
    { title: "Problema e relevância", text: value(form.problemStatement) },
    { title: "Pergunta de pesquisa", text: value(form.researchQuestion) },
    { title: "Agência ou edital-alvo", text: value(form.targetAgency) },
    { title: "Recursos, dados e parceiros", text: value(form.resources) },
  ];
  const completedAnalyses = analyses.filter(analysis => analysis.status === "ready").map(analysis => ({
    title: analysisTitles[analysis.kind],
    text: analysis.content?.trim() || "Análise sem conteúdo.",
  }));
  return { base, completedAnalyses };
}
