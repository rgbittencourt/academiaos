# AcademiaOS

O **AcademiaOS** é um ambiente conectado e auditável para apoiar o ciclo completo da pesquisa acadêmica: concepção, revisão de literatura, método, pré-registro, dados, análise, escrita, publicação e integridade.

## Desenvolvimento institucional

O software é desenvolvido pelo **Prof. Rogério G. Bittencourt**, com assinatura do **INOVALAB — Laboratório de Inteligência Artificial, Inovação e Criatividade**.

| Referência | Endereço |
|---|---|
| Aplicação publicada | https://acadcarto-dbjwmxfb.manus.space |
| Perfil GitHub do desenvolvedor | https://github.com/rgbittencourt |

## Princípios de uso

O AcademiaOS prioriza rastreabilidade, revisão humana e transparência metodológica. As sugestões automatizadas são subsídios de trabalho: não equivalem a interpretação científica final, execução estatística automática, parecer ético, depósito externo ou confirmação de conformidade jurídica.

## Estrutura do ecossistema

| Etapa | Ferramentas |
|---|---|
| Concepção | Lapis |
| Evidências | Cartographer |
| Método e pré-registro | Método e Prereg |
| Dados | Vault |
| Análise | Qualia e Analista |
| Escrita | Scriptorium |
| Publicação e integridade | Matchmaker e Vigil |

## Arquitetura

O repositório contém uma aplicação full-stack em **React 19**, **Vite**, **Tailwind CSS**, **Express**, **tRPC**, **Drizzle ORM** e **MySQL/TiDB**. A autenticação, o armazenamento de arquivos e os recursos de IA exigem variáveis de ambiente provisionadas no ambiente de execução; elas não são incluídas neste repositório.

| Comando | Finalidade |
|---|---|
| `pnpm install` | Instala as dependências declaradas. |
| `pnpm dev` | Inicia o ambiente de desenvolvimento. |
| `pnpm check` | Executa a verificação de tipos do TypeScript. |
| `pnpm test` | Executa a suíte de testes automatizados. |
| `pnpm build` | Gera a compilação do cliente e do servidor. |

## Manuais de uso

A coleção de documentação operacional está disponível em [`docs/manuais`](./docs/manuais/INDICE.md). Ela contém um **Manual Geral do AcademiaOS** e guias separados para Lapis, Cartographer, Método, Prereg, Vault, Qualia, Analista, Scriptorium, Matchmaker e Vigil. Os manuais descrevem os fluxos implementados, a revisão humana necessária e os limites de cada módulo.

## Integrações de descoberta

O Cartographer agrega fontes acadêmicas abertas, incluindo Semantic Scholar, OpenAlex, Europe PMC, PubMed, Crossref, SciELO, OpenAIRE e arXiv. O **Retícula — Atlas de Literatura Científica** é uma implementação própria do Prof. Rogério G. Bittencourt, publicada em [reticula-atlas-ideias.rogerio-bittencourt-1a9.workers.dev](https://reticula-atlas-ideias.rogerio-bittencourt-1a9.workers.dev/). A estratégia de intercâmbio está documentada em [`INTEGRACAO_RETICULA.md`](./INTEGRACAO_RETICULA.md): o Retícula exporta RIS, BibTeX e CSV, enquanto o Lapis prepara coordenadas revisáveis de tema, assunto e disciplina para abri-lo em outra aba sem iniciar uma busca automaticamente.

## Publicação responsável

Este repositório contém código, migrações, testes e documentação pública do produto. Ele não deve conter arquivos `.env`, credenciais, chaves, dados acadêmicos enviados por pesquisadores, documentos privados, cópias de banco de dados ou dependências instaladas. Antes de qualquer implantação independente, configure os serviços de autenticação, banco de dados, armazenamento e IA de acordo com o ambiente de destino.
