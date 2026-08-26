# Incidente: regressão geral do AcademiaOS — 2026-08-26

## Relato

O pesquisador relatou que todo o AcademiaOS passou a apresentar falha grave após a publicação da interoperabilidade.

## Evidência inicial

No domínio publicado, a primeira renderização exibiu uma estrutura de carregamento que ocupava toda a aplicação. Em uma segunda leitura, a capa pública completou a renderização e mostrou a ação de autenticação. Essa observação indica que o erro deve ser investigado também no fluxo autenticado, pois a capa não reproduziu uma falha permanente.

## Salvaguarda

Nenhuma alteração de dados acadêmicos, projetos ou esquema do banco foi executada durante a coleta de evidências. A restauração, se necessária, será de código e não de dados.

## Hipóteses de diagnóstico

Os recursos estáticos públicos responderam normalmente e os registros de produção não exibiram exceções de servidor. A investigação passa a priorizar o fluxo autenticado no cliente: carregamento de `auth.me`, consultas protegidas executadas sem sessão, redirecionamentos durante renderização e leitura de parâmetros do navegador em momento inseguro. Essas hipóteses serão verificadas no código antes de qualquer reversão.

## Recuperação aplicada

A persistência auxiliar do estado de autenticação foi deslocada para um efeito protegido por `try/catch`, para que indisponibilidade de armazenamento local não consiga derrubar a árvore da interface. A tela principal passou a proteger leituras do objeto `window`, a aguardar a autenticação antes de renderizar áreas privadas e a habilitar a consulta de projetos do Lapis no Dashboard somente quando há uma sessão autenticada.

Não houve reversão de esquema, exclusão, atualização ou inserção de projetos, artigos, lotes RIS ou decisões de revisão. A validação local passou com `pnpm check` e com 23 arquivos de teste / 111 testes. As capturas autenticadas de Dashboard, Meus Projetos e Descoberta exibiram o conteúdo carregado; a tela de descoberta também manteve o botão **Abrir Retícula** e a ação de importação RIS.
