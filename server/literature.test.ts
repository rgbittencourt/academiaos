import { describe, expect, it } from "vitest";
import { exactExcerpt, findSupportingExcerpt, inspectStructuredResponse, parseStructuredResponse, validateAuditableSynthesis, validateExtractionEvidence } from "./academicAi";
import { makeRelevanceScore, normalizeOpenAlexWork, normalizeSemanticScholarPaper, reconstructOpenAlexAbstract } from "./literature";

describe("literature normalization", () => {
  it("reconstrói corretamente um resumo do índice invertido do OpenAlex", () => {
    const abstract = reconstructOpenAlexAbstract({
      estudo: [2],
      "Este": [0],
      testa: [1],
      resultados: [3],
    });
    expect(abstract).toBe("Este testa estudo resultados");
  });

  it("normaliza um artigo do Semantic Scholar para o contrato interno", () => {
    const paper = normalizeSemanticScholarPaper({
      paperId: "abc-123",
      title: "Título de teste",
      abstract: "Resumo de teste.",
      year: 2025,
      authors: [{ name: "Ana" }, { name: "Bruno" }],
      externalIds: { DOI: "10.1000/teste" },
      citationCount: 84,
      url: "https://example.org/paper",
    }, 0, 5);
    expect(paper).toMatchObject({
      externalId: "abc-123",
      source: "semantic_scholar",
      authors: ["Ana", "Bruno"],
      doi: "10.1000/teste",
      relevanceScore: expect.any(Number),
    });
  });

  it("normaliza DOI, autores e resumo de um trabalho OpenAlex", () => {
    const work = normalizeOpenAlexWork({
      id: "https://openalex.org/W123",
      title: "Trabalho aberto",
      publication_year: 2024,
      doi: "https://doi.org/10.10/open",
      cited_by_count: 5,
      authorships: [{ author: { display_name: "Carla" } }],
      abstract_inverted_index: { "Uma": [0], evidência: [1] },
    }, 1, 3);
    expect(work).toMatchObject({
      externalId: "W123",
      source: "openalex",
      authors: ["Carla"],
      doi: "10.10/open",
      abstract: "Uma evidência",
    });
  });

  it("prioriza a posição no resultado, mantendo um pequeno bônus de impacto", () => {
    const first = makeRelevanceScore(0, 10, 10);
    const last = makeRelevanceScore(9, 10, 1_000);
    expect(first).toBeGreaterThan(last);
    expect(first).toBeLessThanOrEqual(100);
  });
});

describe("auditabilidade da IA", () => {
  const abstract = "O estudo avaliou 80 estudantes por meio de um ensaio controlado e encontrou redução de sintomas. A principal limitação foi a amostra de conveniência.";

  it("aceita somente trechos literais, curtos e vinculados aos cinco campos", () => {
    const extraction = validateExtractionEvidence({
      objective: "Avaliar sintomas", methodology: "Ensaio controlado", sample: "80 estudantes", mainFindings: "Redução de sintomas", limitations: "Amostra de conveniência",
      evidence: [
        { field: "objective", sourceText: "O estudo avaliou" },
        { field: "methodology", sourceText: "por meio de um ensaio controlado" },
        { field: "sample", sourceText: "80 estudantes" },
        { field: "mainFindings", sourceText: "encontrou redução de sintomas" },
        { field: "limitations", sourceText: "A principal limitação foi a amostra de conveniência" },
      ],
    }, abstract);
    expect(extraction.evidence).toHaveLength(5);
    expect(exactExcerpt("redução de sintomas", abstract)).toBe("redução de sintomas");
  });

  it("substitui evidência parafraseada por trecho literal de apoio quando há correspondência lexical", () => {
    const extraction = validateExtractionEvidence({
      objective: "Avaliar sintomas", methodology: "Ensaio", sample: "80", mainFindings: "Melhora", limitations: "Conveniência",
      evidence: [
        { field: "objective", sourceText: "O estudo avaliou" }, { field: "methodology", sourceText: "ensaio" }, { field: "sample", sourceText: "80 estudantes" }, { field: "mainFindings", sourceText: "redução de sintomas importante" }, { field: "limitations", sourceText: "amostra de conveniência" },
      ],
    }, abstract);
    expect(extraction.evidence.find(item => item.field === "mainFindings")?.sourceText).toContain("encontrou redução de sintomas");
    expect(findSupportingExcerpt("redução de sintomas importante", abstract)).toContain("redução de sintomas");
  });

  it("rejeita uma extração sem lista de evidências antes de tentar iterá-la", () => {
    expect(() => validateExtractionEvidence({
      objective: "Avaliar sintomas", methodology: "Ensaio", sample: "80", mainFindings: "Melhora", limitations: "Conveniência",
    } as never, abstract)).toThrow(/lista de evidências estruturadas/);
  });

  it("rejeita uma sentença factual da síntese que não tenha referência", () => {
    expect(() => validateAuditableSynthesis({
      paragraph: "O estudo encontrou redução de sintomas [1]. A evidência é conclusiva.",
      citations: [{ referenceNumber: 1, articleId: 9, sourceText: "encontrou redução de sintomas", claim: "Foi observada redução de sintomas." }],
    }, [{ id: 9, title: "Estudo", abstract }])).toThrow(/Cada afirmação/);
  });

  it("explica quando o modelo encerra sem conteúdo JSON", () => {
    expect(() => parseStructuredResponse({ choices: [{ message: { content: "" }, finish_reason: "length" }] }, "Extração auditável")).toThrow(/não retornou JSON utilizável/);
  });

  it("normaliza texto retornado pelo modelo em partes de conteúdo", () => {
    const result = parseStructuredResponse<{ ok: boolean }>({
      choices: [{ message: { content: [{ type: "output_text", text: '{"ok":true}' }] }, finish_reason: "stop" }],
    }, "Extração auditável");
    expect(result).toEqual({ ok: true });
  });

  it("aceita JSON retornado em bloco markdown quando o provedor não permite modo JSON", () => {
    const result = parseStructuredResponse<{ ok: boolean }>({
      choices: [{ message: { content: '```json\n{"ok":true}\n```' }, finish_reason: "stop" }],
    }, "Extração auditável");
    expect(result).toEqual({ ok: true });
  });

  it("extrai um objeto JSON válido quando o modelo adiciona texto ao redor da resposta", () => {
    const result = parseStructuredResponse<{ ok: boolean }>({
      choices: [{ message: { content: 'Resposta estruturada:\n```json\n{"ok":true}\n```\nFim.' }, finish_reason: "stop" }],
    }, "Síntese auditável");
    expect(result).toEqual({ ok: true });
  });

  it("trata conteúdo ausente como erro recuperável em vez de acessar um array inexistente", () => {
    expect(() => parseStructuredResponse({ choices: [{ message: {}, finish_reason: "length" }] } as never, "Extração auditável")).toThrow(/não retornou JSON utilizável/);
  });

  it("trata resposta sem choices como erro recuperável sem expor TypeError", () => {
    expect(() => parseStructuredResponse({} as never, "Extração auditável")).toThrow(/não retornou JSON utilizável/);
  });

  it("inspeciona apenas metadados não sensíveis quando a resposta vem sem choices", () => {
    expect(inspectStructuredResponse({})).toEqual({
      choicesCount: 0,
      hasFirstChoice: false,
      finishReason: null,
      contentState: "missing-choice",
      contentLength: 0,
      hasProviderError: false,
    });
  });

  it("identifica encerramento e conteúdo ausente sem registrar o texto do modelo", () => {
    expect(inspectStructuredResponse({ choices: [{ message: {}, finish_reason: "length" }] })).toMatchObject({
      choicesCount: 1,
      finishReason: "length",
      contentState: "missing-content",
      contentLength: 0,
    });
  });

  it("normaliza uma falha declarada pelo provedor sem expor detalhes técnicos", () => {
    expect(() => parseStructuredResponse({ error: { message: "upstream diagnostic" } }, "Extração auditável")).toThrow(/provedor informou uma falha de resposta/);
  });
});
