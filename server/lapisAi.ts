import { listLLMModels } from "./_core/llm";
import { exactExcerpt, invokeStructuredWithRecovery } from "./academicAi";

export type LapisAnalysisKind = "gaps" | "originality" | "grant" | "feasibility";

export const LAPIS_ANALYSIS_TIMEOUT_MS = 20_000;

export class LapisAnalysisTimeoutError extends Error {
  constructor() {
    super("A geração da análise excedeu o tempo esperado.");
    this.name = "LapisAnalysisTimeoutError";
  }
}

export function withLapisAnalysisTimeout<T>(operation: Promise<T>, timeoutMs = LAPIS_ANALYSIS_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new LapisAnalysisTimeoutError()), timeoutMs);
    operation.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

export type LapisEvidence = {
  sourceId: string;
  sourceLabel: string;
  sourceText: string;
};

type LapisSource = {
  sourceId: string;
  sourceLabel: string;
  text: string;
};

type RawLapisAnalysis = {
  content: string;
  evidence: Array<{ sourceId: string; sourceText: string }>;
};

type LapisProjectInput = {
  title: string;
  researchIdea: string;
  problemStatement: string | null;
  researchQuestion: string | null;
  targetAgency: string | null;
  resources: string | null;
};

type LapisArticle = { id: number; title: string; abstract: string | null };

const ANALYSIS_INSTRUCTIONS: Record<LapisAnalysisKind, string> = {
  gaps: "Mapeie perguntas ainda não respondidas, tensões entre resultados e subpopulações ausentes somente quando isso puder ser sustentado pelas fontes fornecidas. Se o corpus for insuficiente, diga explicitamente qual busca ou evidência adicional é necessária.",
  originality: "Compare a ideia com os conceitos presentes nas fontes fornecidas. Aponte aproximações, diferenças e riscos de redundância. Declare expressamente que esta é uma triagem limitada ao caderno e à biblioteca associada; não alegue consultar OSF, registros de teses ou projetos externos.",
  grant: "Elabore uma minuta curta de proposta: problema, contribuição, abordagem, resultados esperados e aderência potencial. Trate a agência indicada apenas como alvo declarado pelo usuário; não afirme requisitos atuais de edital que não foram fornecidos.",
  feasibility: "Avalie premissas, recursos já declarados, riscos e próximos passos para tornar o estudo executável. Diferencie recursos informados de necessidades ainda não verificadas.",
};

function outputText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(part => {
    if (typeof part === "string") return part;
    if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
    return "";
  }).join("");
}

async function getModel() {
  const models = await listLLMModels();
  return models.data.find(model => model.id === "gpt-5-mini")?.id ?? models.data[0]?.id;
}

function projectSources(project: LapisProjectInput, articles: LapisArticle[]): LapisSource[] {
  const projectRecord = [
    `Título: ${project.title}`,
    `Ideia: ${project.researchIdea}`,
    project.problemStatement ? `Problema: ${project.problemStatement}` : "",
    project.researchQuestion ? `Pergunta: ${project.researchQuestion}` : "",
    project.targetAgency ? `Agência-alvo: ${project.targetAgency}` : "",
    project.resources ? `Recursos: ${project.resources}` : "",
  ].filter(Boolean).join("\n");
  return [
    { sourceId: "lapis-project", sourceLabel: "Caderno Lapis", text: projectRecord },
    ...articles.filter(article => article.abstract?.trim()).map(article => ({ sourceId: `article-${article.id}`, sourceLabel: article.title, text: article.abstract!.trim() })),
  ];
}

function validateAnalysis(raw: RawLapisAnalysis, sources: LapisSource[]) {
  if (!raw || typeof raw.content !== "string" || raw.content.trim().length < 20 || !Array.isArray(raw.evidence) || raw.evidence.length === 0) {
    throw new Error("A análise não contém conteúdo e evidências estruturadas suficientes.");
  }
  const evidence: LapisEvidence[] = raw.evidence.slice(0, 6).map(item => {
    const source = sources.find(candidate => candidate.sourceId === item.sourceId);
    const excerpt = source ? exactExcerpt(item.sourceText, source.text) : null;
    if (!source || !excerpt) throw new Error("A análise retornou uma evidência que não corresponde literalmente à fonte.");
    return { sourceId: source.sourceId, sourceLabel: source.sourceLabel, sourceText: excerpt };
  });
  return { content: raw.content.trim().slice(0, 6000), evidence };
}

function firstExcerpt(source: LapisSource) {
  const sentence = source.text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/)?.[0]?.trim() ?? source.text.replace(/\s+/g, " ").trim();
  return sentence.slice(0, 280);
}

function deterministicAnalysis(kind: LapisAnalysisKind, sources: LapisSource[]) {
  const source = sources[0];
  const messages: Record<LapisAnalysisKind, string> = {
    gaps: "Ainda não é possível afirmar uma lacuna de pesquisa ampla apenas com o caderno atual. Use a ideia e a pergunta registradas para orientar uma busca sistemática e confrontar resultados, populações e métodos na biblioteca associada.",
    originality: "A originalidade deve ser examinada em relação à literatura e aos registros externos relevantes. Esta triagem de contingência considera somente o caderno e não confirma consultas a plataformas ou registros fora do AcademiaOS.",
    grant: "Esta é uma estrutura inicial de proposta baseada no problema, ideia e agência-alvo declarados. Critérios e editais vigentes precisam ser anexados ou verificados pelo pesquisador antes do envio.",
    feasibility: "A viabilidade depende de confrontar os recursos declarados com os requisitos metodológicos específicos. O caderno deve ser complementado com cronograma, orçamento, dados e responsabilidades antes de uma decisão final.",
  };
  return {
    content: messages[kind],
    evidence: [{ sourceId: source.sourceId, sourceLabel: source.sourceLabel, sourceText: firstExcerpt(source) }],
  };
}

export async function generateLapisAnalysis(kind: LapisAnalysisKind, project: LapisProjectInput, articles: LapisArticle[]) {
  const model = await getModel();
  if (!model) throw new Error("Nenhum modelo de IA está disponível.");
  const sources = projectSources(project, articles);
  const corpus = sources.map(source => `FONTE ${source.sourceId}\nRótulo: ${source.sourceLabel}\nTEXTO ORIGINAL:\n${source.text}`).join("\n\n---\n\n");
  const request = async (retry: boolean) => {
    const raw = await invokeStructuredWithRecovery<RawLapisAnalysis>(`Análise Lapis: ${kind}`, {
      model,
      maxTokens: 2600,
      ...(model.startsWith("gpt-5") ? { reasoning: { effort: "minimal" } } : {}),
      messages: [
        { role: "system", content: retry ? "A resposta anterior não trouxe evidência literal válida. Retorne somente JSON válido. Cada sourceText deve ser copiado continuamente do TEXTO ORIGINAL da mesma sourceId; nunca parafraseie." : `Você é o Lapis, um co-piloto de concepção de pesquisa responsável e criterioso. ${ANALYSIS_INSTRUCTIONS[kind]} Use apenas as fontes fornecidas; não invente fatos, editais, registros externos ou evidências. Retorne somente JSON com este formato: {"content":"análise em português","evidence":[{"sourceId":"id exato da fonte","sourceText":"trecho literal contínuo"}]}. O conteúdo deve expor limites e premissas quando necessários.` },
        { role: "user", content: `TIPO DE ANÁLISE: ${kind}\n\n${corpus}` },
      ],
    });
    return validateAnalysis(raw, sources);
  };
  try {
    const analysis = await withLapisAnalysisTimeout(request(false));
    return { ...analysis, model };
  } catch (error) {
    if (error instanceof LapisAnalysisTimeoutError) {
      return { ...deterministicAnalysis(kind, sources), model: `${model} (fallback auditável por tempo excedido)` };
    }
    try {
      const analysis = await withLapisAnalysisTimeout(request(true));
      return { ...analysis, model };
    } catch (retryError) {
      if (retryError instanceof LapisAnalysisTimeoutError) {
        return { ...deterministicAnalysis(kind, sources), model: `${model} (fallback auditável por tempo excedido)` };
      }
      return { ...deterministicAnalysis(kind, sources), model: `${model} (fallback auditável)` };
    }
  }
}
