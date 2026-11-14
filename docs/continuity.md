# Continuidade — 14/11/2026

O usuário pediu a conclusão do app e autorizou acesso ao projeto na Vercel, Supabase e GitHub. Após comparar os ambientes, escolheu explicitamente **manter o banco existente**, sem migrar para o V2.

## Base oficial

- Código: `/Users/gledsoncandido/Documents/traffic-flow`.
- Supabase em uso: `ipgcstfddlflzrrotbtj`; credenciais locais existentes, não transcritas neste documento.
- Supabase acessível pelo conector: `dzgkjgssslrbaubmjlta` (traffic-flow-v2), com esquema diferente e sem registros nas tabelas consultadas. Não recebeu alterações.
- Projeto de teste: Entrenamientos de Padel, `d64ceaf7-a6f8-441f-b552-b2b9a29460fe`.
- Outro projeto existente: Protocolo Secreto Africano. Ambos preservados.
- Vercel: equipe `team_nPfHHA20TMSHIQ5rCdax2rbO`, projeto recriado `prj_Xf6Pwlz0Wee4KIFMMQIVBdUddOL1` (traffic-flow). O projeto salvo anteriormente não foi encontrado.
- URL anterior a recuperar: https://traffic-flow-blond.vercel.app.
- GitHub localizado no navegador: https://github.com/gledsonfilho6792-tech/trafficflow. Estava vazio, sem commits, em 14/11/2026.
- Pasta de documentos: `/Users/gledsoncandido/Documents/ChatGPT/Traffic Flow - APP de Trackeamento`.

## Alterações implementadas

- Conferidas as RPCs de vendas no banco existente: resumo retorna `token_pending`; análise separa atribuição. Migration 029 existe localmente. Nenhuma migration foi reaplicada.
- Adicionado `token_pending` ao seletor de atribuição em Vendas.
- Configurações passou de placeholder a formulário de nome/fuso. Server Action valida o usuário e a propriedade; preserva moeda base e slug. Salvamento validado pelo navegador mantendo os valores atuais.
- O endpoint existente de saúde de tracking ganhou diagnóstico por período móvel (24h/7d/30d) e fonte, com contagens exatas, tokens criados/usados e três grupos exclusivos de pedidos.
- Token usado significa `last_used_at` preenchido pelo resolvedor de pedidos. Token criado sem uso não significa falha nem pedido pendente.
- O filtro por fonte só inclui pedidos já vinculados a ela; pedidos sem fonte ficam no agregado Todas as fontes.
- Corrigido o proxy que redirecionava visitantes anônimos de `/traffic-flow.js` para `/login`.
- Corrigidos os apontamentos de lint nos componentes legados, agendando/cancelando trabalho inicial dos efeitos, estabilizando cliente/memos e mantendo os ciclos de atualização existentes.
- Metadados e idioma da aplicação corrigidos para Traffic Flow/pt-BR.
- Next e eslint-config-next atualizados para 16.4.6. Dependências transitivas corrigidas; override de minimatch 11.0.1 restrito ao typescript-estree, que usa a API nomeada `minimatch`. Node local e Vercel: 24.x.

## Evidências e limites

- Instalação limpa e validação em `/tmp/traffic-flow-validation`, devido a dependências descarregadas pelo iCloud na pasta original. Código e lockfile finais devem permanecer sincronizados com a pasta oficial.
- Lint, TypeScript e build aprovados; repetir quando houver alterações posteriores.
- Auditoria npm chegou a zero vulnerabilidades após as atualizações.
- Diagnóstico consultou 8 sessões, 32 eventos, 6 tokens e 4 pedidos históricos (2 atribuídos e 2 não atribuídos), antes de executar um novo E2E.
- Teste de projeto inexistente retornou contagens zeradas.
- Teste controlado adicional criou sessão/eventos/token e resolveu campanha/conjunto/anúncio Meta. Não criou pedido nem efetuou pagamento.
- O teste de checkout confirmou o token em `utm_term` na URL Applyfy.
- Não foi feita instalação do script em página real nem alteração de anúncio.
- Não considerar venda real ponta a ponta validada nesta execução sem confirmação de webhook/pedido.
- A frequência atual das automações externas ainda precisa ser confirmada após restaurar a URL.

## Oferta de teste escolhida pelo usuário

O usuário indicou a aba Applyfy e o produto **83 Receitas Naturais para seu cão**, autorizando obter um checkout por lá.

- Produto: `cmq5rfc7901vb01ony4ln6dmo`.
- Oferta brasileira de R$ 17,90: https://checkout.applyfy.com.br/checkout/cmq5rfc7a01vc01onuuxebuzc?offer=4RDCFIR.
- Oferta alternativa de R$ 27,90: mesmo checkout com `offer=BFT2DNI`.
- Página de vendas cadastrada na Applyfy: https://astonishing-rugelach-0db843.netlify.app/#oferta. Cadastro ainda não comprova que seja a página atual em operação.
- Estes links foram somente consultados; a oferta não foi editada.
- Separar operação real de Pets dos projetos existentes. O laboratório controlado usa o contexto Meta do projeto Padel; isso não significa que suas campanhas sejam da oferta Pets.

## Fontes de segurança consultadas

- https://github.com/advisories/GHSA-2464-fhr4-w9xw
- https://github.com/advisories/GHSA-673q-mjm6-r5xr

As versões afetadas e corrigidas foram conferidas antes da atualização. Os dados de produção e os segredos não foram copiados para a documentação.

## Estado confirmado ao finalizar a recuperação

- GitHub recebeu os commits da recuperação e foi conectado ao projeto Vercel. Segredos ficaram fora do repositório; foi feita varredura dos caminhos publicados.
- URL https://traffic-flow-blond.vercel.app recuperada, associada ao projeto e verificada. A associação acompanha futuros deploys de produção.
- Build remoto com Next 16.4.6 e auditoria zero vulnerabilidades aprovado antes da promoção.
- Em produção: `/login` 200, `/traffic-flow.js` 200 para visitante sem login, health do Supabase 200 e API de diagnóstico sem sessão 401.
- E2E também aprovado no domínio de produção: sessão, eventos, token e entidades Meta resolvidos.
- Sincronização completa Meta executada com sucesso: 11 campanhas, 11 conjuntos e 20 anúncios. Zero insights recebidos no dia consultado, sem inventar investimento.
- Cron hot voltou a executar após a recuperação da URL, com sucessos às 05:07 e 05:08 UTC de 14/11/2026. Não foi criado agendamento duplicado.
- Varredura de erros do deploy publicado nos primeiros 15 minutos retornou zero registros de erro.
- O usuário confirmou: Pets deve ser usada **somente no teste controlado por enquanto**. Não criar operação real de Pets nem instalar script na PV a partir dessa indicação.
- Webhook Applyfy existente confirmado no painel: destino do projeto Padel, filtro Todos os produtos. Configuração e token não foram alterados. Antes da operação real, separar os produtos por projeto.
- Adicionada navegação para telas abaixo de `lg`, pois a sidebar ficava oculta sem alternativa. A tentativa de viewport virtual no Chrome não alterou a largura real; não registrar essa tentativa como prova de visualização em celular.
- Dependências da pasta original reinstaladas com sucesso (zero vulnerabilidades). Caches anteriores preservados como `.node_modules-before-20261114` e `.next-before-20261114`, ambos ignorados no Git/deploy. Não publicar esses diretórios.

A última validação comercial continua dependente de um pedido de teste recebido via Applyfy. Abrir checkout e transportar token não confirma o recebimento de um pedido ou uma aprovação de pagamento. Nenhuma compra foi feita nesta execução.
