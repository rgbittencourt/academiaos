import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  listLLMModels: vi.fn(),
  invokeLLM: vi.fn(),
}));

import { generateLapisAnalysis, LAPIS_ANALYSIS_TIMEOUT_MS } from "./lapisAi";
import { invokeLLM, listLLMModels } from "./_core/llm";

const project = {
  title: "Ondas internas explicáveis",
  researchIdea: "Investigar modelos explicáveis para identificar ondas internas em dados oceanográficos.",
  problemStatement: "A identificação atual exige inspeção especializada.",
  researchQuestion: "Como identificar ondas internas com explicabilidade?",
  targetAgency: "CNPq",
  resources: "Bases históricas e equipe de oceanografia.",
};

const articles = [{
  id: 4,
  title: "Ondas internas e dados",
  abstract: "The study used historical oceanographic data and reported improved detection of internal waves.",
}];

describe("análises estruturadas do Lapis", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listLLMModels).mockResolvedValue({ object: "list", data: [{ id: "gpt-5-mini", object: "model", created: 0, owned_by: "test" }] });
  });

  it("preserva a evidência literal de um artigo associado ao gerar lacunas", async () => {
    const response = {
      content: "A biblioteca ainda precisa comparar a detecção entre contextos oceanográficos e tornar os mecanismos de decisão do modelo verificáveis.",
      evidence: [{ sourceId: "article-4", sourceText: "The study used historical oceanographic data and reported improved detection of internal waves." }],
    };
    vi.mocked(invokeLLM).mockResolvedValue({ id: "lapis-1", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(response) }, finish_reason: "stop" }] });

    await expect(generateLapisAnalysis("gaps", project, articles)).resolves.toMatchObject({
      model: "gpt-5-mini",
      evidence: [{ sourceId: "article-4", sourceLabel: "Ondas internas e dados", sourceText: "The study used historical oceanographic data and reported improved detection of internal waves." }],
    });
  });

  it("produz uma análise de contingência explícita após respostas estruturadas vazias", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ id: "empty", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "length" }] });

    await expect(generateLapisAnalysis("originality", project, articles)).resolves.toMatchObject({
      model: "gpt-5-mini (fallback auditável)",
      content: expect.stringContaining("somente o caderno"),
      evidence: [{ sourceId: "lapis-project", sourceLabel: "Caderno Lapis" }],
    });
    expect(invokeLLM).toHaveBeenCalledTimes(4);
  });

  it("finaliza com fallback auditável quando o provedor não responde dentro do limite", async () => {
    vi.useFakeTimers();
    vi.mocked(invokeLLM).mockImplementation(() => new Promise(() => undefined));

    const result = generateLapisAnalysis("feasibility", project, articles);
    await vi.advanceTimersByTimeAsync(LAPIS_ANALYSIS_TIMEOUT_MS);

    await expect(result).resolves.toMatchObject({
      model: "gpt-5-mini (fallback auditável por tempo excedido)",
      content: expect.stringContaining("viabilidade"),
      evidence: [{ sourceId: "lapis-project", sourceLabel: "Caderno Lapis" }],
    });
    vi.useRealTimers();
  });
});
