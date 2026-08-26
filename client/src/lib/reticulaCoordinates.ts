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

const RETICULA_URL = "https://reticula-atlas-ideias.rogerio-bittencourt-1a9.workers.dev/";
const MAX_COORDINATE_LENGTH = 320;

function cleanCoordinate(value: string | null | undefined, fallback = "") {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_COORDINATE_LENGTH) || fallback;
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
