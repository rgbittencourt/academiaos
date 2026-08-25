# Matriz de alinhamento visual — AcademiaOS

## Fontes de referência revisadas

| Referência | Elementos que definem a proposta original |
| --- | --- |
| `mockups/dashboard.png` | Barra lateral azul-profunda com marca dourada; barra superior de busca, notificações e avatar; saudação contextual; timeline horizontal do ciclo de vida; cartões de projeto, tarefas e IA; métricas e gráfico de produção. |
| `mockups/literatura.png` | Cabeçalho compacto do módulo; pesquisa global; painel dividido entre lista de estudos e mapa de citações; indicadores de relevância, estado editorial e ações de extração; filtros em linha. |
| `mockups/ciclo_vida.png` | Cronologia horizontal de etapas com estado visual, cartões de artefatos e linha do tempo; o estágio atual usa o dourado e os concluídos usam verde. |

## Direção que será aplicada

O produto atual preservará os dados e fluxos Cartographer, mas adotará a composição da proposta: **navegação de produto ampla**, barra superior informacional e superfícies brancas com bordas discretas. O dashboard deixará de ser apenas uma visão de revisão para se tornar uma visão do ciclo de pesquisa, explicitando a passagem **Lapis → Cartographer**.

O Lapis será apresentado como primeira etapa do ciclo e terá indicador de progresso, salvamento automático explícito e exportação de caderno. O Cartographer evoluirá para uma experiência de literatura em dois painéis: resultados e contexto de proveniência/citações, sem fabricar dados de grafo quando não houver corpus suficiente.

O indicador de transição seguirá a lógica do mockup: **Concepção (Lapis)** é o estágio atual enquanto o caderno está em construção; **Literatura (Cartographer)** torna-se acionável quando a ideia e a pergunta forem registradas. As próximas fases serão mostradas como roteiro de pesquisa, sem fingir que funcionalidades ainda não implementadas estejam concluídas.

## Limites de fidelidade

Os mockups exibem dados de demonstração como tarefas, produção de grupo e notificações. A implementação reproduzirá a hierarquia, os componentes e a linguagem visual, mas mostrará apenas dados reais ou estados vazios honestos. Itens que ainda não existem no MVP serão apresentados como próximos passos ou ocultados, e não simulados como atividade de usuários.
