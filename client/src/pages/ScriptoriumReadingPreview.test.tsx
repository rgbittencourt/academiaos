// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ScriptoriumReadingPreview } from "./ResearchTools";

afterEach(cleanup);

describe("ScriptoriumReadingPreview", () => {
  it("organiza título, resumo e parágrafos por seção para revisão antes da exportação", () => {
    render(<ScriptoriumReadingPreview document={{
      title: "Efeitos de uma intervenção educacional",
      targetJournal: "Revista de Educação",
      abstract: "Este é o resumo do manuscrito.",
      sections: [{ id: "intro", heading: "Introdução", content: "Primeiro parágrafo.\n\nSegundo parágrafo." }],
    }} />);

    expect(screen.getByRole("heading", { name: "Pré-visualização de leitura" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Efeitos de uma intervenção educacional" })).toBeTruthy();
    expect(screen.getByText("Preparado para: Revista de Educação")).toBeTruthy();
    expect(screen.getByText("Primeiro parágrafo.")).toBeTruthy();
    expect(screen.getByText("Segundo parágrafo.")).toBeTruthy();
  });
});
