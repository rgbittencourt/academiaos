import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "./_core/env";

const API_BASE_URL = "https://api.zotero.org";

function encryptionKey() {
  if (!ENV.cookieSecret) throw new Error("Chave de proteção do servidor indisponível para a conexão Zotero.");
  return createHash("sha256").update(ENV.cookieSecret).digest();
}

export function encryptZoteroKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptZoteroKey(payload: string) {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Credencial Zotero armazenada em formato inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export type ZoteroImportedItem = {
  itemKey: string; title: string; citationKey: string | null; creatorsJson: string; publicationYear: number | null;
  doi: string | null; sourceUrl: string | null; itemType: string | null; sourceUpdatedAt: Date | null;
};

type ZoteroResponseItem = { key?: string; version?: number; data?: Record<string, unknown> };

export async function fetchZoteroLibrary(input: { libraryId: string; libraryType: "user" | "group"; apiKey: string }) {
  const prefix = input.libraryType === "group" ? "groups" : "users";
  const url = `${API_BASE_URL}/${prefix}/${encodeURIComponent(input.libraryId)}/items/top?format=json&limit=100`;
  const response = await fetch(url, { headers: { "Zotero-API-Version": "3", "Zotero-API-Key": input.apiKey, Accept: "application/json" } });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("O Zotero recusou a chave ou o acesso à biblioteca. Confirme o ID e as permissões de leitura da chave.");
    throw new Error(`Não foi possível sincronizar o Zotero (HTTP ${response.status}).`);
  }
  const rawItems = await response.json() as ZoteroResponseItem[];
  return rawItems.map(item => {
    const data = item.data ?? {};
    const date = typeof data.date === "string" ? data.date.match(/\b(19|20)\d{2}\b/)?.[0] : undefined;
    const creators = Array.isArray(data.creators) ? data.creators : [];
    return {
      itemKey: item.key ?? String(data.key ?? ""),
      title: String(data.title ?? "Sem título"),
      citationKey: typeof data.citationKey === "string" ? data.citationKey : null,
      creatorsJson: JSON.stringify(creators),
      publicationYear: date ? Number(date) : null,
      doi: typeof data.DOI === "string" ? data.DOI : null,
      sourceUrl: typeof data.url === "string" ? data.url : null,
      itemType: typeof data.itemType === "string" ? data.itemType : null,
      sourceUpdatedAt: null,
    } satisfies ZoteroImportedItem;
  }).filter(item => item.itemKey);
}
