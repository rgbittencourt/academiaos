import { describe, expect, it } from "vitest";
import { deriveResearchCycle } from "./researchCycle";

describe("deriveResearchCycle", () => {
  it("aponta a primeira etapa não persistida como o próximo movimento do ciclo", () => {
    const cycle = deriveResearchCycle({
      hasIdea: true,
      hasLiterature: true,
      hasProtocol: false,
      hasPreregistration: false,
      hasData: false,
      hasAnalysis: false,
      hasWriting: false,
      hasSubmission: false,
      hasPublication: false,
    });

    expect(cycle.currentStep).toMatchObject({ label: "Protocolo", module: "Método", path: "/lapis" });
    expect(cycle.steps.map(step => step.state)).toEqual(["done", "done", "current", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(cycle.progressPercent).toBe(22);
  });

  it("marca o ciclo como concluído quando todos os artefatos existem", () => {
    const cycle = deriveResearchCycle({
      hasIdea: true,
      hasLiterature: true,
      hasProtocol: true,
      hasPreregistration: true,
      hasData: true,
      hasAnalysis: true,
      hasWriting: true,
      hasSubmission: true,
      hasPublication: true,
    });

    expect(cycle.progressPercent).toBe(100);
    expect(cycle.steps.every(step => step.state === "done")).toBe(true);
    expect(cycle.currentStep).toMatchObject({ label: "Publicação", module: "Vigil" });
  });
});
