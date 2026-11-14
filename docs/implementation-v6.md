# Traffic Flow V6 — implementação e validação

Atualizado em 14/11/2026. Base oficial preservada: Supabase `ipgcstfddlflzrrotbtj`. Branch `feat/traffic-flow-v6`, origem `9af0c42`. O escopo de referência é `product-scope-v6.md`; a implementação real e suas limitações estão descritas abaixo.

## Implementado

- Novo shell grafite/menta, menu com ícones, tema claro/escuro, privacidade de valores e navegação móvel.
- Dashboard por oferta; seleção explícita de campanhas, múltiplas contas Meta, filtros por conta/status/nome/período e hierarquia campanha/conjunto/anúncio. Colunas selecionáveis, ordenáveis e persistidas.
- Portfólio de ofertas, criação de dashboards, busca/ordenação, comparação entre ofertas e entre períodos de igual duração.
- Investimento, Faturamento, Lucro, ROI, ROAS e Margem, composição dos indicadores, evolução diária, funil contínuo, mapa Brasil/Mundo e ranking por vendas/faturamento BRL com cobertura.
- Vendas rastreadas, origem a confirmar e não rastreadas, detalhes dos itens e histórico do pagamento. Não rastreada não é sinônimo de orgânica.
- Financeiro operacional separado do caixa, lançamentos, compromissos, baixa idempotente e estorno.
- Relatórios por dia, checkout e origem, exportação CSV; UTMs e gerador de links.
- Regras avaliadas no servidor e notificações deduplicadas. Preferências de venda, valores/visibilidade, toast global nas telas da oferta e som de venda, horários e estilo dos resumos.
- Integrações agrupadas em Anúncios, Webhooks, Pixel, UTMs, API e Testes.
- Meta OAuth e sincronização de todas as contas ativas. Hotmart com Hottok e credenciais OAuth opcionais no Vault. Cakto V1/V2, secret/HMAC, produtos, localização, taxas e ciclo de pedidos. Applyfy preservada.
- Pixel/CAPI: configuração no Vault, fila de Purchase com event_id estável, claim atômico, limite de retentativas e histórico. Teste de acesso à API separado da confirmação de uma conversão.
- API de relatórios com credenciais limitadas à dashboard, hash no banco e revogação. Hashes/segredos não são enviados ao cliente.

## Banco

Migration `20261114160922_traffic_flow_operating_workspace.sql` criada pela CLI Supabase2.81.3 e aplicada no SQL Editor do projeto original. Estruturas novas: project_settings, user_project_preferences, finance_commitments, cash_entries, automation_rules, app_notifications, project_api_keys, conversion_deliveries e workspace_audit. RLS em todas, sem SELECT anônimo, chaves/filas/auditoria somente service_role. RPC de baixa usa security invoker e bloqueio de linha.

A aplicação foi feita no SQL Editor porque o conector autenticado não acessa o projeto original. O arquivo está versionado; ainda não foi registrado no histórico remoto da CLI. Não executar a migration novamente sem conferir o histórico.

## Evidências já obtidas

- TypeScript sem erros; ESLint sem erros na rodada de validação.
- 12 testes de cálculo, recorte de oferta/conta, zero denominador, fuso/calendário, autenticidade, assinatura, redaction, normalização, transição de status e preferências.
- Banco real com dois usuários/projetos QA isolados: RLS entre proprietários, negação anônima, credenciais protegidas, baixa repetida gerando um único lançamento e estorno.
- API autenticada: leitura, isolamento, preferências persistidas, compromissos/caixa, criação/escopo/revogação de chave, webhook Hotmart com token/produto/deduplicação, venda não rastreada, notificação, regra e portfólio.
- Cakto: lote V2, taxas sem duplicação, localização, estorno, evento pendente atrasado e recuperação de evento com erro. Despesa manual retornou HTTP201 (criação correta).
- Browser real: login, portfólio, resumo, temas claro/escuro, filtro por conta, configuração/recarregamento das colunas, campos específicos Hotmart e layout móvel390px sem transbordamento da página.
- Dados sintéticos utilizados somente em dashboards QA criadas pelo agente; devem ser removidos antes da entrega. A oferta Pets do usuário permanece apenas para teste controlado.

## Limites explícitos

- Kiwify, Kirvano e demais provedores do catálogo ainda não têm adapters homologados. A tela identifica essa condição e bloqueia sua ativação. Não são integrações operacionais por terem um ícone.
- Nenhuma credencial real de Hotmart/Cakto/Pixel foi fornecida nesta etapa. Os testes com fixtures comprovam o processamento interno; a homologação real exige configurar cada conta e receber evento do provedor. Nenhuma compra foi realizada. O webhook legado Applyfy está sem filtro de produto: seu recebimento será bloqueado até o operador vincular os IDs da oferta correta; pergunta enviada ao usuário, sem alterar o checkout externo.
- CAPI tem backend e fila, mas ainda não há confirmação real de entrega à Meta neste projeto. Configuração não recebe status de evento entregue antes da resposta da Meta.
- O script existente observa Page View e clique para checkout. Clique não comprova abertura do checkout: IC fica indisponível até instrumentação real de `checkout_started`.
- Bump/upsell/downsell só são classificados quando o checkout informa; não há denominadores de exposição para inventar aceitação.
- Faturamento estrangeiro sem conversão verificável não é somado ao BRL. Custos gerais não são rateados arbitrariamente entre campanhas ou checkouts. ROI de campanha é antes de custos gerais não atribuídos.
- Notificações são internas ao app e os resumos usam o agendador existente; não foi implementado push do sistema operacional ou envio WhatsApp/e-mail.
- Gerenciador consulta campanhas e métricas; alterações de orçamento/veiculação na Meta ainda não estão disponíveis.

## Publicação

Primeiro build de produção preparado sem domínio: commit `d89fc1a`, deployment `dpl_4FtSBjYd2MG41M2NKvCupiCUPABW`, estado READY. API autenticada do deployment retornou HTTP200 e dados corretos da dashboard QA (duas contas). Sincronização hot real no ambiente local retornou HTTP200/ok, uma conta processada, sem erros. Ajustes finais de diagnóstico/notificações em validação para a publicação definitiva.
