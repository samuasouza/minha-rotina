# Roadmap

## Fase 1 — Fundação

Implementada no código e no banco. Falta criar as duas contas e percorrer o fluxo logado.

- Projeto, design system, navegação e documentação.
- Autenticação, perfis e RLS.
- Meu Dia: checklist, recorrência, progresso e agenda do dia.
- Agenda semanal interna.
- Configurações de perfil.

As migrations da fundação, dos módulos prioritários, da revogação do helper de RLS e da correção do trigger de posse já estão aplicadas em `kphoehunurubkeiestsr`. O cadastro público está aberto na interface e no Auth. A confirmação de e-mail continua obrigatória.

## Fase 2 — Módulos prioritários

Implementada no código e no banco. A gravação real no navegador depende das contas.

- Devocional, com links externos de leitura.
- Treinos, histórico e progressão confirmada pela pessoa.
- Estudos, incluindo registro manual e cronômetro.
- Ligação desses registros ao checklist, sem concluir um módulo só pela tarefa genérica.

## Fase 3 — Saúde e nutrição

Implementada no código e no banco. A gravação de refeição e água foi conferida no navegador com uma conta temporária, depois removida.

- Alimentação, hidratação, metas e comparação com o consumo do dia.
- Plano da nutricionista, com histórico por arquivamento.
- Sugestão de substituição alimentar. Aceitar ou recusar não altera o item prescrito.
- Cardio, com estimativa ACSM identificada e número informado pelo equipamento guardado à parte.
- Peso, medidas personalizadas, gráfico simples e fotos no bucket privado.
- Bem-estar opcional.
- Resumo curto no Meu Dia, sem ocupar o lugar do checklist e da agenda.

## Fase 3.5 — Anamnese, onboarding e perfil

Implementada no código e no banco. O primeiro acesso sem anamnese sai de Meu Dia para Meu Perfil. Continuar depois devolve o dia e deixa um aviso para retomar.

- Dados pessoais, objetivos com um principal, medidas, rotina e cuidados opcionais.
- Nome permanece em `profiles`. Peso e medidas do dia entram no histórico já existente, sem segunda linha na mesma data.
- Sono habitual fica na anamnese. O registro diário de bem-estar continua separado.
- Alimentação, treinos, cardio, corpo e bem-estar mostram o que foi informado. Dieta prescrita e ficha só mudam com confirmação.
- Sexo biológico é opcional e não entra na estimativa ACSM.

## Fase 4 — Evolução

Implementada em 9 de outubro de 2026.

- Minhas Metas, em `/metas`, com períodos diário, semanal, mensal e personalizado.
- Progresso calculado pelos registros de devocional, treino, estudo, alimentação, água, cardio, peso e sono. Hábito manual fica identificado como lançamento manual.
- Relatórios de 7, 30 e 90 dias e intervalo de até 366 dias, com gráfico SVG quando há pelo menos dois pontos.
- Resumo da semana no Meu Dia, só com linhas que têm registro. Checklist e agenda continuam principais.
- Lembretes internos, com horário, dias, ativação e adiamento. Push não foi simulado.
- Sugestões de carga continuam exigindo confirmação, como na fase 2.

## Fase 5 — Importação, PWA e privacidade

Implementada em 9 de outubro de 2026.

- Importação em `/importar` para dieta, ficha de treino, estudo, tarefas, compromissos, refeição e água. PDF, imagem, áudio e texto ficam numa prévia. O módulo só recebe o que a pessoa confirma.
- Sem `IMPORT_AI_API_KEY`, `IMPORT_AI_BASE_URL` e `IMPORT_AI_MODEL` no servidor, a leitura automática não roda e a prévia começa em branco. Não há extração simulada.
- Gravação de áudio pede o microfone só no botão. Sem o provedor, o áudio fica guardado e não vira texto sozinho.
- PWA instalável: manifesto, ícones, atalho e service worker só em produção. O cache guarda o manifesto, os ícones e a página de sem conexão. Registros e páginas autenticadas continuam na rede.
- Exportação JSON da própria conta em Configurações. Fotos e arquivos entram só com o caminho privado.
- Pedido de exclusão confirma o e-mail e grava a solicitação. A conta e os registros continuam até a identidade ser removida no painel, porque o aplicativo não guarda a chave que apaga o acesso.

Google Calendar, dispositivos de saúde e notificação push continuam fora. A proteção contra senhas vazadas continua no painel, em Authentication → Settings → Password security.
