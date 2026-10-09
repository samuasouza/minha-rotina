# Progresso

Atualizado em 9 de outubro de 2026.

## Feito nesta etapa

- Minhas Metas cria metas diárias, semanais, mensais e personalizadas. O progresso de água, peso, devocional e hábito manual sai dos registros já existentes. A meta manual é a única que aceita lançamento próprio.
- Editar uma meta guarda o estado anterior. O banco recusa lançamento manual numa meta calculada.
- Relatórios de 7, 30, 90 dias e intervalo próprio mostram treino, alimentação, cardio, corpo, estudos, devocional e bem-estar. Dia sem registro não vira zero. Estimativa de cardio continua separada do valor informado.
- Meu Dia ganhou um resumo da semana e lembretes internos, com adiamento. Checklist e agenda seguem como blocos principais. Não há push.

Migration aplicada nesta etapa:

- `20261009215358_phase4_goals_reports_reminders`

## Validado

- `npm run lint`, `npx tsc --noEmit`, 38 testes Vitest e `npm run build` passaram depois das metas.
- No navegador, com conta temporária: a água da semana mostrou 1.500 de 2.000 ml; o hábito manual, 3 de 6; o peso, 78 kg com 40% a partir da referência de 80 kg. Renomear o hábito manteve as duas versões anteriores no histórico.
- O relatório de 7 dias mostrou a média de água só no dia registrado, o peso do dia e a reflexão, e deixou treinos, cardio, estudos e bem-estar sem registros.
- Meu Dia mostrou devocional, hidratação, as três metas e 55% de progresso, sem esconder checklist e agenda. O lembrete “Beber água” apareceu às 00:01 e sumiu depois de adiar 2 horas.
- Em 390 px, Meu Dia e Minhas Metas ficaram com largura 390, sem rolagem horizontal.
- Duas contas temporárias: a segunda leu zero metas, água e pesos. Inserir meta com o identificador da primeira foi recusado (`42501`). `anon` recebeu 401. O lançamento na meta de água foi recusado (`23514`).
- As contas temporárias foram removidas. `auth.users` voltou a zero.

## Fase 3.5, já concluída

- Meu Perfil conduz a anamnese em cinco etapas e continua editável depois. O questionário não diagnostica.
- Sem nenhuma resposta, Meu Dia abre o perfil. Continuar depois devolve o dia e mostra um aviso para retomar.
- Nome fica no perfil. Peso e medidas do dia atualizam o histórico existente. Sono habitual não vira registro diário de bem-estar.
- Alimentação, treinos, cardio, corpo e bem-estar leem esses dados como contexto. Dieta e ficha não mudam sozinhas.

Migration aplicada nesta etapa:

- `20261009212726_phase35_anamnesis_onboarding`

## Validado na fase 3.5

- `npm run lint`, `npx tsc --noEmit`, 29 testes Vitest e `npm run build` passaram depois da anamnese.
- No navegador, com conta temporária: primeiro acesso foi para `/perfil`; voltar conservou altura e peso; objetivos, medidas, rotina e cuidados foram salvos; continuar depois abriu Meu Dia; a retomada voltou à etapa guardada; concluir mostrou o resumo; editar o peso do mesmo dia manteve uma linha.
- O resumo ficou com altura 165, peso 68,4 kg, condicionamento como objetivo principal, mobilidade como objetivo extra, cintura 78, musculação 4 dias, cardio 3 dias, sono habitual 7,5 h e a limitação do joelho.
- Alimentação, treinos, cardio, corpo e bem-estar mostraram esse contexto. A esteira de 30 min a 5 km/h e 0% gravou estimativa ACSM de 121,41 kcal com o peso de 68,4 kg. O bem-estar do dia gravou 8 h e energia 4, sem alterar as 7,5 h habituais.
- Em 390 px, bem-estar e Meu Perfil não tiveram rolagem horizontal.
- Duas contas temporárias: a segunda leu zero linhas de anamnese, objetivos e peso. Inserir anamnese com o identificador da primeira foi recusado (`42501`). `anon` recebeu 401.
- Os formulários de cardio, peso, medida e bem-estar foram preenchidos no navegador.
- As contas temporárias foram removidas. `auth.users` voltou a zero.

## Fase 3, já concluída

- Alimentação, cardio, Meu Corpo e bem-estar gravam no Supabase `kphoehunurubkeiestsr`.
- O plano da nutricionista é arquivado, não reescrito. Aceitar ou recusar uma substituição só muda o status da sugestão.
- Calorias e macros do consumo saem dos alimentos cadastrados, com a fonte informada pela pessoa. O item do dia guarda uma cópia desses valores.
- A estimativa de cardio usa a equação ACSM de caminhada ou corrida e fica identificada como estimativa. O número informado pelo equipamento fica em outro tipo, na mesma linha. Os dois não são somados.
- Fotos de evolução ficam no bucket privado `body-photos`. A tela usa link assinado temporário.
- Meu Dia mostra um resumo curto do que foi registrado, abaixo do progresso. Checklist e agenda continuam como blocos principais.
- A confirmação de e-mail continua obrigatória.

Migrations aplicadas nesta etapa:

- `20261009210856_phase3_health_modules`
- `20261009210926_phase3_activity_body_wellbeing`
- `20261009210927_phase3_private_body_photos`

## Validado na fase 3

- `npm run lint`, `npx tsc --noEmit`, 26 testes Vitest e `npm run build` passaram antes da anamnese.
- Duas contas temporárias confirmadas: a segunda não leu alimentos, refeições, água, metas, dieta, substituições, cardio, peso, medidas, fotos nem bem-estar da primeira. Inserir um alimento com o `user_id` da outra conta foi recusado. `anon` não lê `foods`.
- 40 g de um alimento de 370 kcal por 100 g ficaram em 148 kcal, 5,2 g de proteína, 24 g de carboidrato e 2,8 g de gordura, na API e na tela.
- Aceitar a substituição manteve o item do plano com o mesmo nome e a mesma quantidade.
- Esteira a 4,8 km/h, 10% e 70 kg por 30 min gravou estimativa ACSM de 271,95 kcal, fórmula `acsm_walking_v1`.
- Foto enviada ao bucket privado: link público respondeu 400, a outra conta não leu o arquivo, e a conta dona recebeu link assinado.
- No navegador, com a conta temporária: login, água, refeição, resumo do dia, cardio, peso, foto assinada, bem-estar e logout até `/entrar`. Em 390 px, alimentação e bem-estar não estouraram a largura.
- As contas, os registros e os arquivos de teste foram removidos. `auth.users` voltou a zero.

## Não validado

- O clique no e-mail de confirmação. O limite de envio do Auth continua. A confirmação não foi desligada.
- Cadastro novo pela API de signup, pelo mesmo limite.
- Recuperação de senha até a troca, pelo mesmo motivo.
- Redirect URLs de produção. O arquivo local lista `http://localhost:3000/auth/confirm` e `http://localhost:3001/auth/confirm`. A lista do projeto hospedado precisa incluir a origem pública quando ela existir.
- A proteção contra senhas vazadas. O aviso do projeto continua, e o painel é o caminho para ligá-la: Authentication → Settings → Password security.

## Fase 5

- A importação guarda PDF, imagem, áudio e texto e só grava o módulo depois da prévia confirmada. Sem as três variáveis de IA no servidor, a prévia não é preenchida automaticamente.
- Dieta e ficha reaproveitam as tabelas que já existiam. Nome repetido é recusado. Exercício com o mesmo nome é reaproveitado. Tarefa ou compromisso com o mesmo título e a mesma data não é duplicado.
- O áudio pede o microfone no botão de gravar. Sem o provedor, não há transcrição.
- O aplicativo tem manifesto, ícones e service worker de produção. O cache não guarda páginas autenticadas nem dados do Supabase.
- Configurações exporta um JSON da própria conta e registra o pedido de exclusão. O pedido não apaga a conta.

Migration aplicada nesta etapa:

- `20261009221446_phase5_import_privacy`

## Pendente

- Repetir o fluxo Cadastro → confirmação por e-mail → Login → Dashboard → persistência → Logout quando o envio de e-mail voltar a aceitar.
- No painel Auth, conferir Site URL e Redirect URLs para o ambiente local em uso e, depois, para a origem de produção.
- Categorias na interface.
- Configurar `IMPORT_AI_API_KEY`, `IMPORT_AI_BASE_URL` e `IMPORT_AI_MODEL` no servidor quando a leitura de PDF, imagem e áudio for contratada.
- Remover a identidade de quem pediu exclusão, no painel do Supabase. O aplicativo não tem a chave para isso.
- Notificação push. O lembrete atual só aparece dentro do aplicativo.
- Integração com dispositivos de saúde. A coluna `external_ref` do cardio reserva essa integração e ainda não recebe aparelho nenhum.
- Google Calendar.
