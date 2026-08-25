import { createHash } from "node:crypto";

export type RisRecord = {
  externalId: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  doi: string | null;
  url: string | null;
  notes: string[];
};

export type RisPreviewRecord = RisRecord & {
  status: "ready" | "duplicate" | "invalid";
  reason?: string;
};

const MAX_RIS_CHARACTERS = 2_000_000;
const MAX_RIS_RECORDS = 500;

function clean(value: string | undefined) {
  const normalized = (value ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function normalizeDoi(value: string | null) {
  if (!value) return null;
  return value.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() || null;
}

function stableExternalId(record: Pick<RisRecord, "title" | "authors" | "year" | "doi">) {
  if (record.doi) return `doi:${record.doi}`;
  const raw = [record.title.toLocaleLowerCase("pt-BR"), record.authors.join("|").toLocaleLowerCase("pt-BR"), record.year ?? ""].join("|");
  return `reticula:${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
}

function closeRecord(fields: Record<string, string[]>, records: RisRecord[]) {
  const title = clean(fields.TI?.[0] ?? fields.T1?.[0]);
  if (!title) return;
  const authors = (fields.AU ?? fields.A1 ?? []).map(clean).filter((author): author is string => Boolean(author));
  const yearMatch = clean(fields.PY?.[0] ?? fields.Y1?.[0])?.match(/\b(18|19|20)\d{2}\b/);
  const doi = normalizeDoi(clean(fields.DO?.[0]));
  const record: RisRecord = {
    title,
    authors,
    year: yearMatch ? Number(yearMatch[0]) : null,
    abstract: clean(fields.AB?.[0]),
    doi,
    url: clean(fields.UR?.[0]),
    notes: (fields.N1 ?? []).map(clean).filter((note): note is string => Boolean(note)),
    externalId: "",
  };
  record.externalId = stableExternalId(record);
  records.push(record);
}

/** Analisa metadados RIS. Não grava o arquivo nem executa chamadas externas. */
export function parseRis(content: string): RisRecord[] {
  if (!content.trim()) throw new Error("O arquivo RIS está vazio.");
  if (content.length > MAX_RIS_CHARACTERS) throw new Error("O arquivo RIS ultrapassa o limite de 2 MB.");
  const records: RisRecord[] = [];
  let fields: Record<string, string[]> = {};
  for (const line of content.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9]{2})\s{0,2}-\s?(.*)$/);
    if (!match) continue;
    const [, tag, value] = match;
    if (tag === "TY") { fields = { TY: [value] }; continue; }
    if (tag === "ER") { closeRecord(fields, records); fields = {}; continue; }
    (fields[tag] ??= []).push(value);
    if (records.length > MAX_RIS_RECORDS) throw new Error("O arquivo RIS ultrapassa o limite de 500 registros por lote.");
  }
  if (Object.keys(fields).length) closeRecord(fields, records);
  if (records.length > MAX_RIS_RECORDS) throw new Error("O arquivo RIS ultrapassa o limite de 500 registros por lote.");
  if (!records.length) throw new Error("Não foram encontrados registros RIS com título.");
  return records;
}

export function createRisPreview(content: string, existing: Array<{ externalId: string; doi: string | null; title: string }>) {
  const records = parseRis(content);
  const knownIds = new Set(existing.map(article => article.externalId));
  const knownDois = new Set(existing.map(article => normalizeDoi(article.doi)).filter((doi): doi is string => Boolean(doi)));
  const knownTitles = new Set(existing.map(article => article.title.trim().toLocaleLowerCase("pt-BR")));
  const encountered = new Set<string>();
  const preview: RisPreviewRecord[] = records.map(record => {
    if (encountered.has(record.externalId)) return { ...record, status: "duplicate", reason: "Registro repetido dentro do arquivo RIS." };
    encountered.add(record.externalId);
    if (knownIds.has(record.externalId) || (record.doi && knownDois.has(record.doi))) return { ...record, status: "duplicate", reason: "Já existe um registro com este DOI ou identificador no projeto." };
    if (knownTitles.has(record.title.trim().toLocaleLowerCase("pt-BR"))) return { ...record, status: "duplicate", reason: "Há um título igual na biblioteca; revise antes de importar." };
    return { ...record, status: "ready" };
  });
  return {
    records: preview,
    contentHash: createHash("sha256").update(content).digest("hex"),
    total: preview.length,
    candidateCount: preview.filter(record => record.status === "ready").length,
    duplicateCount: preview.filter(record => record.status === "duplicate").length,
    provenance: preview.flatMap(record => record.notes).filter(note => /Retícula|Atlas de Literatura Científica/i.test(note)).slice(0, 10),
  };
}
