# Minha Rotina

Aplicativo pessoal de organização, cuidado e hábitos para duas contas individuais.

## Começar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

Sem as variáveis do Supabase, a interface abre e explica o que falta. Ela não grava dados localmente e não usa registros fictícios.

## Projeto Supabase

O projeto deste aplicativo já está em uso. As migrations em `supabase/migrations` estão aplicadas nele. A secret key não entra no frontend nem neste arquivo.

Para publicar, siga `docs/VERCEL_DEPLOY.md`.

## Scripts

- `npm run dev` — desenvolvimento
- `npm run test` — regras de negócio
- `npm run lint` — verificação estática
- `npm run build` — build de produção

A documentação do produto está em `docs/`.
