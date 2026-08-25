import { exactExcerpt, invokeStructuredWithRecovery } from "./academicAi";
import { listLLMModels } from "./_core/llm";

const QUALIA_TIMEOUT_MS = 20_000;

export type QualiaGeneratedSuggestion = {
  suggestedLabel: string;
  proposedTheme: string | null;
  rationale: string;
  evidence: string;
  confidence: number;
};

type RawQualiaSuggestion = {
  suggestedLabel: string;
  proposedTheme?: string | null;
  rationale: string;
  evidence: string;
  confidence: number;
};

type RawQualiaResponse = { suggestions: RawQualiaSuggestion[] };

function withQualiaTimeout<T>(operation: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Tempo excedido para a sugestão qualitativa.")), QUALIA_TIMEOUT_MS);
    operation.then(value => { clearTimeout(timeout); resolve(value); }, error => { clearTimeout(timeout); reject(error); });
  });
}

async function getModel() {
  const models = await listLLMModels();
  return models.data.find(model => model.id === "gpt-5-mini")?.id ?? models.data[0]?.id;
}

function fallbackSuggestion(excerpt: string): QualiaGeneratedSuggestion[] {
  const evidence = excerpt.replace(/\s+/g, " ").trim().slice(0, 280);
  return [{
    suggestedLabel: "Revisão manual necessária",
    proposedTheme: "A definir pelo pesquisador",
    rationale: "A sugestão automática não foi concluída. O pesquisador deve decidir se o trecho sustenta um código, um tema ou nenhum deles.",
    evidence,
    confidence: 0,
  }];
}

function validate(raw: RawQualiaResponse, excerpt: string) {
  if (!raw || !Array.isArray(raw.suggestions) || !raw.suggestions.length) throw new Error("A IA não retornou sugestões estruturadas.");
  const suggestions = raw.suggestions.slice(0, 3).map(item => {
    const evidence = exactExcerpt(item.evidence ?? "", excerpt);
    if (!evidence) throw new Error("A IA não apresentou um trecho literal verificável como evidência.");
    const label = item.suggestedLabel?.trim().slice(0, 180);
    const rationale = item.rationale?.trim().slice(0, 2000);
    if (!label || !rationale) throw new Error("A IA não explicou de modo suficiente a sugestão de codificação.");
    return {
      suggestedLabel: label,
      proposedTheme: item.proposedTheme?.trim().slice(0, 255) || null,
      rationale,
      evidence,
      confidence: Math.max(0, Math.min(100, Math.round(Number(item.confidence) || 0))),
    };
  });
  return suggestions;
}

export async function generateQualiaSuggestions(excerpt: string) {
  const model = await getModel();
  if (!model) throw new Error("Nenhum modelo de IA está disponível.");
  const source = excerpt.trim().slice(0, 12000);
  const request = invokeStructuredWithRecovery<RawQualiaResponse>("Sugestões interpretáveis do Qualia", {
    model,
    maxTokens: 1200,
    ...(model.startsWith("gpt-5") ? { reasoning: { effort: "minimal" } } : {}),
    messages: [
      { role: "system", content: "Você auxilia uma análise qualitativa interpretável. Não decida a interpretação final e não faça diagnóstico. Proponha no máximo três códigos provisórios, apenas se houver apoio no trecho fornecido. Para cada sugestão, explique por que ela pode ser considerada e copie literalmente uma evidência contínua do TRECHO ORIGINAL. Não invente contexto, participantes ou significados ocultos. Retorne somente JSON: {\"suggestions\":[{\"suggestedLabel\":\"código curto\",\"proposedTheme\":\"tema opcional\",\"rationale\":\"justificativa revisável\",\"evidence\":\"trecho literal contínuo\",\"confidence\":0}]}" },
      { role: "user", content: `TRECHO ORIGINAL:\n${source}` },
    ],
  });
  try {
    return { suggestions: validate(await withQualiaTimeout(request), source), model };
  } catch {
    return { suggestions: fallbackSuggestion(source), model: `${model} (fallback auditável)` };
  }
}
