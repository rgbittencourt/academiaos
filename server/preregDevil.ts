import { listLLMModels } from "./_core/llm";
import { exactExcerpt, invokeStructuredWithRecovery } from "./academicAi";
import { withLapisAnalysisTimeout } from "./lapisAi";

export type PreregistrationForReview = {
  title: string;
  researchQuestion: string | null;
  hypotheses: string | null;
  studyDesign: string | null;
  primaryOutcomes: string | null;
  secondaryOutcomes: string | null;
  samplingPlan: string | null;
  dataCollection: string | null;
  analysisPlan: string | null;
  exclusionRules: string | null;
  ethicsAndTransparency: string | null;
  deviations: string | null;
  integrityHash: string;
};

type ProtocolField = keyof Pick<PreregistrationForReview, "researchQuestion" | "hypotheses" | "studyDesign" | "primaryOutcomes" | "secondaryOutcomes" | "samplingPlan" | "dataCollection" | "analysisPlan" | "exclusionRules" | "ethicsAndTransparency" | "deviations">;

export type DevilsAdvocateReview = {
  summary: string;
  findings: Array<{ category: "coerencia" | "vies" | "confundimento" | "analise" | "transparencia"; severity: "attention" | "important"; concern: string; recommendation: string; protocolField: ProtocolField; sourceText: string }>;
  scopeLimit: string;
};

const fieldLabels: Record<ProtocolField, string> = {
  researchQuestion: "Pergunta de pesquisa",
  hypotheses: "Hipóteses",
  studyDesign: "Desenho do estudo",
  primaryOutcomes: "Desfechos primários",
  secondaryOutcomes: "Desfechos secundários",
  samplingPlan: "Plano amostral",
  dataCollection: "Coleta de dados",
  analysisPlan: "Plano de análise",
  exclusionRules: "Regras de exclusão",
  ethicsAndTransparency: "Ética e transparência",
  deviations: "Desvios planejados",
};

function firstExcerpt(text: string) {
  return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/)?.[0] ?? text.replace(/\s+/g, " ")).trim().slice(0, 320);
}

function protocolEntries(protocol: PreregistrationForReview) {
  return (Object.keys(fieldLabels) as ProtocolField[]).flatMap(field => {
    const value = protocol[field]?.trim();
    return value ? [{ field, value }] : [];
  });
}

function deterministicReview(protocol: PreregistrationForReview): DevilsAdvocateReview {
  const entries = protocolEntries(protocol);
  const missing = (Object.keys(fieldLabels) as ProtocolField[]).filter(field => !protocol[field]?.trim());
  const source = entries[0] ?? { field: "researchQuestion" as const, value: protocol.title };
  const findings: DevilsAdvocateReview["findings"] = [];
  if (missing.includes("samplingPlan")) findings.push({ category: "vies", severity: "important", concern: "O protocolo não descreve um plano amostral verificável, o que impede avaliar representatividade, seleção e perdas esperadas.", recommendation: "Defina população, unidade de recrutamento, critérios, tamanho amostral e tratamento de perdas antes do bloqueio.", protocolField: source.field, sourceText: firstExcerpt(source.value) });
  if (missing.includes("analysisPlan")) findings.push({ category: "analise", severity: "important", concern: "O protocolo não contém um plano de análise suficientemente definido para distinguir decisões pré-especificadas de escolhas posteriores aos dados.", recommendation: "Declare estimandos, comparações, tratamento de dados ausentes, critérios de exclusão e análises de sensibilidade.", protocolField: source.field, sourceText: firstExcerpt(source.value) });
  if (!missing.includes("primaryOutcomes") && missing.includes("hypotheses")) findings.push({ category: "coerencia", severity: "attention", concern: "Há desfechos declarados sem hipóteses explícitas associadas, o que pode tornar a interpretação confirmatória ambígua.", recommendation: "Relacione cada desfecho primário a uma hipótese ou explique formalmente seu caráter exploratório.", protocolField: "primaryOutcomes", sourceText: firstExcerpt(protocol.primaryOutcomes!) });
  if (!findings.length) findings.push({ category: "transparencia", severity: "attention", concern: "O protocolo contém os principais campos, mas a revisão não substitui avaliação por pares nem validação ética, estatística ou regulatória.", recommendation: "Verifique se cada decisão analítica potencialmente discricionária está definida e registre mudanças futuras como desvios justificados.", protocolField: source.field, sourceText: firstExcerpt(source.value) });
  return { summary: "Revisão crítica baseada exclusivamente no texto do protocolo ativo. Os apontamentos são perguntas de robustez para apoiar o julgamento do pesquisador, não diagnósticos nem acusações.", findings: findings.slice(0, 5), scopeLimit: "O Advogado do Diabo não calcula poder estatístico, não emite DOI, não submete registros externos e não substitui avaliação ética, estatística ou por pares." };
}

function validateReview(raw: DevilsAdvocateReview, protocol: PreregistrationForReview): DevilsAdvocateReview {
  if (!raw || typeof raw.summary !== "string" || raw.summary.trim().length < 30 || !Array.isArray(raw.findings) || raw.findings.length === 0) throw new Error("A revisão crítica não trouxe estrutura suficiente.");
  const findings = raw.findings.slice(0, 6).map(finding => {
    if (!fieldLabels[finding.protocolField] || !["coerencia", "vies", "confundimento", "analise", "transparencia"].includes(finding.category) || !["attention", "important"].includes(finding.severity) || typeof finding.concern !== "string" || typeof finding.recommendation !== "string") throw new Error("A revisão crítica trouxe um apontamento inválido.");
    const source = protocol[finding.protocolField] ?? "";
    const excerpt = exactExcerpt(finding.sourceText, source);
    if (!excerpt) throw new Error("A revisão crítica não vinculou o apontamento a um trecho literal do protocolo.");
    return { ...finding, concern: finding.concern.trim().slice(0, 1200), recommendation: finding.recommendation.trim().slice(0, 1200), sourceText: excerpt };
  });
  return { summary: raw.summary.trim().slice(0, 3000), findings, scopeLimit: typeof raw.scopeLimit === "string" && raw.scopeLimit.trim() ? raw.scopeLimit.trim().slice(0, 1400) : deterministicReview(protocol).scopeLimit };
}

async function getModel() {
  const models = await listLLMModels();
  return models.data.find(model => model.id === "gpt-5-mini")?.id ?? models.data[0]?.id;
}

export async function generateDevilsAdvocateReview(protocol: PreregistrationForReview) {
  const fallback = deterministicReview(protocol);
  const model = await getModel();
  if (!model) return { review: fallback, model: "fallback determinístico (modelo indisponível)" };
  const corpus = protocolEntries(protocol).map(entry => `${fieldLabels[entry.field]} [${entry.field}]:\n${entry.value}`).join("\n\n---\n\n");
  try {
    const raw = await withLapisAnalysisTimeout(invokeStructuredWithRecovery<DevilsAdvocateReview>("Prereg Advogado do Diabo", {
      model,
      maxTokens: 2200,
      ...(model.startsWith("gpt-5") ? { reasoning: { effort: "minimal" } } : {}),
      messages: [
        { role: "system", content: "Você é o Advogado do Diabo metodológico de um pré-registro. Examine SOMENTE o protocolo fornecido e aponte riscos de coerência pergunta–hipóteses–método–análise, viés de seleção, confundimento, flexibilidade analítica e transparência. Não acuse má conduta, não invente dados, não faça diagnóstico, não declare aprovação ética, cálculo de poder, DOI ou registro externo. Retorne somente JSON: {summary,findings:[{category:'coerencia|vies|confundimento|analise|transparencia',severity:'attention|important',concern,recommendation,protocolField,sourceText}],scopeLimit}. Cada sourceText deve ser trecho literal contínuo do campo correspondente." },
        { role: "user", content: `TÍTULO: ${protocol.title}\nHASH DO PROTOCOLO: ${protocol.integrityHash}\n\n${corpus}` },
      ],
    }));
    return { review: validateReview(raw, protocol), model };
  } catch {
    return { review: fallback, model: `${model} (fallback auditável)` };
  }
}
