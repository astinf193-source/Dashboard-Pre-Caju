# Integração Supabase — Dashboard Pré-Caju 2026

## Objetivo
Adicionar autenticação individual e registros operacionais no repositório `Dashboard-Pre-Caju`, sem Google Apps Script e sem planilhas, preservando o dashboard existente e seus recursos visuais.

## Arquitetura
- Front-end estático no GitHub Pages.
- Supabase Auth para login por e-mail e senha.
- Supabase PostgreSQL para militares, efetivo diário, viaturas/recursos e ocorrências.
- Row Level Security (RLS) para limitar leitura a usuários autenticados e gravação a perfis `admin` e `operator`.
- O dashboard lê os dados do banco após autenticação.

## Arquivos
- `index.html`: dashboard existente, preservado, com autenticação e leitura dos indicadores no Supabase.
- `registros.html` e `registros.js`: telas para cadastro operacional.
- `supabase-config.js`: configuração pública do projeto (URL e anon/public key).
- `supabase/schema.sql`: tabelas, funções e políticas RLS.

## Configuração necessária (administrador)
1. Criar um projeto Supabase sob a conta institucional autorizada.
2. Abrir SQL Editor e executar integralmente `supabase/schema.sql`.
3. Em Authentication > Providers, manter Email habilitado. Desabilitar cadastro público (sign-ups) para que contas sejam criadas apenas pelo administrador.
4. Em Project Settings > API, copiar Project URL e chave anon/public. Inserir somente esses dois valores em `supabase-config.js`. Nunca publicar `service_role`, senha de banco ou segredo.
5. Em Authentication > Users, criar os usuários individuais. O trigger cria automaticamente um perfil com função `reader`.
6. Promover o responsável administrador no SQL Editor, substituindo o e-mail:
   ```sql
   update public.profiles p
   set role = 'admin', full_name = 'Administrador Operacional'
   from auth.users u
   where p.id = u.id and u.email = 'EMAIL_DO_ADMIN';
   ```
7. Promover operadores conforme autorização formal:
   ```sql
   update public.profiles p
   set role = 'operator'
   from auth.users u
   where p.id = u.id and u.email = 'EMAIL_DO_OPERADOR';
   ```
8. Configurar Authentication > URL Configuration com o domínio GitHub Pages real do repositório e URLs de redirecionamento correspondentes.
9. Publicar a branch/PR após revisão e validar login, logout, políticas RLS e atualização do dashboard.

## Perfis
- `admin`: consulta, cadastro, alteração e exclusão; administra perfis via SQL/Supabase.
- `operator`: consulta, cadastro e alteração operacional; não exclui registros.
- `reader`: consulta, sem acesso às telas de gravação.

## Modelo de dados
- `personnel`: cadastro básico de militares.
- `daily_assignments`: escala/efetivo por data e situação (previsto, apresentado, falta confirmada, pendente).
- `vehicles`: recursos terrestres, drones e aquáticos e situação.
- `occurrences`: registros de ocorrência com tipo, local, setor, gravidade e relato.
- `profiles`: perfil de acesso vinculado ao usuário Auth.
- `audit_log`: estrutura para trilha de auditoria.

## Observações de segurança e implantação
- O arquivo de configuração contém apenas URL e chave anon/public, que não são segredo; a proteção dos dados depende das políticas RLS.
- Não cadastrar CPF, documentos pessoais, dados de saúde ou detalhes pessoais de vítimas nos relatos. Manter relatos estritamente operacionais.
- Os dados iniciais não são migrados automaticamente da planilha antiga; precisam ser importados após conferência e autorização.
- Não foi criado nem configurado um projeto Supabase por esta alteração. É necessário que o administrador crie o projeto e forneça URL/chave pública para concluir a conexão.
- O dashboard continua sendo uma página estática; a conexão com dados reais só funciona depois da configuração Supabase, criação das contas e publicação.
