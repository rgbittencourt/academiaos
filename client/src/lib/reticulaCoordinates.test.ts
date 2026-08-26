import { describe, expect, it } from "vitest";
import { buildReticulaUrl, deriveReticulaCoordinates } from "./reticulaCoordinates";

describe("coordenadas Lapis para Retícula", () => {
  it("deriva tema, assunto e disciplina sugestiva a partir do caderno", () => {
    const coordinates = deriveReticulaCoordinates({
      title: "Identificação de ondas internas através de redes neurais",
      researchIdea: "Usar imagens SAR e redes neurais para detectar ondas internas no oceano.",
      researchQuestion: "Como identificar ondas internas em imagens SAR com redes neurais?",
    });

    expect(coordinates).toMatchObject({
      theme: "Identificação de ondas internas através de redes neurais",
      subject: "Como identificar ondas internas em imagens SAR com redes neurais?",
      discipline: "Oceanografia Física e Sensoriamento Remoto",
    });
  });

  it("mantém a decisão disciplinar revisável e constrói um deep link seguro", () => {
    const url = new URL(buildReticulaUrl({ theme: "Tema", subject: "Assunto", discipline: "Disciplina" }));
    expect(url.origin).toBe("https://reticula-atlas-ideias.rogerio-bittencourt-1a9.workers.dev");
    expect(url.searchParams.get("theme")).toBe("Tema");
    expect(url.searchParams.get("subject")).toBe("Assunto");
    expect(url.searchParams.get("discipline")).toBe("Disciplina");
    expect(url.searchParams.get("from")).toBe("academiaos");
  });
});
