# Fontes externas para descoberta acadêmica

## Europe PMC

- Documentação: https://europepmc.org/RestfulWebService
- Uso planejado: consulta REST de literatura em ciências da vida, com resposta JSON e metadados de publicação.
- Limite documentado: paginação de referências permite até 1.000 itens por página.

## PubMed / NCBI

- Documentação: https://www.ncbi.nlm.nih.gov/home/develop/api/
- Uso planejado: E-utilities para localizar e recuperar registros PubMed.
- Observação: a documentação oficial indica chave de API opcional por conta NCBI para maior capacidade; a integração deve permanecer funcional no limite anônimo e identificar a fonte na proveniência.

## Crossref

- Documentação: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- Uso planejado: REST API pública para metadados bibliográficos depositados por membros e fontes confiáveis.

## SciELO

- Documentação: https://scielo.readthedocs.io/
- Uso planejado: ArticleMeta RESTful API para metadados de artigos, periódicos, fascículos e coleções; CitedBy RESTful API para citações.

## OpenAIRE

- Documentação: https://graph.openaire.eu/docs/apis/search-api/
- Uso planejado: metadados de produtos de pesquisa e projetos.
- Limite documentado: a Search API legada será descontinuada em 31/05/2026 e limita cada consulta a 10.000 resultados; preferir Graph API para a implementação nova.

## arXiv

- Documentação: https://info.arxiv.org/help/api/user-manual.html
- Uso planejado: API pública de metadados, com consulta `search_query`, paginação `start`/`max_results` e resposta Atom.

## CORE

- Documentação: https://api.core.ac.uk/docs/v3
- Uso planejado: pesquisa de outputs e works do agregador de acesso aberto.
- Observação: exemplos de busca de outputs usam cabeçalho `Authorization: Bearer {apikey}`. A fonte deve ficar desabilitada de modo explícito até que uma chave CORE seja configurada de forma segura.
