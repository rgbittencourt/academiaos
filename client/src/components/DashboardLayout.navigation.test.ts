import { describe, expect, it } from "vitest";
import { academyNavigationItems } from "./DashboardLayout";

describe("academyNavigationItems", () => {
  it("remove Equipe e oferece os quatro destinos internos do Lapis", () => {
    expect(academyNavigationItems.some(item => item.label === "Equipe")).toBe(false);
    const lapis = academyNavigationItems.find(item => item.label === "Lapis");
    expect(lapis).toBeTruthy();
    expect("children" in (lapis ?? {})).toBe(true);
    if (lapis && "children" in lapis) expect(lapis.children.map(item => item.path)).toEqual([
      "/lapis#lapis-lacunas",
      "/lapis#lapis-originalidade",
      "/lapis#lapis-editais",
      "/lapis#lapis-viabilidade",
    ]);
  });

  it("oferece as etapas auditáveis do Cartographer em submenus", () => {
    const cartographer = academyNavigationItems.find(item => item.label === "Literatura");
    expect(cartographer).toBeTruthy();
    expect("children" in (cartographer ?? {})).toBe(true);
    if (cartographer && "children" in cartographer) expect(cartographer.children.map(item => item.path)).toEqual([
      "/search",
      "/library",
      "/library#cartographer-prisma",
      "/library#cartographer-extracao",
      "/synthesis",
      "/search#cartographer-integridade",
      "/search#cartographer-citacoes",
    ]);
  });

  it("mantém Prereg, Vault, Qualia, Analista, Scriptorium e Publicação acessíveis por submenus contextuais", () => {
    const prereg = academyNavigationItems.find(item => item.label === "Prereg");
    const vault = academyNavigationItems.find(item => item.label === "Dados & FAIR");
    const qualia = academyNavigationItems.find(item => item.label === "Qualia");
    const analyst = academyNavigationItems.find(item => item.label === "Analista");
    const scriptorium = academyNavigationItems.find(item => item.label === "Scriptorium");
    const publication = academyNavigationItems.find(item => item.label === "Publicação");
    expect(prereg?.children?.map(item => item.path)).toEqual([
      "/prereg#prereg-protocolo",
      "/prereg#prereg-guardrails",
      "/prereg#prereg-advogado",
      "/prereg#prereg-certificado",
    ]);
    expect(vault?.children?.map(item => item.path)).toEqual([
      "/vault#vault-assets",
      "/vault#vault-dictionary",
      "/vault#vault-governance",
      "/vault#vault-repository",
    ]);
    expect(qualia?.children?.map(item => item.path)).toEqual([
      "/qualia#qualia-corpus",
      "/qualia#qualia-codes",
      "/qualia#qualia-assistance",
      "/qualia#qualia-agreement",
      "/qualia#qualia-memos",
      "/qualia#qualia-report",
    ]);
    expect(analyst?.children?.map(item => item.path)).toEqual([
      "/analista",
      "/analista#analyst-recommendation",
      "/analista#analyst-visualizations",
      "/analista#analyst-notebooks",
    ]);
    expect(scriptorium?.children?.map(item => item.path)).toEqual([
      "/scriptorium#scriptorium-editor",
      "/scriptorium#scriptorium-diff",
      "/scriptorium#scriptorium-references",
      "/scriptorium#scriptorium-review",
    ]);
    expect(publication?.children?.map(item => item.path)).toEqual(["/matchmaker", "/vigil"]);
  });
});
