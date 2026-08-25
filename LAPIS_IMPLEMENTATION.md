# Lapis — implementação do módulo de concepção

O **Lapis** foi implementado como o espaço de concepção e maturação de projetos de pesquisa do AcademiaOS. Cada caderno pertence ao usuário autenticado, pode ser vinculado opcionalmente a um projeto do Cartographer e armazena título, ideia, problema, pergunta de pesquisa, agência-alvo e recursos disponíveis.

| Análise | Escopo implementado | Limite explícito |
| --- | --- | --- |
| Lacunas de pesquisa | Interpreta a ideia à luz dos resumos da biblioteca Cartographer associada. | Não afirma lacunas abrangentes quando o corpus disponível é insuficiente. |
| Originalidade conceitual | Compara proximidades e diferenças com o caderno e a biblioteca associada. | Não alega consulta a OSF, registros de teses ou projetos externos. |
| Minuta para edital | Estrutura problema, contribuição, abordagem, resultados esperados e aderência potencial. | Não inventa regras ou prazos de editais não fornecidos pelo usuário. |
| Viabilidade | Organiza recursos declarados, riscos, premissas e próximos passos. | Não transforma uma estimativa em confirmação técnica, orçamentária ou institucional. |

Todas as análises devem retornar ao menos uma **evidência literal**: um trecho contínuo do caderno ou de um resumo associado. Se o provedor não produzir resposta estruturada ou evidência verificável após as tentativas de recuperação, o Lapis persiste uma análise de contingência com limitações declaradas e citação literal do caderno. A interface permite abrir cada evidência utilizada.

## Validação atual

Os testes de `server/lapisAi.test.ts` validam a associação de evidência literal e o fallback auditável. A rota `/lapis` foi verificada em desktop (1280 × 720) e mobile (375 × 812); ambos os layouts apresentam o estado vazio, a criação de caderno e a navegação do módulo de forma legível. Para testar uma análise com corpus real, crie um caderno e associe-o a um projeto do Cartographer que já possua artigos salvos.
