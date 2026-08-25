import { describe, expect, it } from "vitest";

describe("identidade do projeto", () => {
  it("mantém AcademiaOS como título público configurado", () => {
    expect(process.env.VITE_APP_TITLE).toBe("AcademiaOS");
  });
});
