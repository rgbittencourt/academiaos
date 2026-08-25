import { describe, expect, it } from "vitest";
import { preregistrationReadiness, preregistrationSnapshot, type PreregistrationDraft } from "./preregistration";

const completeDraft: PreregistrationDraft = {
  title: "Pré-registro de teste",
  researchQuestion: "Qual é o efeito da intervenção no desfecho primário?",
  hypotheses: "A intervenção melhora o desfecho primário.",
  studyDesign: "Ensaio controlado",
  primaryOutcomes: "Escore validado em 12 semanas.",
  secondaryOutcomes: "Adesão e eventos adversos.",
  samplingPlan: "Amostra consecutiva com tamanho previamente definido.",
  dataCollection: "Coleta padronizada em formulários eletrônicos.",
  analysisPlan: "Modelo ajustado, intervalo de confiança e análise de sensibilidade.",
  exclusionRules: "Critérios definidos antes da coleta.",
  ethicsAndTransparency: "Submissão ética antes do recrutamento.",
  deviations: "Desvios serão versionados e justificados.",
  status: "review",
};

describe("pré-registro", () => {
  it("identifica os campos confirmatórios que ainda faltam", () => {
    const readiness = preregistrationReadiness({ ...completeDraft, analysisPlan: "", hypotheses: "" });
    expect(readiness.complete).toBe(false);
    expect(readiness.missing).toEqual(["hipóteses ou objetivos confirmatórios", "plano de análise"]);
  });

  it("gera um snapshot exportável com vínculo e hash de integridade", () => {
    const snapshot = preregistrationSnapshot(completeDraft, { lapisProjectId: 42, integrityHash: "abc123", registeredAt: "2026-08-20T00:00:00.000Z" });
    expect(snapshot).toMatchObject({ schemaVersion: "AcademiaOS-Prereg-1.0", lapisProjectId: 42, integrityHash: "abc123", preregistration: { title: "Pré-registro de teste" } });
  });
});
