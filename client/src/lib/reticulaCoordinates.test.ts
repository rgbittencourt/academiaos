import { describe, expect, it } from "vitest";
import { buildReticulaUrl, deriveReticulaCoordinates, lapisProjectHasSufficientReticulaData, resolveLapisProjectForReticula } from "./reticulaCoordinates";

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

  it("libera o Retícula com dados suficientes e resolve o caderno por título antes de exigir associação manual", () => {
    const lapisProjects = [
      { id: 4, title: "Identificação de ondas internas utilizando redes neurais", researchIdea: "Usar imagens SAR para identificar ondas internas oceânicas." },
      { id: 8, title: "Rascunho sem contexto", researchIdea: "" },
    ];

    expect(lapisProjectHasSufficientReticulaData(lapisProjects[0])).toBe(true);
    expect(lapisProjectHasSufficientReticulaData(lapisProjects[1])).toBe(false);
    expect(resolveLapisProjectForReticula({
      lapisProjects,
      reviewProjectId: 12,
      cartographerProjectName: "Identificação de ondas internas utilizando redes neurais",
    })?.id).toBe(4);
  });

  it("usa o único caderno elegível quando ainda não há vínculo nem título correspondente", () => {
    expect(resolveLapisProjectForReticula({
      lapisProjects: [{ id: 9, title: "Projeto exploratório", researchIdea: "Contexto suficiente para construir a revisão." }],
      reviewProjectId: 15,
      cartographerProjectName: "Revisão sem título coincidente",
    })?.id).toBe(9);
  });

  it("reconhece um caderno por título semanticamente semelhante sem exigir associação manual", () => {
    expect(resolveLapisProjectForReticula({
      lapisProjects: [
        { id: 2, title: "Identificação de ondas internas através de redes neurais", researchIdea: "Analisar imagens SAR e redes neurais no oceano." },
        { id: 5, title: "Rascunho de pesquisa em ensino", researchIdea: "Contexto independente para outra revisão." },
      ],
      reviewProjectId: 12,
      cartographerProjectName: "Identificação de ondas internas utilizando redes neurais",
    })?.id).toBe(2);
  });

  it("mantém a associação manual quando dois títulos semelhantes forem indistinguíveis", () => {
    expect(resolveLapisProjectForReticula({
      lapisProjects: [
        { id: 2, title: "Ondas internas oceânicas com redes neurais", researchIdea: "Analisar imagens SAR." },
        { id: 5, title: "Ondas internas oceânicas usando redes neurais", researchIdea: "Investigar classificação automática." },
      ],
      reviewProjectId: 12,
      cartographerProjectName: "Ondas internas oceânicas e redes neurais",
    })).toBeUndefined();
  });
});
