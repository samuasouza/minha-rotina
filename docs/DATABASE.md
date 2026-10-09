# Banco de dados

O projeto autorizado é `minha-rotina` (`kphoehunurubkeiestsr`), na organização Projetos pessoais. Em 9 de outubro de 2026 as migrations locais foram aplicadas nesse banco vazio:

- `supabase/migrations/20261009193516_phase1_foundation.sql`
- `supabase/migrations/20261009202503_phase2_priority_modules.sql`
- `supabase/migrations/20261009204742_revoke_public_rls_helper.sql`
- `supabase/migrations/20261009205915_fix_module_ownership_trigger.sql`
- `supabase/migrations/20261009210856_phase3_health_modules.sql`
- `supabase/migrations/20261009210926_phase3_activity_body_wellbeing.sql`
- `supabase/migrations/20261009210927_phase3_private_body_photos.sql`
- `supabase/migrations/20261009212726_phase35_anamnesis_onboarding.sql`
- `supabase/migrations/20261009215358_phase4_goals_reports_reminders.sql`
- `supabase/migrations/20261009221446_phase5_import_privacy.sql`

O histórico remoto registra essas dez versões. Há 52 tabelas públicas, todas com RLS, e o papel `anon` não tem privilégio sobre elas. A função de plataforma `public.rls_auto_enable()` continua no banco, mas `public`, `anon` e `authenticated` não podem executá-la.

`private.enforce_module_ownership()` só lê colunas da tabela que disparou o trigger. A versão anterior avaliava `plan_item_id` em qualquer tabela e impedia gravar devocional, sessão de estudo e meta semanal.

## Tabelas

| Tabela | Função |
| --- | --- |
| `profiles` | Nome, fuso e caminho futuro de avatar. Uma linha por usuário. |
| `user_preferences` | Idioma, início da semana e sistema de medida. A anamnese grava quilos ou libras; o histórico de peso fica em quilos. |
| `categories` | Categorias por usuário. Ainda sem tela. |
| `routines` | Definição recorrente, com dias da semana e período. |
| `tasks` | Ocorrência de um dia, avulsa ou gerada por uma rotina. |
| `appointments` | Compromisso, com horário opcional. |
| `resource_shares` | Compartilhamento futuro. Não libera leitura das outras tabelas. |

## Regras no banco

- RLS ativo em todas essas tabelas. `anon` não recebe privilégio.
- Políticas usam `(select auth.uid())` e índices começam por `user_id`.
- Uma rotina gera no máximo uma tarefa por dia, por índice único parcial.
- Tarefa concluída exige `completed_at`. Tarefa ignorada exige motivo. Tarefa reagendada exige outra data.
- Tarefa com `completion_policy = module_record` não pode ser concluída sem `linked_record_id`.
- Categoria e rotina referenciadas precisam pertencer ao mesmo usuário.
- `private.handle_new_user` cria perfil e preferências. A função é `security definer` e fica fora do schema exposto.
- `ensure_routine_tasks`, `reschedule_task` e `reschedule_appointment` rodam como o usuário autenticado, então a RLS continua valendo.

## Dias da semana

`0` é domingo e `6` é sábado, no calendário da data, sem deslocar pelo fuso na hora de calcular o dia.

## Fase 2, aplicada

| Tabela | Função |
| --- | --- |
| `devotional_entries` | Devocional do dia, com passagem, link externo, reflexão e conclusão. |
| `reading_plans` / `reading_plan_items` | Plano de leitura e os dias desse plano. |
| `reading_logs` | Leitura feita, de um plano ou livre. |
| `prayer_requests` | Pedido de oração e, quando houver, a resposta. |
| `gratitude_entries` | Registro de gratidão. |
| `devotional_week_goals` | Meta semanal do devocional. |
| `exercises` | Exercício cadastrado pela pessoa. |
| `workout_sheets` / `workout_days` / `workout_exercises` | Ficha, divisão do dia e prescrição. |
| `workout_sessions` / `workout_sets` | Sessão feita, parcial ou completa, e cada série com a carga. |
| `load_suggestions` | Sugestão de carga. Aceitar não muda a ficha. |
| `study_subjects` / `study_topics` | Matéria ou curso e o checklist de conteúdos. |
| `study_week_goals` | Meta semanal de estudo. |
| `study_sessions` / `study_notes` | Sessão com cronômetro e anotações. |

A leitura bíblica guarda só rótulo e URL `https`. Na fase 2, metas gerais, notificações e arquivos importados ficaram de fora. As metas pessoais entraram na fase 4.

## Fase 3, aplicada

| Tabela | Função |
| --- | --- |
| `foods` | Alimento com quantidade de referência, unidade, calorias, macros e a fonte informada pela pessoa. |
| `meal_templates` / `meal_template_items` | Refeição favorita. |
| `meal_logs` / `meal_log_items` | Consumo do dia. O item guarda a cópia já calculada, para o histórico não mudar se o alimento for editado depois. |
| `water_logs` | Água em mililitros. |
| `nutrition_targets` | Meta a partir de uma data. Pelo menos um valor é obrigatório. |
| `diet_plans` / `diet_meals` / `diet_items` | Plano prescrito. Arquivar preenche `archived_at` e conserva o texto. |
| `food_substitutions` | Sugestão de troca. Aceitar ou recusar só muda `status` e `decided_at`. |
| `cardio_sessions` | Atividade, duração, distância, velocidade, inclinação, intensidade, frequência cardíaca opcional e um único gasto energético. |
| `cardio_week_goals` | Meta da semana, com a semana começando na segunda. |
| `body_weights` | Peso do dia, um registro por data. |
| `measure_definitions` / `body_measurements` | Medida personalizada e o valor na data. |
| `body_photos` | Metadado da foto. O caminho precisa ser `user_id/id`. |
| `wellbeing_entries` | Sono, energia, humor, ciclo menstrual opcional e observação. Pelo menos um campo. |

`private.enforce_health_ownership()` confere, com condições separadas, se refeição, item da dieta, medida ou alimento sugerido pertencem à mesma conta.

O gasto do cardio cabe em `energy_kcal` com `energy_kind`: `none`, `acsm_estimate` ou `informed`. A estimativa ACSM de caminhada é `VO2 = 0,1 × velocidade(m/min) + 1,8 × velocidade × inclinação + 3,5`; a de corrida troca os coeficientes para `0,2` e `0,9`. As calorias são `VO2 × peso(kg) / 1000 × 5 × minutos`. A inclinação entra como percentual dividido por 100. Sem peso recente, a estimativa não é inventada. Bicicleta e “outra” não recebem essa fórmula. `external_ref` reserva um identificador futuro de aparelho e não é preenchido por integração nenhuma.

O bucket `body-photos` é privado, aceita jpeg, png e webp até 5 MB, e as políticas de `storage.objects` exigem que a primeira pasta do caminho seja `auth.uid()`.

## Fase 3.5, aplicada

| Tabela | Função |
| --- | --- |
| `anamnesis` | Uma linha por pessoa: nascimento, altura, sexo biológico opcional, rotina, limitações, restrições, alergias, preferências, passo atual, conclusão e adiamento. |
| `anamnesis_goals` | Objetivos marcados, inclusive um personalizado. Só um pode ser o principal. |

O nome continua em `profiles.display_name`. O peso do dia faz upsert em `body_weights`. Cintura, abdômen, quadril, tórax, braço, coxa e panturrilha reutilizam `measure_definitions` e `body_measurements`. Uma medida extra usa o nome informado. O sono habitual fica em `typical_sleep_hours` e não cria linha em `wellbeing_entries`.

Sexo biológico aceita `female` ou `male` e pode ficar vazio. A estimativa ACSM não usa esse campo. Lesão, restrição, alergia, preferência e acompanhamento com nutricionista são opcionais.

## Fase 4, aplicada

| Tabela | Função |
| --- | --- |
| `personal_goals` | Meta diária, semanal, mensal ou personalizada. A medição pode ser manual ou calculada por um módulo. |
| `personal_goal_revisions` | Cópia do estado anterior a cada edição. A pessoa só lê o próprio histórico. |
| `goal_checkins` | Lançamento manual, um por meta e dia. Um trigger recusa lançamento quando a meta é calculada. |
| `reminders` | Lembrete interno, com horário, dias e adiamento. Não envia push, e-mail nem outro serviço. |

As metas semanais de devocional, estudo e cardio, e as metas nutricionais, continuam nas tabelas que já existiam. O progresso da meta pessoal é calculado na aplicação a partir desses registros. Relatórios também são calculados na aplicação; não há view pública, porque uma view comum ignoraria a RLS.

Editar uma meta dispara `private.record_goal_revision()` antes da troca. `private.enforce_manual_checkin()` e `private.enforce_reminder_goal()` conferem a posse e o tipo da meta. As três funções estão no schema `private` e não podem ser executadas por `public`, `anon` nem `authenticated`.

## Fase 5, aplicada

| Tabela | Função |
| --- | --- |
| `import_drafts` | Material e prévia. Não é dieta, ficha, estudo nem agenda até a confirmação. |
| `account_deletion_requests` | Pedido explícito. Não apaga `auth.users` e a pessoa não pode marcá-lo como concluído. |

O bucket `imports` é privado, aceita até 10 MB e só os tipos usados na importação. A primeira pasta do arquivo é o identificador da conta. PDF fica em 8 MB, imagem em 5 MB e áudio em 10 MB na aplicação. Uma prévia aceita no máximo duas leituras automáticas.

Enquanto o pedido de exclusão estiver aberto, os registros permanecem. A remoção da identidade, quando feita no painel, apaga o perfil em cascata. Cópias de backup da plataforma seguem a retenção do Supabase e não são apagadas por este aplicativo.

## Avisos do projeto

O aviso `auth_leaked_password_protection` continua ativo. A proteção contra senhas vazadas não tem interruptor nas ferramentas disponíveis deste projeto; ela precisa ser ligada no painel, em Authentication → Settings → Password security, em [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). A confirmação de e-mail permanece obrigatória. Há também avisos informativos de chave estrangeira sem índice próprio e de índice ainda sem uso. As consultas do dia usam os índices por `user_id` e data. Esses avisos não foram tratados com uma migration nova.
