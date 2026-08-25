// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { LapisAnalysisNavigator } from "./LapisAnalysisNavigator";

describe("LapisAnalysisNavigator", () => {
  it("direciona a navegação interna para cada módulo analítico e mantém a geração ligada ao módulo escolhido", () => {
    const onGenerate = vi.fn();
    render(<LapisAnalysisNavigator analyses={[]} isGenerating={false} notebookTitle="Projeto de teste" onGenerate={onGenerate} grantWorkspace={<p>Seleção de editais oficiais</p>} />);

    fireEvent.click(screen.getByRole("button", { name: /Lacunas/ }));
    expect(screen.getByRole("heading", { name: "Detector de lacunas de pesquisa" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gerar análise" }));
    expect(onGenerate).toHaveBeenCalledWith("gaps");

    fireEvent.click(screen.getByRole("button", { name: /Editais & grants/ }));
    expect(screen.getByRole("heading", { name: "Assistente de grant writing" })).toBeTruthy();
    expect(screen.getByText("Seleção de editais oficiais")).toBeTruthy();
    expect(screen.getByText(/CNPq e CAPES/)).toBeTruthy();
  });

  it("abre o módulo indicado por hash para suportar os submenus da barra lateral", () => {
    window.location.hash = "lapis-viabilidade";
    render(<LapisAnalysisNavigator analyses={[]} isGenerating={false} notebookTitle="Projeto de teste" onGenerate={vi.fn()} grantWorkspace={<span />} />);

    expect(screen.getByRole("heading", { name: "Estimador de viabilidade" })).toBeTruthy();
    window.location.hash = "";
  });
});
