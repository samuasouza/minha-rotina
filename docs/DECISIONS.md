# Decisões

## Projeto Supabase separado

O projeto autorizado é `minha-rotina`, referência `kphoehunurubkeiestsr`, na organização Projetos pessoais. Smart Guindar e Larsana não recebem migration deste aplicativo. A URL e a chave publicável ficam em `.env.local`.

## Sem persistência simulada

Enquanto o Supabase não está configurado, a interface mostra o estado real e desativa a gravação. Não há banco local, dados de exemplo nem sucesso fingido.

## Sessão

O proxy usa `@supabase/ssr` com `getAll` e `setAll`, e confirma a identidade com `getClaims()`. `getSession()` não autoriza página nem dado.

## Cadastro público

Qualquer pessoa pode criar a conta no aplicativo. Os dados continuam individuais: a RLS não foi afrouxada e não há leitura entre contas. A confirmação de e-mail permanece ligada. O limite de envio do Auth é a proteção disponível contra abuso; captcha não foi configurado porque não há provedor.

O nome digitado no cadastro entra em `user_metadata` apenas para o trigger criar o perfil. Autorização não lê esse metadado.

## Progresso do dia

O percentual usa somente atividades obrigatórias pendentes ou concluídas. Opcionais, ignoradas com motivo e reagendadas ficam de fora. Se não houver obrigatória, o dia não mostra 100% artificial.

## Conclusão pelo checklist

`completion_policy = checklist` pode ser concluída na lista. `module_record` só muda para concluída quando existe `linked_record_id`. A Server Action e um trigger recusam o atalho.

## Recorrência

Apagar uma ocorrência recorrente a recriaria na próxima abertura do dia. Por isso a ocorrência pode ser ignorada ou a repetição pode ser encerrada. A exclusão direta vale para a atividade avulsa. O histórico da ocorrência reagendada permanece na linha original.

## Compartilhamento

`resource_shares` existe para o desenho futuro. Nenhuma política de tarefa, agenda ou perfil concede leitura a outra conta.

## Paleta

`#C7A4A0` continua como cor de apoio. Botões e texto usam `#7A5753` e `#594B48` para manter contraste. O tema escuro não está na experiência atual.

## Dependências adiadas

Recharts, service worker e bibliotecas de calendário externo não foram instalados. Ainda não há gráfico nem integração que precise deles.
