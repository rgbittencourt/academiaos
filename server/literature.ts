export type AcademicSource =
  | "semantic_scholar"
  | "openalex"
  | "europe_pmc"
  | "pubmed"
  | "crossref"
  | "scielo"
  | "openaire"
  | "arxiv"
  | "core";

export type AcademicSearchResult = {
  externalId: string;
  source: AcademicSource;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  doi: string | null;
  citationCount: number;
  relevanceScore: number;
  url: string | null;
};

export type DiscoverySourceStatus = {
  id: AcademicSource;
  label: string;
  status: "available" | "unavailable" | "requires_key";
  resultCount: number;
  note: string | null;
};

type SemanticScholarPaper = { paperId?: string; title?: string; abstract?: string | null; year?: number | null; authors?: Array<{ name?: string }>; externalIds?: { DOI?: string | null } | null; citationCount?: number | null; url?: string | null };
type OpenAlexWork = { id?: string; title?: string; publication_year?: number | null; authorships?: Array<{ author?: { display_name?: string } }>; doi?: string | null; cited_by_count?: number | null; primary_location?: { landing_page_url?: string | null } | null; abstract_inverted_index?: Record<string, number[]> | null };

const SOURCE_LABELS: Record<AcademicSource, string> = {
  semantic_scholar: "Semantic Scholar", openalex: "OpenAlex", europe_pmc: "Europe PMC", pubmed: "PubMed",
  crossref: "Crossref", scielo: "SciELO", openaire: "OpenAIRE", arxiv: "arXiv", core: "CORE",
};

const stripTags = (value: string | null | undefined) => value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
const cleanDoi = (value: string | null | undefined) => value?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim() || null;
const numberOrZero = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
const yearOrNull = (value: unknown): number | null => {
  const match = String(value ?? "").match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
};
const authorsFrom = (value: unknown): string[] => {
  if (typeof value === "string") return value.split(/;|,\s*(?=[A-Z])/).map(item => item.trim()).filter(Boolean).slice(0, 12);
  if (!Array.isArray(value)) return [];
  return value.map(item => typeof item === "string" ? item : typeof item === "object" && item ? String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).fullName ?? `${(item as Record<string, unknown>).given ?? ""} ${(item as Record<string, unknown>).family ?? ""}`).trim() : "").filter(Boolean).slice(0, 12);
};

const requestJson = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "AcademiaOS-Cartographer/0.2 (academic discovery)" } });
    if (!response.ok) throw new Error(`Academic search upstream failed (${response.status})`);
    return await response.json() as T;
  } finally { clearTimeout(timeout); }
};

const requestText = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/atom+xml, application/xml, text/xml", "User-Agent": "AcademiaOS-Cartographer/0.2 (academic discovery)" } });
    if (!response.ok) throw new Error(`Academic search upstream failed (${response.status})`);
    return response.text();
  } finally { clearTimeout(timeout); }
};

export function makeRelevanceScore(rank: number, total: number, citations = 0): number {
  const rankScore = total > 1 ? 1 - rank / (total - 1) : 1;
  const citationBonus = Math.min(Math.log10(Math.max(citations, 1)) / 10, 0.12);
  return Math.round(Math.min(rankScore * 0.88 + citationBonus, 1) * 100);
}

export function reconstructOpenAlexAbstract(invertedIndex: Record<string, number[]> | null | undefined): string | null {
  if (!invertedIndex) return null;
  const terms = Object.entries(invertedIndex).flatMap(([term, positions]) => positions.map(position => ({ term, position })));
  return terms.length ? terms.sort((a, b) => a.position - b.position).map(item => item.term).join(" ") : null;
}

function genericResult(raw: Record<string, unknown>, source: AcademicSource, rank: number, total: number): AcademicSearchResult | null {
  const titleValue = raw.title;
  const title = Array.isArray(titleValue) ? String(titleValue[0] ?? "").trim() : String(titleValue ?? raw.dc_title ?? raw.name ?? "").trim();
  const externalId = String(raw.id ?? raw.uid ?? raw.pid ?? raw.doi ?? raw.DOI ?? raw.identifier ?? raw.pmcid ?? "").trim();
  if (!title || !externalId) return null;
  const citations = numberOrZero(raw.cited_by_count ?? raw.citationCount ?? raw["is-referenced-by-count"] ?? raw.citedByCount);
  return {
    externalId: `${source}:${externalId.replace(/^https?:\/\//, "")}`,
    source, title, authors: authorsFrom(raw.authors ?? raw.author ?? raw.authorString ?? raw.creators),
    year: yearOrNull(raw.year ?? raw.publication_year ?? raw.pubYear ?? raw.published ?? raw.created),
    abstract: stripTags(String(raw.abstract ?? raw.abstractText ?? raw.description ?? raw.summary ?? "") || null),
    doi: cleanDoi(String(raw.doi ?? raw.DOI ?? "") || null), citationCount: citations,
    relevanceScore: makeRelevanceScore(rank, total, citations),
    url: String(raw.url ?? raw.URL ?? raw.fullTextUrl ?? raw.landingPageUrl ?? raw.id ?? "") || null,
  };
}

export function normalizeSemanticScholarPaper(paper: SemanticScholarPaper, rank: number, total: number): AcademicSearchResult | null {
  if (!paper.paperId || !paper.title) return null;
  const citations = paper.citationCount ?? 0;
  return { externalId: paper.paperId, source: "semantic_scholar", title: paper.title, authors: (paper.authors ?? []).map(author => author.name).filter((name): name is string => Boolean(name)), year: paper.year ?? null, abstract: paper.abstract ?? null, doi: paper.externalIds?.DOI ?? null, citationCount: citations, relevanceScore: makeRelevanceScore(rank, total, citations), url: paper.url ?? null };
}

export function normalizeOpenAlexWork(work: OpenAlexWork, rank: number, total: number): AcademicSearchResult | null {
  if (!work.id || !work.title) return null;
  const citations = work.cited_by_count ?? 0;
  return { externalId: work.id.replace("https://openalex.org/", ""), source: "openalex", title: work.title, authors: (work.authorships ?? []).map(authorship => authorship.author?.display_name).filter((name): name is string => Boolean(name)), year: work.publication_year ?? null, abstract: reconstructOpenAlexAbstract(work.abstract_inverted_index), doi: cleanDoi(work.doi), citationCount: citations, relevanceScore: makeRelevanceScore(rank, total, citations), url: work.primary_location?.landing_page_url ?? work.id };
}

async function searchSemanticScholar(query: string, limit: number) {
  const params = new URLSearchParams({ query, limit: String(limit), fields: "paperId,title,abstract,year,authors,externalIds,citationCount,url" });
  const papers = (await requestJson<{ data?: SemanticScholarPaper[] }>(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`)).data ?? [];
  return papers.map((paper, index) => normalizeSemanticScholarPaper(paper, index, papers.length)).filter((paper): paper is AcademicSearchResult => Boolean(paper));
}
async function searchOpenAlex(query: string, limit: number) {
  const params = new URLSearchParams({ search: query, per_page: String(limit) });
  const works = (await requestJson<{ results?: OpenAlexWork[] }>(`https://api.openalex.org/works?${params}`)).results ?? [];
  return works.map((work, index) => normalizeOpenAlexWork(work, index, works.length)).filter((work): work is AcademicSearchResult => Boolean(work));
}
async function searchEuropePmc(query: string, limit: number) {
  const params = new URLSearchParams({ query, format: "json", pageSize: String(limit), resultType: "core" });
  const items = (await requestJson<{ resultList?: { result?: Record<string, unknown>[] } }>(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`)).resultList?.result ?? [];
  return items.map((item, index) => genericResult(item, "europe_pmc", index, items.length)).filter((item): item is AcademicSearchResult => Boolean(item));
}
async function searchCrossref(query: string, limit: number) {
  const params = new URLSearchParams({ query, rows: String(limit), select: "DOI,title,author,published,abstract,is-referenced-by-count,URL" });
  const items = (await requestJson<{ message?: { items?: Record<string, unknown>[] } }>(`https://api.crossref.org/works?${params}`)).message?.items ?? [];
  return items.map((item, index) => genericResult({ ...item, id: item.DOI, url: item.URL, year: (item.published as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]?.[0] }, "crossref", index, items.length)).filter((item): item is AcademicSearchResult => Boolean(item));
}
async function searchPubmed(query: string, limit: number) {
  const params = new URLSearchParams({ db: "pubmed", retmode: "json", retmax: String(limit), term: query });
  const ids = (await requestJson<{ esearchresult?: { idlist?: string[] } }>(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params}`)).esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const payload = await requestJson<{ result?: Record<string, Record<string, unknown> & { uid?: string }> }>(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`);
  const records = ids.map(id => payload.result?.[id]).filter((item): item is Record<string, unknown> => Boolean(item));
  return records.map((item, index) => genericResult({ ...item, id: item.uid ?? ids[index], title: item.title, authors: item.authors, year: item.pubdate, url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid ?? ids[index]}/` }, "pubmed", index, records.length)).filter((item): item is AcademicSearchResult => Boolean(item));
}
async function searchArxiv(query: string, limit: number) {
  const xml = await requestText(`https://export.arxiv.org/api/query?${new URLSearchParams({ search_query: `all:${query}`, start: "0", max_results: String(limit) })}`);
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).map(match => match[1]);
  const tag = (entry: string, name: string) => entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  return entries.map((entry, index) => genericResult({ id: tag(entry, "id"), title: tag(entry, "title"), summary: tag(entry, "summary"), published: tag(entry, "published"), authors: Array.from(entry.matchAll(/<name>([\s\S]*?)<\/name>/g)).map(match => match[1].trim()), url: tag(entry, "id") }, "arxiv", index, entries.length)).filter((item): item is AcademicSearchResult => Boolean(item));
}
async function searchSciElo(query: string, limit: number) {
  const params = new URLSearchParams({ collection: "scl", q: query, limit: String(limit) });
  const payload = await requestJson<Record<string, unknown>>(`https://articlemeta.scielo.org/api/v1/article/?${params}`);
  const items = (payload.objects ?? payload.articles ?? payload.results ?? []) as Record<string, unknown>[];
  return items.map((item, index) => genericResult(item, "scielo", index, items.length)).filter((item): item is AcademicSearchResult => Boolean(item));
}
async function searchOpenAire(query: string, limit: number) {
  const params = new URLSearchParams({ query, page: "1", size: String(limit) });
  const payload = await requestJson<Record<string, unknown>>(`https://api.openaire.eu/graph/v1/search/researchProducts?${params}`);
  const items = (payload.results ?? (payload.response as Record<string, unknown> | undefined)?.results ?? []) as Record<string, unknown>[];
  return items.map((item, index) => genericResult(item, "openaire", index, items.length)).filter((item): item is AcademicSearchResult => Boolean(item));
}

const runners: Array<{ id: Exclude<AcademicSource, "core">; run: (query: string, limit: number) => Promise<AcademicSearchResult[]> }> = [
  { id: "semantic_scholar", run: searchSemanticScholar }, { id: "openalex", run: searchOpenAlex }, { id: "europe_pmc", run: searchEuropePmc }, { id: "pubmed", run: searchPubmed }, { id: "crossref", run: searchCrossref }, { id: "scielo", run: searchSciElo }, { id: "openaire", run: searchOpenAire }, { id: "arxiv", run: searchArxiv },
];

function deduplicate(results: AcademicSearchResult[], limit: number): AcademicSearchResult[] {
  const byIdentity = new Map<string, AcademicSearchResult>();
  for (const result of results) {
    const key = result.doi ? `doi:${result.doi.toLowerCase()}` : `title:${result.title.toLowerCase().replace(/\W/g, "")}`;
    const current = byIdentity.get(key);
    if (!current || result.relevanceScore > current.relevanceScore || result.citationCount > current.citationCount) byIdentity.set(key, result);
  }
  return Array.from(byIdentity.values()).sort((a, b) => b.relevanceScore - a.relevanceScore || b.citationCount - a.citationCount).slice(0, limit);
}

export async function searchAcademicArticles(query: string, limit = 10) {
  const settled = await Promise.allSettled(runners.map(source => source.run(query, limit)));
  const sourceStatus: DiscoverySourceStatus[] = settled.map((outcome, index) => ({
    id: runners[index].id, label: SOURCE_LABELS[runners[index].id], status: outcome.status === "fulfilled" ? "available" : "unavailable",
    resultCount: outcome.status === "fulfilled" ? outcome.value.length : 0,
    note: outcome.status === "rejected" ? "Consulta indisponível nesta execução; tente novamente mais tarde." : null,
  }));
  sourceStatus.push({ id: "core", label: SOURCE_LABELS.core, status: "requires_key", resultCount: 0, note: "Aguardando chave individual do CORE para ativação." });
  const results = deduplicate(settled.flatMap(outcome => outcome.status === "fulfilled" ? outcome.value : []), limit);
  return { provider: "Cobertura multi-fonte", results, sources: sourceStatus };
}
