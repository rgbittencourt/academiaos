import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("marca do AcademiaOS", () => {
  it("usa o título oficial, o favicon e os metadados institucionais da plataforma", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    expect(html).toContain("<title>AcademiaOS</title>");
    expect(html).toContain('rel="icon"');
    expect(html).toContain('name="author" content="Prof. Rogério G. Bittencourt · INOVALAB');
    expect(html).toContain('name="application-name" content="AcademiaOS"');
    expect(html).not.toContain("AcademiaOS — Cartographer");
  });
});
