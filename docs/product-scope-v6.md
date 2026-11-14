# Traffic Flow — Escopo de produto e refino V6

**Proposta revisada para aprovação · 14/11/2026**

## 1. A visão do produto

O Traffic Flow deve ser o centro de operação das suas ofertas: mostrar onde as vendas acontecem, como o público percorre o funil, qual oferta entrega retorno, qual campanha gerou a venda e quanto sobra depois dos custos registrados.

Esta V3 amplia a proposta anterior com **mapa de vendas, funil de conversão, cards de ROI e Lucro na dashboard, gestão de múltiplas ofertas e uma central de integrações mais completa**. Mantém a direção visual moderna e minimalista, com grafite, verde, boa legibilidade e identidade própria.

Há três frentes dentro do escopo: refino da interface existente, novos módulos de análise e expansão das integrações. Novos módulos que dependem de dados ou regras ainda ausentes também terão trabalho de backend. O plano deve contemplar isso desde o início.

**Situação:** planejamento para aprovação. Nenhuma alteração desta V4 foi aplicada ao app.

## 2. Referências conferidas

- **UTMify:** a tela Resumo aberta no navegador apresenta funil de cliques, visitas à página, checkouts iniciados, vendas iniciadas e aprovadas, além de mapa/ranking por país. A referência é a utilidade dessas análises na rotina de operação.
- **[CashFlow](https://appcashflow.com.br/):** a apresentação oficial destaca gestão de múltiplas ofertas, tráfego por oferta, feed de vendas, comparação entre ofertas e gestão financeira. Também apresenta Meta Ads e plataformas como Hotmart, Kiwify, Cakto e Kirvano entre suas integrações.

Essas referências orientam o conjunto de necessidades. Os fluxos, a identidade e a implementação do Traffic Flow serão próprios. A consulta ao site da CashFlow não comprova acesso às suas APIs ou ao funcionamento interno do produto.

## 3. Estrutura de navegação proposta

| Área | Pergunta que deve responder |
| --- | --- |
| **Dashboard / Resumo** | Como está minha operação agora? |
| **Ofertas** | Quais ofertas estão rodando e qual é o resultado de cada uma? |
| **Campanhas** | Quais campanhas, conjuntos e anúncios geram vendas? |
| **Vendas** | Quais pedidos chegaram, foram pagos e tiveram sua origem identificada? |
| **Financeiro** | Quais receitas, custos e despesas compõem o resultado? |
| **UTMs** | Quais origens, campanhas e links geram vendas? |
| **Relatórios** | Como comparar, detalhar e exportar o desempenho? |
| **Regras** | Quais condições devem disparar alertas? |
| **Eventos** | Quais eventos chegaram e foram processados? |
| **Notificações** | Quais avisos precisam de atenção? |
| **Ao Vivo** | Qual é o ritmo atual da operação? |
| **Integrações** | Quais fontes estão conectadas e qual delas precisa de atenção? |
| **Configurações** | Quais são as preferências e regras da operação? |

**Hierarquia:** o contexto é a operação/dashboard selecionada. Resumo, UTMs, Integrações, Relatórios, Regras, Eventos e Notificações pertencem a esse contexto. Gestão de Ofertas, Gestão de Tráfego, Gestão Financeira e Vendas complementam o menu. O protótipo apresenta essa hierarquia por agrupamentos, ícones e submenu expandido. ROI e Funil não são abas laterais.

O mapa terá destaque no Resumo e uma visualização expandida acessível por “Ver mapa”. O menu pode agrupar áreas de Operação, Análise e Configuração para manter a navegação enxuta no desktop e no celular.

O seletor de contexto terá **Todas as ofertas** e operações específicas. A visão consolidada precisa respeitar permissões, moeda de relatório e fuso escolhido; não somar moedas ou períodos incompatíveis sem conversão e identificação.

## 4. Nova Resumo

Ordem proposta:

1. Projeto ou portfólio selecionado, período, oferta e atualização dos dados.
2. Indicadores: Investimento, Faturamento, Lucro, ROI, ROAS e Margem.
3. Funil de conversão com etapas e taxas explícitas.
4. Mapa de vendas e ranking geográfico.
5. Evolução financeira e situação da origem das vendas.
6. Ranking de ofertas, campanhas de destaque e últimas vendas.
7. Alertas factuais de integração, dados ausentes ou falha de coleta.

A composição muda conforme a largura da tela. Os módulos terão resumos e acesso a detalhes, mantendo leitura rápida sem esconder a operação.

### 4.1. Mapa de vendas

**Entrega:** mapa interativo para localizar a distribuição das vendas, acompanhado de ranking e tabela acessível.

- Alternância entre Mundo e Brasil.
- Países como primeiro nível; estados e cidades quando houver localização suficiente e normalizada.
- Alternância entre quantidade de vendas aprovadas e receita aprovada.
- Filtros por período, projeto/operação, oferta e checkout.
- Tooltip com região, vendas, receita e participação no total geolocalizado.
- Clique em uma região abre a relação de pedidos e ofertas daquele recorte, preservando os filtros.
- Indicação de quantas vendas possuem localização e quantas estão sem essa informação.
- Lista/ranking equivalente para navegação por teclado e uso no celular.

**Origem da localização:** usar prioritariamente os dados do comprador enviados pelo checkout. A localização da sessão, quando utilizada, deve aparecer como aproximação da visita, com origem do dado identificada. Uma localização obtida pelo IP não deve aparecer como endereço preciso do comprador.

**Regras:** não posicionar automaticamente uma venda sem cidade no centro de uma cidade arbitrária. Não atribuir investimento ou ROI por região sem dados de mídia compatíveis para aquela região. O mapa apresenta distribuição geográfica; o vínculo com campanha continua na análise de atribuição.

**Critério de aceite:** o total geolocalizado mais o total sem localização reconcilia com o total de vendas do mesmo filtro. O mapa não usa endereços pessoais nem pontos exatos para representar compradores.

### 4.2. Feed e ritmo de vendas

- Lista das últimas vendas aprovadas, com oferta, valor, horário e plataforma.
- Separação visível entre pedido iniciado e pagamento aprovado.
- Evolução por hora e por dia da semana, no fuso do relatório.
- Acesso ao detalhe do pedido.
- Atualização discreta; notificações sonoras e visuais, se incluídas, serão configuráveis.
- Reenvio de webhook não pode gerar uma “nova venda” duplicada no feed.

## 5. Funil de conversão

### 5.1. Jornada principal

```text
Cliques no anúncio
    → Page View
        → IC
            → Vendas Iniciadas
                → Vendas Aprovadas
```

A interface usará exatamente **Page View, IC, Vendas Iniciadas e Vendas Aprovadas**. A explicação do significado fica no detalhe da etapa. Page View mede visualizações; IC representa o evento de início de checkout observado. A contagem de sessões, quando exibida, terá seu próprio nome e não será renomeada como Page View.

Cada etapa mostrará quantidade, taxa em relação à etapa anterior e, quando fizer sentido, taxa em relação ao começo da jornada. O usuário poderá filtrar por oferta, campanha, checkout e período, dentro das possibilidades da fonte selecionada.

**Duas leituras identificadas:**

- **Visão do período:** reúne volumes por data de ocorrência. Cliques da Meta, visitas do script e pedidos do checkout vêm de sistemas diferentes. As razões entre esses volumes são indicadores do período e não comprovam uma jornada individual completa.
- **Jornada vinculada:** acompanha sessões identificadas e os pedidos ligados a elas, com uma janela de conversão definida e visível. Essa visão sustenta taxas por percurso acompanhado.

Pedidos ou sessões sem vínculo ficam em grupos próprios. O app não deve forçar uma aparência de funil perfeito: etapas podem ter volumes maiores que as anteriores quando há retorno de visitantes, diferenças de janela ou cobertura incompleta. Nesses casos, explicar a base do indicador.

**Regras de medição:**

- Deduplicar sessões, eventos, pedidos e pagamentos conforme a unidade de cada etapa.
- Contagem de page views e contagem de sessões devem ter nomes diferentes.
- Distinguir clique em botão de checkout de abertura efetivamente observada no checkout.
- Etapa sem instrumentação aparece como “Não monitorada”, com orientação de configuração.
- Lead entra como etapa opcional somente nas ofertas que realmente possuem captura.
- Informar a origem do dado de cada etapa e sua última atualização.

**Critério de aceite:** taxas têm numerador, denominador e janela definidos; os totais podem ser conferidos nos registros de origem.

### 5.2. Funil de monetização por oferta

```text
Compra principal
    ├─ Order bump
    └─ Upsell
         └─ Downsell, quando existir
```

Entregas propostas:

- Relação entre oferta principal, complementos e ofertas posteriores.
- Quantidade vendida e receita de cada produto/etapa.
- Participação de cada etapa na receita da operação.
- Taxa de aceitação de bump, upsell e downsell quando houver o número confiável de pessoas elegíveis ou exposições.
- Ticket da compra inicial e ticket com os complementos vinculados.
- Separação entre número de pedidos, número de compradores e unidades de produtos.

Os itens de pedido existentes ajudam a detalhar produtos vendidos, mas não comprovam sozinhos que um item era bump ou upsell. Essa classificação exige informação do checkout ou cadastro explícito validado. Quando faltar o denominador, apresentar vendas e receita sem inventar taxa de aceitação.

## 6. Área de Ofertas

Esta será uma área principal de gestão da operação, com visão consolidada e página de detalhe.

### 6.1. Organização das entidades

É necessário distinguir:

- **Operação comercial:** o negócio acompanhado, por exemplo, Receitas Naturais para Cães.
- **Produto:** o material ou acesso vendido.
- **Oferta/preço:** uma condição comercial específica daquele produto, como R$ 17,90 ou R$ 27,90.
- **Estrutura de venda:** páginas, checkouts, complementos e campanhas relacionados.

O projeto atual é o contexto de isolamento. A evolução deverá mapear essas entidades sem misturar vendas de produtos distintos nem substituir a estrutura existente sem migração revisada.

### 6.2. Visão de todas as ofertas

Tabela/lista com:

- Nome, produto, projeto, checkout, moeda e identificação da oferta.
- Condição comercial e links de página/checkout.
- Campanhas e contas vinculadas.
- Investimento, vendas aprovadas, receita, CPA, ROAS, custos, resultado e ROI, quando calculáveis.
- Receita de bump/upsell/downsell quando os relacionamentos estiverem disponíveis.
- Reembolsos, chargebacks, aprovação de pagamento e origem identificada.
- Última venda, última sincronização e pendências de configuração.
- Busca, ordenação, filtros e comparação entre ofertas.

**Status sem ambiguidade:** “Em teste”, “Em escala” e “Pausada” podem ser classificações do operador. “Anúncios ativos”, “Com investimento no período” e “Com vendas no período” são fatos derivados dos dados. Os dois tipos de status devem ser identificados separadamente.

### 6.3. Detalhe da oferta

Abas no detalhe da oferta: **Resumo · Tráfego · Vendas · Custos · Estrutura e integrações**. Lucro e ROI ficam nos cards; o funil aparece no Resumo da oferta.

O usuário poderá:

- Ver como a oferta performa ao longo do tempo.
- Conferir campanhas, conjuntos, anúncios e criativos relacionados.
- Entender produtos e checkouts ligados à operação.
- Comparar a mesma oferta em dois períodos ou duas ofertas no mesmo período.
- Abrir os pedidos e rastrear a origem de uma venda.

**Integridade:** uma campanha compartilhada não pode ter seu investimento integral repetido em várias ofertas. Será necessário definir vínculo exclusivo ou regra explícita de distribuição. Vendas e custos sem associação ficam em “Sem oferta vinculada”, com ação de revisão.

Pedidos com vários itens também exigem separar receita do pedido e receita dos itens. A soma de linhas por produto não pode multiplicar o valor total da venda.

## 7. ROI e Lucro nos cards da dashboard

**ROI:** card principal no Resumo, com detalhamento no clique; não terá aba lateral.

**Financeiro:** receitas, custos, despesas e composição do resultado.

Os detalhes dos cards e os Relatórios deverão mostrar:

- Investimento em mídia e demais custos registrados.
- Receita aprovada e receita atribuída à mídia, identificadas separadamente.
- Resultado operacional conhecido, ROI e margem calculados com os custos informados.
- ROAS como indicador distinto do ROI.
- Evolução diária e acumulada.
- Ranking e comparação de ofertas e campanhas, respeitando a disponibilidade dos dados.
- Desdobramento do resultado: receita → mídia → custos → resultado.
- Quais custos estão incluídos, quais foram distribuídos e quais ainda não foram informados.

### Cálculos de base

As fórmulas atuais conferidas no código serão preservadas:

```text
Custos incluídos = investimento + taxas e outros custos informados
Lucro = faturamento − custos incluídos
ROI (%) = lucro ÷ custos incluídos × 100
Margem (%) = lucro ÷ faturamento × 100
ROAS = receita atribuída à Meta ÷ investimento Meta
```

Na interface, um valor sem base de cálculo aparecerá como “Não calculável”, com explicação — por exemplo, quando o denominador for zero.

Exemplo didático: receita de R$ 10.000, mídia de R$ 2.000 e outros custos de R$ 1.000 resultam em R$ 7.000 de lucro e ROI de 233,3%. O ROAS Meta depende de quanto dessa receita foi efetivamente atribuído à Meta.

Os títulos dos cards serão **Investimento, Faturamento, Lucro, ROI, ROAS e Margem**. A explicação “Calculado com os custos informados” fica no detalhe, tooltip ou Gestão Financeira. A ausência de taxas ou despesas não pode ser apresentada como se todos os custos estivessem cobertos.

### Custos e comparação por oferta

- Custos diretos associados à oferta quando houver vínculo confiável.
- Custos compartilhados distribuídos por uma regra visível e revisável.
- Exibir custos ainda não distribuídos na consolidação.
- Não apresentar como ROI de campanha um resultado que usa toda a receita do projeto.
- Não duplicar despesas já descontadas em outra base de receita.
- Manter custos automáticos protegidos e identificados pela origem.

### Evolução do Financeiro empresarial

Incluir no escopo geral uma etapa específica para lançamentos de entradas/saídas, compromissos a pagar/receber e conferência de caixa. O resultado de vendas e mídia não comprova dinheiro disponível na conta; “Caixa” só poderá ser exibido com movimentações e saldos adequados.

Essa etapa é um módulo funcional novo e terá modelagem própria revisada antes de implementação. Não integra contas bancárias nem executa pagamentos por consequência deste escopo.

## 8. Uma linguagem compreensível para atribuição

“Token pendente” sai da visão principal proposta. Token é um identificador técnico de rastreamento; o operador precisa entender a situação da origem da venda.

| Condição atual | Nome proposto na interface | Explicação |
| --- | --- | --- |
| Pedido vinculado a uma sessão | **Origem identificada** | A venda foi ligada a uma visita registrada. Mostrar a fonte e os dados disponíveis. |
| Código recebido, mas sessão ainda não resolvida | **Origem a confirmar** | Recebemos um código de rastreamento, mas ainda não encontramos a visita correspondente. |
| Sem vínculo e sem esse código pendente | **Sem identificação de origem** | O pedido chegou sem vínculo suficiente com uma visita registrada. |

Os três grupos continuam exclusivos. “Origem a confirmar” não significa que o pagamento está pendente e não promete que a origem será resolvida automaticamente.

Reconhecer a sessão também não garante que campanha, conjunto e anúncio estejam todos identificados. O detalhe mostrará exatamente o que foi encontrado, por exemplo: “Visita identificada; anúncio não identificado”.

Na seção técnica do pedido, token, session ID, visitor ID e UTMs continuam disponíveis para diagnóstico. O nome interno dos campos pode permanecer igual; a linguagem da interface será revista de forma consistente em filtros, gráficos, badges, alertas e ajuda.

## 9. Central de integrações

A integração deverá ter um fluxo completo: conectar → selecionar contas/produtos → vincular ofertas → testar recebimento → monitorar a operação.

### Famílias de conexão

| Família | Entrega |
| --- | --- |
| **Tráfego** | Contas Meta, campanhas, conjuntos, anúncios, investimentos e métricas ligados às ofertas |
| **Checkout** | Pedidos, pagamentos, reembolsos, chargebacks, produtos e condições comerciais |
| **Páginas e tracking** | Domínios, instalação do script, eventos e diagnóstico por oferta |
| **Conversões à Meta** | Proposta de configuração de Pixel/CAPI por operação, com validação e tratamento de duplicidades antes de ativar |
| **Outras fontes de mídia** | Google e TikTok como expansão planejada, com conectores e validações próprios |

O envio de conversões à Meta não está comprovado como recurso completo na base atual. Sua inclusão requer documentação oficial, configuração autorizada, eventos de teste, deduplicação e monitoramento. A tela não deve indicar que está ativo antes dessa validação.

### Prioridade de conectores para aprovação

1. **Base e isolamento:** consolidar Meta + Applyfy e o vínculo correto entre projeto, produto e oferta.
2. **Primeiro lote de expansão proposto:** Hotmart, Kiwify, Cakto e Kirvano.
3. **Segundo lote:** PerfectPay, Cartpanda, Mundpay, Wiven, Greenn e Payt.
4. **Catálogo adicional a priorizar:** Ticto, Lastlink, Hubla, Wiapy, GGCheckout, Kavoo, Vega Checkout, Doppus e Zouti.

A prioridade pode ser ajustada conforme as plataformas que você realmente usa. A presença de um arquivo com nome do provedor no repositório não comprova um conector operacional. Cada adapter só recebe status “Disponível” após ser implementado e validado.

A CashFlow apresenta vários desses provedores em seu site oficial. Isso serve como referência do catálogo, não como documentação de integração do Traffic Flow. Cada provedor exigirá sua própria especificação e validação. [Fonte da referência](https://appcashflow.com.br/).

### Detalhe de uma integração

- Conexões por conta, produtos/ofertas selecionados e projeto de destino.
- Autenticação e armazenamento seguro das credenciais.
- URL de webhook e instruções específicas da plataforma.
- Última sincronização, último evento recebido e último evento processado.
- Erros compreensíveis, histórico de tentativas e recuperação idempotente quando suportada.
- Teste de conexão e teste de evento com resultado verificável.
- Situações: conectada, configuração incompleta, credencial expirada, falha ou desativada.
- Planejadas aparecem como planejadas; funções de ativação só existem quando implementadas.

O pipeline genérico atual de pedidos será aproveitado. Não criar um sistema paralelo de vendas para cada checkout.

## 10. O que existe e o que precisa evoluir

Avaliação baseada no código e no histórico verificado. A disponibilidade efetiva por provedor será revalidada antes da implementação.

| Bloco | Base existente | Trabalho incluído na V3 |
| --- | --- | --- |
| Mapa | Campos de país, estado e cidade nos pedidos; geolocalização de sessões | Normalização, agregação geográfica, cobertura dos dados, mapa e filtros |
| Funil principal | Cliques Meta, sessões/eventos, pedidos e status | Definir unidades/janelas, consolidar etapas, deduplicar e construir a análise |
| Bump/upsell/downsell | Itens de pedido com identificação de produto | Modelar relacionamentos, validar classificação e denominadores |
| Ofertas | Projetos, código de oferta, itens e entidades Meta | Cadastro/catálogo, vínculos, portfólio, detalhe e comparação |
| ROI | RPCs e cálculo financeiro já existentes | Cards interativos, detalhes, relatórios, evolução e distribuição de custos |
| Integrações | Meta e Applyfy já validados no histórico; arquitetura genérica | Fluxos de conexão por oferta, diagnóstico e expansão dos adapters |
| Linguagem | Três estados de atribuição existentes | Revisão dos nomes e explicações sem mudar a semântica |
| Caixa empresarial | Despesas conhecidas | Modelagem de movimentações, compromissos e conciliação em etapa própria |
| Identidade e UX | Next, React, Tailwind, Geist, ícones e gráficos disponíveis | Sistema visual, navegação, componentes, responsividade e acessibilidade |

Novas tabelas, campos, RPCs ou migrations serão definidos depois de inspecionar o banco real. A proposta não presume a criação de entidades que já possam existir.

## 11. Direção visual e experiência

Mantêm-se os fundamentos da V1: grafite e verde, Geist, números alinhados, legibilidade, componentes consistentes, transições discretas, estados vazios/carregamento/erro e adaptação a desktop e celular.

A mudança principal é a composição: a Resumo passa a mostrar mapa, funil e ranking de ofertas. Tabelas e telas de detalhe continuam concentrando a informação operacional. Ofertas tem uma área de gestão própria; ROI permanece como card no Resumo e no detalhe das ofertas.

No celular: funil em sequência vertical ou lista de etapas, mapa com ranking acessível, indicadores em duas colunas e filtros em painel próprio. Nenhuma funcionalidade depende exclusivamente de hover.

O protótipo V3 usa valores fictícios, mapa do Brasil com limites estaduais do IBGE e mapa-múndi com contornos Natural Earth. Não comprova geolocalização, conversão ou lucro reais. A referência visual válida da V3 é o protótipo navegável, que substitui a composição estática anterior.

## 12. Sequência de execução proposta

| Etapa | Entrega |
| --- | --- |
| **1 — Dados e definição da operação** | Conferir projetos/produtos/ofertas, fontes de localização, etapas do funil, vínculos de campanhas e custos |
| **2 — Fundação visual e dashboard** | Componentes, linguagem de origem, nova estrutura global e Resumo com mapa e funil |
| **3 — Gestão de ofertas e ROI** | Portfólio, páginas de oferta, comparação, retorno e distribuição explícita de custos |
| **4 — Integrações prioritárias** | Conexão por oferta, diagnóstico e primeiro lote de adapters; testes de pedidos e lifecycle |
| **5 — Aprofundamento** | Bump/upsell/downsell, lotes adicionais de integração e proposta validada de conversões à Meta |
| **6 — Financeiro empresarial e revisão final** | Etapa própria de caixa/compromissos, responsividade, acessibilidade e regressões |

O escopo completo será implementado em entregas verificáveis. As partes que exigem novos eventos, acesso a provedores ou regras de distribuição terão esses requisitos documentados antes de serem apresentadas como funcionais.

A implementação será preparada em branch e preview para revisão. O app atual permanece como base de comparação até a publicação autorizada da nova experiência.

## 13. Critérios de aprovação e entrega

- [ ] Mapa e ranking reconciliam com as vendas do filtro e informam a cobertura geográfica.
- [ ] Funil explica unidades, fontes, janela e base de cada taxa.
- [ ] Bump/upsell/downsell só mostram classificações e conversões sustentadas por dados.
- [ ] Todas as ofertas podem ser identificadas sem misturar operações.
- [ ] Investimentos, pedidos e custos compartilhados não são duplicados.
- [ ] ROI e ROAS estão separados, com custos e denominadores visíveis.
- [ ] A interface principal usa linguagem de negócio, incluindo “Origem a confirmar”.
- [ ] Integrações exibem capacidade e estado reais, com teste de recebimento.
- [ ] Vendas, filtros, paginação, hierarquia e detalhes atuais são preservados.
- [ ] Caixa real não é inferido apenas de faturamento e investimento.
- [ ] Layouts e navegação passam por revisão efetiva em desktop e celular.
- [ ] Lint, TypeScript, build e fluxos de dados passam nas validações pertinentes.

**Para revisão desta V3:** navegar pelo protótipo e avaliar a composição, a hierarquia, os nomes definidos e as interações. A aplicação dessas mudanças no app acontece após a aprovação da proposta.

## 14. Ajustes definidos a partir dos prints do usuário

As imagens enviadas são referências de produto e aparência, não instruções para operar serviços externos. A foto do funil e do mapa mostra uma interface identificada como Tajokefy; os outros recortes foram apresentados pelo usuário como CashFlow. Não é necessário atribuir todas as telas à UTMify para incorporar os requisitos solicitados.

### Nomes obrigatórios na interface

| Nome anterior | Nome definido |
| --- | --- |
| Checkout iniciado | IC |
| ROI conhecido | ROI |
| Resultado conhecido | Lucro |
| Investimento Meta | Investimento |
| Receita aprovada | Faturamento |
| ROAS Meta | ROAS |
| Visitas à página | Page View |
| Pedidos criados | Vendas Iniciadas |

O cálculo e a unidade de cada métrica serão preservados ou corrigidos conforme sua definição. A revisão dos nomes não autoriza tratar sessões como Page View, receita total como receita atribuída à mídia ou valores sem custos como lucro final auditado. A linguagem técnica fica no detalhe, sem ocupar os títulos principais.

### Menu, cards e interações

- Ícones vetoriais consistentes para cada área; botões com área de clique, hover, foco e seleção bem definidos.
- Dashboard com submenu de UTMs, Integrações, Relatórios, Regras, Eventos e Notificações, sempre dentro do contexto selecionado.
- ROI e Lucro nos cards do Resumo. Nenhum botão “Abrir aba ROI”.
- Cards clicáveis abrem detalhes, fórmula, evolução e acesso ao relatório ou custos correspondentes.
- Gráficos com legenda selecionável, tooltip, filtros e estados reais de carregamento/erro/vazio no app final.
- Top 3 ofertas com Lucro, Faturamento, ROAS e Margem, destaque visual por posição e ações de Gestão e Tráfego. O critério de ranking será explícito; na prévia, usa Lucro.
- Cabeçalho com meta de faturamento configurável, progresso, indicador de atualização, moeda, fuso, notificações e ocultação de valores.
- Evolução da operação com Faturamento, Investimento e Lucro e feed de vendas ao lado. Projeções futuras só entram com método e indicação próprios, sem se confundir com valores realizados.
- Funil contínuo com curva proporcional ao volume, números, percentuais e detalhe por etapa.
- Mapa do Brasil com 27 unidades federativas, limites geográficos reais, escala de intensidade, ranking e seleção de estado. Mundo como alternância. Sem desenhos esquemáticos de continentes.
- No app final, ocultar valores cobre todos os valores financeiros, tooltips e detalhes; a preferência é da interface e não substitui permissões de acesso.

### Funcionalidade de cada nova seção

**UTMs:** origens e parâmetros agrupados, comparação por campanha e gerador de links. Utms ausentes não devem ser inventadas; atribuição identificada e não identificada continuam conciliáveis.

**Relatórios:** comparação por período, oferta e campanha, filtros persistidos, detalhamento e CSV. Exportações respeitam os mesmos filtros e permissões.

**Regras:** cadastro de condição, escopo, janela, frequência e ação de notificação; ativação/pausa, histórico de disparos e prevenção de notificações repetidas. A proposta inicial contempla alertas; alterações automáticas de campanhas exigem escopo específico.

**Eventos:** lista de eventos recebidos, origem, processamento, deduplicação, erro e detalhe técnico. Diagnóstico de tracking entra nesta seção. Reprocessamento, quando oferecido, deve respeitar idempotência.

**Notificações:** avisos de regras, integrações e vendas; lidas/não lidas, link para o objeto afetado e preferências de som/categoria. Separar alerta de integração de situação do pagamento.

**Ao Vivo:** evolução e feed, com última atualização efetiva e situação da conexão; sem chamar de “ao vivo” uma coleta parada ou atualização apenas local.

**Como usar:** guias dos fluxos reais do Traffic Flow. O recorte de Premiação aparece na referência, mas não foi apresentado como requisito de negócio suficientemente definido; permanece fora desta entrega até haver uma regra de metas/recompensas.

## 15. Protótipo e limites da prévia

O protótipo local permite testar:

1. Navegação entre todas as áreas apresentadas.
2. Filtros de oferta e período com recálculo dos indicadores demonstrativos.
3. Clique nos cards e detalhes de ofertas.
4. Alternância das séries do gráfico.
5. Mapa Brasil/Mundo, tooltip e seleção de região.
6. Geração de links UTM e exportação de CSV demonstrativo.
7. Criação/pausa de regras na memória da página e leitura de notificações.
8. Adição de despesa simulada com recálculo de Lucro, ROI e Margem.
9. Meta, privacidade visual, busca, moeda e preferências ilustrativas.

Dados, comparações e estados de integração são fictícios e identificados como demonstração. Algumas telas de detalhe ilustram o fluxo e descrevem a entrega final. As regras não executam rotinas, o indicador de acompanhamento não recebe eventos reais e nenhuma credencial é pedida. A distribuição geográfica dos filtros é proporcional no protótipo; no app será calculada a partir dos pedidos reais. Mudanças de simulação são temporárias e somem ao recarregar.

- Prévia: `prototipo-v3/index.html` (pode ser aberta localmente ou por servidor HTTP).
- Referência local servida durante a revisão: http://127.0.0.1:3187/
- Fonte geográfica Brasil: [Malhas do IBGE](https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=UF).
- Fonte geográfica Mundo: [Natural Earth](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson).
- Referência CashFlow: https://appcashflow.com.br/ e recortes fornecidos pelo usuário.
- V1 e V2 preservadas para histórico. O protótipo interativo e este documento passam a ser a proposta vigente.


## 16. Revisão V4 — decisões vigentes a partir dos novos prints

Esta seção atualiza e complementa as anteriores. A entrega para aprovação é um SaaS completo de operação: visual, navegação, gestão de ofertas, tráfego, tracking, integrações e financeiro. O protótipo é a representação dos fluxos; a implantação funcional será feita na base Traffic Flow após aprovação. Prints de marketing são referências de requisitos visíveis, não prova de capacidades internas ou documentação de API da CashFlow.

### Página inicial e funil

A página inicial concentra indicadores, Top 3 ofertas, evolução da operação, últimas vendas, funil e mapa. **Não incluir Central de Integrações, catálogo de provedores nem faixa de conectores na página inicial.** O acesso fica no menu.

Funil: faixa contínua, curvas suaves, escala visual proporcional às etapas, gradiente único nas cores Traffic Flow, divisores verticais, números e percentuais legíveis. Etapas: **Cliques → Page View → IC → Vendas Iniciadas → Vendas Aprovadas**. O preenchimento acompanha os volumes, inclusive quando uma etapa posterior tem volume maior em uma análise do período. Não forçar um funil monotônico se os dados não forem assim. No exemplo V4, os percentuais usam Cliques como denominador; a seleção abre a definição da etapa. A implementação final também terá conversão entre etapas, fonte e janela verificáveis.

### Gestão de Ofertas completa

- Cadastro e edição de produto, oferta, preço, status e vínculos de página/checkout/campanha.
- Cards com Lucro em destaque e Faturamento, Investimento, ROAS, Margem, Vendas e Ticket Médio.
- Resumo de ofertas positivas/negativas, busca, período, status, ordenação, cards/lista e recolhimento.
- Oferta principal e complementos (bump, upsell, downsell) com vínculo explícito e tratamento de dupla oferta quando existir essa relação comercial.
- Ações Gestão da Oferta e Tráfego abrindo o recorte correto.
- Comparação Oferta × Oferta e Período × Período; lados independentes, critérios de vencedor definidos, composição da diferença de lucro e comparação salva.
- Diferença de lucro deve reconciliar com diferença de faturamento menos diferenças de investimento e custos. Não mostrar vencedor conflitante entre cards.

### Gestão de Tráfego completa

- Contas, Campanhas, Conjuntos e Anúncios; seleção, busca, ativos/pausados e histórico.
- Investimento, orçamento, faturamento atribuído, lucro, ROAS, vendas, CPA, CPM, CTR e demais métricas disponíveis por provedor.
- Vínculos entre campanhas e ofertas, sem duplicar investimento em campanhas compartilhadas.
- Área Pixel/CAPI, parâmetros de atribuição, entrega e diagnóstico.
- Orçamento e veiculação como funções do produto, com permissões por operação, escopo de acesso do provedor e histórico de alteração. Na prévia, o controle é somente visual; a execução no provedor depende da implementação da API oficial.

### Financeiro empresarial

- **Resultado:** receita e custos por competência/período de análise; composição do lucro e comparação por oferta.
- **Caixa:** recebimentos e pagamentos efetivos, saldo inicial, contas, categorias, lançamentos, repasses e conciliação. Faturamento aprovado não substitui repasse realizado.
- **Compromissos:** contas a pagar/receber, vencimentos, recorrência, pago/pendente, anexos e vínculo com lançamento de caixa.
- Taxas de gateway, reembolsos, impostos parametrizados, mídia, ferramentas, fornecedores e pró-labore.
- Fluxo em cascata do faturamento ao resultado e conciliação do resultado com o caixa. O gráfico deve ter valores reconciliados, não barras decorativas que sugiram saldo bancário.
- Baixa de compromisso gera ou vincula uma única movimentação; desfazer a baixa mantém conciliação e histórico. Não executar pagamentos bancários por meio desse controle.
- Regime de impostos e valores serão configurados pela operação; não presumir alíquota universal.

### Tracking e diferenciais Traffic Flow

- Cobertura de vendas com origem identificada, a confirmar e sem identificação; grupos exclusivos.
- Sessão identificada, anúncio identificado e conversão entregue à mídia são métricas diferentes.
- Preservar transporte compatível com Applyfy via `utm_term`, vínculo entre sessão/pedido/itens e recuperação de origem quando os dados permitirem.
- Saúde por fonte e janela, laboratório de teste ponta a ponta, inspeção técnica e histórico de processamento.
- Eventos únicos, deduplicação/idempotência, reprocessamento controlado e diagnóstico de perda de atribuição.
- Pixel/CAPI: credenciais protegidas, event_id, evento de teste, confirmação de entrega e erros. Qualidade do evento só será mostrada se houver dado verificável do provedor.
- Nenhum indicador de “100% rastreado” ou “boa qualidade” será presumido a partir de uma conexão cadastrada.

### Notificações personalizadas — referência UTMify enviada

Esta área é um configurador de notificações, com histórico como aba complementar. A lista de avisos não substitui as configurações.

**Vendas:** habilitar pendentes e aprovadas separadamente; valor da venda/comissão/oculto; mostrar/esconder produto, utm_campaign e dashboard; som; prévia instantânea; teste.

**Relatórios:** horários 08:00, 12:00, 18:00 e 23:00 ativáveis individualmente, fuso explícito, estilos Status de Lucro / Resumo Detalhado / Criativa, prévia de mensagem.

**Entrega final:** preferências por usuário/operação, persistência segura, permissão de push quando escolhida pelo usuário, inscrição e cancelamento do dispositivo, fila de entrega, deduplicação, leitura e histórico. Som respeita preferências e limitações do navegador. Horários seguem o fuso e não produzem resumos duplicados em tentativas repetidas. Notificações de vendas distinguem pagamento de atribuição.

Na V4, salvar guarda as preferências no navegador da prévia. Não registra dispositivo nem envia push real. Valor de comissão só aparece na versão funcional quando o provedor fornece essa base; não estimar comissão como valor de venda.

### Integrações

Catálogo ampliado por Tráfego, Checkout, Tracking e Automações. Fluxo: conectar → selecionar conta/produto → vincular oferta → testar → acompanhar eventos/erros → renovar ou desconectar.

A presença de todos os nomes no catálogo não será tratada como integração pronta. Cada provedor terá adapter, autenticação/autenticidade de webhook, mapeamento do ciclo de pedido, política de tentativas e teste completo. O escopo cobre os conectores priorizados nas seções anteriores, Google/TikTok e webhooks de saída como expansões. As exclusividades de tracking do Traffic Flow continuam na mesma operação, sem sistemas paralelos.

### Acabamento de todas as abas

Mesma família de superfícies, tipografia, ícones de traço consistente, cores semânticas, espaçamento, números alinhados e estados interativos. Cards internos têm conteúdo específico de cada tarefa: progresso em ofertas, mensagem prévia em notificações, distribuição em financeiro, cobertura em tracking. Tema claro/escuro com contraste revisado em todos os componentes. Hover, foco por teclado, carregamento, vazio, erro, celular e ocultação de valores fazem parte da entrega, não apenas a tela inicial.

### Fundação SaaS incluída no planejamento

Workspaces/operações isoladas; membros e papéis; convites; preferências e permissões por usuário; trilha de auditoria; recuperação de conta; uso, plano e limites caso o produto seja comercializado. Essas telas e o modelo de cobrança precisam de definição comercial antes de ativar pagamentos ou planos reais. Nenhuma nova assinatura ou cobrança é criada por este escopo.

### O que a V4 permite testar agora

- Nova composição do funil e manutenção do mapa com limites geográficos reais.
- Cards/lista, busca/ordenação e cadastro temporário de oferta.
- Comparação com seletores de oferta e período e explicação da diferença.
- Tráfego em níveis, recorte por oferta e veiculação simulada.
- Resultado, lançamentos de Caixa e baixa/desfazer de Compromissos na memória da prévia.
- Configurações e prévias de notificações, com preferências salvas localmente.
- Catálogo por categoria e estados de planejamento.
- Tracking com métricas de cobertura separadas das de entrega e tema visual alternável.

A V4 não conecta novas plataformas, não envia eventos/push reais e não grava no banco atual. As telas ilustram as capacidades a implementar. A completude funcional será validada em navegador → API → banco → provedor e não apenas pela presença de botões.

**Arquivos vigentes:** `prototipo-v4/index.html`, `traffic-flow-preview-v4.html`, este escopo e as capturas V4. V1–V3 ficam como histórico. A V4 substitui decisões anteriores que deixem notificações apenas como lista ou integrações na página inicial.


## 17. Revisão V5 — integração agrupada, relatórios e rastreamento

Esta seção prevalece sobre as decisões anteriores em caso de divergência. A V5 continua sendo proposta local para aprovação; não altera o app publicado nem a base de dados.

### Integrações com configuração progressiva

Eliminar a aba “Todas” e a grade extensa de provedores na entrada. Navegação interna: **Anúncios · Webhooks · Pixel · UTMs · API · Testes**. A página abre as configurações do grupo selecionado, com nome, plataforma, oferta, estado verificável, ações e orientação contextual.

Adicionar conexão abre fluxo em três passos: **Plataforma → Oferta e eventos → Revisão**. A busca filtra os provedores disponíveis/planejados e mantém o contexto do grupo; não exigir que o usuário percorra centenas de opções. Na implementação, favoritos, recentes e compatibilidade podem ordenar o seletor sem esconder o catálogo completo. Credenciais e campos técnicos só aparecem após a plataforma ser escolhida e conforme sua documentação oficial. Não presumir que todos os provedores exigem Client ID/Client Secret.

- **Anúncios:** contas autorizadas, permissões, seleção, vínculo de ofertas e sincronização.
- **Webhooks:** receber vendas/checkouts, selecionar produtos e eventos, validar assinatura ou segredo, registrar processamento e reenvios. Webhooks de saída terão direção e destino explícitos, separados dos endpoints de recebimento.
- **Pixel:** configurar Pixel por plataforma e oferta, eventos, envio browser/servidor, event_id/deduplicação, teste e diagnóstico de entrega. O gerenciador de tráfego direciona a configuração para este grupo.
- **UTMs:** parâmetros, gerador, instalação e vínculo com a análise de origens. O relatório UTMs pode continuar como acesso de análise no menu.
- **API:** nome, escopos, criação, chave exibida uma única vez, armazenamento protegido, revogação e trilha de uso na implementação real. A V5 só gera uma chave fictícia, sem poder de autenticação.
- **Testes:** laboratório Página → Visita → Checkout → Pedido → Origem. Distinguir simulação de interface de teste real ponta a ponta.

O protótipo salva **rascunhos de demonstração**, sem ativar conectores ou coletar tokens reais. Plataforma planejada continua identificada como tal mesmo quando o fluxo visual permite preparar um rascunho.

### Relatórios úteis para a operação

Cards de Faturamento, Lucro e Vendas; filtros de período, oferta e conta; agrupamento Dia / Oferta / Origem; métricas selecionáveis; ordenação; total do recorte e CSV com as mesmas colunas e ordem da tabela. Métricas agregadas usam as bases somadas: CPA = investimento/vendas; ROI = lucro/custos; CTR = cliques/impressões. Não somar percentuais nem calcular média simples entre razões diferentes.

Na prévia, o filtro de conta usa um recorte ilustrativo identificado como tal; os cards mostram o total da operação e a tabela identifica o recorte. Na implementação conectada, cards e tabela devem usar o mesmo conjunto de filtros ou ter bases explicitamente diferenciadas.

### Gerenciador personalizável

Seletor **Personalizar métricas** em Campanhas, Conjuntos e Anúncios. Disponíveis: Investimento, Faturamento, Lucro, ROI, ROAS, Vendas, CPA, Margem, IC, CPI, Cliques, CPC, CTR, CPM, Impressões e Despesas.

Escolha por checkbox; ordem ajustável; presets Performance / Financeiro / Tráfego; restauração do padrão; pelo menos uma métrica selecionada. Nome e identificação ficam fixos. Preferências do gerenciador e de relatórios são independentes. Na V5, ficam no armazenamento local do navegador; no app, por usuário/operação e contexto da tabela. Faturamento atribuído e vendas não rastreadas não devem ser misturados silenciosamente em ROAS de campanha.

### Venda não rastreada — requisito confirmado pelo usuário

Reconhecer o pedido recebido do checkout e informar separadamente a situação do pagamento e do rastreamento:

| Situação | Apresentação |
| --- | --- |
| Pedido com vínculo de visita resolvido | Rastreada |
| Identificador recebido, visita correspondente ainda não encontrada | Origem a confirmar |
| Sem vínculo e sem identificador em resolução | Não rastreada |

Uma venda aprovada não rastreada integra o Faturamento da operação, mas não recebe campanha/anúncio inventados. “Não rastreada” não significa orgânica, fraudulenta ou sem pagamento. Origem orgânica/direta só será exibida quando houver evidência correspondente.

Entregas: cards de cobertura, filtro de pedidos, badge, motivo no detalhe, campos disponíveis e diagnóstico. Recuperação posterior exige evidência auditável e preserva o pedido/pagamento. Distinguir “venda sem origem” de “conversão não enviada ao Pixel”: o segundo é estado de entrega ao provedor, não o mesmo estado de atribuição.

### Tema claro e consistência visual

Paleta explícita de fundo, superfícies, borda, texto e estados semânticos. Cobrir navegação, submenu, cabeçalho, cards, formulários, selects, radios, switches, tabelas, célula fixa, tooltip, modal, gráfico e estados de foco/seleção. A correção não pode depender apenas de mudar o fundo do body ou inverter cores.

Manter a identidade grafite/verde no escuro e neutros claros/verde no claro. Acessibilidade e ocultação de valores continuam requisitos em ambos. Revisar desktop/celular e estados interativos antes de publicar.

### Verificação realizada nesta prévia

- Sintaxe dos scripts sem erros; servidor HTTP 200.
- Pixel: seleção, configuração, revisão e criação de rascunho demonstrativo.
- Webhooks: busca “ki” retornou Kiwify e Kirvano.
- Métricas: preset Tráfego aplicado e refletido nas colunas.
- Relatórios: sete linhas diárias, agrupamento por Oferta com três linhas, total do recorte e personalização disponíveis.
- Tema claro: navegação por 12 áreas sem erro JavaScript; inspeção visual de Relatórios, Integrações/Pixel e modal de métricas.
- Vendas: filtro Não rastreadas e abertura do motivo no detalhe.
- API: formulário de credencial demonstrativa abriu corretamente.

Essas verificações comprovam o protótipo e os fluxos observados; a implementação real de autenticação, provedores, persistência e classificação de dados permanece parte da entrega após aprovação.

**Proposta vigente:** `traffic-flow-preview-v5.html`, `prototipo-v5/` e este documento. Capturas: `integracoes-v5.jpg`, `metricas-claro-v5.jpg`, `relatorios-claro-v5.jpg`. Versões anteriores permanecem como histórico.


## 18. Revisão V6 — uma dashboard por oferta e configuração por provedor

**Regra de negócio confirmada pelo usuário:** cada dashboard pertence a uma única oferta. Esta regra substitui qualquer proposta anterior de gerenciar campanhas de todas as ofertas em uma única dashboard.

### Hierarquia e isolamento

```text
Operação / workspace
  ├─ Visão consolidada de ofertas (consulta e comparação)
  ├─ Dashboard da oferta A
  │    ├─ Contas de anúncios vinculadas (uma ou várias)
  │    ├─ Campanhas → Conjuntos → Anúncios desta oferta
  │    └─ Webhooks, Pixel, UTMs, pedidos e configurações desta oferta
  └─ Dashboard da oferta B
       └─ Seus próprios vínculos e configurações
```

A visão da operação consolida resultados, ofertas e comparações. O gerenciador não opera campanhas nessa visão: pede a seleção de uma dashboard específica. O seletor de dashboard fica sempre visível; não existe seletor “Todas as ofertas” dentro do gerenciador.

Uma conta de anúncios pode ser vinculada a mais de uma oferta quando necessário. Isso **não** importa todas as campanhas dessa conta para cada dashboard. O vínculo de campanha define o recorte; dados de uma campanha compartilhada exigem regra explícita de distribuição e rastreabilidade. Não duplicar investimento por conta do compartilhamento.

No app conectado, o isolamento deve ser aplicado na consulta, API, banco e permissão, e não apenas escondendo linhas na interface. Pedidos fora do produto/oferta configurado não entram na dashboard por consequência de receber um evento na mesma integração.

### Gerenciador dentro da dashboard

- Abas **Contas · Campanhas · Conjuntos · Anúncios**, com configuração de vínculos em contexto.
- Filtros de nome, veiculação, período e **conta de anúncio**. “Todas as contas” significa exclusivamente as vinculadas à dashboard atual.
- Trocar de dashboard limpa filtros e seleções incompatíveis, especialmente conta e campanha pai.
- Campanha → conjunto → anúncio preserva dashboard, conta, período e relacionamento da seleção.
- Totalização usa apenas as linhas do recorte. Nenhuma conta de outra oferta deve aparecer nas opções do filtro.
- Orçamento e status respeitam a unidade e o nível da plataforma; dados indisponíveis aparecem como “—”.
- Métricas adicionais: conta, ID, veiculação, última atualização, orçamento, Page View, CPV, taxa de conexão, taxa de IC, conversão do checkout, conversão vendas/Page View, ARPU, frequência, vendas pendentes/recusadas/reembolsadas, faturamento reembolsado e métricas de vídeo (Hook, retenção, Hold Rate), conforme dados realmente disponíveis.
- Busca de métricas, seleção, ordem e presets. Retenção, mídia, financeiro e identificação precisam de definições e denominadores explícitos. O print é referência de cobertura; não prova que a fonte atual fornece todos os campos.
- Métricas de vídeo e demais campos ausentes ficam sem valor; não serão simulados como resultados reais. Preferências pertencem ao usuário/dashboard/nível do gerenciador.

### Webhooks — campos conforme o provedor

A configuração deve conter nome, dashboard/oferta de destino, produto/condição comercial, URL gerada pelo servidor, eventos e autenticação própria da plataforma. Dentro de uma dashboard a oferta de destino fica fixa: mudar o destino exige fluxo explícito de migração ou criar configuração no contexto correto.

| Provedor | Conferência realizada | Formulário proposto |
| --- | --- | --- |
| Hotmart | Documentação oficial de Webhook e autenticação OAuth | Hottok para validar os eventos; bloco separado de Client ID, Client Secret e Basic quando o conector consultar a API |
| Applyfy | Código atual do endpoint e histórico da integração | Token do Webhook, produto/oferta, nome e eventos; manter a validação do token recebido |
| Cakto | Guia oficial de webhooks | Secret e configuração por produto/evento; verificar a versão e a assinatura exigida no adapter |
| Kiwify | Ajuda oficial confirma cadastro por produto/eventos e teste; especificação detalhada de autenticação não recuperada nesta consulta | Campo de token sinalizado como “a validar”; confirmar contrato antes de ativar, sem copiar a API bancária para o checkout de produtos digitais |
| Demais provedores | Campos ainda não validados individualmente | Mostrar planejamento e bloquear ativação até documentar autenticação, eventos, ciclo de pedido e teste |

**Hotmart:** Hottok não substitui Client Secret; credenciais OAuth não substituem a validação de origem do webhook. As três peças de acesso à API (Client ID, Client Secret e Basic) são documentadas pela Hotmart. O formulário não exige acesso à API para representar apenas o recebimento de notificações; esse complemento é explicitamente selecionado conforme a capacidade do conector.

Os campos de segredo da V6 exibem exemplos fictícios mascarados, com mostrar/ocultar. Não recebem credenciais reais. Na implantação, receberão as credenciais no servidor com proteção adequada à finalidade: um segredo usado apenas em comparação pode ser armazenado como hash; um segredo necessário para assinar ou solicitar acesso deve ser recuperável com criptografia e acesso restrito. Não aplicar a regra de hash do token Applyfy indiscriminadamente a Client Secret/OAuth.

A revisão mostra nome, oferta, plataforma e eventos, sem reproduzir os segredos. Salvar na prévia cria somente rascunho em memória. A URL `.invalid` é ilustrativa e não deve ser cadastrada em um checkout.

### Validação V6

- Pets abriu com duas contas e três campanhas próprias.
- Filtrar a conta de escala retornou somente a campanha dessa conta.
- Trocar para Padel atualizou as contas e não exibiu campanha de Pets.
- Selecionar Portfólio no gerenciador solicitou uma dashboard; não exibiu campanhas consolidadas.
- Rascunho Hotmart de Padel ficou somente em Padel; em Pets permaneceu somente a configuração ilustrativa Applyfy.
- Hottok visível como campo próprio; habilitar consulta à API revelou Client ID, Client Secret e Basic.
- Busca “Page View” filtrou as métricas correspondentes.
- Sem erro JavaScript nos fluxos testados; sintaxe dos scripts e servidor HTTP 200.

### Fontes da especificação

- [Hotmart — Webhook de compra](https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/): Hottok no cabeçalho X-HOTMART-HOTTOK.
- [Hotmart — Autenticação da API](https://developers.hotmart.com/docs/en/start/app-auth): credenciais e geração de access token.
- [Kiwify — Como funcionam os webhooks](https://ajuda.kiwify.com.br/pt-br/article/como-funcionam-os-webhooks-2ydtgl/): seleção de produto/eventos, testes e logs. A página de documentação detalhada vinculada não ficou acessível nesta consulta; a autenticação do adapter permanece pendente de validação.
- [Cakto — Guia oficial de webhooks](https://www.cakto.com.br/blog/o-que-e-webhook): configuração de secret e validação das entregas.
- Applyfy: endpoint local `src/app/api/webhooks/[provider]/[integrationId]/route.ts`, validação existente de payload.token contra SHA-256. Nenhum segredo da conta foi lido nem incluído nesta proposta.

**Arquivos vigentes:** `traffic-flow-preview-v6.html`, `traffic-flow-preview.html` (atalho da versão atual), `prototipo-v6/` e este escopo. A V6 representa a nova estrutura de navegação e configuração para aprovação; o aplicativo publicado continua sem as alterações desta proposta.
