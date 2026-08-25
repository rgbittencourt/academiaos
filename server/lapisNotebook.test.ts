import { describe, expect, it } from "vitest";
import { lapisDraftForPendingExit, lapisDraftStorageKey, lapisExportFilename, lapisExportSections, lapisHasPendingChanges, lapisNeedsAnalysisRefresh, lapisNormalizeReviewProjectId, lapisReadyForAutosave, lapisResearchFlow, lapisShouldRestoreDraft, lapisShouldWarnBeforeUnload, restoreLapisDraft, restoreLapisDraftRecord, serializeLapisDraft, type LapisNotebookForm } from "../client/src/lib/lapisNotebook";

const completeNotebook: LapisNotebookForm = {
  title: "Ondas internas e redes neurais",
  researchIdea: "Investigar ondas internas com redes neurais para identificar padrões em imagens de sensoriamento remoto.",
  problemStatement: "A identificação manual é lenta.",
  researchQuestion: "Como redes neurais podem identificar ondas internas?",
  targetAgency: "CNPq",
  resources: "Imagens SAR e equipe interdisciplinar.",
  reviewProjectId: 1,
};

describe("regras de continuidade do Lapis", () => {
  it("habilita o salvamento automático somente quando título e ideia são suficientes", () => {
    expect(lapisReadyForAutosave(completeNotebook)).toBe(true);
    expect(lapisReadyForAutosave({ ...completeNotebook, researchIdea: "Curta" })).toBe(false);
    expect(lapisReadyForAutosave({ ...completeNotebook, title: "  " })).toBe(false);
  });

  it("identifica alterações pendentes inclusive quando o caderno ainda não atende aos mínimos de salvamento remoto", () => {
    const persisted = JSON.stringify(completeNotebook);
    expect(lapisHasPendingChanges(completeNotebook, persisted)).toBe(false);
    expect(lapisHasPendingChanges({ ...completeNotebook, researchIdea: "Rascunho" }, persisted)).toBe(true);
  });

  it("restaura o rascunho local após recarga quando a sincronização remota ainda não ocorreu", () => {
    const raw = serializeLapisDraft(42, { ...completeNotebook, researchIdea: "Rascunho local preservado antes da sincronização." }, 1_700_000_000_000);
    expect(lapisDraftStorageKey(42)).toBe("academiaos:lapis:local-draft:42");
    expect(restoreLapisDraft(raw, 42)?.researchIdea).toBe("Rascunho local preservado antes da sincronização.");
  });

  it("mantém o rascunho recuperável quando uma sincronização remota falha", () => {
    const unsynced = { ...completeNotebook, problemStatement: "Rascunho preservado após indisponibilidade do servidor." };
    const raw = serializeLapisDraft(42, unsynced, 1_700_000_000_100);

    // O fluxo de falha não remove o valor de localStorage: ele permanece disponível no próximo carregamento.
    expect(restoreLapisDraft(raw, 42)).toMatchObject({
      problemStatement: "Rascunho preservado após indisponibilidade do servidor.",
      title: completeNotebook.title,
    });
  });

  it("restaura somente rascunho local mais recente que a versão remota e preserva a associação já sincronizada", () => {
    const stale = serializeLapisDraft(42, { ...completeNotebook, reviewProjectId: null }, 1_700_000_000_000);
    const pending = serializeLapisDraft(42, { ...completeNotebook, resources: "Novo recurso ainda sem confirmação do servidor." }, 1_700_000_000_200);

    expect(restoreLapisDraftRecord(stale, 42)?.updatedAt).toBe(1_700_000_000_000);
    expect(lapisShouldRestoreDraft(1_700_000_000_000, 1_700_000_000_100)).toBe(false);
    expect(lapisShouldRestoreDraft(1_700_000_000_200, 1_700_000_000_100)).toBe(true);
    expect(restoreLapisDraft(pending, 42)?.resources).toContain("ainda sem confirmação");
  });

  it("avisa antes de sair quando há alteração pendente ou sincronização em curso", () => {
    const persisted = JSON.stringify(completeNotebook);
    expect(lapisShouldWarnBeforeUnload(completeNotebook, persisted, false)).toBe(false);
    expect(lapisShouldWarnBeforeUnload({ ...completeNotebook, resources: "Dados novos ainda não sincronizados." }, persisted, false)).toBe(true);
    expect(lapisShouldWarnBeforeUnload(completeNotebook, persisted, true)).toBe(true);
  });

  it("serializa um rascunho restaurável para a saída antes da sincronização e não cria cópia sem alteração", () => {
    const persisted = JSON.stringify(completeNotebook);
    const changed = { ...completeNotebook, resources: "Rascunho de saída preservado localmente." };
    const raw = lapisDraftForPendingExit(42, changed, persisted, false, 1_700_000_000_200);

    expect(raw).not.toBeNull();
    expect(restoreLapisDraft(raw, 42)?.resources).toBe("Rascunho de saída preservado localmente.");
    expect(lapisDraftForPendingExit(42, completeNotebook, persisted, false)).toBeNull();
  });

  it("solicita atualização do workspace enquanto uma análise recuperada está em processamento", () => {
    expect(lapisNeedsAnalysisRefresh([{ status: "ready" }, { status: "generating" }])).toBe(true);
    expect(lapisNeedsAnalysisRefresh([{ status: "ready" }, { status: "error" }])).toBe(false);
  });

  it("ignora rascunhos corrompidos ou pertencentes a outro caderno", () => {
    expect(restoreLapisDraft("{incompleto", 42)).toBeNull();
    expect(restoreLapisDraft(serializeLapisDraft(7, completeNotebook), 42)).toBeNull();
  });

  it("normaliza identificadores não positivos da associação antes de restaurar ou sincronizar", () => {
    const legacyDraft = { ...completeNotebook, reviewProjectId: 0 };
    const raw = serializeLapisDraft(42, legacyDraft);

    expect(lapisNormalizeReviewProjectId(1)).toBe(1);
    expect(lapisNormalizeReviewProjectId(0)).toBeNull();
    expect(lapisNormalizeReviewProjectId(-1)).toBeNull();
    expect(restoreLapisDraft(raw, 42)?.reviewProjectId).toBeNull();
  });

  it("libera a etapa Cartographer somente depois que a pergunta de pesquisa estiver registrada", () => {
    expect(lapisResearchFlow(false, false)[1].state).toBe("future");
    expect(lapisResearchFlow(true, false)[1].state).toBe("active");
    expect(lapisResearchFlow(true, true)[1].state).toBe("done");
  });

  it("integra autosave, conteúdo exportável e transição para o Cartographer a partir do mesmo caderno", () => {
    const persisted = JSON.stringify({ ...completeNotebook, resources: "" });
    const changed = { ...completeNotebook, resources: "Base SAR, equipe interdisciplinar e acesso computacional." };
    const exported = lapisExportSections(changed, [{ kind: "gaps", status: "ready", content: "Lacuna auditável." }]);
    const flow = lapisResearchFlow(Boolean(changed.researchQuestion), Boolean(changed.reviewProjectId));

    expect(lapisReadyForAutosave(changed)).toBe(true);
    expect(lapisHasPendingChanges(changed, persisted)).toBe(true);
    expect(exported.base.find(section => section.title === "Recursos, dados e parceiros")?.text).toContain("Base SAR");
    expect(exported.completedAnalyses).toEqual([{ title: "Lacunas de pesquisa", text: "Lacuna auditável." }]);
    expect(flow[1]).toMatchObject({ label: "Literatura", state: "done", detail: "Cartographer" });
  });

  it("gera um nome de arquivo seguro para a exportação do caderno", () => {
    expect(lapisExportFilename("Ondas internas: versão 1")).toBe("lapis-ondas-internas-versao-1.pdf");
    expect(lapisExportFilename("   ")).toBe("lapis-caderno.pdf");
  });

  it("exporta campos reais do caderno e apenas análises concluídas", () => {
    const sections = lapisExportSections(completeNotebook, [
      { kind: "gaps", status: "ready", content: "A análise usa o corpus associado." },
      { kind: "grant", status: "generating", content: "Não exportar." },
    ]);
    expect(sections.base[0]).toEqual({ title: "Ideia central", text: completeNotebook.researchIdea });
    expect(sections.completedAnalyses).toEqual([{ title: "Lacunas de pesquisa", text: "A análise usa o corpus associado." }]);
  });
});
