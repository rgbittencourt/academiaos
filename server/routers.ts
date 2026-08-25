import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAuditableSynthesis, extractArticleData, type StructuredExtraction } from "./academicAi";
import { buildCitationMap, inspectReferenceIntegrity, searchAcademicRecords } from "./academicDiscovery";
import { generateLapisAnalysis, type LapisAnalysisKind } from "./lapisAi";
import { generateDevilsAdvocateReview } from "./preregDevil";
import { generateQualiaSuggestions } from "./qualiaAi";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { fetchOfficialGrantOpportunities } from "./grantSources";
import { searchAcademicArticles } from "./literature";
import { extractPdfText, MAX_PDF_BYTES, validatePdfBuffer } from "./pdfText";
import { createRisPreview } from "./risImport";
import { findTitleSimilarityCandidates, scoreTitleSimilarity } from "./duplicateReview";
import { storageGetSignedUrl, storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";
import { decryptZoteroKey, encryptZoteroKey, fetchZoteroLibrary } from "./zotero";
import { invokeLLM } from "./_core/llm";

const articleInput = z.object({
  externalId: z.string().min(1).max(255),
  source: z.enum(["semantic_scholar", "openalex", "europe_pmc", "pubmed", "crossref", "scielo", "openaire", "arxiv", "core", "reticula"]),
  title: z.string().min(1),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  abstract: z.string().nullable(),
  doi: z.string().nullable(),
  citationCount: z.number().int().nonnegative(),
  relevanceScore: z.number().int().min(0).max(100),
  url: z.string().nullable(),
});

const lapisProjectInput = z.object({
  title: z.string().trim().min(3).max(180),
  researchIdea: z.string().trim().min(20).max(6000),
  problemStatement: z.string().trim().max(4000).optional(),
  researchQuestion: z.string().trim().max(2000).optional(),
  targetAgency: z.string().trim().max(180).optional(),
  resources: z.string().trim().max(4000).optional(),
  reviewProjectId: z.number().int().positive().nullable().optional(),
  status: z.enum(["draft", "maturing", "ready"]).optional(),
});

const lapisAnalysisInput = z.object({
  lapisProjectId: z.number().int().positive(),
  kind: z.enum(["gaps", "originality", "grant", "feasibility"]),
});

const lapisMethodInput = z.object({
  studyDesign: z.string().trim().max(180).optional(),
  setting: z.string().trim().max(4000).optional(),
  population: z.string().trim().max(4000).optional(),
  sampling: z.string().trim().max(4000).optional(),
  inclusionCriteria: z.string().trim().max(4000).optional(),
  exclusionCriteria: z.string().trim().max(4000).optional(),
  variables: z.string().trim().max(4000).optional(),
  dataCollection: z.string().trim().max(4000).optional(),
  analysisPlan: z.string().trim().max(4000).optional(),
  ethicsConsiderations: z.string().trim().max(4000).optional(),
});

const preregistrationInput = z.object({
  title: z.string().trim().min(3).max(255),
  researchQuestion: z.string().trim().max(2000).optional(),
  hypotheses: z.string().trim().max(12000).optional(),
  studyDesign: z.string().trim().max(180).optional(),
  primaryOutcomes: z.string().trim().max(12000).optional(),
  secondaryOutcomes: z.string().trim().max(12000).optional(),
  samplingPlan: z.string().trim().max(12000).optional(),
  dataCollection: z.string().trim().max(12000).optional(),
  analysisPlan: z.string().trim().max(12000).optional(),
  exclusionRules: z.string().trim().max(12000).optional(),
  ethicsAndTransparency: z.string().trim().max(12000).optional(),
  deviations: z.string().trim().max(12000).optional(),
  status: z.enum(["draft", "review"]),
});

const milestoneInput = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(2000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(["planned", "in_progress", "done"]),
  sortOrder: z.number().int().min(0).max(10000),
}).refine(value => value.endDate >= value.startDate, { message: "O término não pode anteceder o início.", path: ["endDate"] });

const screeningInput = z.object({
  projectId: z.number().int().positive(),
  articleId: z.number().int().positive(),
  stage: z.enum(["title_abstract", "full_text"]),
  decision: z.enum(["pending", "included", "excluded"]),
  reason: z.string().trim().max(2000).optional(),
});

const narrativeThemeInput = z.object({
  title: z.string().trim().min(3).max(180),
  interpretation: z.string().trim().min(10).max(8000),
  articleIds: z.array(z.number().int().positive()).min(1).max(100),
});

const pdfImportInput = z.object({
  projectId: z.number().int().positive(),
  articleId: z.number().int().positive(),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.literal("application/pdf"),
  base64: z.string().min(12).max(Math.ceil(MAX_PDF_BYTES * 4 / 3) + 128),
});

const manuscriptInput = z.object({
  title: z.string().trim().min(3).max(255),
  abstract: z.string().trim().max(12000).optional(),
  keywords: z.string().trim().max(2000).optional(),
  sections: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    heading: z.string().trim().min(1).max(180),
    content: z.string().trim().max(30000),
    source: z.enum(["method", "synthesis", "manual"]),
  })).min(1).max(20),
  status: z.enum(["draft", "review", "ready"]),
});

const vaultDatasetInput = z.object({
  title: z.string().trim().min(3).max(255), description: z.string().trim().min(10).max(12000),
  dataType: z.enum(["tabular", "qualitative", "image", "audio", "other"]), storageLocation: z.string().trim().max(2000).optional(),
  persistentIdentifier: z.string().trim().max(500).optional(), license: z.string().trim().max(255).optional(),
  accessLevel: z.enum(["open", "restricted", "controlled", "private"]), containsPersonalData: z.boolean(),
  lawfulBasis: z.string().trim().max(4000).optional(), consentStatus: z.enum(["not_applicable", "pending", "documented", "withdrawn"]),
  anonymizationPlan: z.string().trim().max(8000).optional(), retentionPolicy: z.string().trim().max(4000).optional(),
  metadata: z.object({ creator: z.string().trim().max(255).optional(), keywords: z.array(z.string().trim().max(80)).max(20).default([]), format: z.string().trim().max(100).optional(), collectionDate: z.string().trim().max(100).optional() }).default({ keywords: [] }),
});

const vaultVersionInput = z.object({ changeSummary: z.string().trim().min(3).max(500) });
const vaultDataDictionaryEntryInput = z.object({
  variableName: z.string().trim().regex(/^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_. -]*$/).min(1).max(180),
  variableType: z.enum(["unknown", "identifier", "integer", "number", "text", "boolean", "date", "categorical", "other"]),
  description: z.string().trim().min(3).max(12000),
  allowedValues: z.array(z.string().trim().min(1).max(300)).max(100).default([]),
  units: z.string().trim().max(180).optional(),
  missingValueRule: z.string().trim().max(500).optional(),
});
const vaultDataDictionaryGenerationInput = z.object({ source: z.enum(["csv_header", "cleaning_code"]), sourceText: z.string().trim().min(1).max(30000) });
const vaultGovernanceInput = z.object({
  humanSubjects: z.boolean(),
  cepConepStatus: z.enum(["not_applicable", "planning", "submitted", "approved", "amendment_required", "closed"]),
  approvalReference: z.string().trim().max(255).optional(),
  riskLevel: z.enum(["not_assessed", "minimal", "moderate", "high"]),
  dataProcessingAgreementStatus: z.enum(["not_applicable", "pending", "documented"]),
  privacyImpactSummary: z.string().trim().max(12000).optional(),
  pendingItems: z.array(z.string().trim().min(2).max(500)).max(30).default([]),
});
const vaultRepositoryPlanInput = z.object({
  repository: z.enum(["zenodo", "dataverse", "institutional"]),
  status: z.enum(["draft", "metadata_ready", "manual_deposit", "deposited", "published", "blocked"]),
  destinationUrl: z.string().trim().max(2000).optional(),
  repositoryRecordId: z.string().trim().max(255).optional(),
  requirements: z.array(z.string().trim().min(2).max(500)).max(30).default([]),
  notes: z.string().trim().max(12000).optional(),
});
const vaultRepositoryAuthorizationStatement = "Autorizo apenas a autenticação e a preparação do depósito deste ativo. Nenhum arquivo será transferido ou publicado sem uma confirmação posterior no repositório.";
const vaultRepositoryAuthorizationInput = z.object({
  acknowledged: z.literal(true),
  confirmationStatement: z.literal(vaultRepositoryAuthorizationStatement),
});

const qualiaCorpusInput = z.object({ title: z.string().trim().min(3).max(255), description: z.string().trim().min(10).max(12000), sourceScope: z.string().trim().max(4000).optional() });
const qualiaCodeInput = z.object({ parentCodeId: z.number().int().positive().nullable().optional(), label: z.string().trim().min(2).max(180), definition: z.string().trim().min(5).max(8000), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() });
const qualiaExcerptInput = z.object({ codeId: z.number().int().positive().nullable().optional(), sourceLabel: z.string().trim().min(2).max(255), content: z.string().trim().min(3).max(50000), analyticMemo: z.string().trim().max(12000).optional() });
const qualiaSourceInput = z.object({ label: z.string().trim().min(2).max(255), mediaType: z.enum(["text", "audio", "image", "video", "document"]), transcription: z.string().trim().max(50000).optional(), researcherDescription: z.string().trim().max(12000).optional() });
const qualiaMediaUploadInput = z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), label: z.string().trim().min(2).max(255), mediaType: z.enum(["audio", "image", "video", "document"]), filename: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(3).max(180), base64: z.string().min(4).max(Math.ceil(25 * 1024 * 1024 * 4 / 3) + 128), researcherDescription: z.string().trim().max(12000).optional() });
const qualiaSuggestionGenerationInput = z.object({ excerptId: z.number().int().positive(), acknowledgedExternalProcessing: z.literal(true) });
const qualiaSuggestionDecisionInput = z.object({ suggestionId: z.number().int().positive(), status: z.enum(["accepted", "rejected"]), researcherNote: z.string().trim().max(4000).optional() });
const qualiaCodingDecisionInput = z.object({ excerptId: z.number().int().positive(), codeId: z.number().int().positive(), coderLabel: z.string().trim().min(2).max(180), decision: z.enum(["applied", "not_applied", "uncertain"]), rationale: z.string().trim().max(4000).optional() });
const qualiaMemoInput = z.object({ excerptId: z.number().int().positive().nullable().optional(), title: z.string().trim().min(3).max(255), content: z.string().trim().min(10).max(50000), memoType: z.enum(["analytic", "reflexive", "methodological"]), authorLabel: z.string().trim().min(2).max(180) });
const qualiaAgreementInput = z.object({ codeId: z.number().int().positive(), coderA: z.string().trim().min(2).max(180), coderB: z.string().trim().min(2).max(180) }).refine(value => value.coderA !== value.coderB, { message: "Informe dois codificadores distintos.", path: ["coderB"] });

const qualiaDecisionCategories = ["applied", "not_applied", "uncertain"] as const;
type QualiaDecisionCategory = typeof qualiaDecisionCategories[number];
type QualiaAgreementDecision = { excerptId: number; codeId: number; coderLabel: string; decision: QualiaDecisionCategory };

export function calculateQualiaAgreement(decisions: QualiaAgreementDecision[], codeId: number, coderA: string, coderB: string) {
  const a = new Map(decisions.filter(item => item.codeId === codeId && item.coderLabel === coderA).map(item => [item.excerptId, item.decision]));
  const b = new Map(decisions.filter(item => item.codeId === codeId && item.coderLabel === coderB).map(item => [item.excerptId, item.decision]));
  const pairs = Array.from(a.entries()).flatMap(([excerptId, decisionA]) => {
    const decisionB = b.get(excerptId);
    return decisionB ? [{ excerptId, decisionA, decisionB }] : [];
  });
  if (pairs.length < 2) return { status: "insufficient" as const, pairedExcerpts: pairs.length, kappa: null, alpha: null, observedAgreement: null, message: "São necessários pelo menos dois excertos avaliados pelos dois codificadores para calcular concordância." };
  const observedAgreement = pairs.filter(item => item.decisionA === item.decisionB).length / pairs.length;
  const proportionsA = Object.fromEntries(qualiaDecisionCategories.map(category => [category, pairs.filter(item => item.decisionA === category).length / pairs.length])) as Record<QualiaDecisionCategory, number>;
  const proportionsB = Object.fromEntries(qualiaDecisionCategories.map(category => [category, pairs.filter(item => item.decisionB === category).length / pairs.length])) as Record<QualiaDecisionCategory, number>;
  const expectedAgreement = qualiaDecisionCategories.reduce((sum, category) => sum + proportionsA[category] * proportionsB[category], 0);
  const kappa = Math.abs(1 - expectedAgreement) < 1e-9 ? null : (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
  const totals = Object.fromEntries(qualiaDecisionCategories.map(category => [category, pairs.reduce((sum, item) => sum + Number(item.decisionA === category) + Number(item.decisionB === category), 0)])) as Record<QualiaDecisionCategory, number>;
  const nRatings = pairs.length * 2;
  const expectedDisagreement = 1 - qualiaDecisionCategories.reduce((sum, category) => sum + totals[category] * (totals[category] - 1), 0) / (nRatings * (nRatings - 1));
  const observedDisagreement = 1 - observedAgreement;
  const alpha = expectedDisagreement <= 0 ? null : 1 - observedDisagreement / expectedDisagreement;
  return { status: "calculated" as const, pairedExcerpts: pairs.length, kappa, alpha, observedAgreement, expectedAgreement, expectedDisagreement, message: "Métricas calculadas para decisões nominais no código selecionado. Elas descrevem consistência entre codificadores, não validam automaticamente a interpretação teórica." };
}

const analystPlanInput = z.object({
  researchQuestion: z.string().trim().min(10).max(4000), outcomeName: z.string().trim().min(2).max(255),
  outcomeType: z.enum(["continuous", "binary", "count", "ordinal", "time_to_event"]), predictors: z.string().trim().min(2).max(4000),
  design: z.string().trim().max(4000).optional(), missingDataPlan: z.string().trim().max(4000).optional(),
  recommendation: z.string().trim().min(10).max(8000), rationale: z.string().trim().min(10).max(8000), assumptions: z.string().trim().min(10).max(8000),
  rCode: z.string().trim().min(5).max(30000), pythonCode: z.string().trim().min(5).max(30000),
  graphPlan: z.string().trim().min(10).max(8000), resultsTemplate: z.string().trim().min(10).max(8000),
});

const analystNotebookInput = z.object({
  language: z.enum(["r", "python"]), title: z.string().trim().min(3).max(255), purpose: z.string().trim().min(10).max(4000),
  code: z.string().trim().min(5).max(30000),
});

type AnalystRecommendationFields = z.infer<typeof analystPlanInput>;

function analystFallback(input: Pick<AnalystRecommendationFields, "researchQuestion" | "outcomeName" | "outcomeType" | "predictors" | "design" | "missingDataPlan">) {
  const predictors = input.predictors.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean);
  const formula = `${input.outcomeName} ~ ${predictors.join(" + ") || "preditor_1"}`;
  const recipe = {
    continuous: ["regressão linear", "O desfecho contínuo permite estimar associações ajustadas com uma regressão linear inicial.", `modelo <- lm(${formula}, data = dados)\nsummary(modelo)\nconfint(modelo)`, `import statsmodels.formula.api as smf\nmodelo = smf.ols(${JSON.stringify(formula)}, data=dados).fit()\nprint(modelo.summary())`, "Verifique linearidade, independência, homocedasticidade, resíduos e pontos influentes.", "Efeitos estimados com IC 95% e diagnóstico de resíduos; defina escalas antes da análise."],
    binary: ["regressão logística", "O desfecho binário sugere razões de chances ajustadas por regressão logística.", `modelo <- glm(${formula}, family = binomial(), data = dados)\nsummary(modelo)\nexp(cbind(OR = coef(modelo), confint(modelo)))`, `import statsmodels.formula.api as smf\nmodelo = smf.logit(${JSON.stringify(formula)}, data=dados).fit()\nprint(modelo.summary())`, "Verifique codificação do desfecho, independência, tamanho por parâmetro e separação completa.", "Probabilidades preditas com IC 95%, indicando valores de referência dos demais preditores."],
    count: ["regressão de contagem", "O desfecho de contagem pede avaliação de Poisson e sobredispersão antes de uma decisão final.", `modelo <- glm(${formula}, family = poisson(), data = dados)\nsummary(modelo)\n# Avalie sobredispersão antes de alterar a família.`, `import statsmodels.formula.api as smf\nmodelo = smf.poisson(${JSON.stringify(formula)}, data=dados).fit()\nprint(modelo.summary())`, "Verifique sobredispersão, excesso de zeros, independência e offset/exposição quando aplicável.", "Taxas ou contagens observadas versus preditas, com janela de observação e IC 95%."],
    ordinal: ["regressão ordinal", "O desfecho ordinal preserva ordem de categorias sem assumir intervalos iguais.", `library(MASS)\nmodelo <- polr(as.factor(${input.outcomeName}) ~ ${predictors.join(" + ") || "preditor_1"}, data = dados, Hess = TRUE)\nsummary(modelo)`, `from statsmodels.miscmodels.ordinal_model import OrderedModel\n# Prepare preditores e ajuste um OrderedModel com categorias ordenadas.`, "Verifique a ordenação, chances proporcionais, independência e tamanho por categoria.", "Probabilidades preditas por categoria com IC 95%, sem representar categorias como escala contínua."],
    time_to_event: ["modelo de sobrevivência de Cox", "O tempo até evento pode exigir um modelo que trate censura de forma explícita.", `library(survival)\nmodelo <- coxph(Surv(tempo, evento) ~ ${predictors.join(" + ") || "preditor_1"}, data = dados)\nsummary(modelo)`, `from lifelines import CoxPHFitter\nmodelo = CoxPHFitter()\nmodelo.fit(dados, duration_col="tempo", event_col="evento")\nmodelo.print_summary()`, "Defina tempo/evento, verifique censura não informativa e proporcionalidade de riscos.", "Curvas de Kaplan–Meier e efeitos ajustados com IC 95%, número sob risco e censura."],
  }[input.outcomeType];
  return { recommendation: `Plano inicial: ${recipe[0]}.`, rationale: recipe[1], rCode: recipe[2], pythonCode: recipe[3], assumptions: recipe[4], graphPlan: recipe[5], resultsTemplate: `Relate ${recipe[0]}, estimativas e IC 95%, tamanho amostral analisado, dados ausentes e verificações de pressupostos. Não interprete associação como causalidade sem justificativa do desenho.` };
}

function parseAnalystRecommendation(content: string) {
  const candidate = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const fields = ["recommendation", "rationale", "assumptions", "rCode", "pythonCode", "graphPlan", "resultsTemplate"];
    return fields.every(field => typeof parsed[field] === "string" && String(parsed[field]).trim()) ? Object.fromEntries(fields.map(field => [field, String(parsed[field]).trim()])) : null;
  } catch { return null; }
}

async function generateAnalystRecommendation(input: Pick<AnalystRecommendationFields, "researchQuestion" | "outcomeName" | "outcomeType" | "predictors" | "design" | "missingDataPlan">) {
  const fallback = analystFallback(input);
  const prompt = `Produza um plano estatístico inicial, revisável por um especialista humano. Não execute código, não invente resultados e não alegue causalidade. Responda somente JSON com recommendation, rationale, assumptions, rCode, pythonCode, graphPlan e resultsTemplate. Pergunta: ${input.researchQuestion}. Desfecho: ${input.outcomeName} (${input.outcomeType}). Preditores: ${input.predictors}. Desenho: ${input.design || "não informado"}. Dados ausentes: ${input.missingDataPlan || "não informado"}.`;
  try {
    const response = await Promise.race([
      invokeLLM({ messages: [{ role: "system", content: "Você é um assistente estatístico que prioriza transparência, reprodutibilidade e limites metodológicos." }, { role: "user", content: prompt }] }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Tempo limite")), 20_000)),
    ]);
    const rawContent = response.choices[0]?.message?.content;
    const parsed = parseAnalystRecommendation(typeof rawContent === "string" ? rawContent : "");
    return { ...fallback, ...(parsed ?? {}), model: parsed ? "manus-llm" : "fallback-auditável", isFallback: !parsed };
  } catch { return { ...fallback, model: "fallback-auditável", isFallback: true }; }
}

const scriptoriumDocumentInput = z.object({
  title: z.string().trim().min(3).max(255), targetJournal: z.string().trim().max(255).optional(), abstract: z.string().trim().max(12000).optional(),
  sections: z.array(z.object({ id: z.string().trim().min(1).max(100), heading: z.string().trim().min(1).max(180), content: z.string().trim().max(50000) })).min(1).max(30),
  status: z.enum(["draft", "review", "ready"]),
});

const vaultUploadInput = z.object({
  lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(["text/csv", "application/json", "text/plain", "application/pdf", "application/zip", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]), base64: z.string().min(4).max(33_600_000),
  personalDataCategory: z.enum(["none", "identifiable", "sensitive", "pseudonymized", "anonymized"]), processingPurpose: z.string().trim().min(10).max(4000),
  lawfulBasis: z.string().trim().max(4000).optional(), consentReference: z.string().trim().max(500).optional(), consentConfirmed: z.boolean(),
});

const analystVisualizationInput = z.object({
  kind: z.enum(["distribution", "comparison", "relationship", "effect", "survival"]), title: z.string().trim().min(3).max(255), dataSourceDescription: z.string().trim().min(8).max(4000),
  spec: z.object({ labels: z.array(z.string().trim().min(1).max(80)).min(2).max(30), values: z.array(z.number().finite()).min(2).max(30), confidenceIntervals: z.array(z.number().finite().nonnegative()).max(30).optional(), xLabel: z.string().trim().max(120).optional(), yLabel: z.string().trim().max(120).optional() }),
});

const zoteroConnectionInput = z.object({ libraryId: z.string().trim().regex(/^\d+$/).max(64), libraryType: z.enum(["user", "group"]), apiKey: z.string().trim().min(20).max(255) });

const matchmakerSubmissionInput = z.object({
  manuscriptTitle: z.string().trim().min(3).max(255), scopeSummary: z.string().trim().min(20).max(12000),
  rankedVenues: z.array(z.object({ title: z.string().trim().min(2).max(255), scopeFit: z.number().int().min(0).max(100), accessModel: z.string().trim().max(180), apcNote: z.string().trim().max(500).optional(), decisionTimeNote: z.string().trim().max(500).optional(), rationale: z.string().trim().min(10).max(2000) })).max(20), targetVenue: z.string().trim().max(255).optional(), coverLetter: z.string().trim().max(20000).optional(),
  checklist: z.array(z.object({ framework: z.enum(["PRISMA", "CONSORT", "STROBE", "COREQ", "OUTRO"]), item: z.string().trim().min(2).max(500), completed: z.boolean(), evidence: z.string().trim().max(1000).optional() })).max(80),
  reviewerComments: z.array(z.object({ reviewer: z.string().trim().min(1).max(120), comment: z.string().trim().min(3).max(5000), disposition: z.enum(["pending", "accepted", "clarified", "declined"]), responseDraft: z.string().trim().max(5000).optional() })).max(100), status: z.enum(["planning", "submitted", "revision", "accepted"]),
});

const vigilAssessmentInput = z.object({
  integrityChecklist: z.array(z.object({ id: z.string().trim().min(1).max(80), label: z.string().trim().min(3).max(500), state: z.enum(["not_checked", "review", "clear", "attention"]), evidence: z.string().trim().max(4000).optional() })).max(40),
  referenceAlerts: z.array(z.object({ reference: z.string().trim().min(2).max(1000), type: z.enum(["retraction", "erratum", "expression_of_concern", "quality_note"]), status: z.enum(["open", "reviewed", "resolved"]), note: z.string().trim().max(4000).optional() })).max(80),
  supplementaryMaterials: z.array(z.object({ label: z.string().trim().min(2).max(255), kind: z.enum(["data", "code", "protocol", "appendix", "other"]), url: z.string().trim().url().max(2000).optional(), accessNote: z.string().trim().max(2000).optional() })).max(50),
  dissemination: z.array(z.object({ format: z.enum(["plain_summary", "thread", "slide_outline", "preprint_note"]), content: z.string().trim().min(10).max(12000), status: z.enum(["draft", "review", "approved"]) })).max(20), status: z.enum(["draft", "review", "monitoring"]),
});

function parseJsonArray(value: string | null | undefined): unknown[] {
  if (!value?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function normalizeVaultVariables(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim().replace(/^['"]|['"]$/g, "")).filter(value => /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_. -]*$/.test(value)))).slice(0, 100);
}

function inferVaultVariables(source: "csv_header" | "cleaning_code", sourceText: string) {
  if (source === "csv_header") {
    const header = sourceText.split(/\r?\n/).find(line => line.trim())?.replace(/^\uFEFF/, "") ?? "";
    const commaCount = (header.match(/,/g) ?? []).length;
    const semicolonCount = (header.match(/;/g) ?? []).length;
    return normalizeVaultVariables(header.split(semicolonCount > commaCount ? ";" : ","));
  }
  const quotedColumns = Array.from(sourceText.matchAll(/\[\s*["']([^"']+)["']\s*\]/g), match => match[1]);
  const callArguments = Array.from(sourceText.matchAll(/(?:select|mutate|transmute|rename)\s*\(([^)]*)\)/gi), match => match[1].split(",").map(value => value.trim().split(/\s*=\s*/).pop() ?? ""));
  return normalizeVaultVariables([...quotedColumns, ...callArguments.flat()]);
}

function vaultSnapshot(dataset: Awaited<ReturnType<typeof db.getVaultDataset>>, files: Awaited<ReturnType<typeof db.getVaultFiles>>, dictionary: Awaited<ReturnType<typeof db.getVaultDataDictionary>>, governance: Awaited<ReturnType<typeof db.getVaultGovernanceRecord>>) {
  return JSON.stringify({
    capturedAt: new Date().toISOString(),
    dataset: dataset ? { ...dataset, metadata: parseJsonObject(dataset.metadataJson) } : null,
    files: files.map(file => ({ id: file.id, originalFilename: file.originalFilename, mimeType: file.mimeType, byteSize: file.byteSize, sha256: file.sha256, personalDataCategory: file.personalDataCategory, processingPurpose: file.processingPurpose, createdAt: file.createdAt })),
    dataDictionary: dictionary.map(entry => ({ ...entry, allowedValues: parseJsonArray(entry.allowedValuesJson) })),
    governance: governance ? { ...governance, pendingItems: parseJsonArray(governance.pendingItemsJson) } : null,
  });
}

function preregistrationIntegrityHash(preregistration: z.infer<typeof preregistrationInput>) {
  const canonical = JSON.stringify({
    title: preregistration.title,
    researchQuestion: preregistration.researchQuestion ?? "",
    hypotheses: preregistration.hypotheses ?? "",
    studyDesign: preregistration.studyDesign ?? "",
    primaryOutcomes: preregistration.primaryOutcomes ?? "",
    secondaryOutcomes: preregistration.secondaryOutcomes ?? "",
    samplingPlan: preregistration.samplingPlan ?? "",
    dataCollection: preregistration.dataCollection ?? "",
    analysisPlan: preregistration.analysisPlan ?? "",
    exclusionRules: preregistration.exclusionRules ?? "",
    ethicsAndTransparency: preregistration.ethicsAndTransparency ?? "",
    deviations: preregistration.deviations ?? "",
    status: preregistration.status,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

function normalizeDeduplicationText(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findPossibleDuplicateGroups(articles: Awaited<ReturnType<typeof db.getSavedArticles>>) {
  const groups = new Map<string, number[]>();
  articles.forEach(article => {
    const doi = normalizeDeduplicationText(article.doi);
    const title = normalizeDeduplicationText(article.title);
    const key = doi ? `doi:${doi}` : title ? `title:${title}` : null;
    if (!key) return;
    groups.set(key, [...(groups.get(key) ?? []), article.id]);
  });
  return Array.from(groups.values()).filter(group => group.length > 1);
}

function findPossibleOverlapPairs(articles: Awaited<ReturnType<typeof db.getSavedArticles>>) {
  const pairs: Array<[number, number]> = [];
  for (let index = 0; index < articles.length; index += 1) {
    const left = articles[index];
    const leftAuthors = parseJsonArray(left.authorsJson).filter((author): author is string => typeof author === "string");
    const leftFirstAuthor = normalizeDeduplicationText(leftAuthors[0]).split(" ")[0];
    const leftWords = new Set(normalizeDeduplicationText(left.title).split(" ").filter(word => word.length > 3));
    if (!leftFirstAuthor || leftWords.size === 0) continue;
    for (let candidateIndex = index + 1; candidateIndex < articles.length; candidateIndex += 1) {
      const right = articles[candidateIndex];
      const rightAuthors = parseJsonArray(right.authorsJson).filter((author): author is string => typeof author === "string");
      const rightFirstAuthor = normalizeDeduplicationText(rightAuthors[0]).split(" ")[0];
      const yearDistance = Math.abs((left.publicationYear ?? 0) - (right.publicationYear ?? 0));
      const rightWords = normalizeDeduplicationText(right.title).split(" ").filter(word => word.length > 3);
      const overlap = rightWords.filter(word => leftWords.has(word)).length / Math.max(leftWords.size, rightWords.length, 1);
      if (leftFirstAuthor === rightFirstAuthor && yearDistance <= 2 && overlap >= 0.35) pairs.push([left.id, right.id]);
    }
  }
  return pairs;
}

function prismaFromScreenings(articles: Awaited<ReturnType<typeof db.getSavedArticles>>, screenings: Awaited<ReturnType<typeof db.getProjectScreenings>>) {
  const byArticle = new Map(screenings.map(screening => [screening.articleId, screening]));
  const titleAbstract = articles.filter(article => byArticle.get(article.id)?.stage === "title_abstract");
  const fullText = articles.filter(article => byArticle.get(article.id)?.stage === "full_text");
  const titleAbstractIncluded = titleAbstract.filter(article => byArticle.get(article.id)?.decision === "included").length;
  const fullTextIncluded = fullText.filter(article => byArticle.get(article.id)?.decision === "included").length;
  return {
    recordsIdentified: articles.length,
    recordsScreened: titleAbstract.length,
    recordsExcluded: titleAbstract.filter(article => byArticle.get(article.id)?.decision === "excluded").length,
    reportsSought: fullText.length,
    reportsAssessed: fullText.length,
    reportsExcluded: fullText.filter(article => byArticle.get(article.id)?.decision === "excluded").length,
    studiesIncluded: fullTextIncluded || titleAbstractIncluded,
    source: "Contagens derivadas somente de artigos salvos e decisões de triagem registradas neste projeto.",
  };
}

function toArticleView(article: Awaited<ReturnType<typeof db.getSavedArticles>>[number], extraction?: Awaited<ReturnType<typeof db.getExtraction>>) {
  return {
    ...article,
    authors: JSON.parse(article.authorsJson) as string[],
    extraction: extraction ? {
      ...extraction,
      evidence: JSON.parse(extraction.evidenceJson) as unknown[],
    } : null,
  };
}

async function assertProjectAccess(projectId: number, userId: number) {
  const project = await db.getProjectForUser(projectId, userId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado." });
  return project;
}

async function assertLapisProjectAccess(lapisProjectId: number, userId: number) {
  const project = await db.getLapisProjectForUser(lapisProjectId, userId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto Lapis não encontrado." });
  return project;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  cartographer: router({
    search: protectedProcedure
      .input(z.object({ query: z.string().trim().min(3).max(240), limit: z.number().int().min(1).max(15).default(10) }))
      .query(async ({ input }) => searchAcademicArticles(input.query, input.limit)),
    projects: protectedProcedure.query(async ({ ctx }) => db.getProjectsByUserId(ctx.user.id)),
    createProject: protectedProcedure
      .input(z.object({ name: z.string().trim().min(3).max(180), researchQuestion: z.string().trim().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const projectId = await db.createReviewProject(ctx.user.id, input.name, input.researchQuestion);
        return { projectId };
      }),
    projectOverview: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const project = await assertProjectAccess(input.projectId, ctx.user.id);
        const [saved, metrics, synthesis, screenings, themes] = await Promise.all([
          db.getSavedArticles(input.projectId),
          db.getProjectMetrics(input.projectId),
          db.getProjectSynthesis(input.projectId),
          db.getProjectScreenings(input.projectId),
          db.getNarrativeThemes(input.projectId),
        ]);
        const articles = await Promise.all(saved.map(async article => {
          const [extraction, document] = await Promise.all([db.getExtraction(article.id), db.getArticleDocument(article.id)]);
          return { ...toArticleView(article, extraction), document: document ?? null };
        }));
        return {
          project,
          articles,
          metrics,
          screenings,
          possibleDuplicateGroups: findPossibleDuplicateGroups(saved),
          possibleOverlapPairs: findPossibleOverlapPairs(saved),
          prisma: prismaFromScreenings(saved, screenings),
          narrativeThemes: themes.map(theme => ({ ...theme, articleIds: parseJsonArray(theme.articleIdsJson).filter((id): id is number => typeof id === "number") })),
          synthesis: synthesis ? { ...synthesis, citations: parseJsonArray(synthesis.citationsJson) } : null,
        };
      }),
    prisma: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const [articles, screenings] = await Promise.all([db.getSavedArticles(input.projectId), db.getProjectScreenings(input.projectId)]);
      return prismaFromScreenings(articles, screenings);
    }),
    citationMap: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const articles = await db.getSavedArticles(input.projectId);
      return buildCitationMap(articles.map(article => ({ externalId: article.externalId, source: article.source, doi: article.doi, title: article.title, year: article.publicationYear, citationCount: article.citationCount, url: article.sourceUrl })));
    }),
    referenceIntegrity: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), articleId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const article = await db.getArticleForProject(input.articleId, input.projectId);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado." });
      return { articleId: article.id, title: article.title, doi: article.doi, checkedAt: new Date().toISOString(), ...(await inspectReferenceIntegrity(article.doi)) };
    }),
    saveArticle: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), article: articleInput }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        await db.saveArticle(input.projectId, input.article);
        return { success: true };
      }),
    duplicateReviewCandidates: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        const [articles, reviews] = await Promise.all([db.getSavedArticles(input.projectId), db.getArticleDuplicateReviews(input.projectId)]);
        const byId = new Map(articles.map(article => [article.id, article]));
        const reviewByPair = new Map(reviews.map(review => [`${review.articleIdA}:${review.articleIdB}`, review]));
        return findTitleSimilarityCandidates(articles).map(candidate => {
          const left = byId.get(candidate.articleIdA);
          const right = byId.get(candidate.articleIdB);
          return {
            ...candidate,
            articleA: left ? { id: left.id, title: left.title, authors: parseJsonArray(left.authorsJson), year: left.publicationYear, doi: left.doi } : null,
            articleB: right ? { id: right.id, title: right.title, authors: parseJsonArray(right.authorsJson), year: right.publicationYear, doi: right.doi } : null,
            review: reviewByPair.get(`${candidate.articleIdA}:${candidate.articleIdB}`) ?? null,
          };
        });
      }),
    reviewDuplicateCandidate: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), articleIdA: z.number().int().positive(), articleIdB: z.number().int().positive(), decision: z.enum(["same_study", "distinct"]), reviewerNote: z.string().trim().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        if (input.articleIdA === input.articleIdB) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione dois estudos distintos para revisão." });
        const [left, right] = await Promise.all([
          db.getArticleForProject(input.articleIdA, input.projectId),
          db.getArticleForProject(input.articleIdB, input.projectId),
        ]);
        if (!left || !right) throw new TRPCError({ code: "BAD_REQUEST", message: "Os dois estudos precisam pertencer ao projeto ativo." });
        const candidate = scoreTitleSimilarity(left, right);
        if (!candidate) throw new TRPCError({ code: "BAD_REQUEST", message: "Este par não atende ao limiar de revisão por título semelhante." });
        await db.upsertArticleDuplicateReview({
          projectId: input.projectId,
          articleIdA: candidate.articleIdA,
          articleIdB: candidate.articleIdB,
          similarityScore: Math.round(candidate.score),
          decision: input.decision,
          reviewerNote: input.reviewerNote,
        });
        return { success: true, score: candidate.score };
      }),
    previewRisImport: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), filename: z.string().trim().min(1).max(255), content: z.string().min(1).max(2_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        if (!/\.ris$/i.test(input.filename)) throw new TRPCError({ code: "BAD_REQUEST", message: "Envie um arquivo com extensão .ris." });
        try {
          return createRisPreview(input.content, await db.getSavedArticles(input.projectId));
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível ler o arquivo RIS." });
        }
      }),
    confirmRisImport: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), filename: z.string().trim().min(1).max(255), content: z.string().min(1).max(2_000_000), selectedExternalIds: z.array(z.string().min(1).max(255)).min(1).max(500), acknowledged: z.literal(true) }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        if (!/\.ris$/i.test(input.filename)) throw new TRPCError({ code: "BAD_REQUEST", message: "Envie um arquivo com extensão .ris." });
        const preview = createRisPreview(input.content, await db.getSavedArticles(input.projectId));
        const selection = new Set(input.selectedExternalIds);
        const articles = preview.records.filter(record => record.status === "ready" && selection.has(record.externalId));
        if (!articles.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione ao menos uma referência disponível para importação." });
        const sanitizedFilename = input.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-255) || "reticula.ris";
        const importBatchId = await db.saveRisImportBatch({
          projectId: input.projectId,
          originalFilename: sanitizedFilename,
          contentHash: preview.contentHash,
          totalRecords: preview.total,
          candidateRecords: preview.candidateCount,
          duplicateRecords: preview.duplicateCount,
          selectedRecords: articles.length,
          provenanceJson: JSON.stringify({ source: "Retícula — Atlas de Literatura Científica", format: "RIS", notes: preview.provenance, importedAt: new Date().toISOString() }),
          articles,
        });
        return { importBatchId, importedCount: articles.length, skippedDuplicates: preview.duplicateCount };
      }),
    toggleArticleRead: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), articleId: z.number().int().positive(), isRead: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        const article = await db.getArticleForProject(input.articleId, input.projectId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado." });
        await db.setArticleReadState(article.id, input.isRead);
        return { success: true };
      }),
    removeArticle: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), articleId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        const article = await db.getArticleForProject(input.articleId, input.projectId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado." });
        await db.removeSavedArticle(article.id);
        return { success: true };
      }),
    screenArticle: protectedProcedure.input(screeningInput).mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const article = await db.getArticleForProject(input.articleId, input.projectId);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado." });
      await db.upsertArticleScreening(input.projectId, input.articleId, input);
      return { success: true };
    }),
    importArticlePdf: protectedProcedure.input(pdfImportInput).mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const article = await db.getArticleForProject(input.articleId, input.projectId);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado." });
      let buffer: Buffer;
      try {
        if (!/^[a-zA-Z0-9+/=\s]+$/.test(input.base64)) throw new Error("Base64 inválido.");
        buffer = Buffer.from(input.base64, "base64");
        validatePdfBuffer(buffer);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "PDF inválido." });
      }
      const extracted = await extractPdfText(buffer).catch(error => ({ error: error instanceof Error ? error.message : "Falha ao extrair texto." }));
      const filename = input.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-180) || "artigo.pdf";
      const stored = await storagePut(`users/${ctx.user.id}/reviews/${input.projectId}/articles/${input.articleId}/${filename}`, buffer, input.mimeType);
      if ("error" in extracted) {
        await db.upsertArticleDocument({ projectId: input.projectId, articleId: input.articleId, originalFilename: input.filename, storageKey: stored.key, storageUrl: stored.url, mimeType: input.mimeType, byteSize: buffer.byteLength, extractionStatus: "error", fullText: null, errorMessage: extracted.error, extractedAt: null });
        return { status: "error" as const, message: extracted.error };
      }
      await db.upsertArticleDocument({ projectId: input.projectId, articleId: input.articleId, originalFilename: input.filename, storageKey: stored.key, storageUrl: stored.url, mimeType: input.mimeType, byteSize: buffer.byteLength, pageCount: extracted.pageCount, extractionStatus: "ready", fullText: extracted.text, errorMessage: null, extractedAt: new Date() });
      return { status: "ready" as const, pageCount: extracted.pageCount, charactersExtracted: extracted.text.length };
    }),
    createNarrativeTheme: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), theme: narrativeThemeInput })).mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const projectArticles = await db.getSavedArticles(input.projectId);
      const allowedIds = new Set(projectArticles.map(article => article.id));
      if (input.theme.articleIds.some(articleId => !allowedIds.has(articleId))) throw new TRPCError({ code: "BAD_REQUEST", message: "As evidências escolhidas precisam pertencer ao corpus deste projeto." });
      const themeId = await db.createNarrativeTheme(input.projectId, { title: input.theme.title, interpretation: input.theme.interpretation, articleIdsJson: JSON.stringify(input.theme.articleIds) });
      return { themeId };
    }),
    updateNarrativeTheme: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), themeId: z.number().int().positive(), theme: narrativeThemeInput })).mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const projectArticles = await db.getSavedArticles(input.projectId);
      const allowedIds = new Set(projectArticles.map(article => article.id));
      if (input.theme.articleIds.some(articleId => !allowedIds.has(articleId))) throw new TRPCError({ code: "BAD_REQUEST", message: "As evidências escolhidas precisam pertencer ao corpus deste projeto." });
      await db.updateNarrativeTheme(input.projectId, input.themeId, { title: input.theme.title, interpretation: input.theme.interpretation, articleIdsJson: JSON.stringify(input.theme.articleIds) });
      return { success: true };
    }),
    removeNarrativeTheme: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), themeId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      await db.removeNarrativeTheme(input.projectId, input.themeId);
      return { success: true };
    }),
    extractArticle: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), articleId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        const article = await db.getArticleForProject(input.articleId, input.projectId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado." });
        const authors = JSON.parse(article.authorsJson) as string[];
        const result = await extractArticleData({ title: article.title, abstract: article.abstract, year: article.publicationYear, authors });
        await db.upsertExtraction(article.id, {
          objective: result.extraction.objective,
          methodology: result.extraction.methodology,
          sample: result.extraction.sample,
          mainFindings: result.extraction.mainFindings,
          limitations: result.extraction.limitations,
          evidenceJson: JSON.stringify(result.extraction.evidence),
          model: result.model,
        });
        return result.extraction;
      }),
    generateSynthesis: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id);
        await db.setProjectSynthesis(input.projectId, { status: "generating", citationsJson: "[]", content: null, model: null, errorMessage: null });
        try {
          const articles = await db.getSavedArticles(input.projectId);
          const withExtractions = await Promise.all(articles.map(async article => {
            const extraction = await db.getExtraction(article.id);
            return {
              id: article.id,
              title: article.title,
              abstract: article.abstract,
              authors: JSON.parse(article.authorsJson) as string[],
              year: article.publicationYear,
              extraction: extraction ? {
                objective: extraction.objective,
                methodology: extraction.methodology,
                sample: extraction.sample,
                mainFindings: extraction.mainFindings,
                limitations: extraction.limitations,
                evidence: JSON.parse(extraction.evidenceJson),
              } as StructuredExtraction : null,
            };
          }));
          const synthesis = await createAuditableSynthesis(withExtractions);
          await db.setProjectSynthesis(input.projectId, { status: "ready", content: synthesis.paragraph, citationsJson: JSON.stringify(synthesis.citations), model: synthesis.model, errorMessage: null });
          return synthesis;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha inesperada ao gerar a síntese.";
          await db.setProjectSynthesis(input.projectId, { status: "error", content: null, citationsJson: "[]", model: null, errorMessage: message });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
        }
    }),
  }),
  lapis: router({
    projects: protectedProcedure.query(async ({ ctx }) => db.getLapisProjectsByUserId(ctx.user.id)),
    createProject: protectedProcedure.input(lapisProjectInput).mutation(async ({ ctx, input }) => {
      if (input.reviewProjectId) await assertProjectAccess(input.reviewProjectId, ctx.user.id);
      const lapisProjectId = await db.createLapisProject(ctx.user.id, input);
      return { lapisProjectId };
    }),
    updateProject: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), project: lapisProjectInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (input.project.reviewProjectId) await assertProjectAccess(input.project.reviewProjectId, ctx.user.id);
      await db.updateLapisProject(input.lapisProjectId, input.project);
      return { success: true };
    }),
    removeProject: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.removeLapisProject(input.lapisProjectId);
      return { success: true };
    }),
    workspace: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const project = await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const [analyses, method, preregistration, milestones, grantSelections, manuscript, academicRecordSearches, devilReviews] = await Promise.all([
        db.getLapisAnalyses(input.lapisProjectId),
        db.getLapisMethod(input.lapisProjectId),
        db.getLapisPreregistration(input.lapisProjectId),
        db.getLapisMilestones(input.lapisProjectId),
        db.getLapisGrantSelections(input.lapisProjectId),
        db.getLapisManuscript(input.lapisProjectId),
        db.getLapisAcademicRecordSearches(input.lapisProjectId),
        db.getLapisPreregistrationDevilReviews(input.lapisProjectId),
      ]);
      const reviewProject = project.reviewProjectId ? await db.getProjectForUser(project.reviewProjectId, ctx.user.id) : null;
      return {
        project,
        reviewProject,
        method,
        preregistration: preregistration ?? null,
        milestones,
        grantSelections,
        manuscript: manuscript ? { ...manuscript, sections: parseJsonArray(manuscript.sectionsJson) } : null,
        analyses: analyses.map(analysis => ({ ...analysis, evidence: parseJsonArray(analysis.evidenceJson) })),
        academicRecordSearches: academicRecordSearches.map(search => ({ ...search, sources: parseJsonArray(search.sourcesJson), results: parseJsonArray(search.resultsJson) })),
        devilReviews: devilReviews.map(review => ({ ...review, review: JSON.parse(review.reviewJson) })),
      };
    }),
    searchAcademicRecords: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), query: z.string().trim().min(3).max(500), criteria: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const result = await searchAcademicRecords(input.query);
      const searchId = await db.createLapisAcademicRecordSearch(input.lapisProjectId, {
        queryText: result.query,
        criteriaText: input.criteria?.trim() || "Consulta de originalidade iniciada pelo pesquisador.",
        sourcesJson: JSON.stringify(result.sources),
        resultCount: result.records.length,
        resultsJson: JSON.stringify(result.records),
      });
      return { searchId, ...result };
    }),
    updateMethod: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), method: lapisMethodInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.upsertLapisMethod(input.lapisProjectId, input.method);
      return { success: true };
    }),
    updatePreregistration: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), preregistration: preregistrationInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const existing = await db.getLapisPreregistration(input.lapisProjectId);
      if (existing?.status === "locked") throw new TRPCError({ code: "CONFLICT", message: "Este pré-registro está bloqueado. Crie uma nova versão para alterar o protocolo." });
      const integrityHash = preregistrationIntegrityHash(input.preregistration);
      await db.upsertLapisPreregistration(input.lapisProjectId, { ...input.preregistration, integrityHash });
      return { success: true, integrityHash };
    }),
    lockPreregistration: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const existing = await db.getLapisPreregistration(input.lapisProjectId);
      if (!existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Salve o pré-registro antes de bloqueá-lo." });
      if (existing.status !== "locked") await db.lockLapisPreregistration(input.lapisProjectId);
      return { success: true };
    }),
    generateDevilsAdvocateReview: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const preregistration = await db.getLapisPreregistration(input.lapisProjectId);
      if (!preregistration) throw new TRPCError({ code: "BAD_REQUEST", message: "Salve o protocolo antes de solicitar a revisão crítica." });
      const generated = await generateDevilsAdvocateReview(preregistration);
      const reviewId = await db.createLapisPreregistrationDevilReview(input.lapisProjectId, {
        preregistrationHash: preregistration.integrityHash,
        reviewJson: JSON.stringify(generated.review),
        model: generated.model,
      });
      return { reviewId, preregistrationHash: preregistration.integrityHash, ...generated };
    }),
    createMilestone: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), milestone: milestoneInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const milestoneId = await db.createLapisMilestone(input.lapisProjectId, input.milestone);
      return { milestoneId };
    }),
    updateMilestone: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), milestoneId: z.number().int().positive(), milestone: milestoneInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.updateLapisMilestone(input.lapisProjectId, input.milestoneId, input.milestone);
      return { success: true };
    }),
    removeMilestone: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), milestoneId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.removeLapisMilestone(input.lapisProjectId, input.milestoneId);
      return { success: true };
    }),
    grantOpportunities: protectedProcedure.input(z.object({ provider: z.enum(["cnpq", "capes"]).optional() }).optional()).query(async ({ input }) => db.getGrantOpportunities(input?.provider)),
    syncOfficialGrants: protectedProcedure.mutation(async () => {
      const opportunities = await fetchOfficialGrantOpportunities();
      await Promise.all(opportunities.map(opportunity => db.upsertGrantOpportunity(opportunity)));
      return { synced: opportunities.length, fetchedAt: new Date().toISOString() };
    }),
    selectGrantOpportunity: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), grantOpportunityId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const opportunity = (await db.getGrantOpportunities()).find(item => item.id === input.grantOpportunityId);
      if (!opportunity) throw new TRPCError({ code: "NOT_FOUND", message: "Edital oficial não encontrado." });
      await db.selectLapisGrant(input.lapisProjectId, input.grantOpportunityId);
      return { success: true };
    }),
    removeGrantOpportunitySelection: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), grantOpportunityId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.removeLapisGrantSelection(input.lapisProjectId, input.grantOpportunityId);
      return { success: true };
    }),
    updateManuscript: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), manuscript: manuscriptInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.upsertLapisManuscript(input.lapisProjectId, { ...input.manuscript, sectionsJson: JSON.stringify(input.manuscript.sections) });
      return { success: true };
    }),
    vaultWorkspace: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const project = await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      return { project, datasets: await db.getVaultDatasets(input.lapisProjectId) };
    }),
    createVaultDataset: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), dataset: vaultDatasetInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const datasetId = await db.createVaultDataset(input.lapisProjectId, { ...input.dataset, storageLocation: input.dataset.storageLocation || null, persistentIdentifier: input.dataset.persistentIdentifier || null, license: input.dataset.license || null, lawfulBasis: input.dataset.lawfulBasis || null, anonymizationPlan: input.dataset.anonymizationPlan || null, retentionPolicy: input.dataset.retentionPolicy || null, metadataJson: JSON.stringify(input.dataset.metadata) });
      const [dataset, files, dictionary, governance] = await Promise.all([db.getVaultDataset(input.lapisProjectId, datasetId), db.getVaultFiles(datasetId), db.getVaultDataDictionary(datasetId), db.getVaultGovernanceRecord(datasetId)]);
      await db.createVaultDatasetVersion(datasetId, ctx.user.id, "Registro inicial do ativo de dados", vaultSnapshot(dataset, files, dictionary, governance));
      return { datasetId };
    }),
    updateVaultDataset: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), dataset: vaultDatasetInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.updateVaultDataset(input.lapisProjectId, input.datasetId, { ...input.dataset, storageLocation: input.dataset.storageLocation || null, persistentIdentifier: input.dataset.persistentIdentifier || null, license: input.dataset.license || null, lawfulBasis: input.dataset.lawfulBasis || null, anonymizationPlan: input.dataset.anonymizationPlan || null, retentionPolicy: input.dataset.retentionPolicy || null, metadataJson: JSON.stringify(input.dataset.metadata) });
      const [dataset, files, dictionary, governance] = await Promise.all([db.getVaultDataset(input.lapisProjectId, input.datasetId), db.getVaultFiles(input.datasetId), db.getVaultDataDictionary(input.datasetId), db.getVaultGovernanceRecord(input.datasetId)]);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      await db.createVaultDatasetVersion(input.datasetId, ctx.user.id, "Metadados e controles do ativo atualizados", vaultSnapshot(dataset, files, dictionary, governance));
      return { success: true };
    }),
    vaultDatasetWorkspace: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      const [files, versions, dataDictionary, governance, repositoryPlans] = await Promise.all([
        db.getVaultFiles(input.datasetId),
        db.getVaultDatasetVersions(input.datasetId),
        db.getVaultDataDictionary(input.datasetId),
        db.getVaultGovernanceRecord(input.datasetId),
        db.getVaultRepositoryPlans(input.datasetId),
      ]);
      const authorizationHistory = await Promise.all(repositoryPlans.map(plan => db.getVaultRepositoryAuthorizations(plan.id)));
      return {
        dataset: { ...dataset, metadata: parseJsonObject(dataset.metadataJson) },
        files,
        versions,
        dataDictionary: dataDictionary.map(entry => ({ ...entry, allowedValues: parseJsonArray(entry.allowedValuesJson) })),
        governance: governance ? { ...governance, pendingItems: parseJsonArray(governance.pendingItemsJson) } : null,
        repositoryPlans: repositoryPlans.map((plan, index) => ({ ...plan, requirements: parseJsonArray(plan.requirementsJson), metadataSnapshot: parseJsonObject(plan.metadataSnapshotJson), authorizationHistory: authorizationHistory[index], currentAuthorization: authorizationHistory[index][0] ?? null })),
      };
    }),
    createVaultDatasetVersion: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), version: vaultVersionInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      const [files, dictionary, governance] = await Promise.all([db.getVaultFiles(input.datasetId), db.getVaultDataDictionary(input.datasetId), db.getVaultGovernanceRecord(input.datasetId)]);
      return db.createVaultDatasetVersion(input.datasetId, ctx.user.id, input.version.changeSummary, vaultSnapshot(dataset, files, dictionary, governance));
    }),
    upsertVaultDataDictionaryEntry: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), entry: vaultDataDictionaryEntryInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      await db.upsertVaultDataDictionaryEntry(input.datasetId, { ...input.entry, allowedValuesJson: JSON.stringify(input.entry.allowedValues), units: input.entry.units || null, missingValueRule: input.entry.missingValueRule || null, source: "manual", sourceDetail: "Registrado manualmente pelo pesquisador" });
      const [files, dictionary, governance] = await Promise.all([db.getVaultFiles(input.datasetId), db.getVaultDataDictionary(input.datasetId), db.getVaultGovernanceRecord(input.datasetId)]);
      await db.createVaultDatasetVersion(input.datasetId, ctx.user.id, `Dicionário de dados atualizado: ${input.entry.variableName}`, vaultSnapshot(dataset, files, dictionary, governance));
      return { success: true };
    }),
    generateVaultDataDictionary: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), generation: vaultDataDictionaryGenerationInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      const variableNames = inferVaultVariables(input.generation.source, input.generation.sourceText);
      if (!variableNames.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível identificar nomes de variáveis. Informe um cabeçalho CSV ou use o cadastro manual." });
      const sourceLabel = input.generation.source === "csv_header" ? "Cabeçalho CSV informado" : "Trecho de código de limpeza informado";
      await Promise.all(variableNames.map(variableName => db.upsertVaultDataDictionaryEntry(input.datasetId, {
        variableName,
        variableType: "unknown",
        description: `Variável detectada a partir de ${sourceLabel.toLocaleLowerCase("pt-BR")}. Complete a definição operacional antes de reutilizar o dataset.`,
        allowedValuesJson: "[]",
        source: input.generation.source,
        sourceDetail: `${sourceLabel}; ${input.generation.sourceText.split(/\r?\n/).filter(line => line.trim()).length} linha(s) analisada(s); tipos e valores não foram inferidos.`,
      })));
      const [files, dictionary, governance] = await Promise.all([db.getVaultFiles(input.datasetId), db.getVaultDataDictionary(input.datasetId), db.getVaultGovernanceRecord(input.datasetId)]);
      await db.createVaultDatasetVersion(input.datasetId, ctx.user.id, `Dicionário gerado a partir de ${input.generation.source === "csv_header" ? "cabeçalho CSV" : "código de limpeza"}`, vaultSnapshot(dataset, files, dictionary, governance));
      return { generated: variableNames, warning: "A geração identifica somente nomes declarados. Tipos, descrições, unidades, regras de ausência e valores permitidos exigem revisão do pesquisador." };
    }),
    upsertVaultGovernance: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), governance: vaultGovernanceInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      if (input.governance.humanSubjects && input.governance.cepConepStatus === "not_applicable") throw new TRPCError({ code: "BAD_REQUEST", message: "Projetos com participantes humanos exigem um estado CEP/Conep diferente de ‘não aplicável’." });
      if (!input.governance.humanSubjects && input.governance.cepConepStatus !== "not_applicable") throw new TRPCError({ code: "BAD_REQUEST", message: "Use ‘não aplicável’ quando o ativo não envolver participantes humanos." });
      await db.upsertVaultGovernanceRecord(input.datasetId, { ...input.governance, approvalReference: input.governance.approvalReference || null, privacyImpactSummary: input.governance.privacyImpactSummary || null, pendingItemsJson: JSON.stringify(input.governance.pendingItems), lastReviewedAt: new Date() });
      const [files, dictionary, governance] = await Promise.all([db.getVaultFiles(input.datasetId), db.getVaultDataDictionary(input.datasetId), db.getVaultGovernanceRecord(input.datasetId)]);
      await db.createVaultDatasetVersion(input.datasetId, ctx.user.id, "Checklist LGPD e CEP/Conep revisado", vaultSnapshot(dataset, files, dictionary, governance));
      return { success: true };
    }),
    upsertVaultRepositoryPlan: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), plan: vaultRepositoryPlanInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      const [files, dictionary, governance] = await Promise.all([db.getVaultFiles(input.datasetId), db.getVaultDataDictionary(input.datasetId), db.getVaultGovernanceRecord(input.datasetId)]);
      const metadataSnapshotJson = vaultSnapshot(dataset, files, dictionary, governance);
      await db.upsertVaultRepositoryPlan(input.datasetId, { ...input.plan, destinationUrl: input.plan.destinationUrl || null, repositoryRecordId: input.plan.repositoryRecordId || null, requirementsJson: JSON.stringify(input.plan.requirements), metadataSnapshotJson, notes: input.plan.notes || null, createdByUserId: ctx.user.id });
      await db.createVaultDatasetVersion(input.datasetId, ctx.user.id, `Plano de depósito ${input.plan.repository} atualizado`, metadataSnapshotJson);
      return { success: true };
    }),
    confirmVaultRepositoryAuthorization: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), repositoryPlanId: z.number().int().positive(), confirmation: vaultRepositoryAuthorizationInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      const plan = (await db.getVaultRepositoryPlans(input.datasetId)).find(item => item.id === input.repositoryPlanId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plano de repositório não encontrado para este ativo." });
      const authorizationHistory = await db.getVaultRepositoryAuthorizations(plan.id);
      if (authorizationHistory[0]?.action === "confirmed") return { success: true, alreadyConfirmed: true };
      const metadataSnapshotJson = JSON.stringify({ datasetId: dataset.id, datasetTitle: dataset.title, repositoryPlanId: plan.id, repository: plan.repository, destinationUrl: plan.destinationUrl, requirements: parseJsonArray(plan.requirementsJson), metadataSnapshot: parseJsonObject(plan.metadataSnapshotJson), transmissionExecuted: false });
      await db.createVaultRepositoryAuthorization(plan.id, { action: "confirmed", confirmationStatement: input.confirmation.confirmationStatement, metadataSnapshotJson, confirmedByUserId: ctx.user.id });
      await db.createVaultDatasetVersion(input.datasetId, ctx.user.id, `Autorização explícita registrada para preparar depósito em ${plan.repository}`, metadataSnapshotJson);
      return { success: true, alreadyConfirmed: false };
    }),
    revokeVaultRepositoryAuthorization: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive(), repositoryPlanId: z.number().int().positive(), confirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      const plan = (await db.getVaultRepositoryPlans(input.datasetId)).find(item => item.id === input.repositoryPlanId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plano de repositório não encontrado para este ativo." });
      const authorizationHistory = await db.getVaultRepositoryAuthorizations(plan.id);
      if (authorizationHistory[0]?.action !== "confirmed") throw new TRPCError({ code: "BAD_REQUEST", message: "Não há uma autorização ativa para revogar." });
      const metadataSnapshotJson = JSON.stringify({ datasetId: dataset.id, datasetTitle: dataset.title, repositoryPlanId: plan.id, repository: plan.repository, destinationUrl: plan.destinationUrl, revokedAuthorizationId: authorizationHistory[0].id, transmissionExecuted: false });
      await db.createVaultRepositoryAuthorization(plan.id, { action: "revoked", confirmationStatement: "Autorização de autenticação e preparação de depósito revogada pelo pesquisador.", metadataSnapshotJson, confirmedByUserId: ctx.user.id });
      await db.createVaultDatasetVersion(input.datasetId, ctx.user.id, `Autorização de depósito revogada para ${plan.repository}`, metadataSnapshotJson);
      return { success: true };
    }),
    vaultFiles: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), datasetId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (!await db.getVaultDataset(input.lapisProjectId, input.datasetId)) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      return db.getVaultFiles(input.datasetId);
    }),
    uploadVaultFile: protectedProcedure.input(vaultUploadInput).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const dataset = await db.getVaultDataset(input.lapisProjectId, input.datasetId);
      if (!dataset) throw new TRPCError({ code: "NOT_FOUND", message: "Conjunto de dados não encontrado." });
      if (["identifiable", "sensitive"].includes(input.personalDataCategory) && (!input.lawfulBasis || !input.consentConfirmed)) throw new TRPCError({ code: "BAD_REQUEST", message: "Dados identificáveis ou sensíveis exigem base legal declarada e confirmação de consentimento/documentação antes do envio." });
      const bytes = Buffer.from(input.base64, "base64");
      if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "O arquivo deve ter entre 1 byte e 25 MB." });
      const digest = createHash("sha256").update(bytes).digest("hex");
      const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`vault/${ctx.user.id}/${input.lapisProjectId}/${input.datasetId}/${Date.now()}_${safeFilename}`, bytes, input.mimeType);
      const fileId = await db.createVaultFile(input.datasetId, { originalFilename: input.filename, storageKey: stored.key, storageUrl: stored.url, mimeType: input.mimeType, byteSize: bytes.length, sha256: digest, personalDataCategory: input.personalDataCategory, processingPurpose: input.processingPurpose, lawfulBasis: input.lawfulBasis || null, consentReference: input.consentReference || null, consentConfirmed: input.consentConfirmed, uploadedByUserId: ctx.user.id });
      const [files, dictionary, governance] = await Promise.all([db.getVaultFiles(input.datasetId), db.getVaultDataDictionary(input.datasetId), db.getVaultGovernanceRecord(input.datasetId)]);
      await db.createVaultDatasetVersion(input.datasetId, ctx.user.id, `Arquivo adicionado: ${input.filename}`, vaultSnapshot(dataset, files, dictionary, governance));
      return { fileId, sha256: digest, byteSize: bytes.length };
    }),
    qualiaWorkspace: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      const project = await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const corpora = await db.getQualiaCorpora(input.lapisProjectId);
      const corpusId = input.corpusId ?? corpora[0]?.id;
      if (!corpusId) return { project, corpora, corpus: null, codes: [], excerpts: [], sources: [], suggestions: [], codingDecisions: [], memos: [] };
      const corpus = await db.getQualiaCorpus(corpusId, input.lapisProjectId);
      if (!corpus) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      const [codes, excerpts, sources, suggestions, codingDecisions, memos] = await Promise.all([db.getQualiaCodes(corpusId), db.getQualiaExcerpts(corpusId), db.getQualiaSources(corpusId), db.getQualiaCodeSuggestions(corpusId), db.getQualiaCodingDecisions(corpusId), db.getQualiaMemos(corpusId)]);
      return { project, corpora, corpus, codes, excerpts, sources, suggestions, codingDecisions, memos };
    }),
    createQualiaCorpus: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpus: qualiaCorpusInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      return { corpusId: await db.createQualiaCorpus(input.lapisProjectId, { ...input.corpus, sourceScope: input.corpus.sourceScope || null }) };
    }),
    createQualiaCode: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), code: qualiaCodeInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (!await db.getQualiaCorpus(input.corpusId, input.lapisProjectId)) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      return { codeId: await db.createQualiaCode(input.corpusId, input.code) };
    }),
    createQualiaExcerpt: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), excerpt: qualiaExcerptInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (!await db.getQualiaCorpus(input.corpusId, input.lapisProjectId)) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      return { excerptId: await db.createQualiaExcerpt(input.corpusId, input.excerpt) };
    }),
    createQualiaSource: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), source: qualiaSourceInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (!await db.getQualiaCorpus(input.corpusId, input.lapisProjectId)) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      return { sourceId: await db.createQualiaSource(input.corpusId, { ...input.source, transcription: input.source.transcription || null, researcherDescription: input.source.researcherDescription || null }) };
    }),
    uploadQualiaMedia: protectedProcedure.input(qualiaMediaUploadInput).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (!await db.getQualiaCorpus(input.corpusId, input.lapisProjectId)) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      const bytes = Buffer.from(input.base64, "base64");
      if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "O arquivo deve ter entre 1 byte e 25 MB." });
      if (input.mediaType === "audio" && !input.mimeType.startsWith("audio/")) throw new TRPCError({ code: "BAD_REQUEST", message: "A fonte de áudio exige um tipo MIME de áudio." });
      if (input.mediaType === "image" && !input.mimeType.startsWith("image/")) throw new TRPCError({ code: "BAD_REQUEST", message: "A fonte de imagem exige um tipo MIME de imagem." });
      if (input.mediaType === "video" && !input.mimeType.startsWith("video/")) throw new TRPCError({ code: "BAD_REQUEST", message: "A fonte de vídeo exige um tipo MIME de vídeo." });
      const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`qualia/${ctx.user.id}/${input.lapisProjectId}/${input.corpusId}/${Date.now()}_${safeFilename}`, bytes, input.mimeType);
      const sourceId = await db.createQualiaSource(input.corpusId, { label: input.label, mediaType: input.mediaType, storageKey: stored.key, mediaUrl: stored.url, mimeType: input.mimeType, researcherDescription: input.researcherDescription || null });
      return { sourceId, byteSize: bytes.length };
    }),
    transcribeQualiaSource: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), sourceId: z.number().int().positive(), language: z.string().trim().min(2).max(12).optional() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const source = await db.getQualiaSource(input.sourceId, input.corpusId);
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Fonte qualitativa não encontrada." });
      if (source.mediaType !== "audio" || !source.storageKey) throw new TRPCError({ code: "BAD_REQUEST", message: "Somente fontes de áudio enviadas ao Vault podem ser transcritas automaticamente." });
      const signedUrl = await storageGetSignedUrl(source.storageKey);
      const result = await transcribeAudio({ audioUrl: signedUrl, language: input.language || "pt", prompt: "Transcrição literal para análise qualitativa acadêmica." });
      if ("error" in result) throw new TRPCError({ code: "BAD_GATEWAY", message: result.details ? `${result.error}: ${result.details}` : result.error });
      const transcription = result.text?.trim();
      if (!transcription) throw new TRPCError({ code: "BAD_GATEWAY", message: "O serviço de transcrição não retornou texto utilizável." });
      await db.updateQualiaSourceTranscription(source.id, input.corpusId, transcription);
      return { transcription, language: result.language ?? input.language ?? "pt", segmentCount: Array.isArray(result.segments) ? result.segments.length : 0 };
    }),
    generateQualiaSuggestions: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), generation: qualiaSuggestionGenerationInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (!await db.getQualiaCorpus(input.corpusId, input.lapisProjectId)) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      const excerpt = (await db.getQualiaExcerpts(input.corpusId)).find(item => item.excerpt.id === input.generation.excerptId)?.excerpt;
      if (!excerpt) throw new TRPCError({ code: "NOT_FOUND", message: "Trecho qualitativo não encontrado." });
      const result = await generateQualiaSuggestions(excerpt.content);
      const suggestionIds = await db.createQualiaCodeSuggestions(input.corpusId, result.suggestions.map(suggestion => ({ excerptId: excerpt.id, ...suggestion, modelId: result.model })));
      return { suggestionIds, model: result.model, warning: "Sugestões são provisórias e devem ser aceitas ou rejeitadas pelo pesquisador; o trecho foi enviado ao provedor de IA após o aceite explícito." };
    }),
    decideQualiaSuggestion: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), decision: qualiaSuggestionDecisionInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const suggestion = (await db.getQualiaCodeSuggestions(input.corpusId)).find(item => item.id === input.decision.suggestionId);
      if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Sugestão qualitativa não encontrada." });
      await db.decideQualiaCodeSuggestion(suggestion.id, input.corpusId, input.decision.status, input.decision.researcherNote || null);
      return { success: true };
    }),
    upsertQualiaCodingDecision: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), coding: qualiaCodingDecisionInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const [corpus, codes, excerpts] = await Promise.all([db.getQualiaCorpus(input.corpusId, input.lapisProjectId), db.getQualiaCodes(input.corpusId), db.getQualiaExcerpts(input.corpusId)]);
      if (!corpus) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      if (!codes.some(code => code.id === input.coding.codeId) || !excerpts.some(item => item.excerpt.id === input.coding.excerptId)) throw new TRPCError({ code: "NOT_FOUND", message: "Código ou trecho não pertence ao corpus selecionado." });
      await db.upsertQualiaCodingDecision(input.corpusId, { ...input.coding, rationale: input.coding.rationale || null });
      return { success: true };
    }),
    createQualiaMemo: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), memo: qualiaMemoInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (!await db.getQualiaCorpus(input.corpusId, input.lapisProjectId)) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      return { memoId: await db.createQualiaMemo(input.corpusId, { ...input.memo, excerptId: input.memo.excerptId ?? null }) };
    }),
    qualiaAgreement: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), corpusId: z.number().int().positive(), agreement: qualiaAgreementInput })).query(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      if (!await db.getQualiaCorpus(input.corpusId, input.lapisProjectId)) throw new TRPCError({ code: "NOT_FOUND", message: "Corpus qualitativo não encontrado." });
      const decisions = await db.getQualiaCodingDecisions(input.corpusId);
      return calculateQualiaAgreement(decisions, input.agreement.codeId, input.agreement.coderA, input.agreement.coderB);
    }),
    analystWorkspace: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const project = await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const plan = await db.getAnalystPlan(input.lapisProjectId);
      return { project, plan: plan ?? null, versions: plan ? await db.getAnalystPlanVersions(plan.id) : [], visualizations: plan ? await db.getAnalystVisualizations(plan.id) : [], notebooks: plan ? await db.getAnalystNotebooks(plan.id) : [] };
    }),
    recommendAnalystPlan: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), request: analystPlanInput.pick({ researchQuestion: true, outcomeName: true, outcomeType: true, predictors: true, design: true, missingDataPlan: true }) })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const recommendation = await generateAnalystRecommendation(input.request);
      return { ...recommendation, warning: "A recomendação não executa dados, não produz resultados e exige revisão metodológica humana antes de ser salva ou utilizada." };
    }),
    updateAnalystPlan: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), plan: analystPlanInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      return { planId: await db.upsertAnalystPlan(input.lapisProjectId, { ...input.plan, design: input.plan.design || null, missingDataPlan: input.plan.missingDataPlan || null }) };
    }),
    createAnalystNotebook: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), notebook: analystNotebookInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const plan = await db.getAnalystPlan(input.lapisProjectId);
      if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Salve primeiro um plano Analista antes de versionar um notebook." });
      return db.upsertAnalystNotebook(plan.id, { ...input.notebook, inputSnapshotJson: JSON.stringify({ analystPlanId: plan.id, planVersion: plan.versionNumber, generatedAt: new Date().toISOString(), executionNotice: "Código não executado pelo AcademiaOS." }) });
    }),
    createAnalystVisualization: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), visualization: analystVisualizationInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const plan = await db.getAnalystPlan(input.lapisProjectId);
      if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Salve primeiro um plano Analista antes de criar visualizações." });
      const visualizationId = await db.createAnalystVisualization(plan.id, { kind: input.visualization.kind, title: input.visualization.title, dataSourceDescription: input.visualization.dataSourceDescription, specJson: JSON.stringify(input.visualization.spec) });
      return { visualizationId };
    }),
    scriptoriumWorkspace: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const project = await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const document = await db.getScriptoriumDocument(input.lapisProjectId);
      const citations = project.reviewProjectId ? await db.getSavedArticles(project.reviewProjectId) : [];
      const zotero = await db.getZoteroConnection(ctx.user.id);
      return { project, document: document ? { ...document, sections: parseJsonArray(document.sectionsJson) } : null, versions: document ? await db.getScriptoriumVersions(document.id) : [], reviews: document ? await db.getScriptoriumSubstanceReviews(document.id) : [], citations: citations.map(article => ({ id: article.id, title: article.title, authors: parseJsonArray(article.authorsJson), year: article.publicationYear, doi: article.doi })), zoteroConnection: zotero ? { libraryId: zotero.libraryId, libraryType: zotero.libraryType, keyHint: zotero.keyHint, syncStatus: zotero.syncStatus, lastSyncedAt: zotero.lastSyncedAt, errorMessage: zotero.errorMessage } : null, zoteroItems: await db.getZoteroItems(ctx.user.id) };
    }),
    updateScriptoriumDocument: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), document: scriptoriumDocumentInput, changeSummary: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const documentId = await db.upsertScriptoriumDocument(input.lapisProjectId, { title: input.document.title, targetJournal: input.document.targetJournal || null, abstract: input.document.abstract || null, sectionsJson: JSON.stringify(input.document.sections), status: input.document.status }, input.changeSummary);
      return { documentId };
    }),
    restoreScriptoriumVersion: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), versionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const document = await db.getScriptoriumDocument(input.lapisProjectId);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Documento Scriptorium não encontrado." });
      const version = await db.getScriptoriumVersion(document.id, input.versionId);
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Versão não encontrada." });
      const parsed = scriptoriumDocumentInput.safeParse(JSON.parse(version.snapshotJson));
      if (!parsed.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "A versão armazenada está inválida." });
      await db.upsertScriptoriumDocument(input.lapisProjectId, { title: parsed.data.title, targetJournal: parsed.data.targetJournal || null, abstract: parsed.data.abstract || null, sectionsJson: JSON.stringify(parsed.data.sections), status: parsed.data.status }, `Restauração da versão ${version.versionNumber}`);
      return { success: true };
    }),
    connectZotero: protectedProcedure.input(zoteroConnectionInput).mutation(async ({ ctx, input }) => {
      const items = await fetchZoteroLibrary(input);
      await db.upsertZoteroConnection(ctx.user.id, { libraryId: input.libraryId, libraryType: input.libraryType, encryptedApiKey: encryptZoteroKey(input.apiKey), keyHint: input.apiKey.slice(-4), syncStatus: "connected", lastSyncedAt: new Date() });
      await db.replaceZoteroItems(ctx.user.id, items);
      return { imported: items.length };
    }),
    syncZotero: protectedProcedure.mutation(async ({ ctx }) => {
      const connection = await db.getZoteroConnection(ctx.user.id);
      if (!connection) throw new TRPCError({ code: "NOT_FOUND", message: "Conecte sua biblioteca Zotero antes de sincronizar." });
      try {
        const items = await fetchZoteroLibrary({ libraryId: connection.libraryId, libraryType: connection.libraryType, apiKey: decryptZoteroKey(connection.encryptedApiKey) });
        await db.replaceZoteroItems(ctx.user.id, items);
        await db.upsertZoteroConnection(ctx.user.id, { libraryId: connection.libraryId, libraryType: connection.libraryType, encryptedApiKey: connection.encryptedApiKey, keyHint: connection.keyHint, syncStatus: "connected", lastSyncedAt: new Date() });
        return { imported: items.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao sincronizar o Zotero.";
        await db.upsertZoteroConnection(ctx.user.id, { libraryId: connection.libraryId, libraryType: connection.libraryType, encryptedApiKey: connection.encryptedApiKey, keyHint: connection.keyHint, syncStatus: "error", errorMessage: message, lastSyncedAt: connection.lastSyncedAt });
        throw new TRPCError({ code: "BAD_GATEWAY", message });
      }
    }),
    reviewScriptoriumSubstance: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const document = await db.getScriptoriumDocument(input.lapisProjectId);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Salve um documento Scriptorium antes de revisá-lo." });
      const sections = parseJsonArray(document.sectionsJson).filter((section): section is { heading?: string; content?: string } => Boolean(section && typeof section === "object"));
      const corpus = sections.map(section => `${section.heading ?? ""}\n${section.content ?? ""}`).join("\n").toLocaleLowerCase("pt-BR");
      const expected = ["introdução", "método", "resultados", "discussão", "conclusão"];
      const missing = expected.filter(heading => !sections.some(section => (section.heading ?? "").toLocaleLowerCase("pt-BR").includes(heading)));
      const findings = [{ criterion: "Cobertura de seções", status: missing.length ? "attention" : "clear", detail: missing.length ? `Seções ausentes ou não identificadas: ${missing.join(", ")}.` : "As seções essenciais foram identificadas." }, { criterion: "Objeções e limitações", status: /limit|objeç|viés|ameaça/.test(corpus) ? "clear" : "review", detail: /limit|objeç|viés|ameaça/.test(corpus) ? "O texto contém menção a limites, objeções ou vieses." : "Inclua limites, objeções relevantes e sua resposta argumentativa." }, { criterion: "Rastreabilidade de citações", status: /\[[^\]]+\]|\([^)]+\d{4}\)/.test(corpus) ? "clear" : "review", detail: /\[[^\]]+\]|\([^)]+\d{4}\)/.test(corpus) ? "Foram detectados marcadores de citação no texto." : "Vincule afirmações centrais às referências vivas disponíveis." }, { criterion: "Adequação ao periódico-alvo", status: document.targetJournal ? "review" : "attention", detail: document.targetJournal ? `Confirme manualmente escopo e diretrizes de ${document.targetJournal}; esta verificação não substitui a avaliação editorial.` : "Defina um periódico-alvo para revisar escopo e requisitos." }];
      const versions = await db.getScriptoriumVersions(document.id);
      const reviewId = await db.createScriptoriumSubstanceReview(document.id, versions[0]?.versionNumber ?? 1, JSON.stringify({ expectedSections: expected, method: "heurísticas rastreáveis; não é correção gramatical" }), JSON.stringify(findings));
      return { reviewId, findings };
    }),
    matchmakerWorkspace: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const project = await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const document = await db.getScriptoriumDocument(input.lapisProjectId);
      const submission = await db.getMatchmakerSubmission(input.lapisProjectId);
      return { project, document: document ? { id: document.id, title: document.title, targetJournal: document.targetJournal, abstract: document.abstract } : null, submission: submission ? { ...submission, rankedVenues: parseJsonArray(submission.rankedVenuesJson), checklist: parseJsonArray(submission.checklistJson), reviewerComments: parseJsonArray(submission.reviewerCommentsJson), responseDrafts: parseJsonArray(submission.responseDraftJson) } : null };
    }),
    updateMatchmakerSubmission: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), submission: matchmakerSubmissionInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.upsertMatchmakerSubmission(input.lapisProjectId, { manuscriptTitle: input.submission.manuscriptTitle, scopeSummary: input.submission.scopeSummary, rankedVenuesJson: JSON.stringify(input.submission.rankedVenues), targetVenue: input.submission.targetVenue || null, coverLetter: input.submission.coverLetter || null, checklistJson: JSON.stringify(input.submission.checklist), reviewerCommentsJson: JSON.stringify(input.submission.reviewerComments), responseDraftJson: JSON.stringify(input.submission.reviewerComments.map(comment => ({ reviewer: comment.reviewer, responseDraft: comment.responseDraft ?? "", disposition: comment.disposition }))), status: input.submission.status });
      return { success: true };
    }),
    vigilWorkspace: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const project = await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const document = await db.getScriptoriumDocument(input.lapisProjectId);
      const assessment = await db.getVigilAssessment(input.lapisProjectId);
      return { project, document: document ? { id: document.id, title: document.title } : null, assessment: assessment ? { ...assessment, integrityChecklist: parseJsonArray(assessment.integrityChecklistJson), referenceAlerts: parseJsonArray(assessment.referenceAlertsJson), supplementaryMaterials: parseJsonArray(assessment.supplementaryJson), dissemination: parseJsonArray(assessment.disseminationJson) } : null };
    }),
    updateVigilAssessment: protectedProcedure.input(z.object({ lapisProjectId: z.number().int().positive(), assessment: vigilAssessmentInput })).mutation(async ({ ctx, input }) => {
      await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      const document = await db.getScriptoriumDocument(input.lapisProjectId);
      await db.upsertVigilAssessment(input.lapisProjectId, { documentId: document?.id ?? null, integrityChecklistJson: JSON.stringify(input.assessment.integrityChecklist), referenceAlertsJson: JSON.stringify(input.assessment.referenceAlerts), supplementaryJson: JSON.stringify(input.assessment.supplementaryMaterials), disseminationJson: JSON.stringify(input.assessment.dissemination), status: input.assessment.status });
      return { success: true };
    }),
    generateAnalysis: protectedProcedure.input(lapisAnalysisInput).mutation(async ({ ctx, input }) => {
      const project = await assertLapisProjectAccess(input.lapisProjectId, ctx.user.id);
      await db.setLapisAnalysis(input.lapisProjectId, { kind: input.kind, status: "generating", content: null, evidenceJson: "[]", model: null, errorMessage: null });
      try {
        const articles = project.reviewProjectId ? await db.getSavedArticles(project.reviewProjectId) : [];
        const analysis = await generateLapisAnalysis(input.kind as LapisAnalysisKind, project, articles.map(article => ({ id: article.id, title: article.title, abstract: article.abstract })));
        await db.setLapisAnalysis(input.lapisProjectId, { kind: input.kind, status: "ready", content: analysis.content, evidenceJson: JSON.stringify(analysis.evidence), model: analysis.model, errorMessage: null });
        return analysis;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha inesperada ao gerar a análise Lapis.";
        await db.setLapisAnalysis(input.lapisProjectId, { kind: input.kind, status: "error", content: null, evidenceJson: "[]", model: null, errorMessage: message });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
