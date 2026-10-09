# Testes

## Automatizados

`npm test` executa Vitest nas regras puras:

- data de calendário, semana começando na segunda e formatação em português;
- saudação por hora;
- percentual do dia, com opcionais, ignoradas e reagendadas fora da conta;
- bloqueio de conclusão pelo checklist quando o módulo exige registro;
- recorrência por dia da semana e período;
- validação de atividade, motivo, horário de compromisso, nome do cadastro e confirmação de senha;
- escala nutricional e diferença entre alimento original e sugerido;
- estimativa ACSM de caminhada, ausência de estimativa sem peso e ausência de fórmula para bicicleta;
- conversão de libras e polegadas para quilos e centímetros, e escolha do objetivo principal;
- janela semanal, mensal e personalizada, recorte de 7 dias, progresso manual, água, sono sem registro, peso com e sem referência, lembrete e adiamento;
- volume de treino, médias de alimentação, estimativa de cardio separada do valor informado e resumo semanal vazio.

Resultado em 9 de outubro de 2026, depois da fase 4: 9 arquivos, 38 testes, todos passando.

`npx tsc --noEmit`, `npm run lint` e `npm run build` passaram na mesma rodada.

## Autenticação e isolamento

No projeto `kphoehunurubkeiestsr`, em 9 de outubro de 2026:

- e-mail inválido é recusado pelo Auth;
- senha incorreta não cria sessão;
- duas contas de teste receberam perfil e preferências pelo trigger;
- a segunda conta não leu tarefas, devocionais, treinos, estudos, metas nem preferências da primeira;
- gravar uma tarefa com o identificador da outra conta foi recusado;
- devocional, sessão de estudo, meta semanal e sessão de treino gravaram depois da correção do trigger.

## Fase 3

Na mesma data, com duas contas temporárias confirmadas direto no banco, sem desligar a confirmação de e-mail:

- a segunda conta não leu alimentos, refeições, água, metas, dieta, substituições, cardio, peso, medidas, fotos nem bem-estar da primeira;
- inserir um alimento com o identificador da outra conta foi recusado;
- `anon` recebeu 401 ao ler `foods`;
- 40 g de um alimento cadastrado a 370 kcal por 100 g geraram 148 kcal, 5,2 g de proteína, 24 g de carboidrato e 2,8 g de gordura;
- aceitar a substituição manteve o rótulo e a quantidade do item prescrito;
- a sessão de esteira gravou `acsm_estimate` e a fórmula `acsm_walking_v1`;
- o upload no bucket `body-photos` ficou privado: leitura pública 400, outra conta 400, dona com link assinado 200.

As contas, as linhas e os dois arquivos de teste foram apagados. `auth.users` voltou a zero. O limite de e-mail do Auth continua impedindo um cadastro novo pela API.

## Fase 3.5

Na mesma data, com duas contas temporárias confirmadas direto no banco:

- a primeira conta percorreu as cinco etapas no navegador, adiou, retomou e concluiu;
- voltar da etapa de objetivos conservou altura 165 e peso 68;
- editar o peso para 68,4 no mesmo dia manteve uma linha em `body_weights` e duas medidas;
- a segunda conta leu zero anamneses, objetivos e pesos; a inserção cruzada em `anamnesis` recebeu `42501`; `anon` recebeu 401;
- a esteira de 30 min, 5 km/h e 0% gravou `acsm_estimate`, fórmula `acsm_walking_v1` e 121,41 kcal;
- o bem-estar do dia gravou 8 h de sono e energia 4, enquanto `typical_sleep_hours` permaneceu 7,5;
- em 390 px, bem-estar e Meu Perfil ficaram com largura 390 e sem rolagem horizontal.

## Fase 4

Na mesma data, com duas contas temporárias confirmadas direto no banco, sem desligar a confirmação de e-mail:

- a meta de água usou o registro de 1.500 ml e mostrou 75%; o peso de 78 kg usou a referência anterior de 80 kg e mostrou 40%; sem essa referência, o percentual fica vazio;
- lançar quantidade numa meta calculada foi recusado com `23514`;
- editar o alvo de 5 para 6 gravou a revisão com o valor anterior;
- a segunda conta leu zero metas, água e pesos; a inserção cruzada recebeu `42501`; `anon` recebeu 401;
- no navegador, a renomeação para “Hábito da semana” preservou as duas versões anteriores;
- o relatório de 7 dias não preencheu treinos, cardio, estudos nem bem-estar, e a média de água considerou só o dia com registro;
- o lembrete criado na tela apareceu no Meu Dia e deixou de aparecer depois de adiar 2 horas;
- em 390 px, Meu Dia e Minhas Metas ficaram com largura 390 e sem rolagem horizontal.

As contas e os registros de teste foram apagados. `auth.users` voltou a zero.

## Interface

Com o aplicativo em `http://localhost:3001`:

- `/cadastro` mostra nome, e-mail, senha, confirmação, criar conta, entrar e recuperar senha;
- formulário vazio e senhas diferentes exibem as mensagens de validação;
- rotas autenticadas sem sessão continuam indo para `/entrar`;
- a conta temporária entrou, registrou 250 ml de água e uma refeição de 40 g pela tela, viu 148 kcal no resumo e no Meu Dia, abriu cardio, corpo, bem-estar e saiu de volta para `/entrar`;
- as fotos apareceram por link assinado do host do projeto, sem caminho público;
- em 390 px, alimentação, bem-estar e Meu Perfil não tiveram rolagem horizontal;
- cardio, peso, medida e bem-estar foram criados pelos formulários na fase 3.5.

## Fase 5

Na mesma data:

- `npm run lint`, `npx tsc --noEmit`, 48 testes Vitest e `npm run build` passaram com a importação, o manifesto e a exportação.
- Duas contas temporárias: a segunda leu zero planos e zero prévias; inserir prévia com o identificador da primeira recebeu `42501`; o PDF no bucket `imports` não foi baixado pela outra conta e o link público respondeu 400.
- A prévia vazia não criou plano. Confirmar “Plano da fase 5” gravou Almoço com Arroz, 100 g. O texto colado não virou ficha sozinho.
- O pedido de exclusão ficou registrado e o plano continuou na conta. Atualizar o pedido para concluído não alterou nenhuma linha.
- Sem sessão, o manifesto, `/sw.js`, `/offline.html` e os ícones responderam 200. O service worker lista só manifesto, ícones e a página sem conexão.
- O conselho de segurança do projeto não trouxe avisos novos. A proteção contra senhas vazadas não foi ligada por aqui.

As contas, o PDF e os registros de teste foram apagados. `auth.users` voltou a zero.

## Publicação

Na revisão para o GitHub, `npm run lint`, `npx tsc --noEmit`, 48 testes e `npm run build` passaram de novo. Um `next start` local serviu o manifesto, `/sw.js`, `/offline.html` e os ícones com status 200. `/meu-dia` sem sessão respondeu 307 para `/entrar`.

A confirmação de uma ficha pela tela, o download do JSON, a largura de 390 px de Importar e Configurações e o registro do service worker dentro do navegador não foram repetidos nesta revisão. O worker só é registrado nas páginas autenticadas do build de produção, e não foi criada outra conta temporária para esse passo.

## Ainda não coberto

- abrir o link de confirmação de e-mail e entrar no dashboard por esse caminho;
- recuperação de senha até a troca;
- ligar a proteção contra senhas vazadas no painel, em Authentication → Settings → Password security;
- os formulários de Meu Dia, Devocional, Treinos e Estudos no navegador;
- a instalação do PWA e o aviso de atualização, porque o service worker só registra em produção;
- a permissão de microfone e uma gravação concluída;
- a leitura automática, porque as variáveis do provedor não estão configuradas;
- a remoção da identidade depois do pedido de exclusão;
- a largura de 390 px das telas novas de importação e privacidade.
