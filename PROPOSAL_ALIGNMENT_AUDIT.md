# Matriz de aderência — proposta original e estado do AcademiaOS

**Base de comparação:** os dois materiais anexados pelo usuário e a expansão local posterior ao checkpoint `65ffa610`.

## Síntese executiva

O produto atual materializa de forma consistente o núcleo de **concepção** e **revisão auditável**: Lapis mantém um caderno persistido com quatro análises, Método e cronograma; Cartographer combina busca semântica, biblioteca, triagem, extração estruturada e síntese com referência clicável. A identidade visual preserva a navegação azul-marinho, o modo claro e a tipografia editorial da proposta; o sistema adota o âmbar como acento de ação e proveniência em vez do vermelho-escuro visto em parte da apresentação de referência.

As lacunas críticas agora se concentram nas integrações externas e nas etapas posteriores do ciclo de vida. Método, seleção sistemática, duplicidade e narrativa foram entregues como artefatos persistidos e auditáveis, sem declarar integrações externas ainda não executadas.

## Lapis — concepção e maturação

| Capacidade proposta | Estado atual verificável | Aderência | Próximo incremento |
|---|---|---:|---|
| Caderno da ideia até protocolo maduro | Caderno com título, ideia, problema, pergunta, agência, recursos, autosave, PDF, **Método** e cronograma persistidos. | Implementado | Evoluir o protocolo para pré-registro formal em incremento próprio. |
| Detector de lacunas | Gera análise de lacunas a partir do caderno e, quando há vínculo, do corpus Cartographer; mostra evidências. | Parcial | Estruturar critérios e usar o corpus selecionado como fonte explicitada. |
| Originalidade conceitual | Compara com o corpus associado e declara que não consulta fontes externas. | Parcial | Manter a declaração de escopo; preparar conectores futuros para registros e editais, sem alegação de cobertura externa. |
| Grant writing por agência | Produz minuta alinhada à agência informada. | Parcial | Estruturar requisitos, itens de avaliação e cronograma da proposta; bases de editais exigem integração posterior. |
| Viabilidade por recursos | Analisa recursos declarados, riscos e requisitos a verificar; Método e cronograma oferecem os campos persistidos para operacionalização. | Parcial | Conectar recomendações de viabilidade a marcos sugeridos por IA. |

## Cartographer — revisão e síntese de evidências

| Capacidade proposta | Estado atual verificável | Aderência | Próximo incremento |
|---|---|---:|---|
| Busca semântica em bases abertas | Semantic Scholar é a fonte primária e OpenAlex a continuidade. | Parcial | Tornar a origem de cada resultado explícita; PubMed demanda conector próprio posterior. |
| Critérios transparentes de inclusão/exclusão | A biblioteca possui triagem por título/resumo e texto completo, com decisão e justificativa persistidas. | Implementado | Exportar o registro e refinar critérios predefinidos. |
| Extrações comparáveis | Objetivo, método, amostra, resultados e limitações, com trechos rastreáveis. | Implementado | Preservar e conectar à triagem. |
| Síntese auditável | Afirmações têm marcadores clicáveis, trecho literal e exportação direta em DOCX ou LaTeX com proveniência. | Implementado | Incluir estilos de citação configuráveis em incremento próprio. |
| Fluxo PRISMA | A biblioteca apresenta contagens derivadas das decisões de triagem por etapa, sem afirmar geração de diagrama PRISMA. | Parcial | Gerar diagrama PRISMA e exportar o log de decisão. |
| Duplicatas e sobreposição de estudos | Alertas conservadores com base em DOI, título e metadados; não há exclusão automática. | Implementado | Adicionar confirmação assistida e regras configuráveis. |
| Síntese qualitativa/narrativa | Caderno de temas narrativos permite interpretação do pesquisador vinculada explicitamente aos estudos selecionados. | Implementado | Oferecer codificação e comparação avançadas em futuro módulo qualitativo. |

## Ciclo de vida AcademiaOS

| Etapa do ecossistema | Situação atual | Direção de produto |
|---|---|---|
| Concepção e financiamento | Lapis funcional, com maturação assistida. | Evoluir para Método e protocolo. |
| Revisão de literatura | Cartographer funcional em descoberta, extração e síntese. | Adicionar triagem, deduplicação e narrativa. |
| Pré-registro e método | Lapis disponibiliza o núcleo Método e cronograma do protocolo. | Evoluir para exportação específica de pré-registro. |
| Dados, análise, escrita, publicação e pós-publicação | Ainda não implementados. | Representar como próximos módulos no fluxo e desenvolver em incrementos próprios após o núcleo metodológico. |

## Regra de honestidade de escopo

Funcionalidades que dependeriam de consulta a OSF, registros de teses, editais de agências, PubMed, Zotero, Overleaf ou repositórios de dados só serão apresentadas como integradas quando houver conector e execução real. Até lá, o sistema deve explicitar o corpus, os campos declarados pelo pesquisador e a evidência usada em cada saída.
