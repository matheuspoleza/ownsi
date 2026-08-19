---
feature: domain-ownership
phase: prd
updated: 2026-08-19
---

# Pesquisa de referências — prova de posse de domínio

O que é este arquivo: um levantamento de como 30 produtos reais desenham verificação de
domínio, feito para embasar o design do produto descrito em `docs/domain-ownership/prd.md`
(prova de posse via registro TXT, com diagnóstico de falha, espera, revogação, coexistência
e recuperação de erro).

Fonte: biblioteca do Mobbin (screens + flows, plataforma web), consultada em 19/08/2026.
Todas as imagens estão em `docs/domain-ownership/references/screenshots/`, nomeadas
`{nn}-{dimensão}-{app}-{o-que-mostra}.webp`. Cada uma tem o link canônico no Mobbin na
tabela da Seção 5 — abra lá se quiser ver o screen no contexto do app.

Este arquivo cobre os screenshots `01`–`40`. Uma segunda rodada, dirigida ao padrão "claim"
(reivindicar um recurso que já tem dono) e à contestação, está em
`docs/domain-ownership/references/claim-patterns.md` e cobre os `41`–`55`.

As dimensões vieram do PRD, não do Mobbin: `instruction` (instrução de setup), `pending`
(espera), `failure` (falha), `partial` (parcialmente verificado), `success`, `list`
(lista/estado agregado), `provider` (adaptação por provedor), `recovery` (apagar/restaurar),
`conflict` (dois donos), `grace` (janela até perder validade), `flow` (jornada inteira).

---

## 1. Como ler a pasta em 30 segundos

| Se você vai desenhar… | Comece por |
|---|---|
| O cartão de instrução do TXT | `01`, `03`, `05`, `06`, `10` |
| A tela de espera | `19`, `21`, `11` — e `18` como contraexemplo |
| A tela de falha | `15`, `16` — e `13`, `14`, `17` como contraexemplos |
| A lista de domínios | `08`, `12`, `09` |
| Instrução adaptada ao provedor | `06`, `29`, `31` |
| Apagar / reativar | `33`, `32`, `39` |
| Segunda conta provando o mesmo domínio | `15`, `37`, `38` |
| Janela de graça de 72h | `39`, `40` |

---

## 2. Síntese por dimensão

### 2.1 Instrução de setup — o cartão do registro TXT

O padrão do mercado é estável e chato: título, parágrafo dizendo "vá no seu provedor de
DNS", uma tabela `Type / Name / Value / TTL` com ícone de copiar por célula, e um botão
"Verify". Quase todo mundo faz isso (`01`, `02`, `04`, `06`, `10`, `12`, `36`).

O que separa os bons dos medianos são três detalhes:

- **Nomear a armadilha do host antes que ela aconteça.** Outseta (`05`) escreve no corpo da
  instrução: *"Many DNS providers will automatically add the `.website-nu-sand-53.vercel.app`
  domain name to the end of the Host field"*. É o duplo append (`_x.acme.com.acme.com`) do
  catálogo de sondas do PRD (D16), avisado **antes** de virar suporte. incident.io (`10`) faz
  o equivalente para Cloudflare: *"be careful to create these records in 'DNS-only' mode, not
  proxy mode"*. **Copiar isso.** No nosso caso o aviso deve ser condicional ao provedor
  detectado, não um parágrafo genérico para todo mundo.
- **Reconhecer que quem clama não é quem tem acesso ao DNS.** Langdock (`03`) coloca, embaixo
  do valor do TXT, um bloco "Don't have access to DNS settings? Send this email to your
  infrastructure team" com **assunto e corpo prontos** (Type/Host/Value + prazo), cada um com
  seu botão de copiar. É a melhor ideia da pesquisa inteira e ninguém mais tem. Encaixa
  direto no nosso público "tem o painel do registrar aberto e nunca ouviu falar de TXT" — e
  no ator que nem painel tem.
- **Detectar o provedor e falar a língua dele.** Resend (`06`) mostra `PROVIDER: Cloudflare`
  como metadado de primeira classe e escreve *"Access the DNS settings page of Cloudflare
  and add all the following DNS records"*. É exatamente a D15 do PRD, já validada em
  produção pela própria Resend.

Detalhes menores que valem roubar: Google Workspace (`01`) oferece **método alternativo**
(TXT ou CNAME) colapsado no mesmo cartão e um checkbox *"Come back here and confirm once you
have updated the code"* que destrava o botão Confirm — o usuário declara que fez, o produto
verifica. Langdock (`03`) mostra **validade do token** ("expires on 29. Apr"); no nosso
produto o token é estável e nunca expira (D4), então o equivalente honesto é dizer isso:
"este valor não muda" — remove o medo de perder a janela.

**Evitar:** o "Go to Cloudflare" do Google Workspace (`01`) é deep link para o painel do
provedor; o PRD corta isso explicitamente (D15) porque o link quebra e envelhece calado.

### 2.2 Espera — o estado mais mal desenhado do mercado

Três qualidades, na ordem:

1. **Pior:** Google Workspace (`18`) — tela inteira, cronômetro, barra indeterminada, *"Leave
   this page open while we verify"*. A espera vira uma prisão: sem informação, sem saída, e
   fechar a aba parece cancelar.
2. **Mediano:** Savee (`20`) e Cloudflare (`21`) — a faixa "5 mins to 48 hours" / "1-2 hours
   but may take up to 24 hours". Honesto sobre a incerteza, inútil como expectativa. É
   literalmente o "pode levar até 72 horas" que o PRD promete não escrever. Cloudflare pelo
   menos diz *"We are checking your status periodically"* e dá um "Check nameservers now" —
   o usuário sabe que o sistema trabalha sem ele.
3. **Melhor:** Resend (`19`) — a página do domínio pendente mostra uma **timeline de eventos
   do domínio** (`Domain added 16/mar 2:02 PM → DNS verified 17/mar 2:41 PM → Verifying
   domain`) mais uma frase de estado *"Looking for DNS records: This may take a few hours
   depending on Cloudflare's propagation time"*. A espera deixa de ser um vácuo porque tem
   histórico, e a estimativa é **atribuída a uma causa** (o provedor).

AWS Amplify (`11`) contribui o stepper vertical com o passo corrente explicado em prosa
("SSL creation in progress… This may take a few minutes") — bom para separar "o que já
passou" de "onde estamos travados".

**O que isso significa pro nosso produto.** A tela de pendência do PRD é uma evolução direta
do `19`: mesma espinha (timeline permanente + frase de estado), mas a frase deixa de ser
"depende do seu provedor" e passa a ser derivada do que a gente já sabe — autoritativo tem o
registro?, existe cache negativo?, quanto falta pelo SOA MINIMUM. Nenhuma referência da
pesquisa quantifica a espera. É espaço vazio de mercado.

### 2.3 Falha — onde todo mundo erra

O padrão dominante é **não diagnosticar**: um alerta vermelho dizendo que não encontrou, e o
resto por conta do usuário.

- Google Workspace (`13`) é o arquétipo do anti-padrão do PRD: *"Unable to verify at the
  moment"*, ilustração simpática, e **três hipóteses numeradas** ("pode ser problema no seu
  host", "confira se apagou MX pré-existentes", "pode levar até 48h"). Três chutes empilhados
  = zero informação. O usuário tem que testar cada um.
- Circle (`17`) reduz a falha a um **toast vermelho** — a informação mais importante da tela
  aparece no elemento mais efêmero dela, e some.
- folk (`14`) escala pra humano: *"Your domain isn't connected yet. You can book a call with
  us"*. Confessa que o produto não sabe o que houve.
- AutoSend (`04`) pelo menos é específico sobre o fato bruto: *"No DNS records found — please
  add the DNS records below"*, com a tabela logo abaixo e um Refresh.

Os dois melhores:

- **Vercel (`15`)** — no fluxo de claim, o erro é *"TXT record not found: The verification TXT
  record was not found. Please add the record shown above and wait a few minutes for it to
  propagate before trying again."* Nomeia o registro exato, e o erro fica **ancorado abaixo da
  instrução que ele contradiz**, não num toast.
- **GitBook (`16`)** — a falha vive dentro do stepper: `✗ Invalid configuration for
  test.example.com`, com os passos seguintes (SSL, status) apagados em cinza, e a explicação
  *"The provided hostname is missing a CNAME record pointing to `…gitbook.io` **or** the
  update has not yet propagated"* + "Try again". Melhor da pesquisa: mostra **onde na cadeia**
  quebrou e o que ainda nem começou. O defeito é o "or": junta "você não criou" e "ainda não
  propagou" numa frase só — as duas causas com consertos opostos (mexer no DNS vs. não mexer
  em nada). É exatamente a separação que o PRD faz consultando o autoritativo (D9/D12).

**Regra de design que sai daqui:** o texto de erro fica no corpo da tela, colado na instrução;
a causa é uma frase, a correção é outra frase, e nunca as duas grudadas com "ou". O que 12 de
12 referências não fazem: distinguir "não achamos" (falha do usuário) de "não conseguimos
olhar" (falha nossa — o `unresolvable` do PRD, D6). Nenhum produto da amostra tem esse
terceiro estado.

### 2.4 Estado parcial e granularidade por registro

AutoSend (`22`) mostra o meio-termo bem: faixa âmbar *"Domain ownership verified.
Configuration pending."* e a tabela com `VERIFIED` e `PENDING` misturados linha a linha. O
status agregado no topo, o detalhe por registro embaixo. Churnkey (`12`) faz o mesmo por
expansão: a linha do domínio tem um badge, e abrir revela os registros com badges próprios.

Nosso produto tem **um** registro TXT, então a granularidade por linha não se aplica — mas a
ideia estrutural sim: **um veredito no topo, evidência crua embaixo**. É o "instrução por
cima, evidência por baixo" da Seção 1 do PRD, e essas duas telas mostram o layout já resolvido.

### 2.5 Sucesso — o padrão é ruído

Modal de parabéns, ilustração, confete implícito: Polywork (`26`), AutoSend (`25`), Google
Workspace (`24`). Todos vendem o próximo passo (ativar Gmail, mandar e-mail de teste) porque
neles a posse é meio para outra coisa. **No nosso produto a posse é o fim** (D2) — não há
próximo passo pra empurrar, então o modal celebratório não tem função.

Os dois que servem:

- **folk (`28`)** — o sucesso **substitui a instrução no lugar**: o passo "Verify CNAME
  records" ganha badge `Verified` e a frase "Your domain has been verified". Sem tela nova,
  sem modal. O usuário volta na página e entende o estado em um segundo.
- **Air (`27`)** — diálogo mínimo, uma frase, um botão. Sem ilustração.

Detalhe a roubar do Polywork (`26`) e do Savee (`20`): *"We will notify you when everything is
working"* / *"You will receive an email when this process is complete"* — a promessa explícita
de e-mail é o que autoriza o usuário a fechar a aba. Combina com a política de notificação do
PRD (e-mail só em mudança de estado, D19).

### 2.6 Lista de domínios

Três tratamentos de status:

- **Badge** (Okta `09`, Churnkey `12`, Hashnode `07`) — compacto, ambíguo: "Setup in progress"
  não diz se falta você agir.
- **Frase** (Copilot `08`) — `Verifying · validating records` / `Active · correct records have
  been entered`. Ocupa mais espaço e **diz o que está acontecendo**. Para um produto cuja tese
  é "a mensagem genérica é o problema", esse é o tratamento certo.
- **Inline sem tela intermediária** (Tally `35`) — depois de adicionar, a linha já mostra
  "Verifying DNS records… · Created just now". Bom para o momento imediatamente após o claim.

Empty state: Tally (`34`) é o mínimo correto — ícone, "No custom domains yet", botão, link
"Learn about custom domains".

### 2.7 Adaptação por provedor

Ninguém na amostra faz detecção de NS e instrução adaptada — Resend (`06`) chega mais perto
mostrando o provedor detectado como metadado. O padrão mais próximo em espírito é o **grid de
plataformas** do Dub (`29`): tiles com logo (React, GTM, Framer, Shopify, WordPress, Webflow)
e, sempre, um tile **"Manual Installation"** como escape. incident.io (`31`) repete a
estrutura com "Create teams manually" no fim da lista.

Lição para o nosso fallback genérico (~6 provedores mapeados + genérico, D15): o fallback não
é um estado de erro, é **um item da lista, no mesmo peso visual dos outros**. E o Dub anota
"Estimated time: 1 hour" no topo — declarar o custo antes de começar é honesto e barato.

### 2.8 Recuperação: apagar, e o que acontece depois

- **Resend (`33`)** — "Delete team" lista o **inventário do que está preso ali** (0 Members,
  1 Webhooks, 1 Domains, 2 API Keys), avisa que "the deletion will be fully processed in 7
  days" e pede o nome digitado. Inventário + prazo + fricção proporcional.
- **Productboard (`32`)** — as consequências são **checkboxes que você precisa marcar**
  ("Remove 1 card from the Portal", "Unlink 1 insight"). Fricção que ensina.
- **Cloaked (`39`)** — o melhor para o nosso caso: *"Your account will be deleted on December
  29, 2023. You'll still have access and be able to restore your account within the next 30
  days."* **Data absoluta + janela de restauração + o que fazer nela.**

O PRD não apaga: arquiva, preserva token e histórico, e devolve tudo pelo autocomplete
(D18). Isso é mais brando que qualquer referência — então a fricção deve ser proporcional:
o `33`/`32` é o modelo para o "apagar definitivamente", não para o "remover".

### 2.9 Coexistência e contestação — quase deserto

Um único achado direto: **Vercel (`15`), "Claim Domain Ownership"** — *"This domain is
registered with another Vercel account. Verify DNS ownership to claim it."* Reconhece que
outra conta já tem o domínio e resolve pela mesma raiz de confiança (prove no DNS), sem
arbitragem humana. Igual à tese do PRD (D7/D8). Detalhe útil: a nota âmbar diz que **você
pode remover o registro depois de verificar** — dá o fim da história junto com o começo.

Duas adjacências, já que ninguém desenha "não fui eu" para domínio:

- **Supabase (`37`)** — "Potential issue detected": nomeia o risco em duas frases e oferece
  **duas saídas rotuladas pela consequência** ("Run without RLS" / "Run and enable RLS"), não
  "OK/Cancelar". É a forma do nosso diálogo de contestação.
- **OKX (`38`)** — antes de reportar, três passos numerados do **que vai acontecer depois**
  ("Make a report → Answer follow-up questions → Receive investigation updates"). O nosso
  equivalente é mais curto e mais forte porque a resolução é do próprio usuário: "apague este
  TXT da sua zona → a gente recheca → a prova da outra conta cai".

### 2.10 Janela de graça

- **Cloaked (`39`)** — data absoluta e reversibilidade explícita (ver 2.8). É o modelo para as
  72h de graça da revogação (D13): *"o registro sumiu em 19/ago 14:20; a prova continua
  válida até 22/ago 14:20"*.
- **ManyChat (`40`)** — depois do prazo, **faixa persistente no topo** ("Your subscription has
  expired and your account is now on the Free plan") + o estado refletido no objeto ("Plan:
  Expired"). Estado degradado tem que ser visível de qualquer tela, não só na página do objeto.

---

## 3. Onde as referências acabam (e o produto começa)

Cinco coisas que **nenhum** dos 30 produtos da amostra faz. Cada uma é um requisito do PRD e,
portanto, o lugar onde este produto se diferencia — e onde não existe padrão pronto pra copiar:

1. **Nomear a causa específica.** Todos param em "não encontrado" ou empilham hipóteses
   (`13`). Ninguém diz "seu provedor anexou o domínio de novo no host: o registro ficou em
   `_app-challenge.acme.com.acme.com`".
2. **Separar falha do usuário de falha nossa.** Nenhum produto tem o terceiro estado
   (`unresolvable`). Todos tratam "não consegui olhar" como "você não fez" — e alguns mandam
   e-mail em cima disso.
3. **Quantificar a espera.** O teto do mercado é "5 min a 48 h" (`20`, `21`). Ninguém deriva
   a estimativa do SOA MINIMUM observado nem diz "o autoritativo já tem, falta o cache".
4. **Recuperação sem retrabalho no DNS.** Nenhuma referência arquiva preservando token, nem
   oferece "reativar e rechecar". Apagar é sempre destrutivo (`32`, `33`).
5. **Contestação self-service.** Vercel (`15`) reconhece o conflito mas o remédio é só "prove
   também". Ninguém mostra ao dono existente **qual registro apagar** para derrubar a prova
   alheia.

## 4. Decisões de design que esta pesquisa sustenta

| Decisão | Referência que sustenta | Referência que ensina o contrário |
|---|---|---|
| Tela de pendência é o estado primário, com timeline | Resend `19`, AWS `11` | Google Workspace `18` (spinner-prisão) |
| Erro no corpo da tela, colado na instrução | Vercel `15`, GitBook `16` | Circle `17` (toast), folk `14` (agenda uma call) |
| Uma causa + uma correção, nunca "ou" | GitBook `16` (chega perto) | Google Workspace `13` (três hipóteses) |
| Status em frase, não em badge | Copilot `08` | Okta `09` ("Setup in progress") |
| Instrução no vocabulário do provedor | Resend `06`, Outseta `05`, incident.io `10` | — |
| Fallback genérico como item de igual peso | Dub `29`, incident.io `31` | — |
| Sucesso substitui a instrução, sem modal | folk `28`, Air `27` | Polywork `26`, AutoSend `25` |
| Graça com data absoluta + como reverter | Cloaked `39`, ManyChat `40` | Savee `20` ("5 mins to 48 hours") |
| Conflito resolvido pela raiz de confiança | Vercel `15`, Supabase `37` | — |
| Bloco "não tenho acesso ao DNS" com e-mail pronto | Langdock `03` | — |

---

## 5. Inventário completo

| # | Arquivo | App | Dimensão | O que mostra |
|---|---|---|---|---|
| 01 | `01-instruction-google-workspace.webp` | Google Workspace | instruction | Cartão TXT (Name/Content/TTL), método CNAME alternativo colapsado, deep link "Go to Cloudflare", checkbox de auto-declaração antes do Confirm — [Mobbin](https://mobbin.com/screens/f238c4b7-1fe5-47a3-9b33-7ec625531ada) |
| 02 | `02-instruction-grok-pending.webp` | Grok | instruction | Página de domínio mínima: badge Pending, data de adição, valor TXT com copiar, "we will confirm ownership within 24 hours" — [Mobbin](https://mobbin.com/screens/68e05949-06ff-43d9-aa74-51ede25936d4) |
| 03 | `03-instruction-langdock-email-to-it.webp` | Langdock | instruction | Bloco "Don't have access to DNS settings?" com assunto e corpo de e-mail prontos pro time de infra; token com data de expiração — [Mobbin](https://mobbin.com/screens/7f2c86d9-1575-49ca-9059-19b7278b0bcc) |
| 04 | `04-failure-autosend-no-records-found.webp` | AutoSend | failure | Alerta "No DNS records found" + tabela de registros pendentes com copiar por célula + Refresh — [Mobbin](https://mobbin.com/screens/2c9c4317-dfc7-4957-a9ca-79169ad9bc97) |
| 05 | `05-instruction-outseta-steps-host-note.webp` | Outseta | instruction | Passos numerados e o aviso do duplo append no campo Host, escrito antes de o erro acontecer — [Mobbin](https://mobbin.com/screens/18bd2af6-3823-4b98-aa54-80ba10af9e15) |
| 06 | `06-instruction-resend-provider-detected.webp` | Resend | instruction / provider | Provedor detectado (Cloudflare) como metadado; registros agrupados por propósito; "Auto configure" — [Mobbin](https://mobbin.com/screens/ee71c976-8c06-4610-b736-afbb27829f87) |
| 07 | `07-list-hashnode-verifying.webp` | Hashnode | list | Tabela URL/Status/Added/Actions com "Verifying"; apex e `www` como linhas separadas — [Mobbin](https://mobbin.com/screens/c049ea4a-0b28-4215-b985-3b61d2c5366b) |
| 08 | `08-list-copilot-status-sentence.webp` | Copilot | list | Status como frase: "Verifying · validating records" / "Active · correct records have been entered" — [Mobbin](https://mobbin.com/screens/7ce56d42-8ac9-457f-a853-05196069789b) |
| 09 | `09-list-okta-domains-table.webp` | Okta | list | Tabela densa com "Setup in progress" e colunas de certificado — badge ambíguo — [Mobbin](https://mobbin.com/screens/3db7378a-0a63-4280-b9dc-5e194ee41bfe) |
| 10 | `10-instruction-incidentio-numbered-warning.webp` | incident.io | instruction | Três passos numerados, aviso "DNS-only, not proxy mode" para Cloudflare, "Domain is pending verification" + Check — [Mobbin](https://mobbin.com/screens/a01b085b-86f0-4b47-b1d8-fed6c8914f6a) |
| 11 | `11-pending-aws-stepper-progress.webp` | AWS Amplify | pending | Stepper vertical com passo corrente explicado em prosa + link pro guia de troubleshooting — [Mobbin](https://mobbin.com/screens/1d706922-62c3-433e-a760-244137f06a5e) |
| 12 | `12-list-churnkey-inline-expand.webp` | Churnkey | list / partial | Linha de domínio expansível revelando registros com status próprio; toast "Sender Domain Added" — [Mobbin](https://mobbin.com/screens/12e97121-20e6-43fc-9e37-1e1b3d1f85ba) |
| 13 | `13-failure-google-workspace-generic-guesses.webp` | Google Workspace | failure | **Anti-padrão:** "Unable to verify at the moment" + três hipóteses numeradas + Retry — [Mobbin](https://mobbin.com/screens/216d90ce-306a-40a9-b705-ebb9e610e41b) |
| 14 | `14-failure-folk-modal-domain-not-connected.webp` | folk | failure | **Anti-padrão:** "Domain not connected" e a saída é agendar uma call com o suporte — [Mobbin](https://mobbin.com/screens/bf89809a-e231-4f22-9ed0-107f92471949) |
| 15 | `15-conflict-vercel-claim-domain-ownership.webp` | Vercel | conflict / failure | "Claim Domain Ownership": domínio já é de outra conta, prove no DNS; erro específico "TXT record not found"; nota de que dá pra remover o registro depois — [Mobbin](https://mobbin.com/screens/50f72208-2525-4367-9875-bd455dcc71be) |
| 16 | `16-failure-gitbook-stepper-per-step-reason.webp` | GitBook | failure | Falha dentro do stepper, passos seguintes apagados, motivo nomeado (mas com "ou" juntando duas causas) — [Mobbin](https://mobbin.com/screens/c91f010e-e624-482e-94f4-56faf97dde22) |
| 17 | `17-failure-circle-toast-cname-not-found.webp` | Circle | failure | **Anti-padrão:** falha só num toast vermelho efêmero; link pra um validador externo — [Mobbin](https://mobbin.com/screens/f6024235-f81b-4f3d-8b01-7e5318f4d13b) |
| 18 | `18-pending-google-workspace-spinner-only.webp` | Google Workspace | pending | **Anti-padrão:** tela inteira de cronômetro, "Leave this page open while we verify" — [Mobbin](https://mobbin.com/screens/1e371ae4-36c5-4162-b543-3a7a1b902759) |
| 19 | `19-pending-resend-event-timeline.webp` | Resend | pending | Timeline de eventos do domínio + frase de estado atribuída ao provedor. Melhor referência de espera da amostra — [Mobbin](https://mobbin.com/screens/6f41111b-5a31-4d83-a3fa-ec3f2064a957) |
| 20 | `20-pending-savee-modal-5min-to-48h.webp` | Savee | pending | "5 mins to 48 hours" repetido duas vezes + promessa de e-mail ao concluir — [Mobbin](https://mobbin.com/screens/11245f96-e28e-4866-b076-0008570c5250) |
| 21 | `21-pending-cloudflare-waiting-registrar.webp` | Cloudflare | pending | "Waiting for your registrar…" com faixa de tempo, "we are checking periodically" e ação manual de recheck — [Mobbin](https://mobbin.com/screens/d6e70ad1-f98f-4b76-a515-fbce32d1ea2e) |
| 22 | `22-partial-autosend-verified-vs-pending-rows.webp` | AutoSend | partial | Veredito agregado no topo ("ownership verified, configuration pending") + status por registro — [Mobbin](https://mobbin.com/screens/bb3e5124-d099-46c2-881a-2e0037cef8ac) |
| 23 | `23-success-ghost-domain-updated.webp` | Ghost | success | Confirmação sóbria com prazo curto e concreto ("up to 30 seconds") — [Mobbin](https://mobbin.com/screens/8db18a96-4ca3-426c-aef8-2518552d6ffb) |
| 24 | `24-success-google-workspace-next-step.webp` | Google Workspace | success | Sucesso vira trampolim pro próximo passo do onboarding — [Mobbin](https://mobbin.com/screens/bb4e586a-3a03-40fb-9620-704c1ae1433f) |
| 25 | `25-success-autosend-checklist-modal.webp` | AutoSend | success | Modal celebratório com checklist de 4 itens e o pendente destacado — [Mobbin](https://mobbin.com/screens/5e7bd582-4c12-44a0-8d3e-cc2b3a4b729c) |
| 26 | `26-success-polywork-you-did-it.webp` | Polywork | success | "You did it!" + ressalva de propagação + "We will notify you when everything is working" — [Mobbin](https://mobbin.com/screens/8c9b757e-ac0e-45d9-a3f1-b0472463be19) |
| 27 | `27-success-air-minimal-dialog.webp` | Air | success | Diálogo mínimo: uma frase, um botão, um toast com o próximo passo opcional — [Mobbin](https://mobbin.com/screens/079f6e54-e75b-4ec0-9a50-1631834ebf66) |
| 28 | `28-success-folk-step-verified-inline.webp` | folk | success | Sucesso substitui a instrução no lugar: o passo ganha badge Verified e frase de confirmação — [Mobbin](https://mobbin.com/screens/53d5ca64-47e3-4745-b549-cd0be5477aca) |
| 29 | `29-provider-dub-per-platform-instructions.webp` | Dub | provider | Grid de plataformas com logo, tile "Manual Installation" como escape, "Estimated time: 1 hour", "I've completed this" — [Mobbin](https://mobbin.com/screens/963b5605-7ef8-43de-a7a0-c30f01b68ee8) |
| 30 | `30-provider-twingate-list.webp` | Twingate | provider | Lista simples de provedores com logo + botão Connect por linha — [Mobbin](https://mobbin.com/screens/f7580bc0-e4e1-4346-bd22-e124d86ce8d6) |
| 31 | `31-provider-incidentio-source-of-truth.webp` | incident.io | provider | Lista de provedores dentro de um stepper, com "Create teams manually" como último item — [Mobbin](https://mobbin.com/screens/0aad6bca-865f-42d0-9d6c-e9ee9ad8a981) |
| 32 | `32-recovery-productboard-consequence-checklist.webp` | Productboard | recovery | Consequências como checkboxes obrigatórios antes de deletar — [Mobbin](https://mobbin.com/screens/d8ca0338-d1d7-4e2a-9243-55567358e202) |
| 33 | `33-recovery-resend-delete-team-inventory.webp` | Resend | recovery | Inventário do que será perdido, prazo de processamento (7 dias) e nome digitado pra confirmar — [Mobbin](https://mobbin.com/screens/52df18d7-8f15-470f-a302-5c407d781091) |
| 34 | `34-flow-tally-empty-state-add-domain.webp` | Tally | flow | Empty state de domínios: ícone, frase, botão, link educativo — [Mobbin](https://mobbin.com/flows/1c80b812-54b6-45ff-bbc1-fbd5b699b1a4) |
| 35 | `35-flow-tally-verifying-inline-status.webp` | Tally | flow / list | Logo após adicionar: "Verifying DNS records… · Created just now" na própria linha, sem tela intermediária — [Mobbin](https://mobbin.com/flows/1c80b812-54b6-45ff-bbc1-fbd5b699b1a4) |
| 36 | `36-flow-peerlist-two-steps-help-per-registrar.webp` | Peerlist | flow / instruction | Dois passos na mesma tela, A vs CNAME com aviso de "não adicione os dois", "Domain not configured yet" + Check, e artigos de ajuda por registrar (GoDaddy/Namecheap/Cloudflare) — [Mobbin](https://mobbin.com/flows/2feb78d3-d4ee-47b5-842d-040b10dcc40c) |
| 37 | `37-conflict-supabase-risk-two-exits.webp` | Supabase | conflict | "Potential issue detected": risco nomeado em duas frases, duas saídas rotuladas pela consequência — [Mobbin](https://mobbin.com/screens/ddc7775d-ddd7-4f5a-90cd-c49e66325dbb) |
| 38 | `38-conflict-okx-report-what-happens-next.webp` | OKX | conflict | Antes de reportar, três passos do que acontece depois da denúncia — [Mobbin](https://mobbin.com/screens/69011940-3f87-4baf-b65c-0b720664bf7c) |
| 39 | `39-grace-cloaked-deletion-date-restorable.webp` | Cloaked | grace / recovery | Data absoluta da perda + janela de restauração explícita + ação para preservar o que importa — [Mobbin](https://mobbin.com/screens/627b7763-1075-4891-9571-57fc9c908510) |
| 40 | `40-grace-manychat-expired-persistent-banner.webp` | ManyChat | grace | Depois do prazo: faixa persistente no topo + estado degradado refletido no objeto — [Mobbin](https://mobbin.com/screens/03b30f47-6ee9-449c-80cc-58456bf3d871) |

---

## 6. Próximo passo

Este documento é insumo da Seção 3 do PRD (`docs/domain-ownership/prd.md`), que está em
aberto. As telas a desenhar, na ordem em que o PRD as prioriza: pendência (2.2), falha
diagnosticada (2.3), instrução por provedor (2.1/2.7), coexistência e contestação (2.9),
revogação com graça (2.10), reativação pelo autocomplete (2.8).
