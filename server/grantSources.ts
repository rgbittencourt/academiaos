export type OfficialGrantOpportunity = {
  provider: "cnpq" | "capes";
  sourceUrl: string;
  sourceKey: string;
  title: string;
  summaryLiteral: string | null;
  statusLabel: string | null;
  publishedAt: Date | null;
  deadlineAt: Date | null;
  sourceFetchedAt: Date;
};

const SOURCES = {
  cnpq: {
    url: "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao",
    fallbackTitle: "Chamadas abertas para submissão — CNPq",
  },
  capes: {
    url: "https://www.gov.br/capes/pt-br/assuntos/editais-e-resultados-capes",
    fallbackTitle: "Editais e Resultados — CAPES",
  },
} as const;

function decodeEntities(value: string) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(href: string, sourceUrl: string) {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return null;
  }
}

function extractOfficialLinks(html: string, sourceUrl: string) {
  const results: Array<{ title: string; sourceUrl: string }> = [];
  const seen = new Set<string>();
  const anchors = Array.from(html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
  for (const anchor of anchors) {
    const url = toAbsoluteUrl(anchor[1], sourceUrl);
    const title = decodeEntities(anchor[2]);
    if (!url || !url.includes("gov.br") || title.length < 12 || title.length > 350) continue;
    if (/^(início|acessibilidade|contato|menu|busca|mais informações)$/i.test(title)) continue;
    const key = `${url}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ title, sourceUrl: url });
  }
  return results.slice(0, 30);
}

async function fetchSource(provider: "cnpq" | "capes"): Promise<OfficialGrantOpportunity[]> {
  const source = SOURCES[provider];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const fetchedAt = new Date();
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: { "User-Agent": "AcademiaOS/1.0 (consulta de metadados públicos de editais)" },
    });
    if (!response.ok) throw new Error(`Fonte oficial retornou ${response.status}`);
    const html = await response.text();
    const links = extractOfficialLinks(html, source.url);
    const entries = links.filter(link => /(edital|chamada|bolsa|prêmio|programa|resultado)/i.test(link.title));
    const normalized = (entries.length ? entries : [{ title: source.fallbackTitle, sourceUrl: source.url }]).map(entry => ({
      provider,
      sourceUrl: entry.sourceUrl,
      sourceKey: entry.sourceUrl,
      title: entry.title,
      summaryLiteral: null,
      statusLabel: entries.length ? "Metadado listado em página oficial" : "Índice oficial consultado",
      publishedAt: null,
      deadlineAt: null,
      sourceFetchedAt: fetchedAt,
    }));
    return normalized;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchOfficialGrantOpportunities() {
  const settled = await Promise.allSettled([fetchSource("cnpq"), fetchSource("capes")]);
  const opportunities = settled.flatMap(result => result.status === "fulfilled" ? result.value : []);
  if (!opportunities.length) throw new Error("Não foi possível consultar as páginas oficiais de editais neste momento.");
  return opportunities;
}
