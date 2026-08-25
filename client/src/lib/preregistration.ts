export type PreregistrationDraft = {
  title: string;
  researchQuestion: string;
  hypotheses: string;
  studyDesign: string;
  primaryOutcomes: string;
  secondaryOutcomes: string;
  samplingPlan: string;
  dataCollection: string;
  analysisPlan: string;
  exclusionRules: string;
  ethicsAndTransparency: string;
  deviations: string;
  status: "draft" | "review";
};

const requiredFields: Array<[keyof PreregistrationDraft, string]> = [
  ["researchQuestion", "pergunta de pesquisa"],
  ["hypotheses", "hipóteses ou objetivos confirmatórios"],
  ["studyDesign", "desenho do estudo"],
  ["primaryOutcomes", "desfechos primários"],
  ["samplingPlan", "plano de amostragem"],
  ["dataCollection", "procedimento de coleta"],
  ["analysisPlan", "plano de análise"],
];

export function preregistrationReadiness(draft: PreregistrationDraft) {
  const missing = requiredFields.filter(([key]) => !draft[key].trim()).map(([, label]) => label);
  return { complete: missing.length === 0, missing };
}

export function preregistrationSnapshot(draft: PreregistrationDraft, metadata: { lapisProjectId: number; integrityHash?: string | null; registeredAt?: string | Date | null }) {
  return {
    schemaVersion: "AcademiaOS-Prereg-1.0",
    exportedAt: new Date().toISOString(),
    lapisProjectId: metadata.lapisProjectId,
    integrityHash: metadata.integrityHash ?? null,
    registeredAt: metadata.registeredAt ? new Date(metadata.registeredAt).toISOString() : null,
    preregistration: draft,
  };
}
