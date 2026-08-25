# Fontes oficiais de editais — CNPq e CAPES

## CNPq

O Portal CNPq mantém uma página oficial de **chamadas abertas para submissão**, que reúne oportunidades, prazos e requisitos publicados pelo órgão. A página pode ser consultada como fonte de origem, mas a análise inicial não identificou uma API pública documentada, estável e sem autenticação para ingestão estruturada. Portanto, a primeira integração deve coletar somente metadados exibidos publicamente, conservar URL e data de consulta e nunca inferir regras ausentes.

- Fonte: https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao
- Página institucional: https://www.gov.br/cnpq/pt-br
- Dados abertos institucionais: http://portal-adm.cnpq.br/web/guest/dados_abertos

## CAPES

A CAPES mantém a página oficial de **Editais e Resultados**, que lista chamadas e editais institucionais. A fonte será integrada inicialmente por coleta pública de metadados com proveniência, pois a análise inicial também não identificou API pública documentada para pesquisa de chamadas.

- Fonte: https://www.gov.br/capes/pt-br/assuntos/editais-e-resultados-capes

## Critérios de integração

Cada oportunidade importada deve preservar órgão, título, URL oficial, resumo literal quando disponível, status publicado, data de publicação, prazo quando explícito e data de consulta pelo AcademiaOS. O assistente Lapis deve informar lacunas de dados e usar apenas os critérios extraídos da fonte oficial selecionada.
