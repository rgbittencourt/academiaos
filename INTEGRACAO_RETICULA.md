# Integração Retícula — AcademiaOS

## Contexto

O **Retícula — Atlas de Literatura Científica** é uma implementação própria do **Prof. Rogério G. Bittencourt** e encontra-se, por ora, hospedado no ChatGPT Sites. O AcademiaOS deverá tratá-lo como uma fonte complementar de descoberta para o Cartographer, preservando a autonomia dos dois produtos e a rastreabilidade de todos os registros recebidos.

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
| Importação de exportação | O pesquisador importa um arquivo gerado pelo Retícula em RIS, BibTeX ou CSV. | Amostra real de arquivo e mapeamento dos campos. | Primeiro candidato para MVP. |
| API autenticada | O Cartographer pesquisa ou recebe registros estruturados do Retícula. | URL pública, documentação, autenticação, limites e autorização explícita. | Aguardando definição do Retícula. |
| Consulta federada | O Cartographer cria a consulta e abre ou incorpora o resultado autorizado do Retícula. | URL pública, política de embedding/CORS e comportamento de retorno definido. | Aguardando definição do Retícula. |

## Contrato mínimo de proveniência

Cada registro originado no Retícula deve preservar, quando disponível, o identificador externo, URL de origem, consulta executada, data e hora da coleta, lote de importação, autores, título, resumo, ano, DOI, tipo documental, licença e campos brutos necessários à auditoria. O Cartographer deve exibir essa proveniência ao pesquisador e não substituir silenciosamente os metadados da fonte.

A deduplicação deve priorizar DOI e identificadores bibliográficos estáveis. Quando não houver identificador estável, o sistema deve marcar a possível duplicidade a partir de título, autores e ano normalizados, deixando a confirmação para o pesquisador.

## Informações pendentes para implementação

Para iniciar a integração, o responsável pelo Retícula deve escolher uma modalidade de intercâmbio. Como a rota pública `GET /api/atlas` já existe, a recomendação é adotar uma **API de descoberta versionada** como caminho principal: `GET /api/v1/atlas` receberia `theme`, `subject` e `discipline`; retornaria o contrato já normalizado, acrescido de `schemaVersion`, identificador de consulta, política de erros estável e controles de limite. O AcademiaOS consumiria a API somente a partir do seu backend, protegeria uma chave de serviço no ambiente e salvaria a proveniência de cada resultado no Cartographer.

Em paralelo, é recomendável oferecer exportação RIS/BibTeX/CSV no Retícula e importação no AcademiaOS como rota manual de interoperabilidade. Esse recurso atende pesquisadores que trabalham fora do AcademiaOS e funciona como contingência caso a API fique temporariamente indisponível. A consulta federada, por sua vez, deve ficar como melhoria de navegação: um botão do AcademiaOS abre o Retícula já preenchido ou incorpora um mapa autorizado, mas não substitui a ingestão estruturada necessária para triagem e síntese auditáveis.

Antes da ativação, devem ser definidos chave de serviço, limites de requisição, CORS restrito ao backend autorizado, observabilidade sem metadados pessoais, política de cache, termos de uso e tratamento de erros. Como a camada de descoberta atual faz chamadas externas e pode utilizar planejamento semântico, não é recomendável expor indefinidamente a rota sem esses controles.

Até essa definição, o AcademiaOS não deve automatizar navegação, raspagem de tela ou coleta recorrente no Retícula.
