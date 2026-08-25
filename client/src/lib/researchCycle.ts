export type ResearchCycleState = "done" | "current" | "upcoming";

export type ResearchCycleSignals = {
  hasIdea: boolean;
  hasLiterature: boolean;
  hasProtocol: boolean;
  hasPreregistration: boolean;
  hasData: boolean;
  hasAnalysis: boolean;
  hasWriting: boolean;
  hasSubmission: boolean;
  hasPublication: boolean;
};

export type ResearchCycleStep = {
  id: keyof ResearchCycleSignals;
  label: string;
  module: string;
  path: string;
  state: ResearchCycleState;
};

const cycleBlueprint: Omit<ResearchCycleStep, "state">[] = [
  { id: "hasIdea", label: "Ideia", module: "Lapis", path: "/lapis" },
  { id: "hasLiterature", label: "Literatura", module: "Cartographer", path: "/search" },
  { id: "hasProtocol", label: "Protocolo", module: "Método", path: "/lapis" },
  { id: "hasPreregistration", label: "Pré-registro", module: "Prereg", path: "/prereg" },
  { id: "hasData", label: "Coleta & dados", module: "Vault", path: "/vault" },
  { id: "hasAnalysis", label: "Análise", module: "Analista · Qualia", path: "/analista" },
  { id: "hasWriting", label: "Escrita", module: "Scriptorium", path: "/scriptorium" },
  { id: "hasSubmission", label: "Submissão", module: "Matchmaker", path: "/matchmaker" },
  { id: "hasPublication", label: "Publicação", module: "Vigil", path: "/vigil" },
];

export function deriveResearchCycle(signals: ResearchCycleSignals) {
  const firstOpenIndex = cycleBlueprint.findIndex(step => !signals[step.id]);
  const completedCount = cycleBlueprint.filter(step => signals[step.id]).length;
  const steps = cycleBlueprint.map((step, index) => ({
    ...step,
    state: signals[step.id] ? "done" : index === firstOpenIndex ? "current" : "upcoming",
  }));

  return {
    steps,
    completedCount,
    progressPercent: Math.round((completedCount / cycleBlueprint.length) * 100),
    currentStep: steps[firstOpenIndex === -1 ? steps.length - 1 : firstOpenIndex],
  };
}
