const OPENALEX_API = "https://api.openalex.org";
const OSF_API = "https://api.osf.io/v2";
const CROSSREF_API = "https://api.crossref.org/works";
const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1";

type SourceStatus = { source: "openalex" | "osf"; status: "ok" | "unavailable"; retrievedAt: string; note?: string };

export type AcademicRecord = {
  source: "openalex" | "osf";
  externalId: string;
  title: string;
  description: string | null;
  year: number | null;
  url: string | null;
  recordType: "work" | "project" | "registration";
};

export type CitationNode = { id: string; title: string; year: number | null; citationCount: number | null; url: string | null; source: "corpus" | "reference" | "citing" };
export type CitationEdge = { source: string; target: string; relation: "references" | "cited_by" };

async function fetchJson(url: string, timeoutMs = 9000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "AcademiaOS/1.0 academic-discovery" }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function plainText(value: unknown) {
  if (typeof value !== "string") return null;
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
}

function reconstructAbstract(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parts: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) if (typeof position === "number") parts.push([position, word]);
  }
  return parts.sort((a, b) => a[0] - b[0]).map(([, word]) => word).join(" ") || null;
}

export async function searchAcademicRecords(query: string, limit = 8) {
  const normalized = query.trim().replace(/\s+/g, " ").slice(0, 500);
  if (normalized.length < 3) throw new Error("A consulta precisa ter ao menos três caracteres.");
  const retrievedAt = new Date().toISOString();
  const [openAlexResult, osfResult] = await Promise.allSettled([
    fetchJson(`${OPENALEX_API}/works?search=${encodeURIComponent(normalized)}&per-page=${limit}&select=id,display_name,publication_year,doi,primary_location,abstract_inverted_index,type`),
    fetchJson(`${OSF_API}/nodes/?filter[title]=${encodeURIComponent(normalized)}&page[size]=${limit}`),
  ]);

  const sources: SourceStatus[] = [];
  const records: AcademicRecord[] = [];
  if (openAlexResult.status === "fulfilled") {
    sources.push({ source: "openalex", status: "ok", retrievedAt });
    const payload = openAlexResult.value as { results?: Array<Record<string, unknown>> };
    for (const work of payload.results ?? []) {
      const location = work.primary_location as { landing_page_url?: string | null } | null;
      records.push({
        source: "openalex",
        externalId: String(work.id ?? ""),
        title: String(work.display_name ?? "Registro sem título"),
        description: reconstructAbstract(work.abstract_inverted_index),
        year: typeof work.publication_year === "number" ? work.publication_year : null,
        url: location?.landing_page_url ?? (typeof work.doi === "string" ? work.doi : null),
        recordType: "work",
      });
    }
  } else sources.push({ source: "openalex", status: "unavailable", retrievedAt, note: openAlexResult.reason instanceof Error ? openAlexResult.reason.message : "Falha na consulta" });

  if (osfResult.status === "fulfilled") {
    sources.push({ source: "osf", status: "ok", retrievedAt });
    const payload = osfResult.value as { data?: Array<{ id?: string; type?: string; attributes?: Record<string, unknown>; links?: { html?: string } }> };
    for (const item of payload.data ?? []) {
      const attributes = item.attributes ?? {};
      const category = String(attributes.category ?? "project");
      records.push({
        source: "osf",
        externalId: String(item.id ?? ""),
        title: String(attributes.title ?? "Registro OSF sem título"),
        description: plainText(attributes.description),
        year: typeof attributes.date_created === "string" ? Number(attributes.date_created.slice(0, 4)) || null : null,
        url: item.links?.html ?? null,
        recordType: category === "registration" ? "registration" : "project",
      });
    }
  } else sources.push({ source: "osf", status: "unavailable", retrievedAt, note: osfResult.reason instanceof Error ? osfResult.reason.message : "Falha na consulta" });

  return { query: normalized, retrievedAt, sources, records };
}

export async function inspectReferenceIntegrity(doi: string | null) {
  if (!doi) return { status: "not_checked" as const, source: "Crossref", detail: "O registro não possui DOI para consulta de metadados." };
  try {
    const payload = await fetchJson(`${CROSSREF_API}/${encodeURIComponent(doi)}`) as { message?: Record<string, unknown> };
    const message = payload.message ?? {};
    const relation = message.relation && typeof message.relation === "object" ? message.relation as Record<string, unknown> : {};
    const relationKeys = Object.keys(relation);
    const hasUpdateSignal = relationKeys.some(key => /retract|correct|update|errat/i.test(key));
    return hasUpdateSignal
      ? { status: "review_required" as const, source: "Crossref", detail: `Metadados indicam relação de atualização: ${relationKeys.join(", ")}. Confirme no registro editorial antes de qualquer decisão.`, relations: relationKeys }
      : { status: "no_relation_reported" as const, source: "Crossref", detail: "Os metadados retornados não informaram relação de retratação ou correção. Isso não comprova integridade nem substitui verificação editorial.", relations: relationKeys };
  } catch (error) {
    return { status: "unavailable" as const, source: "Crossref", detail: error instanceof Error ? `Consulta indisponível: ${error.message}` : "Consulta indisponível." };
  }
}

function nodeFromPaper(paper: Record<string, unknown>, source: CitationNode["source"]): CitationNode | null {
  const id = typeof paper.paperId === "string" ? paper.paperId : null;
  if (!id) return null;
  return { id, title: typeof paper.title === "string" ? paper.title : "Trabalho sem título", year: typeof paper.year === "number" ? paper.year : null, citationCount: typeof paper.citationCount === "number" ? paper.citationCount : null, url: typeof paper.url === "string" ? paper.url : null, source };
}

export async function buildCitationMap(articles: Array<{ externalId: string; source: string; doi: string | null; title: string; year: number | null; citationCount: number; url: string | null }>) {
  const capped = articles.slice(0, 8);
  const nodes = new Map<string, CitationNode>();
  const edges: CitationEdge[] = [];
  const warnings: string[] = [];
  await Promise.all(capped.map(async article => {
    const identifier = article.source === "semantic_scholar" ? article.externalId : article.doi ? `DOI:${article.doi}` : null;
    if (!identifier) { warnings.push(`“${article.title}” não possui identificador compatível para expandir citações.`); return; }
    try {
      const fields = "paperId,title,year,citationCount,url,references.paperId,references.title,references.year,references.citationCount,references.url,citations.paperId,citations.title,citations.year,citations.citationCount,citations.url";
      const payload = await fetchJson(`${SEMANTIC_SCHOLAR_API}/paper/${encodeURIComponent(identifier)}?fields=${encodeURIComponent(fields)}`) as Record<string, unknown>;
      const root = nodeFromPaper(payload, "corpus");
      if (!root) return;
      nodes.set(root.id, root);
      for (const paper of Array.isArray(payload.references) ? payload.references : []) {
        if (!paper || typeof paper !== "object") continue;
        const reference = nodeFromPaper(paper as Record<string, unknown>, "reference");
        if (reference) { nodes.set(reference.id, reference); edges.push({ source: root.id, target: reference.id, relation: "references" }); }
      }
      for (const paper of Array.isArray(payload.citations) ? payload.citations : []) {
        if (!paper || typeof paper !== "object") continue;
        const citing = nodeFromPaper(paper as Record<string, unknown>, "citing");
        if (citing) { nodes.set(citing.id, citing); edges.push({ source: citing.id, target: root.id, relation: "cited_by" }); }
      }
    } catch (error) {
      warnings.push(`Não foi possível expandir citações de “${article.title}”: ${error instanceof Error ? error.message : "falha externa"}.`);
    }
  }));
  return { nodes: Array.from(nodes.values()), edges, warnings, source: "Semantic Scholar", generatedAt: new Date().toISOString() };
}
