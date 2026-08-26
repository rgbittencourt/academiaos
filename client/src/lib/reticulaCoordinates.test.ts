import { describe, expect, it } from "vitest";
import { buildReticulaUrl, deriveReticulaCoordinates } from "./reticulaCoordinates";

describe("coordenadas Lapis para Retícula", () => {
  it("deriva tema, assunto e disciplina sugestiva a partir do caderno", () => {
    const coordinates = deriveReticulaCoordinates({
      title: "Identificação de ondas internas através de redes neurais",
      researchIdea: "Usar imagens de sensoriamento remoto e redes neurais para detectar ondas internas no oceano.",
      researchQuestion: "Como identificar ondas internas em imagens de sensoriamento remoto com redes neurais?",
    });

    expect(coordinates).toMatchObject({
      theme: "Identificação de ondas internas através de redes neurais",
      subject: "Como identificar ondas internas em imagens de sensoriamento remoto com redes neurais?",
      discipline: "Oceanografia Física e Sensoriamento Remoto",
    });
  });

  it("propõe as três coordenadas específicas para ondas internas, SAR e redes neurais", () => {
    const coordinates = deriveReticulaCoordinates({
      title: "Ondas internas oceânicas",
      researchIdea: "Investigar a identificação de ondas internas em imagens de radar de abertura sintética.",
      researchQuestion: "Como redes neurais podem detectar ondas internas em imagens SAR?",
      problemStatement: "A interpretação manual de feições oceanográficas é lenta.",
      workspaceContext: "Desenho observacional com análise de imagens de sensoriamento remoto.",
    });

    expect(coordinates).toMatchObject({
      theme: "Ocean internal waves",
      subject: "Detection of ocean internal waves in Synthetic Aperture Radar (SAR) imagery using neural networks",
      discipline: "Physical Oceanography",
    });
  });

  it("usa problema e contexto do workspace quando a pergunta formal ainda não foi registrada", () => {
    const coordinates = deriveReticulaCoordinates({
      title: "Estudo exploratório",
      researchIdea: "",
      problemStatement: "Mapear obstáculos relatados no campo.",
      workspaceContext: "Estudo qualitativo com entrevistas semiestruturadas.",
    });

    expect(coordinates.subject).toBe("Mapear obstáculos relatados no campo.");
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
