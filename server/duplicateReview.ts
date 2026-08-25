export type DuplicateCandidateArticle = {
  id: number;
  title: string;
  doi: string | null;
  publicationYear: number | null;
  authorsJson: string;
};

export type TitleSimilarityCandidate = {
  articleIdA: number;
  articleIdB: number;
  score: number;
  reasons: string[];
};

export function normalizeDuplicateText(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function titleTokens(value: string) {
  return new Set(normalizeDuplicateText(value).split(" ").filter(token => token.length > 3));
}

function parseAuthors(value: string) {
  try {
    const authors: unknown = JSON.parse(value);
    return Array.isArray(authors) ? authors.filter((author): author is string => typeof author === "string") : [];
  } catch {
    return [];
  }
}

function rounded(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Produz indícios transparentes para revisão humana. O resultado nunca afirma
 * identidade entre estudos e não deve ser usado para remover ou mesclar registros.
 */
export function scoreTitleSimilarity(left: DuplicateCandidateArticle, right: DuplicateCandidateArticle): TitleSimilarityCandidate | null {
  const leftTokens = titleTokens(left.title);
  const rightTokens = titleTokens(right.title);
  if (!leftTokens.size || !rightTokens.size) return null;

  const intersection = Array.from(leftTokens).filter(token => rightTokens.has(token)).length;
  const union = new Set(Array.from(leftTokens).concat(Array.from(rightTokens))).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(leftTokens.size, rightTokens.size);
  const titleScore = Math.round((jaccard * 0.7 + containment * 0.3) * 70);
  const reasons = [`Títulos compartilham ${intersection} termo(s) informativo(s) (${Math.round(jaccard * 100)}% de sobreposição).`];
  let score = titleScore;

  const leftDoi = normalizeDuplicateText(left.doi);
  const rightDoi = normalizeDuplicateText(right.doi);
  if (leftDoi && leftDoi === rightDoi) {
    score += 30;
    reasons.push("DOI normalizado idêntico.");
  }

  const leftFirstAuthor = normalizeDuplicateText(parseAuthors(left.authorsJson)[0]).split(" ")[0];
  const rightFirstAuthor = normalizeDuplicateText(parseAuthors(right.authorsJson)[0]).split(" ")[0];
  if (leftFirstAuthor && leftFirstAuthor === rightFirstAuthor) {
    score += 12;
    reasons.push("Primeiro sobrenome de autoria coincidente.");
  }

  if (left.publicationYear && right.publicationYear) {
    const distance = Math.abs(left.publicationYear - right.publicationYear);
    if (distance === 0) {
      score += 8;
      reasons.push("Mesmo ano de publicação.");
    } else if (distance <= 2) {
      score += 4;
      reasons.push("Anos de publicação próximos.");
    }
  }

  const boundedScore = Math.min(100, score);
  if (boundedScore < 45) return null;
  return { articleIdA: Math.min(left.id, right.id), articleIdB: Math.max(left.id, right.id), score: rounded(boundedScore), reasons };
}

export function findTitleSimilarityCandidates(articles: DuplicateCandidateArticle[]) {
  const candidates: TitleSimilarityCandidate[] = [];
  for (let index = 0; index < articles.length; index += 1) {
    for (let candidateIndex = index + 1; candidateIndex < articles.length; candidateIndex += 1) {
      const candidate = scoreTitleSimilarity(articles[index], articles[candidateIndex]);
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates.sort((left, right) => right.score - left.score || left.articleIdA - right.articleIdA || left.articleIdB - right.articleIdB);
}
