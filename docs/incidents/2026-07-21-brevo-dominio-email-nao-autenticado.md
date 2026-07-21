# Incidente: domínio de e-mail não autenticado na Brevo (formulário de contato)

**Data:** 2026-07-21
**Severidade:** Alta (formulário de contato do app inoperante — nenhum e-mail saía)
**Status:** Resolvido. `contato@culturanacional.com.br` autenticado e verificado; teste ponta a ponta confirmado.

## Sintoma

A Edge Function `send-email` (Supabase) respondia com sucesso na comunicação
com a API da Brevo, mas o envio real do e-mail era rejeitado:

```
Sending has been rejected because the sender you used
contato@culturanacional.com.br is not valid. Validate your sender or
authenticate your domain.
```

Toda a infraestrutura ao redor (Cloudflare, Email Routing, Supabase, Edge
Function, comunicação com a API da Brevo) estava funcionando. O bloqueio era
100% autenticação de domínio/remetente do lado da Brevo.

## Causa raiz

Na tela **Brevo → Senders, Domains and Dedicated IPs → Domains**, existiam
**dois domínios cadastrados** ao mesmo tempo:

- `culturanacional.com.br` (branded subdomain: `mail`) — o domínio real, de
  onde sai `contato@culturanacional.com.br`.
- `mail.culturanacional.com.br` (branded subdomain: `link`) — um domínio
  **duplicado por engano**, cadastrado como se fosse um domínio de envio
  próprio. Gerou registros DNS conflitantes (`img.link.mail...`,
  `link.mail...`, `r.link.mail...`) que o usuário já tinha notado como
  "incompatíveis" antes desta sessão.

Os dois apareciam como "Não autenticado", e nenhum dos dois batia
exatamente com os registros DNS que existiam no Cloudflare.

## Tentativa que não funcionou: delegação NS

Depois de excluir o domínio duplicado, tentamos autenticar
`culturanacional.com.br` usando a opção **"Configuração gerenciada pela
Brevo" (NS records)** — delegar todo o subdomínio `mail.culturanacional.com.br`
via 2 registros NS (`ns1.sendinblue.com` / `ns2.sendinblue.com`) apontados no
Cloudflare com `Name: mail`.

**Não propagou de forma confiável em mais de 24h.** Diagnóstico feito:

- `whatsmydns.net` (tipo NS) mostrou propagação inconsistente: 3 servidores
  verdes numa checagem, 0 verdes na checagem seguinte ~24h depois — sem
  padrão de melhora.
- Consulta direta contra os nameservers autoritativos do domínio
  (`damon.ns.cloudflare.com` / `vida.ns.cloudflare.com`, via
  `nslookup.io` aba "Authoritative") não retornou os NS do subdomínio
  `mail` — sinal de que a delegação não estava realmente "cortando" a
  zona como esperado, mesmo com o registro correto no painel do
  Cloudflare.

Não foi identificada a causa exata desse comportamento (a documentação do
Cloudflare confirma que delegação de subdomínio via NS é suportada no plano
Free). Dado o tempo já gasto sem sinal de melhora, a decisão foi abandonar
essa estratégia em vez de continuar investigando.

## Correção aplicada

Trocado o método de autenticação na Brevo de "NS records" para **"Registros
DNS individuais"** (manual), que aponta a autenticação real para a **raiz do
domínio** em vez do subdomínio `mail`:

| Tipo  | Nome                  | Conteúdo (padrão)                                  |
|-------|-----------------------|-----------------------------------------------------|
| TXT   | `@` (raiz)             | `brevo-code:...`                                    |
| CNAME | `brevo1._domainkey`    | `b1.culturanacional-com-br.dkim.brevo.com`           |
| CNAME | `brevo2._domainkey`    | `b2.culturanacional-com-br.dkim.brevo.com`           |
| TXT   | `_dmarc`               | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`   |
| CNAME | `mail`                 | `...brand.brevosend.com` (marca/link tracking)       |
| CNAME | `img.mail`             | `...img.brand.brevosend.com` (link tracking)         |
| CNAME | `r.mail`               | `...r.brand.brevosend.com` (link tracking)           |

Os 2 registros NS da tentativa anterior foram removidos do Cloudflare antes
de criar os CNAMEs acima (não podem coexistir no mesmo nome `mail`).

Registros TXT/CNAME propagaram e autenticaram em minutos (bem mais rápido e
previsível que a delegação NS). Depois da autenticação:

1. Remetente `contato@culturanacional.com.br` adicionado em
   **Brevo → Senders** — ficou **verificado automaticamente** (sem clicar em
   link de confirmação), porque o domínio já estava autenticado.
2. Teste da Edge Function `send-email` via painel do Supabase (aba "Test
   send-email" de Edge Functions), com JSON puro no Request Body — retornou
   `success: true` e `messageId` real da Brevo.
3. E-mail confirmado recebido em `culturanacionalbr@gmail.com` via Cloudflare
   Email Routing.

## Prevenção futura

- **Ao cadastrar um domínio na Brevo, cadastre só o domínio raiz.** Não
  cadastre o subdomínio de marca (`mail.*`, `link.*`, etc.) como domínio
  separado — ele é gerenciado automaticamente dentro da configuração do
  domínio raiz. Cadastrar os dois gera registros DNS conflitantes difíceis
  de diagnosticar.
- **Prefira "Registros DNS individuais" a "NS records" pra domínios no
  Cloudflare Free**, pelo menos até entender melhor por que a delegação NS
  não propagou neste caso. Registros TXT/CNAME diretos são mais previsíveis
  e mais fáceis de depurar (dá pra conferir cada um individualmente no
  painel do Cloudflare, sem depender de propagação de zona inteira).
- **Pra testar Edge Functions do Supabase que recebem JSON**, usar o painel
  "Test" da própria função (aba Edge Functions → função → botão de teste) e
  colar **só o JSON no Request Body** — não colar o comando `curl` inteiro
  ali, o campo já é só o corpo da requisição.
- Se precisar depurar propagação de DNS de novo, **consultar direto os
  nameservers autoritativos do domínio** (visíveis em Cloudflare → DNS →
  Settings → "Cloudflare Nameservers") via uma ferramenta que permita
  servidor customizado, em vez de confiar só em checadores de propagação
  pública — eles podem mostrar cache desatualizado por muito mais tempo que
  o esperado.
