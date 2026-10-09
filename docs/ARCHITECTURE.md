# Arquitetura

## Aplicação

Next.js 16 com App Router, TypeScript e Tailwind CSS 4. A interface usa shadcn/ui sobre Base UI. Formulários usam React Hook Form e Zod. Ícones são do Lucide.

```text
src/app            rotas, layouts e o proxy de sessão
src/components     interface
src/lib/domain     regras puras de data, progresso, recorrência, nutrição e gasto energético
src/lib/validation esquemas Zod
src/lib/data       leitura no Supabase
src/lib/actions    escrita no Supabase
src/lib/supabase   clientes de browser, servidor e ambiente
supabase/migrations SQL versionado
```

O proxy em `src/proxy.ts` renova a sessão e protege as rotas quando o Supabase está configurado. A identidade no servidor vem de `auth.getClaims()`, não de `getSession()`.

## Autenticação e autorização

Cada pessoa cria a própria conta em `/cadastro`, com nome, e-mail e senha. A confirmação de e-mail está ligada no projeto: sem o link, o login não abre sessão. O perfil e as preferências nascem pelo trigger `private.handle_new_user`. O nome inicial entra em `user_metadata` só para esse trigger. Autorização não lê esse metadado. A recuperação de senha usa `/recuperar` e a troca, com sessão válida, usa `/nova-senha`. Não há compartilhamento entre contas.

Toda tabela exposta tem RLS. As políticas comparam `user_id` ou `id` com `auth.uid()`. A aplicação não usa a service role para contornar permissão.

`resource_shares` reserva o compartilhamento futuro. As tabelas de conteúdo continuam restritas ao dono até essa leitura ser implementada e testada.

## Persistência

Não há armazenamento local substituto. `.env.local` aponta para `https://kphoehunurubkeiestsr.supabase.co` e guarda somente a chave publicável. A secret key não entra no aplicativo. Sem essas variáveis, as telas explicam a dependência e os botões de gravação ficam desativados.

As mutations passam por Server Actions, validam com Zod e gravam pelo cliente do servidor, sujeito à RLS. Conclusão de tarefa que exige registro de módulo é recusada na aplicação e de novo por trigger no banco.

## Importação e aplicativo instalável

A prévia fica em `import_drafts` e no bucket privado `imports`. A gravação em dieta, ficha, estudo, agenda, refeição ou água acontece na confirmação. O provedor de leitura, quando as três variáveis de servidor existem, é chamado só no servidor e a resposta passa pelo Zod. Confiança abaixo de 0,6 pede revisão. Cada prévia aceita no máximo duas leituras. Sem as variáveis, o arquivo permanece guardado e a prévia não é preenchida por conta própria.

O manifesto e os ícones identificam o Minha Rotina. O service worker registra em produção, avisa quando há atualização e não guarda HTML autenticado nem respostas do Supabase. A página sem conexão diz que os registros não ficam no aparelho.

A exportação usa a sessão da pessoa e a RLS. O pedido de exclusão não apaga `auth.users`: não há secret key no aplicativo, e a pessoa não pode marcar o pedido como concluído.

## O que ainda não entra

Recharts, Google Calendar, relógios e push. Os gráficos de peso e de período são SVG pequenos. Notificação push dependeria de um serviço externo, como Web Push com VAPID. O lembrete atual aparece no Meu Dia. A leitura de PDF, imagem e áudio depende do provedor configurado no servidor; sem ele, não há transcrição nem extração.

Alimentação, cardio, corpo e bem-estar gravam no banco. Os valores nutricionais vêm do cadastro da pessoa, com a fonte escrita no alimento. A estimativa de cardio é calculada pela equação ACSM documentada em `src/lib/domain/energy.ts` e apresentada como estimativa. O número do equipamento, quando a pessoa o informa, ocupa o mesmo campo de calorias com outro tipo e não é somado à estimativa. Fotos usam o bucket privado `body-photos` e link assinado de dez minutos. Não há URL pública.
