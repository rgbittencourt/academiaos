import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("segurança de bootstrap do cliente", () => {
  it("não permite que a persistência opcional de autenticação interrompa a renderização", () => {
    const source = readProjectFile("client/src/_core/hooks/useAuth.ts");

    expect(source).toContain("useEffect(() => {");
    expect(source).toContain("try {\n      localStorage.setItem");
    expect(source).toContain("O aplicativo permanece funcional sem essa conveniência local.");
  });

  it("aguarda sessão autenticada antes de renderizar áreas e consultas protegidas do Dashboard", () => {
    const source = readProjectFile("client/src/pages/Home.tsx");

    expect(source).toContain("if (!isAuthenticated) return <DashboardLayout>{null}</DashboardLayout>;");
    expect(source).toContain("trpc.lapis.projects.useQuery(undefined, { enabled: Boolean(user) })");
    expect(source).toContain('typeof window === "undefined" ? "" : window.location.hash');
  });
});
