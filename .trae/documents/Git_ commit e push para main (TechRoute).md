## Objetivo
- Adicionar todas as mudanças ao stage, criar o commit com a mensagem exata, garantir que estamos em `main` e fazer push para `origin/main` em `https://github.com/mmancilha/TechRoute`.

## Contexto e Pré-requisitos
- Diretório de trabalho: `c:\Users\mmanc\Music\tech-route`.
- Git instalado e configurado com credenciais do GitHub.
- Remote `origin` deve apontar para `https://github.com/mmancilha/TechRoute.git`.

## Passos (Windows PowerShell)
1. Verificar estado e remote
   - `git status`
   - `git rev-parse --is-inside-work-tree`
   - `git remote -v`
2. Ajustar o remote (se necessário)
   - Se não houver `origin`: `git remote add origin https://github.com/mmancilha/TechRoute.git`
   - Se o URL estiver diferente: `git remote set-url origin https://github.com/mmancilha/TechRoute.git`
3. Garantir branch `main`
   - `git branch --show-current`
   - Se não for `main`: `git checkout -B main`
4. Adicionar todas as mudanças ao stage
   - `git add .`
5. Criar o commit com a mensagem exata
   - `git commit -m "feat: Add Vercel deploy configuration"`
6. Push para o repositório remoto `main`
   - `git push -u origin main`

## Verificação
- Confirmar o último commit local:
  - `git log -n 1 --oneline`
- Confirmar branch remota atualizada:
  - `git ls-remote --heads origin main`
- Opcional: verificar no GitHub se o commit aparece em `main`.

## Contingências
- Sem alterações a commitar: o passo 5 falha; iremos informar e parar.
- Push rejeitado por divergência: executar `git pull --rebase origin main` e repetir o push.
- Solicitação de autenticação: usar credenciais/tokens configurados no Git.