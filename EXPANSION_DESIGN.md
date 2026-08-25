# Desenho técnico da expansão AcademiaOS

## Decisões de produto

O **Método** pertence ao caderno Lapis porque transforma a hipótese em protocolo antes de a pesquisa avançar para análise e escrita. O artefato é separado do texto de concepção para permitir autosave, rastreabilidade e evolução independente. O cronograma pertence ao mesmo protocolo e contém marcos ordenados, com início, término e estado explícitos.

No Cartographer, a triagem não substitui a biblioteca. Salvar um resultado cria o corpus candidato; a decisão de triagem registra se ele foi incluído, excluído ou se permanece pendente, sempre com motivo opcional e data de atualização. O fluxo PRISMA é calculado a partir desses dados e não apresenta números inventados.

| Entidade | Relação | Campos essenciais | Finalidade |
|---|---|---|---|
| `lapis_methods` | 1:1 com `lapis_projects` | desenho, cenário, população, amostragem, critérios, variáveis, coleta, análise, ética | Protocolo de Método persistido. |
| `lapis_milestones` | N:1 com `lapis_projects` | título, descrição, início, término, status, ordem | Cronograma interativo e auditável. |
| `article_screenings` | 1:1 por artigo e projeto | etapa, decisão, justificativa, atualização | Registro de inclusão/exclusão. |
| `narrative_themes` | N:1 com `review_projects` | tema, síntese, IDs de artigos, evidências | Síntese narrativa manual e rastreável. |

## Contratos e invariantes

| Capacidade | Invariante de segurança e qualidade |
|---|---|
| Método e cronograma | Todo acesso é autorizado pelo proprietário do caderno Lapis. Datas são guardadas como timestamps UTC. |
| Triagem | Cada decisão é escopada ao projeto Cartographer; nenhum artigo pode ser atualizado por outro usuário. |
| Duplicatas | São apenas alertas heurísticos por DOI ou título normalizado; o sistema nunca remove estudos automaticamente. |
| Sobreposição | É apresentada como **possível** quando metadados são semelhantes; não há inferência causal sobre estudos primários. |
| Síntese narrativa | O tema e sua interpretação são inseridos pelo pesquisador; cada evidência selecionada aponta a um artigo do corpus. |
| DOCX e LaTeX | O download contém o argumento, a lista de referências e os trechos literais de proveniência; não há referência bibliográfica inventada. |

## Escopo desta entrega

Esta expansão entrega o núcleo operacional do Método, cronograma, triagem, alertas de duplicação/sobreposição, caderno de síntese narrativa e exportação de síntese. Integrações externas com PubMed, OSF, registros de teses, editais de agências e editores de texto permanecem explicitamente fora do escopo até que conectores reais estejam configurados.
