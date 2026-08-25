import { describe, expect, it } from "vitest";
import { createRisPreview, parseRis } from "./risImport";

const sampleRis = `TY  - JOUR
TI  - Redes neurais e ondas internas
AU  - Bittencourt, Rogério
PY  - 2025
DO  - https://doi.org/10.1234/EXEMPLO
UR  - https://doi.org/10.1234/exemplo
AB  - Estudo de demonstração.
N1  - Retícula — Atlas de Literatura Científica | consulta: ondas internas
ER  - 
`;

describe("importação RIS", () => {
  it("lê metadados bibliográficos e normaliza o DOI", () => {
    const [record] = parseRis(sampleRis);
    expect(record).toMatchObject({
      title: "Redes neurais e ondas internas",
      authors: ["Bittencourt, Rogério"],
      year: 2025,
      doi: "10.1234/exemplo",
    });
  });

  it("marca como duplicado um DOI que já pertence ao projeto sem gravar registros", () => {
    const preview = createRisPreview(sampleRis, [{ externalId: "x", doi: "10.1234/exemplo", title: "Outro título" }]);
    expect(preview).toMatchObject({ total: 1, candidateCount: 0, duplicateCount: 1 });
    expect(preview.records[0]?.reason).toMatch(/DOI|identificador/);
  });

  it("rejeita conteúdo sem registros RIS com título", () => {
    expect(() => parseRis("TY  - JOUR\nAU  - Sem título\nER  - ")).toThrow(/título/);
  });
});
