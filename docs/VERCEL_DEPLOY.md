# Publicar o Minha Rotina na Vercel

O código em `main` já está pronto para importação. Este arquivo não faz o deploy.

O deploy de 9 de outubro de 2026 ficou em `https://minha-rotina-5y177qgq2-samuasouzas-projects.vercel.app` e nos aliases do projeto, todos respondendo 302 para o login da Vercel. Para o teste no celular, o ambiente Production precisa estar público, ou a proteção de acesso da Vercel precisa ser desligada. `NEXT_PUBLIC_SITE_URL` tem de ser exatamente essa origem pública.

## 1. Importar o repositório

1. Entre em [vercel.com/new](https://vercel.com/new).
2. Escolha GitHub e o repositório `samuasouza/minha-rotina`.
3. Framework Preset: **Next.js**.
4. Root Directory: a raiz do repositório.
5. Não altere os comandos. A Vercel usa `npm install` e `npm run build`.
6. Não defina Output Directory. O Next.js publica a pasta própria do build.

Node 20 ou mais recente atende ao Next.js 16. O padrão da Vercel para Next.js serve.

## 2. Variáveis obrigatórias

Em Project Settings → Environment Variables, no ambiente Production:

| Nome | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kphoehunurubkeiestsr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | A publishable key do projeto, em Project Settings → API Keys. Começa com `sb_publishable_`. |
| `NEXT_PUBLIC_SITE_URL` | A origem HTTPS do aplicativo, sem barra no final. Exemplo: `https://minha-rotina.vercel.app`. |

`NEXT_PUBLIC_SITE_URL` entra nos links de confirmação de e-mail e de recuperação de senha. Se ficar vazia, o código usa `http://localhost:3000` e esses links não abrem o site publicado.

Não crie variável com a secret key do Supabase. O aplicativo não a utiliza.

Depois de salvar as variáveis, faça um novo deploy. Variáveis `NEXT_PUBLIC_` entram no build.

## 3. Variáveis opcionais de leitura automática

Só no servidor, as três juntas. Sem o prefixo `NEXT_PUBLIC_`.

| Nome | Função |
| --- | --- |
| `IMPORT_AI_API_KEY` | Chave do provedor compatível com a API de chat. |
| `IMPORT_AI_BASE_URL` | URL HTTPS do provedor, terminando em `/v1` quando for o caso. |
| `IMPORT_AI_MODEL` | Nome do modelo. |

Sem as três, a importação continua disponível: o arquivo fica guardado e a pessoa preenche a prévia. Nada é extraído por conta própria.

## 4. Supabase Auth

No projeto `minha-rotina` (`kphoehunurubkeiestsr`):

1. Authentication → URL Configuration.
2. Site URL: a mesma origem de `NEXT_PUBLIC_SITE_URL`.
3. Redirect URLs: inclua `https://SEU-DOMINIO/auth/confirm`.
4. Mantenha a confirmação de e-mail ligada.
5. Authentication → Settings → Password security: ligue a proteção contra senhas vazadas. O aplicativo não tem esse interruptor.

O caminho `/auth/confirm` troca o código do e-mail por sessão e segue para `/meu-dia`, ou para `/nova-senha` na recuperação.

## 5. Validar o PWA

O service worker só registra em produção, dentro das páginas autenticadas.

1. Abra o site publicado por HTTPS e entre na conta.
2. Em Application → Manifest, confira nome Minha Rotina, `start_url` `/meu-dia`, tema `#7A5753` e fundo `#F8F2EE`.
3. Em Application → Service Workers, confira o registro de `/sw.js`.
4. O cache guarda o manifesto, os ícones e `/offline.html`. Páginas da conta e chamadas ao Supabase continuam na rede.
5. O navegador pode oferecer instalação depois dos critérios dele. O botão Instalar aparece quando o navegador dispara `beforeinstallprompt`.
6. Sem conexão, a navegação mostra que os registros não ficam no aparelho.

## 6. Checklist depois do deploy

- `/entrar` abre sem sessão.
- `/meu-dia` sem sessão volta para `/entrar`.
- Cadastro pede confirmação de e-mail e o link abre o domínio publicado.
- Entrar, sair e recuperar a senha usam o mesmo domínio.
- Importar uma ficha só grava depois de confirmar a prévia.
- Baixar meus dados entrega um JSON da própria conta.
- O pedido de exclusão não apaga o acesso sozinho.
- Em cerca de 390 px, Importar e Configurações não criam rolagem horizontal.
