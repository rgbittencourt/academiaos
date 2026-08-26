// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React, { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { LapisAutosaveScheduler, LapisCartographerCta, LapisExitGuard, LapisPdfExportButton, LapisSaveStatus, LapisWorkspace, ResearchFlow } from "./Lapis";
import { ReticulaCoordinatesDialog } from "@/components/ReticulaCoordinatesDialog";
import { lapisDraftStorageKey, restoreLapisDraft, serializeLapisDraft, type LapisNotebookForm } from "@/lib/lapisNotebook";

Object.defineProperties(HTMLElement.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
  scrollIntoView: { configurable: true, value: () => undefined },
});

const trpcState = vi.hoisted(() => {
  const invalidate = vi.fn();
  const cancel = vi.fn();
  const pdfDocument = {
    setFillColor: vi.fn(), rect: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(), setFontSize: vi.fn(), text: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(["linha"]), addPage: vi.fn(), save: vi.fn(),
  };
  return {
    onSuccess: undefined as undefined | (() => void),
    updateMutate: vi.fn(),
    removeOnSuccess: undefined as undefined | (() => void),
    removeMutate: vi.fn(),
    invalidate,
    cancel,
    utils: { lapis: { projects: { invalidate }, workspace: { invalidate, cancel }, grantOpportunities: { invalidate } } },
    updateMutation: null as null | { isPending: boolean; mutate: ReturnType<typeof vi.fn> },
    removeMutation: null as null | { isPending: boolean; mutate: ReturnType<typeof vi.fn> },
    methodMutation: { isPending: false, mutate: vi.fn() },
    createMilestoneMutation: { isPending: false, mutate: vi.fn() },
    updateMilestoneMutation: { isPending: false, mutate: vi.fn() },
    removeMilestoneMutation: { isPending: false, mutate: vi.fn() },
    grantOpportunitiesQuery: { data: [], isLoading: false },
    syncOfficialGrantsMutation: { isPending: false, mutate: vi.fn() },
    selectGrantOpportunityMutation: { isPending: false, mutate: vi.fn() },
    removeGrantOpportunitySelectionMutation: { isPending: false, mutate: vi.fn() },
    updateManuscriptMutation: { isPending: false, mutate: vi.fn() },
    question: "Como redes neurais podem identificar ondas internas?",
    reviewProjectId: null as number | null,
    pdfDocument,
  };
});
trpcState.updateMutation = { isPending: false, mutate: trpcState.updateMutate };
trpcState.removeMutation = { isPending: false, mutate: trpcState.removeMutate };

vi.mock("jspdf", () => ({ jsPDF: vi.fn(() => trpcState.pdfDocument) }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, name: "QA" } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => trpcState.utils,
    lapis: {
      projects: { useQuery: () => ({ data: [{ id: 42, title: "Ondas internas e redes neurais", researchIdea: "Investigar ondas internas com redes neurais para identificar padrões em imagens de sensoriamento remoto.", problemStatement: "A identificação manual é lenta.", researchQuestion: trpcState.question, targetAgency: "CNPq", resources: "", reviewProjectId: trpcState.reviewProjectId, status: "maturing", updatedAt: "2026-08-20T01:00:00.000Z" }], isLoading: false }) },
      workspace: { useQuery: () => ({ data: { analyses: [], method: null, milestones: [] } }) },
      updateProject: { useMutation: () => trpcState.updateMutation },
      updateMethod: { useMutation: () => trpcState.methodMutation },
      createMilestone: { useMutation: () => trpcState.createMilestoneMutation },
      updateMilestone: { useMutation: () => trpcState.updateMilestoneMutation },
      removeMilestone: { useMutation: () => trpcState.removeMilestoneMutation },
      grantOpportunities: { useQuery: () => trpcState.grantOpportunitiesQuery },
      syncOfficialGrants: { useMutation: () => trpcState.syncOfficialGrantsMutation },
      selectGrantOpportunity: { useMutation: () => trpcState.selectGrantOpportunityMutation },
      removeGrantOpportunitySelection: { useMutation: () => trpcState.removeGrantOpportunitySelectionMutation },
      updateManuscript: { useMutation: () => trpcState.updateManuscriptMutation },
      removeProject: { useMutation: (options?: { onSuccess?: () => void; onMutate?: (input: { lapisProjectId: number }) => Promise<void> }) => { trpcState.removeOnSuccess = options?.onSuccess; trpcState.removeMutate.mockImplementation((input: { lapisProjectId: number }) => { void options?.onMutate?.(input); }); return trpcState.removeMutation; } },
      createProject: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      generateAnalysis: { useMutation: () => ({ isPending: false, mutate: vi.fn(), variables: undefined }) },
    },
    cartographer: { projects: { useQuery: () => ({ data: [{ id: 1, name: "Revisão de ondas internas" }] }) } },
  },
}));

const persistedForm: LapisNotebookForm = {
  title: "Ondas internas e redes neurais",
  researchIdea: "Investigar ondas internas com redes neurais para identificar padrões em imagens de sensoriamento remoto.",
  problemStatement: "A identificação manual é lenta.",
  researchQuestion: "Como redes neurais podem identificar ondas internas?",
  targetAgency: "CNPq",
  resources: "",
  reviewProjectId: 1,
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  trpcState.onSuccess = undefined;
  trpcState.updateMutate.mockReset();
  trpcState.removeOnSuccess = undefined;
  trpcState.removeMutate.mockReset();
  trpcState.methodMutation.mutate.mockReset();
  trpcState.createMilestoneMutation.mutate.mockReset();
  trpcState.updateMilestoneMutation.mutate.mockReset();
  trpcState.removeMilestoneMutation.mutate.mockReset();
  trpcState.syncOfficialGrantsMutation.mutate.mockReset();
  trpcState.selectGrantOpportunityMutation.mutate.mockReset();
  trpcState.removeGrantOpportunitySelectionMutation.mutate.mockReset();
  trpcState.updateManuscriptMutation.mutate.mockReset();
  trpcState.invalidate.mockReset();
  trpcState.cancel.mockReset();
  trpcState.question = "Como redes neurais podem identificar ondas internas?";
  trpcState.reviewProjectId = null;
  Object.values(trpcState.pdfDocument).forEach(value => { if (typeof value === "function" && "mockClear" in value) value.mockClear(); });
  window.localStorage.clear();
});

function FailedSyncExitHarness({ form, persist }: { form: LapisNotebookForm; persist: (value: LapisNotebookForm) => Promise<void> }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    persist(form).catch(() => setFailed(true));
  }, [form, persist]);

  return failed ? <LapisExitGuard lapisProjectId={42} form={form} persistedSnapshot={JSON.stringify(persistedForm)} isSyncing={false} /> : null;
}

describe("LapisExitGuard", () => {
  it("grava e restaura o rascunho local quando beforeunload ocorre com alterações pendentes", () => {
    const changedForm = { ...persistedForm, resources: "Rascunho recuperado depois da saída." };
    render(<LapisExitGuard lapisProjectId={42} form={changedForm} persistedSnapshot={JSON.stringify(persistedForm)} isSyncing={false} />);

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    const draft = window.localStorage.getItem(lapisDraftStorageKey(42));
    expect(event.defaultPrevented).toBe(true);
    expect(restoreLapisDraft(draft, 42)?.resources).toBe("Rascunho recuperado depois da saída.");
  });

  it("não cria rascunho nem bloqueia a saída quando não há alteração pendente", () => {
    render(<LapisExitGuard lapisProjectId={42} form={persistedForm} persistedSnapshot={JSON.stringify(persistedForm)} isSyncing={false} />);

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(window.localStorage.getItem(lapisDraftStorageKey(42))).toBeNull();
  });

  it("mantém um rascunho restaurável após falha de sincronização seguida de saída e recarga", async () => {
    const changedForm = { ...persistedForm, resources: "Rascunho preservado depois de falha remota." };
    const persist = vi.fn().mockRejectedValue(new Error("Rede indisponível"));
    render(<FailedSyncExitHarness form={changedForm} persist={persist} />);

    await waitFor(() => expect(persist).toHaveBeenCalledWith(changedForm));
    await waitFor(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    const reloaded = restoreLapisDraft(window.localStorage.getItem(lapisDraftStorageKey(42)), 42);
    expect(reloaded?.resources).toBe("Rascunho preservado depois de falha remota.");
  });

  it("dispara o autosave após o debounce e exibe os estados de persistência", () => {
    vi.useFakeTimers();
    const onPersist = vi.fn();
    const changed = { ...persistedForm, resources: "Novo recurso a salvar." };
    render(<><LapisSaveStatus state="unsaved" /><LapisAutosaveScheduler lapisProjectId={42} form={changed} persistedSnapshot={JSON.stringify(persistedForm)} onPersist={onPersist} /></>);

    expect(screen.getByText("Alterações serão salvas automaticamente")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1199));
    expect(onPersist).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onPersist).toHaveBeenCalledTimes(1);
    expect(render(<LapisSaveStatus state="saving" />).getByText("Salvando alterações…")).toBeTruthy();
    expect(render(<LapisSaveStatus state="saved" />).getByText("Salvo automaticamente")).toBeTruthy();
  });

  it("exporta o caderno pelo botão da interface usando um documento PDF simulado", async () => {
    const user = userEvent.setup();
    const doc = {
      setFillColor: vi.fn(), rect: vi.fn(), setTextColor: vi.fn(), setFont: vi.fn(), setFontSize: vi.fn(), text: vi.fn(),
      splitTextToSize: vi.fn().mockReturnValue([persistedForm.title]), addPage: vi.fn(), save: vi.fn(),
    };
    render(<LapisPdfExportButton form={persistedForm} analyses={[{ kind: "gaps", status: "ready", content: "Lacuna rastreável." }]} createDocument={() => doc} />);

    await user.click(screen.getByRole("button", { name: "Exportar PDF" }));
    expect(doc.save).toHaveBeenCalledWith("lapis-ondas-internas-e-redes-neurais.pdf");
    expect(doc.text).toHaveBeenCalledWith("AcademiaOS · Lapis", 18, 17);
  });

  it("renderiza o progresso e libera a chamada para o Cartographer apenas com pergunta definida", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const { rerender } = render(<><ResearchFlow hasQuestion={false} hasReviewProject={false} /><LapisCartographerCta hasQuestion={false} onNavigate={onNavigate} /></>);

    expect(screen.getByText("Registre uma pergunta para liberar a passagem à literatura.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Ir para Cartographer" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<><ResearchFlow hasQuestion hasReviewProject /><LapisCartographerCta hasQuestion onNavigate={onNavigate} /></>);
    expect(screen.getByText("A pergunta está pronta para orientar a revisão.")).toBeTruthy();
    expect(screen.getByText("Protocolo e cronograma")).toBeTruthy();
    expect(screen.getByText("Manuscrito rastreável")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ir para Cartographer" }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("executa o autosave real do workspace, atualiza o estado visual e limpa o rascunho local após sucesso", async () => {
    trpcState.updateMutate.mockImplementation((_input: unknown, options: { onSuccess?: () => void }) => {
      trpcState.onSuccess = options.onSuccess;
    });
    render(<LapisWorkspace />);

    const resources = await screen.findByLabelText("Recursos, dados e parceiros disponíveis");
    vi.useFakeTimers();
    fireEvent.change(resources, { target: { value: "Recurso pendente de sincronização." } });
    expect(screen.getByText("Alterações serão salvas automaticamente")).toBeTruthy();
    expect(window.localStorage.getItem(lapisDraftStorageKey(42))).not.toBeNull();

    act(() => vi.advanceTimersByTime(1200));
    expect(trpcState.updateMutate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Salvando alterações…")).toBeTruthy();

    act(() => trpcState.onSuccess?.());
    expect(screen.getByText("Salvo automaticamente")).toBeTruthy();
    expect(window.localStorage.getItem(lapisDraftStorageKey(42))).toBeNull();
  });

  it("aciona a exportação PDF real a partir do botão renderizado pelo workspace", async () => {
    const user = userEvent.setup();
    render(<LapisWorkspace />);
    await screen.findByLabelText("Recursos, dados e parceiros disponíveis");

    await user.click(screen.getByRole("button", { name: "Exportar PDF" }));
    expect(trpcState.pdfDocument.save).toHaveBeenCalledWith("lapis-ondas-internas-e-redes-neurais.pdf");
    expect(trpcState.pdfDocument.text).toHaveBeenCalledWith("AcademiaOS · Lapis", 18, 17);
  });

  it("mantém e libera o CTA Cartographer dentro do workspace conforme a pergunta de pesquisa", async () => {
    const onNavigate = vi.fn();
    trpcState.question = "";
    const { unmount } = render(<LapisWorkspace onNavigateToCartographer={onNavigate} />);
    const blocked = await screen.findByRole("button", { name: "Ir para Cartographer" });
    expect((blocked as HTMLButtonElement).disabled).toBe(true);
    unmount();

    trpcState.question = "Como redes neurais podem identificar ondas internas?";
    const user = userEvent.setup();
    render(<LapisWorkspace onNavigateToCartographer={onNavigate} />);
    const enabled = await screen.findByRole("button", { name: "Ir para Cartographer" });
    expect((enabled as HTMLButtonElement).disabled).toBe(false);
    await user.click(enabled);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("abre o Retícula por ação síncrona com as três coordenadas, sem exigir pergunta formal", async () => {
    const user = userEvent.setup();
    const openWindow = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ReticulaCoordinatesDialog form={{ ...persistedForm, researchQuestion: "" }} disabled={false} workspaceContext="Análise de sensoriamento remoto" />);

    const trigger = screen.getByRole("button", { name: "Abrir Retícula com coordenadas do Lapis" });
    const triggerContent = trigger.querySelector("span.inline-flex");
    expect(triggerContent).toBeTruthy();
    expect(triggerContent?.querySelector("svg")).toBeTruthy();
    expect(triggerContent?.textContent).toContain("Abrir Retícula com coordenadas do Lapis");

    await user.click(trigger);
    await user.click(await screen.findByRole("button", { name: "Abrir Retícula com coordenadas" }));

    expect(openWindow).toHaveBeenCalledTimes(1);
    const [url, target, features] = openWindow.mock.calls[0];
    const deepLink = new URL(String(url));
    expect(target).toBe("_blank");
    expect(features).toBe("noopener,noreferrer");
    expect(deepLink.searchParams.get("theme")).toBe("Ondas internas e redes neurais");
    expect(deepLink.searchParams.get("subject")).toBe("A identificação manual é lenta.");
    expect(deepLink.searchParams.get("discipline")).toBe("Oceanografia Física e Sensoriamento Remoto");
    expect(deepLink.searchParams.get("from")).toBe("academiaos");
    openWindow.mockRestore();
  });

  it("associa um projeto Cartographer pelo seletor acessível do workspace e preserva a escolha no rascunho", async () => {
    const user = userEvent.setup();
    render(<LapisWorkspace />);

    const trigger = await screen.findByRole("combobox", { name: "Projeto Cartographer associado" });
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Revisão de ondas internas" }));

    const draft = restoreLapisDraft(window.localStorage.getItem(lapisDraftStorageKey(42)), 42);
    expect(draft?.reviewProjectId).toBe(1);
    await waitFor(() => expect(trpcState.updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        lapisProjectId: 42,
        project: expect.objectContaining({ reviewProjectId: 1, status: "maturing" }),
      }),
      expect.any(Object),
    ));
  });

  it("exige confirmação para remover o caderno e limpa o rascunho local após sucesso", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(lapisDraftStorageKey(42), JSON.stringify({ lapisProjectId: 42, savedAt: new Date().toISOString(), form: persistedForm }));
    render(<LapisWorkspace />);

    await user.click(await screen.findByRole("button", { name: "Excluir caderno" }));
    const confirmation = await screen.findByRole("alertdialog");
    expect(within(confirmation).getByText("Excluir este caderno?")).toBeTruthy();
    await user.click(within(confirmation).getByRole("button", { name: "Excluir caderno" }));
    expect(trpcState.removeMutate).toHaveBeenCalledWith({ lapisProjectId: 42 });
    await waitFor(() => expect(trpcState.cancel).toHaveBeenCalledWith({ lapisProjectId: 42 }));

    act(() => trpcState.removeOnSuccess?.());
    expect(window.localStorage.getItem(lapisDraftStorageKey(42))).toBeNull();
  });
});
