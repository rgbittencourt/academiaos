# Fontes públicas para registros, citações e integridade bibliográfica

## OpenAlex

O OpenAlex mantém documentação de acesso à API e se apresenta como índice abrangente de pesquisa. Será usado como fonte pública para consultas de registros acadêmicos no módulo Originalidade, sempre registrando a fonte, a consulta e o instante de execução. A documentação de referência deve ser consultada antes de ampliar filtros ou entidades específicas.

- Documentação: <https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/search-entities>

## Crossref REST API

O Crossref oferece o endpoint público `/works` com parâmetros de consulta bibliográfica, filtros, seleção de campos e paginação. Seu retorno contém metadados de obras e relações declaradas, apropriados para complementar a checagem auditável de DOI e possíveis atualizações/retrações, sem classificar automaticamente um trabalho como inválido.

- Documentação: <https://api.crossref.org/swagger-ui/index.html>
- Referência REST: <https://www.crossref.org/documentation/retrieve-metadata/rest-api/>

## Semantic Scholar Academic Graph API

A API Academic Graph do Semantic Scholar documenta busca por relevância, detalhes de artigos, citações e referências. O Cartographer já utiliza essa fonte primária e poderá solicitar metadados de citações e referências para compor um mapa navegável, preservando links de origem e limites de cobertura da base.

- Documentação: <https://api.semanticscholar.org/api-docs/graph>
- Especificação: <https://api.semanticscholar.org/graph/v1/swagger.json>

> Limite operacional: fontes públicas podem ter cobertura e atualização incompletas. Indicadores de atualização, correção ou retratação são sinais de revisão humana, nunca uma acusação ou decisão automatizada.
