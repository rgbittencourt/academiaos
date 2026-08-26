# Integração Retícula — AcademiaOS

## Contexto

O **Retícula — Atlas de Literatura Científica** é uma implementação própria do **Prof. Rogério G. Bittencourt**, publicada em Cloudflare Workers. O AcademiaOS o trata como uma fonte complementar de descoberta para o Cartographer, preservando a autonomia dos dois produtos e a rastreabilidade de todos os registros recebidos.

Nenhum endpoint, URL pública, formato de exportação, contrato de autenticação ou política de reuso foi configurado neste repositório até o momento. Por esse motivo, este documento descreve o contrato que deve ser confirmado antes de qualquer conexão técnica.

## Interface pública verificada

Em 25 de agosto de 2026, foi verificada a instância pública `https://reticula-atlas-ideias.rogerio-bittencourt-1a9.workers.dev/`. Ela se apresenta como um atlas de literatura científica aberto, sem cadastro ou login, e informa pesquisa paralela em oito serviços acadêmicos, mapa interativo 3D de conceitos e autores, além de referências, DOI e links preservados para conferência. A interface confirma excelente complementaridade com o Cartographer: o Retícula favorece a exploração visual e o AcademiaOS sustenta o ciclo de projeto, seleção, extração e síntese auditável.

O perfil público do desenvolvedor também confirma o repositório `https://github.com/rgbittencourt/reticula-atlas-ideias`, descrito como “Atlas 3D de literatura científica gerado a partir de tema, assunto e disciplina”, em TypeScript e sob licença MIT. Essa verificação permite avançar para a inspeção do código e das rotas expostas.

O repositório aponta uma arquitetura com aplicação TypeScript, diretório `worker`, banco D1/Drizzle e dependências de fontes acadêmicas por variáveis de ambiente. A documentação pública declara busca simultânea em Semantic Scholar, Crossref, OpenAlex, SciELO, OpenAIRE, Europe PMC/PubMed, arXiv e CORE, além de fontes brasileiras e latino-americanas como Oasisbr/IBICT, BDTD/IBICT, DOAJ, CAPES Dados Abertos, ERIC, DataCite, LA Referencia e repositórios brasileiros via OAI-PMH. Essa cobertura é mais ampla e tem vocação natural para servir como camada de descoberta do ecossistema.

O código público expõe uma rota de aplicação em `app/api/atlas/route.ts`. A rota normaliza trabalhos em uma estrutura que inclui `id`, `title`, `year`, `authors`, `venue`, `doi`, `url`, `abstract`, `citations`, `source` e `fields`, e contém lógica de planejamento semântico com contingência determinística. O arquivo do Worker funciona como adaptador para o roteador da aplicação, não como uma API pública independente. Para o AcademiaOS, isso significa que o ponto de partida correto é **formalizar e versionar o contrato da rota de atlas**, em vez de acoplar-se à implementação interna atual.

Foi confirmada uma rota `GET /api/atlas` que exige três parâmetros de consulta: `theme`, `subject` e `discipline`. Em resposta bem-sucedida, ela retorna as coordenadas, consulta, plano semântico, até 500 trabalhos deduplicados, conceitos, ligações do grafo e proveniência por fonte, incluindo estado e contagem dos provedores. A resposta atual usa cache público e trata consultas com poucos documentos como erro de negócio. Esse contrato já é suficiente para um **MVP de API de descoberta**, mas deve receber uma versão explícita, uma chave de serviço e uma política de CORS antes do consumo pelo backend do AcademiaOS.

Essa verificação de interface e metadados do repositório não confirma, por si só, a existência de API, exportação estruturada ou permissão de incorporação. Esses pontos devem ser definidos a partir do repositório do Retícula ou de sua camada de backend.

## Caminhos de implementação

| Modalidade | Uso | Pré-condições | Situação |
|---|---|---|---|
| Importação de exportação | O pesquisador exporta um conjunto selecionado no Retícula e importa o arquivo no Cartographer. | Amostra real de arquivo e mapeamento dos campos. | **Primeira integração recomendada.** |
| API autenticada | O Cartographer pesquisa ou recebe registros estruturados do Retícula. | URL pública, documentação, autenticação, limites e autorização explícita. | Aguardando definição do Retícula. |
| Consulta federada | O Cartographer cria a consulta e abre ou incorpora o resultado autorizado do Retícula. | URL pública, política de embedding/CORS e comportamento de retorno definido. | Aguardando definição do Retícula. |

## Contrato mínimo de proveniência

Cada registro originado no Retícula deve preservar, quando disponível, o identificador externo, URL de origem, consulta executada, data e hora da coleta, lote de importação, autores, título, resumo, ano, DOI, tipo documental, licença e campos brutos necessários à auditoria. O Cartographer deve exibir essa proveniência ao pesquisador e não substituir silenciosamente os metadados da fonte.

A deduplicação deve priorizar DOI e identificadores bibliográficos estáveis. Quando não houver identificador estável, o sistema deve marcar a possível duplicidade a partir de título, autores e ano normalizados, deixando a confirmação para o pesquisador.

## Primeira integração recomendada: exportar e importar

Para a primeira versão, o caminho mais simples é implementar **exportação no Retícula** e **importação no AcademiaOS**. O pesquisador continua usando o mapa, os filtros e a descoberta visual do Retícula; ao selecionar os estudos de interesse, baixa um arquivo e decide conscientemente em qual projeto do Cartographer ele será incorporado. Não há autenticação entre aplicações, CORS, chave de serviço, sincronização periódica nem exposição adicional de endpoints.

O Retícula deve oferecer **RIS** como formato principal, pois preserva a estrutura bibliográfica clássica e é amplamente interoperável. **BibTeX** pode ser disponibilizado em seguida para fluxos LaTeX/Zotero. Um **CSV de auditoria** é útil como complemento de leitura, mas não deve ser a única opção, pois campos multivalorados e resumos longos são mais frágeis nesse formato.

| Campo mínimo de exportação | Uso no AcademiaOS |
|---|---|
| `title`, `authors`, `year`, `venue` | Criação e apresentação do registro bibliográfico. |
| `doi`, `url`, `source` e `sourceId` | Deduplicação e rastreio da origem. |
| `abstract`, quando disponível | Apoio à triagem e extração auditável. |
| `query`, `exportedAt`, `reticulaUrl` | Proveniência do lote e reprodutibilidade da descoberta. |

No Cartographer, o fluxo deve ter quatro etapas: envio do arquivo, pré-visualização com validação dos campos, indicação de possíveis duplicatas por DOI/identificadores e confirmação explícita do pesquisador para importar. O sistema deve manter o arquivo ou os campos brutos do lote junto da data, da consulta e da origem `Retícula`, sem substituir silenciosamente o que já existe na biblioteca.

Essa abordagem não impede uma API posterior. Ao contrário, o formato normalizado usado no importador define desde já a estrutura que a futura API deverá devolver. Quando houver demanda por atualização contínua de consultas ou trabalho sem etapa manual, a rota `GET /api/atlas` poderá evoluir para `/api/v1/atlas` autenticada e reutilizar o mesmo modelo de dados.

## Interoperabilidade entregue

O Retícula exporta o conjunto atualmente filtrado em três formatos: **RIS** para importação bibliográfica, **BibTeX** para fluxos LaTeX/Zotero e **CSV UTF-8 com BOM** como relatório de auditoria legível em planilhas. Os três formatos preservam, quando disponíveis, identificador, título, autores, ano, veículo, DOI, URL, resumo, fonte, consulta, três coordenadas e horário de exportação. A exportação não inventa campos de veículo nem altera os registros que fundamentam o atlas.

Os dois produtos também oferecem continuidade de descoberta por URL, sem uso de API privada, raspagem ou sincronização em segundo plano. A partir de um caderno no **Lapis**, o AcademiaOS deriva uma proposta inicial de `theme`, `subject` e `discipline` a partir da pergunta de pesquisa, título e problema registrados; a disciplina é apenas uma sugestão lexical e todos os três campos permanecem editáveis em uma prévia antes de o Retícula ser aberto. O link contém também `from=academiaos`. O Retícula apenas pré-preenche as coordenadas e exige que o pesquisador inicie a busca. No retorno, o Retícula abre `/search` do AcademiaOS em nova aba com a consulta e a proveniência `source=reticula`; o Cartographer mostra o contexto recebido e mantém o comando de busca sob controle explícito do pesquisador.

No Cartographer, a deduplicação continua a priorizar identificadores estáveis. Uma camada adicional calcula candidatos de títulos semelhantes com regra determinística e explicável baseada em tokens do título, autoria, ano e DOI. O pesquisador pode registrar **“mesmo estudo”** ou **“manter distintos”**, com nota opcional e data. Essa decisão é auditável, não exclui, não funde e não substitui nenhum estudo salvo.

## Próximos limites e evolução

Se o objetivo for a integração inicial de menor risco, não é necessária uma API nova: basta definir os formatos e implementar exportador/importador. A rota pública `GET /api/atlas` pode permanecer como recurso do Retícula até que uma integração automática seja realmente necessária. Nesse momento, a recomendação será evoluir para uma API versionada com `schemaVersion`, identificador de consulta, política de erros estável e controles de limite; o AcademiaOS a consumirá somente por seu backend e continuará salvando proveniência.

Em paralelo, a exportação RIS/BibTeX/CSV no Retícula e a importação RIS auditável no AcademiaOS constituem a rota manual de interoperabilidade. Esse recurso atende pesquisadores que trabalham fora do AcademiaOS e funciona como contingência caso uma futura API fique temporariamente indisponível. A consulta por URL é uma melhoria de navegação; ela não substitui a ingestão estruturada necessária para triagem e síntese auditáveis.

Antes da ativação, devem ser definidos chave de serviço, limites de requisição, CORS restrito ao backend autorizado, observabilidade sem metadados pessoais, política de cache, termos de uso e tratamento de erros. Como a camada de descoberta atual faz chamadas externas e pode utilizar planejamento semântico, não é recomendável expor indefinidamente a rota sem esses controles.

Até essa definição, o AcademiaOS não deve automatizar navegação, raspagem de tela ou coleta recorrente no Retícula.
