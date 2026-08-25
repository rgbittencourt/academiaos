import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  listLLMModels: vi.fn(),
  invokeLLM: vi.fn(),
}));

import { createAuditableSynthesis, extractArticleData, parseStructuredResponse } from "./academicAi";
import { invokeLLM, listLLMModels } from "./_core/llm";

const article = {
  title: "Atenção e sono",
  abstract: "Study used survey with 50 students and reported better attention. Limitation was small sample.",
  year: 2024,
  authors: ["Ada Lovelace"],
};

describe("recuperação de resposta estruturada", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listLLMModels).mockResolvedValue({ object: "list", data: [{ id: "gpt-5-mini", object: "model", created: 0, owned_by: "test" }] });
  });

  it("repete uma extração com prompt compacto após receber resposta vazia", async () => {
    const valid = {
      objective: "Avaliar atenção", methodology: "Survey", sample: "50 estudantes", mainFindings: "Atenção melhor", limitations: "Amostra pequena",
      evidence: [
        { field: "objective", sourceText: "Study" }, { field: "methodology", sourceText: "used survey" }, { field: "sample", sourceText: "50 students" }, { field: "mainFindings", sourceText: "reported better attention" }, { field: "limitations", sourceText: "Limitation was small sample" },
      ],
    };
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce({ id: "one", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "length" }] })
      .mockResolvedValueOnce({ id: "two", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(valid) }, finish_reason: "stop" }] });

    await expect(extractArticleData(article)).resolves.toMatchObject({ extraction: { objective: "Avaliar atenção" }, model: "gpt-5-mini" });
    expect(invokeLLM).toHaveBeenCalledTimes(2);
    expect(vi.mocked(invokeLLM).mock.calls[1]?.[0]).toMatchObject({ maxTokens: 3200 });
  });

  it("repete uma extração quando a primeira resposta contém JSON truncado", async () => {
    const valid = {
      objective: "Avaliar atenção", methodology: "Survey", sample: "50 estudantes", mainFindings: "Atenção melhor", limitations: "Amostra pequena",
      evidence: [
        { field: "objective", sourceText: "Study" }, { field: "methodology", sourceText: "used survey" }, { field: "sample", sourceText: "50 students" }, { field: "mainFindings", sourceText: "reported better attention" }, { field: "limitations", sourceText: "Limitation was small sample" },
      ],
    };
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce({ id: "one", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: "{\"objective\":\"incompleto" }, finish_reason: "length" }] })
      .mockResolvedValueOnce({ id: "two", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(valid) }, finish_reason: "stop" }] });

    await expect(extractArticleData(article)).resolves.toMatchObject({ extraction: { sample: "50 estudantes" } });
    expect(invokeLLM).toHaveBeenCalledTimes(2);
  });

  it("repete uma extração quando a resposta omite a lista de evidências obrigatória", async () => {
    const incomplete = {
      objective: "Avaliar atenção", methodology: "Survey", sample: "50 estudantes", mainFindings: "Atenção melhor", limitations: "Amostra pequena",
    };
    const valid = {
      ...incomplete,
      evidence: [
        { field: "objective", sourceText: "Study" }, { field: "methodology", sourceText: "used survey" }, { field: "sample", sourceText: "50 students" }, { field: "mainFindings", sourceText: "reported better attention" }, { field: "limitations", sourceText: "Limitation was small sample" },
      ],
    };
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce({ id: "one", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(incomplete) }, finish_reason: "stop" }] })
      .mockResolvedValueOnce({ id: "two", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(valid) }, finish_reason: "stop" }] });

    await expect(extractArticleData(article)).resolves.toMatchObject({ extraction: { objective: "Avaliar atenção" } });
    expect(invokeLLM).toHaveBeenCalledTimes(2);
    expect(vi.mocked(invokeLLM).mock.calls[1]?.[0].messages?.[0]).toMatchObject({ content: expect.stringContaining("lista evidence completa") });
  });

  it("preserva uma extração auditável de contingência após duas respostas sem evidências", async () => {
    const incomplete = {
      objective: "Avaliar atenção", methodology: "Survey", sample: "50 estudantes", mainFindings: "Atenção melhor", limitations: "Amostra pequena",
    };
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce({ id: "one", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(incomplete) }, finish_reason: "stop" }] })
      .mockResolvedValueOnce({ id: "two", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(incomplete) }, finish_reason: "stop" }] });

    await expect(extractArticleData(article)).resolves.toMatchObject({
      model: "gpt-5-mini (fallback auditável)",
      extraction: { evidence: expect.arrayContaining([{ field: "methodology", sourceText: "Study used survey with 50 students and reported better attention." }]) },
    });
    expect(invokeLLM).toHaveBeenCalledTimes(2);
  });

  it("substitui evidência parafraseada por trecho literal de apoio sem uma chamada adicional", async () => {
    const paraphrased = {
      objective: "Avaliar atenção", methodology: "Survey", sample: "50 estudantes", mainFindings: "Atenção melhor", limitations: "Amostra pequena",
      evidence: [
        { field: "objective", sourceText: "Study" }, { field: "methodology", sourceText: "used survey" }, { field: "sample", sourceText: "50 students" }, { field: "mainFindings", sourceText: "attention improved" }, { field: "limitations", sourceText: "Limitation was small sample" },
      ],
    };
    const literal = { ...paraphrased, evidence: paraphrased.evidence.map(item => item.field === "mainFindings" ? { ...item, sourceText: "reported better attention" } : item) };
    vi.mocked(invokeLLM)
      .mockResolvedValueOnce({ id: "one", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(paraphrased) }, finish_reason: "stop" }] })
      .mockResolvedValueOnce({ id: "two", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(literal) }, finish_reason: "stop" }] });

    await expect(extractArticleData(article)).resolves.toMatchObject({ extraction: { mainFindings: "Atenção melhor", evidence: expect.arrayContaining([{ field: "mainFindings", sourceText: "Study used survey with 50 students and reported better attention." }]) } });
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });

  it("repete a síntese quando a citação inicial não é literal no resumo indicado", async () => {
    const sources = [{ id: 9, title: article.title, abstract: article.abstract, year: article.year, authors: article.authors, extraction: null }];
    const invalid = {
      paragraph: "O estudo relatou melhor atenção [1].",
      citations: [{ referenceNumber: 1, articleId: 9, sourceText: "attention improved", claim: "O estudo relatou melhor atenção." }],
    };
    const valid = {
      paragraph: "O estudo relatou melhor atenção [1].",
      citations: [{ referenceNumber: 1, articleId: 9, sourceText: "reported better attention", claim: "O estudo relatou melhor atenção." }],
    };
    expect(parseStructuredResponse({ choices: [{ message: { content: JSON.stringify(invalid) }, finish_reason: "stop" }] }, "Síntese auditável")).toEqual(invalid);
    vi.mocked(invokeLLM).mockImplementation(async params => {
      const isLiteralRetry = String(params.messages[0]?.content).includes("tentativa anterior usou uma referência");
      const result = isLiteralRetry ? valid : invalid;
      return { id: "response", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(result) }, finish_reason: "stop" }] };
    });

    await expect(createAuditableSynthesis(sources)).resolves.toMatchObject({ citations: [{ sourceText: "reported better attention" }] });
    expect(invokeLLM).toHaveBeenCalledTimes(2);
    expect(vi.mocked(invokeLLM).mock.calls[1]?.[0].messages?.[0]).toMatchObject({ content: expect.stringContaining("Copie cada sourceText literalmente") });
  });

  it("preserva trechos literais em uma síntese de contingência após respostas estruturadas vazias", async () => {
    const sources = [{ id: 9, title: article.title, abstract: article.abstract, year: article.year, authors: article.authors, extraction: null }];
    vi.mocked(invokeLLM).mockResolvedValue({ id: "empty", created: 0, model: "gpt-5-mini", choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "length" }] });

    await expect(createAuditableSynthesis(sources)).resolves.toMatchObject({
      model: "gpt-5-mini (fallback auditável)",
      paragraph: expect.stringContaining("[1]"),
      citations: [{ articleId: 9, sourceText: "Study used survey with 50 students and reported better attention" }],
    });
    expect(invokeLLM).toHaveBeenCalledTimes(2);
  });
});
