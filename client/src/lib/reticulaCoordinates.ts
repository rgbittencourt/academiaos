export type ReticulaCoordinateInput = {
  title: string;
  researchIdea: string;
  researchQuestion?: string | null;
  problemStatement?: string | null;
  workspaceContext?: string | null;
};

export type ReticulaCoordinates = {
  theme: string;
  subject: string;
  discipline: string;
  disciplineRationale: string;
};

type LapisWorkspaceContextSource = {
  method?: {
    studyDesign?: string | null;
    setting?: string | null;
    population?: string | null;
    variables?: string | null;
    dataCollection?: string | null;
    analysisPlan?: string | null;
  } | null;
  analyses?: Array<{ content?: string | null }> | null;
};

export type LapisProjectForReticula = {
  id: number;
  title?: string | null;
  researchIdea?: string | null;
  researchQuestion?: string | null;
  problemStatement?: string | null;
  reviewProjectId?: number | string | null;
};

type ResolveLapisProjectInput = {
  lapisProjects: LapisProjectForReticula[];
  requestedLapisProjectId?: number | null;
  reviewProjectId?: number | null;
  cartographerProjectName?: string | null;
};

const RETICULA_URL = "https://reticula-atlas-ideias.rogerio-bittencourt-1a9.workers.dev/";
const MAX_COORDINATE_LENGTH = 320;

function cleanCoordinate(value: string | null | undefined, fallback = "") {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_COORDINATE_LENGTH) || fallback;
}

function normalizedProjectName(value: string | null | undefined) {
  return cleanCoordinate(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const GENERIC_TITLE_TOKENS = new Set(["a", "as", "o", "os", "de", "da", "das", "do", "dos", "e", "em", "na", "nas", "no", "nos", "para", "por", "com", "um", "uma", "sobre"]);

function significantTitleTokens(value: string | null | undefined) {
  return new Set(normalizedProjectName(value).split(" ").filter(token => token.length >= 3 && !GENERIC_TITLE_TOKENS.has(token)));
}

function titleSimilarity(left: string | null | undefined, right: string | null | undefined) {
  const leftTokens = significantTitleTokens(left);
  const rightTokens = significantTitleTokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const shared = Array.from(leftTokens).filter(token => rightTokens.has(token)).length;
  const smallestTitle = Math.min(leftTokens.size, rightTokens.size);
  const union = new Set([...Array.from(leftTokens), ...Array.from(rightTokens)]).size;
  const coverage = shared / smallestTitle;
  const jaccard = shared / union;
  return coverage >= 0.6 && jaccard >= 0.45 ? (coverage + jaccard) / 2 : 0;
}

export function lapisProjectHasSufficientReticulaData(project?: Partial<LapisProjectForReticula> | null) {
  const title = cleanCoordinate(project?.title);
  const supportingContext = [project?.researchIdea, project?.researchQuestion, project?.problemStatement]
    .map(value => cleanCoordinate(value))
    .some(value => value.length >= 4);
  return title.length >= 3 && supportingContext;
}

export function resolveLapisProjectForReticula({ lapisProjects, requestedLapisProjectId, reviewProjectId, cartographerProjectName }: ResolveLapisProjectInput) {
  const eligible = lapisProjects.filter(lapisProjectHasSufficientReticulaData);
  const requested = eligible.find(project => project.id === requestedLapisProjectId);
  if (requested) return requested;
  const associated = reviewProjectId == null ? undefined : eligible.find(project => project.reviewProjectId != null && Number(project.reviewProjectId) === Number(reviewProjectId));
  if (associated) return associated;
  const normalizedCartographerName = normalizedProjectName(cartographerProjectName);
  const matchingTitle = eligible.find(project => normalizedProjectName(project.title) === normalizedCartographerName);
  if (matchingTitle) return matchingTitle;
  const similarTitles = eligible
    .map(project => ({ project, score: titleSimilarity(project.title, cartographerProjectName) }))
    .filter(candidate => candidate.score > 0)
    .sort((left, right) => right.score - left.score);
  const bestSimilarTitle = similarTitles[0];
  const secondSimilarTitle = similarTitles[1];
  if (bestSimilarTitle && (!secondSimilarTitle || bestSimilarTitle.score - secondSimilarTitle.score >= 0.15)) return bestSimilarTitle.project;
  return eligible.length === 1 ? eligible[0] : undefined;
}

function suggestDiscipline(source: string) {
  const normalized = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/(onda[s]? interna[s]?|ocean|marinh|sar|radar de abertura sintetica|sensoriamento remoto)/.test(normalized)) {
    return {
      discipline: "Oceanografia Física e Sensoriamento Remoto",
      rationale: "Sugestão por termos do caderno relacionados a oceano, ondas internas, SAR ou sensoriamento remoto.",
    };
  }
  if (/(saude|clinica|epidemiolog|paciente|hospital|doenca)/.test(normalized)) {
    return { discipline: "Ciências da Saúde", rationale: "Sugestão por termos do caderno relacionados a saúde e investigação clínica." };
  }
  if (/(educacao|escola|ensino|aprendizagem|estudante)/.test(normalized)) {
    return { discipline: "Educação", rationale: "Sugestão por termos do caderno relacionados a educação e aprendizagem." };
  }
  return {
    discipline: "Pesquisa interdisciplinar",
    rationale: "O caderno não contém termos suficientes para uma classificação disciplinar específica; confirme ou substitua esta sugestão.",
  };
}

function isInternalWavesSarNeuralNotebook(source: string) {
  const normalized = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /(onda[s]? interna[s]?|internal wave[s]?)/.test(normalized)
    && /(\bsar\b|radar de abertura sintetica|synthetic aperture radar)/.test(normalized)
    && /(rede[s]? neur(?:al|ais)|neural network[s]?)/.test(normalized);
}

export function lapisWorkspaceToReticulaContext(workspace?: LapisWorkspaceContextSource | null) {
  return [
    workspace?.method?.studyDesign,
    workspace?.method?.setting,
    workspace?.method?.population,
    workspace?.method?.variables,
    workspace?.method?.dataCollection,
    workspace?.method?.analysisPlan,
    ...(workspace?.analyses ?? []).map(analysis => analysis.content ?? ""),
  ].filter(Boolean).join(" ");
}

export function deriveReticulaCoordinates(input: ReticulaCoordinateInput): ReticulaCoordinates {
  const source = `${input.title} ${input.researchIdea} ${input.problemStatement ?? ""} ${input.researchQuestion ?? ""} ${input.workspaceContext ?? ""}`;
  if (isInternalWavesSarNeuralNotebook(source)) {
    return {
      theme: "Ocean internal waves",
      subject: "Detection of ocean internal waves in Synthetic Aperture Radar (SAR) imagery using neural networks",
      discipline: "Physical Oceanography",
      disciplineRationale: "Sugestão editável baseada nos termos ondas internas, SAR e redes neurais registrados no caderno Lapis.",
    };
  }
  const theme = cleanCoordinate(input.title, "Tema de pesquisa");
  const subject = cleanCoordinate(input.researchQuestion, cleanCoordinate(input.problemStatement, cleanCoordinate(input.researchIdea, cleanCoordinate(input.workspaceContext, theme))));
  const disciplineSuggestion = suggestDiscipline(source);
  return {
    theme,
    subject,
    discipline: disciplineSuggestion.discipline,
    disciplineRationale: disciplineSuggestion.rationale,
  };
}

export function buildReticulaUrl(coordinates: Pick<ReticulaCoordinates, "theme" | "subject" | "discipline">) {
  const parameters = new URLSearchParams();
  parameters.set("theme", cleanCoordinate(coordinates.theme, "Tema de pesquisa"));
  parameters.set("subject", cleanCoordinate(coordinates.subject, "Assunto de pesquisa"));
  parameters.set("discipline", cleanCoordinate(coordinates.discipline, "Pesquisa interdisciplinar"));
  parameters.set("from", "academiaos");
  return `${RETICULA_URL}?${parameters.toString()}`;
}
