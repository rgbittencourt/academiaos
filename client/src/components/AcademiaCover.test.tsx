// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcademiaCover } from "./DashboardLayout";

vi.mock("@/const", () => ({ startLogin: vi.fn() }));

afterEach(cleanup);

describe("AcademiaCover", () => {
  it("apresenta a identidade AcademiaOS, capacidades, crédito institucional e entrada protegida", () => {
    render(<AcademiaCover />);

    expect(screen.getAllByText("AcademiaOS").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /ideias mais nítidas/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /entrar no academiaos/i })).toBeTruthy();
    expect(screen.getByText("Evidências rastreáveis")).toBeTruthy();
    expect(screen.getByText("Prof. Rogério G. Bittencourt")).toBeTruthy();
    expect(screen.getAllByText("INOVALAB").length).toBeGreaterThan(0);
    expect(screen.getByText(/Laboratório de Inteligência Artificial, Inovação e Criatividade/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Logotipo completo do INOVALAB" }).getAttribute("src")).toContain("academiaos-logo-inovalab-signature");
    expect(screen.getAllByRole("img", { name: "Logotipo do INOVALAB" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "Logotipo do IFSC – Campus Continente" })).toBeTruthy();
    expect(screen.getByTestId("cover-ifsc-signature")).toBeTruthy();
    expect(screen.getByTestId("cover-inovalab-signature")).toBeTruthy();
    expect(screen.queryByText("IFSC · Câmpus Continente")).toBeNull();
    expect(screen.getByRole("link", { name: "github.com/rgbittencourt" }).getAttribute("href")).toBe("https://github.com/rgbittencourt");
    expect(screen.getByTestId("cover-research-journey")).toBeTruthy();
    expect(screen.getByTestId("cover-institutional-credit").getAttribute("data-alignment")).toBe("left");
  });
});
