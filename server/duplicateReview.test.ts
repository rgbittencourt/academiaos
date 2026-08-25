import { describe, expect, it } from "vitest";
import { findTitleSimilarityCandidates, scoreTitleSimilarity } from "./duplicateReview";

const baseArticle = { id: 9, title: "Detecção de ondas internas oceânicas em imagens SAR", doi: null, publicationYear: 2025, authorsJson: '["Silva, Ana"]' };

describe("revisão assistida de títulos semelhantes", () => {
  it("explica o score com sinais de título, autoria e ano sem concluir que os estudos são iguais", () => {
    const candidate = scoreTitleSimilarity(baseArticle, { id: 11, title: "Detecção de ondas internas oceânicas por radar SAR", doi: null, publicationYear: 2025, authorsJson: '["Silva, Beatriz"]' });
    expect(candidate).toMatchObject({ articleIdA: 9, articleIdB: 11 });
    expect(candidate?.score).toBeGreaterThanOrEqual(45);
    expect(candidate?.reasons.join(" ")).toContain("Primeiro sobrenome");
    expect(candidate?.reasons.join(" ")).toContain("Mesmo ano");
  });

  it("não apresenta pares sem sobreposição suficiente de título", () => {
    expect(findTitleSimilarityCandidates([baseArticle, { id: 12, title: "Governança de dados educacionais", doi: null, publicationYear: 2025, authorsJson: '["Silva, Ana"]' }])).toEqual([]);
  });
});
