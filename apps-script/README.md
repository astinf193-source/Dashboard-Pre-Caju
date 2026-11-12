# Sistema de Registros Operacionais — Pré-Caju / CBMSE

Este diretório contém a versão organizada dos scripts fornecidos para o registro de:
- assunção de serviço (check-in);
- ocorrências;
- emprego de viaturas e drones;
- faltas e alterações de militares;
- avisos;
- consulta dos registros individuais e supervisão por setor.

O sistema é executado no **Google Apps Script** e utiliza a planilha Google vinculada ao projeto como base de dados. A dashboard estática do GitHub Pages consome somente um resumo operacional e campos não identificáveis por meio do endpoint JSONP `?mode=dashboard`.

## Arquivos

- `Code.gs`: funções de autenticação, gravação, consulta e endpoint de integração da dashboard.
- `Index.html`: interface de login e navegação.
- `Menu.html`, `Ocorrencia.html`, `Viaturas.html`, `AlteracaoMilitar.html`, `MeusRegistros.html`: telas principais.
- `Avisos.html`, `PostarAviso.html`, `ConsultaOcorrencias.html`, `MilitaresZona.html`, `OcorrenciaLocal.html`: telas auxiliares.

## Estrutura esperada da planilha

O projeto Apps Script deve estar vinculado à planilha operacional que contém as abas abaixo. Os nomes e a ordem das colunas precisam ser preservados:

| Aba | Colunas esperadas |
|---|---|
| `Users` | A ordem; B nome; C sobrenome; D campo legado; E matrícula; F credencial atual (script original usa CPF); G setor/zona; H função; I supervisor; J local |
| `Checkins` | A data/hora; B militar; C matrícula |
| `Ocorrencias` | A data/hora; B registrador; C matrícula do registrador; D setor; E ponto de referência; F tipo; G gravidade; H quantidade atendida; I relato |
| `Alteracoes Militares` | A data/hora; B registrador; C matrícula do registrador; D tipo; E militar afetado; F relato |
| `Viaturas` | A data/hora; B registrador; C matrícula do registrador; D tipo (Terrestre/Aquática/Aérea); E prefixo/identificação; F observação |
| `Avisos` | A data/hora; B registrador; C matrícula; D setor; E aviso |
| `Locais` | A setor/zona; B local |

A contagem de efetivo previsto é calculada a partir dos registros com matrícula na aba `Users`. Portanto, essa aba deve conter apenas o efetivo considerado no planejamento da operação ou ser ajustada antes da publicação.

## Publicação no Google Apps Script

1. Abra a planilha operacional correta e acesse **Extensões → Apps Script**.
2. No projeto vinculado, crie/substitua o arquivo `Code.gs` pelo conteúdo deste diretório.
3. Crie os arquivos HTML com os nomes indicados (sem a extensão `.html` no editor Apps Script) e copie o conteúdo dos arquivos correspondentes.
4. Confirme os nomes das abas e a ordem das colunas descritas acima.
5. Em **Configurações do projeto**, defina o fuso horário como `America/Maceio`.
6. Execute uma função de teste no editor para conceder as permissões necessárias à planilha.
7. Acesse **Implantar → Nova implantação → Aplicativo da web**.
8. Execute o aplicativo como a conta institucional responsável pela planilha. Defina o acesso conforme a política de segurança do CBMSE.
9. Copie a URL terminada em `/exec`.

## Conectar à Dashboard-Pre-Caju

1. Publique a dashboard do repositório `Dashboard-Pre-Caju` no GitHub Pages.
2. Abra a dashboard e localize **Integração do sistema de registros**.
3. Cole a URL do Web App do Apps Script e selecione **Conectar sistema**.
4. A dashboard consulta o endpoint `?mode=dashboard` e atualiza os indicadores de efetivo, check-ins, faltas, viaturas, drones, recursos aquáticos, alterações e ocorrências.
5. O botão **Abrir sistema de registros** leva à interface de lançamento hospedada no Apps Script.

A URL é armazenada no navegador que fez a configuração. Para outros computadores, informe a mesma URL em cada navegador.

## Segurança e limites

- O endpoint da dashboard retorna apenas totais operacionais e campos de ocorrência necessários à visualização (data, tipo, setor, ponto, gravidade e quantidade). Não envia matrícula, CPF, nome do militar ou texto livre do relato.
- As operações de gravação e consulta individual exigem um token de sessão temporário validado no servidor.
- A autenticação original usa o valor da coluna F da aba `Users` como credencial. O script legado trata CPF como texto simples. **Antes de disponibilizar amplamente, substitua esse mecanismo por credencial individual protegida (hash/salt) e valide a política de acesso com a área de segurança da informação.**
- A contagem de faltas é calculada como efetivo previsto menos check-ins do dia. Ela é um indicador de conferência e não substitui a validação formal da escala.
- Registros de viaturas são contados por data de lançamento; o formulário original não contém situação operacional nem coordenadas geográficas. Esses campos podem ser acrescentados em etapa posterior.
- O endpoint de leitura é destinado à dashboard operacional. Não inclua dados pessoais, relatos identificáveis ou informações sensíveis nas colunas que serão publicadas.

## Testes antes do uso oficial

- Validar login de usuário comum e supervisor.
- Confirmar que usuário comum não consegue consultar registros de outros militares ou executar funções de supervisão.
- Registrar check-in duas vezes no mesmo dia e confirmar que não duplica.
- Registrar ocorrência, alteração e viatura; conferir as respectivas abas.
- Conferir se os totais da dashboard correspondem à planilha para o mesmo dia.
- Testar a URL de integração em outro navegador e em celular.
