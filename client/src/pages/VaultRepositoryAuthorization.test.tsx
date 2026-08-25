// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { VaultRepositoryAuthorizationPanel } from "./ResearchTools";

describe("VaultRepositoryAuthorizationPanel", () => {
  it("exige aceite explícito antes da confirmação e permite revogar uma autorização ativa", () => {
    const onConfirm = vi.fn();
    const onRevoke = vi.fn();
    render(<VaultRepositoryAuthorizationPanel plans={[
      { id: 11, repository: "zenodo", status: "metadata_ready", destinationUrl: "https://zenodo.org/deposit", currentAuthorization: null, authorizationHistory: [] },
      { id: 12, repository: "dataverse", status: "manual_deposit", destinationUrl: null, currentAuthorization: { action: "confirmed", createdAt: new Date("2026-08-20T09:00:00Z") }, authorizationHistory: [{ action: "confirmed", createdAt: new Date("2026-08-20T09:00:00Z") }] },
    ]} onConfirm={onConfirm} onRevoke={onRevoke} confirming={false} revoking={false} />);

    expect(screen.getByText("Sem transferência automática")).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Confirmar preparação autenticada" });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirm.hasAttribute("disabled")).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith(11);

    fireEvent.click(screen.getByRole("button", { name: "Revogar autorização" }));
    expect(onRevoke).toHaveBeenCalledWith(12);
  });
});
