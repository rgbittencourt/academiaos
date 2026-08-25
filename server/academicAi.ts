import { listLLMModels, invokeLLM, type InvokeParams } from "./_core/llm";

export type EvidenceItem = {
  field: "objective" | "methodology" | "sample" | "mainFindings" | "limitations";
  sourceText: string;
};

export type StructuredExtraction = {
  objective: string;
  methodology: string;
  sample: string;
  mainFindings: string;
  limitations: string;
  evidence: EvidenceItem[];
};

export type SynthesisCitation = {
  referenceNumber: number;
  articleId: number;
  articleTitle: string;
  sourceText: string;
  claim: string;
};

const EXTRACTION_SCHEMA = {
  name: "article_extraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
      objective: { type: "string" },
      methodology: { type: "string" },
      sample: { type: "string" },
      mainFindings: { type: "string" },
      limitations: { type: "string" },
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", enum: ["objective", "methodology", "sample", "mainFindings", "limitations"] },
            sourceText: { type: "string" },
          },
          required: ["field", "sourceText"],
          additionalProperties: false,
        },
      },
    },
    required: ["objective", "methodology", "sample", "mainFindings", "limitations", "evidence"],
    additionalProperties: false,
  },
} as const;

const SYNTHESIS_SCHEMA = {
  name: "auditable_synthesis",
  strict: true,
  schema: {
    type: "object",
    properties: {
      paragraph: { type: "string" },
      citations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            referenceNumber: { type: "integer" },
            articleId: { type: "integer" },
            sourceText: { type: "string" },
            claim: { type: "string" },
          },
          required: ["referenceNumber", "articleId", "sourceText", "claim"],
          additionalProperties: false,
        },
      },
    },
    required: ["paragraph", "citations"],
    additionalProperties: false,
  },
} as const;

async function getModel() {
  const models = await listLLMModels();
  return models.data.find(model => model.id === "gpt-5-mini")?.id ?? models.data[0]?.id;
}

function outputText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(part => {
    if (typeof part === "string") return part;
    if (part && typeof part === "object" && "text" in part) {
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    }
    return "";
  }).join("");
}

function jsonCandidates(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  const embedded = firstBrace >= 0 && lastBrace > firstBrace ? trimmed.slice(firstBrace, lastBrace + 1) : undefined;
  return Array.from(new Set([trimmed, fenced, embedded].filter((candidate): candidate is string => Boolean(candidate))));
}

export type StructuredProviderResponse = {
  choices?: Array<{ message?: { content?: unknown }; finish_reason: string | null }>;
  error?: unknown;
};

export type StructuredResponseDiagnostics = {
  choicesCount: number;
  hasFirstChoice: boolean;
  finishReason: string | null;
  contentState: "missing-choice" | "missing-content" | "empty-content" | "present";
  contentLength: number;
  hasProviderError: boolean;
};

export function inspectStructuredResponse(response: StructuredProviderResponse): StructuredResponseDiagnostics {
  const choice = response.choices?.[0];
  const content = outputText(choice?.message?.content).trim();
  return {
    choicesCount: response.choices?.length ?? 0,
    hasFirstChoice: Boolean(choice),
    finishReason: choice?.finish_reason ?? null,
    contentState: !choice ? "missing-choice" : choice.message?.content === undefined ? "missing-content" : content ? "present" : "empty-content",
    contentLength: content.length,
    hasProviderError: Boolean(response.error),
  };
}

export function parseStructuredResponse<T>(response: StructuredProviderResponse, operation: string): T {
  const choice = response.choices?.[0];
  const content = outputText(choice?.message?.content).trim();
  const diagnostics = inspectStructuredResponse(response);
  if (!content) {
    if (diagnostics.hasProviderError) {
      throw new Error(`${operation}: o provedor informou uma falha de resposta. Tente novamente.`);
    }
    const reason = diagnostics.finishReason ? ` (motivo: ${diagnostics.finishReason})` : "";
    throw new Error(`${operation}: o modelo não retornou JSON utilizável${reason}. Tente novamente.`);
  }
  for (const candidate of jsonCandidates(content)) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Tenta o próximo candidato, extraído de um bloco Markdown ou de um objeto envolvido por texto.
    }
  }
  throw new Error(`${operation}: a resposta do modelo não era um JSON válido. Tente novamente.`);
}

function isRecoverableStructuredResponseError(error: unknown) {
  return error instanceof Error && (
    error.message.includes("não retornou JSON utilizável") ||
    error.message.includes("não era um JSON válido") ||
    error.message.includes("não contém uma lista de evidências estruturadas") ||
    error.message.includes("o provedor informou uma falha de resposta")
  );
}

export async function invokeStructuredWithRecovery<T>(operation: string, params: InvokeParams): Promise<T> {
  const firstResponse = await invokeLLM(params);
  try {
    return parseStructuredResponse<T>(firstResponse, operation);
  } catch (error) {
    if (!isRecoverableStructuredResponseError(error)) throw error;
    const retryResponse = await invokeLLM({
      ...params,
      maxTokens: Math.max(params.maxTokens ?? params.max_tokens ?? 0, 3200),
      messages: [
        { role: "system", content: "A tentativa anterior terminou sem JSON completo. Gere agora uma resposta curta, estritamente válida e compatível com o esquema. Não use markdown nem explicações." },
        ...params.messages,
      ],
    });
    return parseStructuredResponse<T>(retryResponse, operation);
  }
}

const REQUIRED_EXTRACTION_FIELDS: EvidenceItem["field"][] = ["objective", "methodology", "sample", "mainFindings", "limitations"];

export function exactExcerpt(candidate: string, source: string) {
  const compact = candidate.trim().replace(/\s+/g, " ");
  const normalizedSource = source.replace(/\s+/g, " ");
  if (!compact || compact.length > 280 || !normalizedSource.toLocaleLowerCase().includes(compact.toLocaleLowerCase())) return null;
  return compact;
}

export function findSupportingExcerpt(candidate: string, source: string) {
  const terms = candidate.toLocaleLowerCase().match(/[A-Za-zÀ-ÿ0-9]{4,}/g) ?? [];
  if (terms.length === 0) return null;
  const sentences = source.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  const ranked = sentences.map(sentence => ({
    sentence: sentence.trim(),
    score: terms.reduce((score, term) => score + (sentence.toLocaleLowerCase().includes(term) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score === 0) return null;
  if (best.sentence.length <= 280) return best.sentence;
  const matchedTerm = terms.find(term => best.sentence.toLocaleLowerCase().includes(term));
  const matchIndex = Math.max(0, best.sentence.toLocaleLowerCase().indexOf(matchedTerm ?? ""));
  const start = Math.max(0, matchIndex - 100);
  return best.sentence.slice(start, start + 280);
}

export function validateExtractionEvidence(extraction: StructuredExtraction, sourceAbstract: string): StructuredExtraction {
  if (!extraction || !Array.isArray(extraction.evidence)) {
    throw new Error("A extração não contém uma lista de evidências estruturadas. Tente novamente.");
  }
  const evidenceByField = new Map<EvidenceItem["field"], string>();
  for (const item of extraction.evidence) {
    if (evidenceByField.has(item.field)) throw new Error(`A evidência para “${item.field}” foi duplicada.`);
    const excerpt = exactExcerpt(item.sourceText, sourceAbstract) ?? findSupportingExcerpt(item.sourceText, sourceAbstract);
    if (!excerpt) throw new Error(`A evidência para “${item.field}” não é um trecho literal verificável do resumo.`);
    evidenceByField.set(item.field, excerpt);
  }
  for (const field of REQUIRED_EXTRACTION_FIELDS) {
    if (!evidenceByField.has(field)) throw new Error(`A extração não contém evidência rastreável para “${field}”.`);
  }
  return {
    ...extraction,
    evidence: REQUIRED_EXTRACTION_FIELDS.map(field => ({ field, sourceText: evidenceByField.get(field)! })),
  };
}

function isLiteralEvidenceError(error: unknown) {
  return error instanceof Error && (
    error.message.includes("não é um trecho literal verificável") ||
    error.message.includes("não contém evidência rastreável")
  );
}

function isInvalidExtractionStructureError(error: unknown) {
  return error instanceof Error && error.message.includes("não contém uma lista de evidências estruturadas");
}

function isRecoverableExtractionError(error: unknown) {
  return isLiteralEvidenceError(error) || isInvalidExtractionStructureError(error) || isRecoverableStructuredResponseError(error);
}

function deterministicAuditableExtraction(sourceAbstract: string): StructuredExtraction {
  const sentences = sourceAbstract.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? [];
  const fallback = sentences[0] ?? sourceAbstract.trim();
  const chooseSentence = (terms: string[]) => sentences.find(sentence => terms.some(term => sentence.toLocaleLowerCase().includes(term))) ?? fallback;
  const selections: Array<[EvidenceItem["field"], string]> = [
    ["objective", chooseSentence(["objetiv", "propor", "avaliar", "apresenta"])],
    ["methodology", chooseSentence(["processo", "método", "metodologia", "classificação", "utilizou"])],
    ["sample", chooseSentence(["amostra", "imagens", "conjunto", "dados"])],
    ["mainFindings", chooseSentence(["resultado", "acurácia", "desempenho", "conclu"])],
    ["limitations", chooseSentence(["limita", "não há", "nível de significância", "resumo"])],
  ];
  const values = Object.fromEntries(selections) as Record<EvidenceItem["field"], string>;
  return validateExtractionEvidence({
    objective: values.objective,
    methodology: values.methodology,
    sample: values.sample,
    mainFindings: values.mainFindings,
    limitations: values.limitations,
    evidence: selections.map(([field, sourceText]) => ({ field, sourceText })),
  }, sourceAbstract);
}

function isInvalidSynthesisCitationError(error: unknown) {
  return error instanceof Error && error.message.includes("não possui um trecho literal verificável");
}

type SynthesisSource = { id: number; title: string; abstract: string | null };

function deterministicAuditableSynthesis(sources: SynthesisSource[]) {
  const citations = sources.slice(0, 3).map((article, index) => {
    const firstSentence = article.abstract?.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/)?.[0]?.trim() ?? "";
    const sourceText = firstSentence.slice(0, 220).replace(/[.!?]+$/, "").trim();
    return {
      referenceNumber: index + 1,
      articleId: article.id,
      sourceText,
      claim: "Trecho literal do resumo apresentado diretamente na síntese de contingência.",
    };
  }).filter(citation => citation.sourceText.length > 0);
  return validateAuditableSynthesis({
    paragraph: `Trechos verificáveis preservados: ${citations.map(citation => `“${citation.sourceText}” [${citation.referenceNumber}].`).join(" ")}`,
    citations,
  }, sources);
}

export function validateAuditableSynthesis(
  raw: { paragraph: string; citations: Omit<SynthesisCitation, "articleTitle">[] },
  sources: SynthesisSource[]
): { paragraph: string; citations: SynthesisCitation[] } {
  if (!raw || typeof raw.paragraph !== "string" || !Array.isArray(raw.citations)) {
    throw new Error("A síntese não contém o texto e as referências estruturadas esperadas.");
  }
  const paragraph = raw.paragraph.trim();
  if (!paragraph || raw.citations.length === 0) throw new Error("A síntese precisa conter texto e ao menos uma referência verificável.");
  const referenceNumbers = new Set<number>();
  const citations = raw.citations.map(citation => {
    if (!Number.isInteger(citation.referenceNumber) || citation.referenceNumber < 1 || referenceNumbers.has(citation.referenceNumber)) {
      throw new Error("A síntese contém números de referência duplicados ou inválidos.");
    }
    referenceNumbers.add(citation.referenceNumber);
    const article = sources.find(item => item.id === citation.articleId);
    const excerpt = article ? exactExcerpt(citation.sourceText, article.abstract ?? "") : null;
    if (!article || !excerpt) throw new Error(`A referência [${citation.referenceNumber}] não possui um trecho literal verificável.`);
    if (!citation.claim.trim()) throw new Error(`A referência [${citation.referenceNumber}] não descreve a afirmação que sustenta.`);
    return { ...citation, articleTitle: article.title, sourceText: excerpt };
  });
  const citedInParagraph = Array.from(paragraph.matchAll(/\[(\d+)\]/g)).map(match => Number(match[1]));
  if (citedInParagraph.length === 0 || citedInParagraph.some(reference => !referenceNumbers.has(reference))) {
    throw new Error("A síntese contém citações sem evidência correspondente.");
  }
  if (citations.some(citation => !citedInParagraph.includes(citation.referenceNumber))) {
    throw new Error("A síntese retornou evidências que não foram usadas no texto.");
  }
  const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  const uncitedSentence = sentences.find(sentence => /[A-Za-zÀ-ÿ]/.test(sentence) && !/\[\d+\]/.test(sentence));
  if (uncitedSentence) throw new Error("Cada afirmação da síntese deve terminar com ao menos uma referência auditável.");
  return { paragraph, citations };
}

export async function extractArticleData(article: { title: string; abstract: string | null; year: number | null; authors: string[] }) {
  if (!article.abstract?.trim()) {
    throw new Error("Este artigo não possui resumo público suficiente para uma extração auditável.");
  }
  const model = await getModel();
  if (!model) throw new Error("Nenhum modelo de IA está disponível.");
  const requestExtraction = async (evidenceRetry = false) => {
    const systemPrompt = evidenceRetry
      ? "A tentativa anterior teve estrutura incompleta ou ao menos um sourceText foi uma paráfrase. Refaça a extração com todos os campos e a lista evidence completa. Copie cada sourceText literalmente, de forma contínua, do RESUMO ORIGINAL. Se faltar dado, use literalmente o trecho do resumo que declara a ausência. Retorne somente JSON válido do esquema."
      : `Você é um assistente de revisão sistemática rigoroso. Use somente o resumo fornecido. Quando a informação não constar, escreva 'Não informado no resumo'. Cada sourceText deve ser uma citação literal e contínua extraída do resumo, nunca uma paráfrase. Não invente dados. Mantenha cada campo textual com até 160 caracteres e cada sourceText com até 220 caracteres. Retorne somente JSON com exatamente estes campos: {"objective":"...","methodology":"...","sample":"...","mainFindings":"...","limitations":"...","evidence":[{"field":"objective","sourceText":"..."},{"field":"methodology","sourceText":"..."},{"field":"sample","sourceText":"..."},{"field":"mainFindings","sourceText":"..."},{"field":"limitations","sourceText":"..."}]}`;
    const raw = await invokeStructuredWithRecovery<StructuredExtraction>("Extração auditável", {
      model,
      maxTokens: 2400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `ARTIGO\nTítulo: ${article.title}\nAno: ${article.year ?? "não informado"}\nAutores: ${article.authors.join(", ") || "não informados"}\n\nRESUMO ORIGINAL\n${article.abstract}` },
      ],
    });
    return validateExtractionEvidence(raw, article.abstract!);
  };
  let extraction: StructuredExtraction;
  try {
    extraction = await requestExtraction();
  } catch (error) {
    if (!isRecoverableExtractionError(error)) throw error;
    try {
      extraction = await requestExtraction(true);
    } catch (retryError) {
      if (!isRecoverableExtractionError(retryError)) throw retryError;
      extraction = deterministicAuditableExtraction(article.abstract!);
      return { extraction, model: `${model} (fallback auditável)` };
    }
  }
  return { extraction, model };
}

export async function createAuditableSynthesis(articles: Array<{ id: number; title: string; abstract: string | null; authors: string[]; year: number | null; extraction: StructuredExtraction | null }>) {
  const usable = articles.filter(article => article.abstract?.trim());
  if (usable.length === 0) throw new Error("Salve ao menos um artigo com resumo público para gerar uma síntese auditável.");
  const model = await getModel();
  if (!model) throw new Error("Nenhum modelo de IA está disponível.");
  const corpus = usable.map((article, index) => {
    const extraction = article.extraction ? `\nExtração verificada: objetivo=${article.extraction.objective}; método=${article.extraction.methodology}; resultados=${article.extraction.mainFindings}` : "";
    return `FONTE ${index + 1} | articleId=${article.id}\nTítulo: ${article.title}\nAno: ${article.year ?? "n/d"}\nResumo original: ${article.abstract}${extraction}`;
  }).join("\n\n---\n\n");
  const requestSynthesis = async (literalRetry = false) => {
    const systemPrompt = literalRetry
      ? "A tentativa anterior usou uma referência sem trecho literal verificável. Refaça a síntese usando apenas as fontes fornecidas. Copie cada sourceText literalmente, de modo contínuo, do RESUMO ORIGINAL da mesma fonte cujo articleId você informar. Cada frase factual do parágrafo deve terminar com [n] e cada [n] deve existir em citations. Retorne somente JSON válido do esquema."
      : "Você sintetiza evidência científica sem extrapolar. Redija um único parágrafo conciso em português, usando apenas as fontes. Anote cada afirmação factual com [n], em que n é o referenceNumber da respectiva citação. Para cada item citations, sourceText deve ser um trecho literal, contínuo e curto do resumo original da fonte indicada. Nunca use informação que não apareça explicitamente nos resumos. Mantenha o parágrafo em até 900 caracteres e cada sourceText em até 220 caracteres. Retorne somente o JSON do esquema.";
    const raw = await invokeStructuredWithRecovery<{ paragraph: string; citations: Omit<SynthesisCitation, "articleTitle">[] }>("Síntese auditável", {
      model,
      maxTokens: 2400,
      ...(model.startsWith("gpt-5") ? { reasoning: { effort: "minimal" } } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Construa uma síntese auditável a partir destas fontes:\n\n${corpus}` },
      ],
    });
    return validateAuditableSynthesis(raw, usable);
  };
  let validated: { paragraph: string; citations: SynthesisCitation[] };
  try {
    validated = await requestSynthesis();
  } catch (error) {
    if (!isInvalidSynthesisCitationError(error)) {
      return { ...deterministicAuditableSynthesis(usable), model: `${model} (fallback auditável)` };
    }
    try {
      validated = await requestSynthesis(true);
    } catch {
      return { ...deterministicAuditableSynthesis(usable), model: `${model} (fallback auditável)` };
    }
  }
  return { ...validated, model };
}
