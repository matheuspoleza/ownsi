---
feature: domain-ownership
phase: tech-design
updated: 2026-08-21
---

# PRD — Prova de posse de domínio

Contexto: take-home "Product engineer" da Resend. Enunciado: *"Build a product experience that helps a user prove ownership of a domain, understand the verification process, when it fails, and recover from mistakes."*

O log completo de decisões, com o *porquê* de cada uma, está em `docs/domain-ownership/decisions.md` (D1–D19). Este PRD é a consequência dele; quando os dois divergirem, o log é a fonte.

---

## 1. Coverage Checklist

**Para quem é.** Quem controla (ou acha que controla) a zona DNS de um domínio e precisa provar isso para um serviço terceiro. Dois formatos da mesma pessoa:
- quem sabe rodar `dig` e quer a evidência crua;
- quem tem o painel do registrar aberto, nunca ouviu falar de registro TXT, e vai copiar e colar o que mandarem.

O produto atende os dois com a mesma tela: instrução no vocabulário do provedor por cima, evidência crua acessível por baixo.

Ator secundário: **o dono já provado**, que não pediu nada e é notificado quando outra conta prova o mesmo domínio.

**Que problema resolve.** Provar posse é uma tarefa de três minutos que rotineiramente consome dias. Não porque seja difícil — porque a falha é silenciosa. "Ainda não verificado" é a mesma frase para: você digitou o host errado, seu provedor ainda não publicou a zona, um cache negativo de 24h está segurando, você criou o registro no `www`, ou o painel embrulhou seu token em aspas. Cinco problemas diferentes, cinco consertos diferentes, uma única mensagem inútil. O usuário responde ao vácuo do único jeito que sabe: espera, mexe de novo, quebra o que estava certo.

**Como é o sucesso.** Três resultados observáveis:
1. O caminho feliz termina em minutos, e o produto diz *quantos* minutos faltam em vez de "pode levar até 72 horas".
2. Quando falha, a tela nomeia a causa específica e a correção exata — não mostra um log e deseja sorte.
3. Nenhum erro do usuário custa refazer o trabalho no DNS. Apagou, arquivou, sumiu: volta com um clique, mesmo token.

**O que está fora, explicitamente.** Domínio de envio (DKIM/SPF/DMARC), prova por e-mail de papel ou arquivo HTML, qualquer capacidade destravada pela posse, arbitragem de quem é o dono legítimo, herança de escopo entre `acme.com` e `app.acme.com`. Cada corte tem razão registrada na Seção 2.

**Superfície nova ou existente.** Greenfield inteiro — front, back, banco, deploy.

**Restrições.** Uma semana, um dev. TypeScript obrigatório. Front e back precisam estar publicamente no ar (revisor abre em horário aleatório: cold start de 50s é a primeira impressão). Entregável final inclui vídeo de 3–5 minutos, então o produto precisa ser demonstrável em fluxo contínuo, sem "aqui eu esperaria dois dias".

---

## 2. Product Requirements

**Goal.** Um usuário prova posse de um domínio escrevendo um registro TXT na zona; quando isso não acontece, o produto diz qual das causas conhecidas é a dele e o que fazer a respeito.

**Target users.**
- **Reivindicante** (primário) — adiciona o domínio, recebe a instrução, escreve no DNS, espera, e é quem falha.
- **Dono já provado** (secundário) — recebe notificação quando outra conta prova o mesmo domínio, e tem um caminho de contestação.

### In scope

**Identidade e claim**
- Login por magic link enviado pela API da Resend; o e-mail é a identidade da conta. (D5)
- Adicionar um domínio gera um token estável por (conta, domínio) e um registro alvo `TXT _<app>-challenge.<domínio>`. O token não muda: nem em recheck, nem em revogação, nem em reativação. (D4)
- Input normalizado na entrada: `HTTP://WWW.Acme.com/path` vira `acme.com`. Punycode/IDN, ponto final, maiúsculas, porta, path. Sufixo público (`co.uk`) gera aviso, não bloqueio. (D10)

**Instrução de setup**
- No momento do claim, o produto consulta os NS do domínio, identifica o provedor e mostra a instrução adaptada àquele painel: nomes reais dos campos, e o valor do host no formato que aquele provedor espera (alguns querem `_app-challenge`, outros o FQDN). ~6 provedores mapeados + fallback genérico. Sem deep link para o painel. (D15)

**Verificação**
- Verificação por múltiplos resolvers públicos via DoH — é o que o mundo enxerga. (D9)
- Toda checagem tem três resultados, nunca dois: `found`, `absent`, `unresolvable`. O terceiro é falha nossa e não conta contra o usuário em lugar nenhum do sistema. (D6)
- Cadência por `next_check_at` derivado de (estado, idade do claim, SOA MINIMUM observado, falhas consecutivas), drenado por um cron de tick fixo. Com a aba aberta, o cliente tem uma faixa rápida com rate limit por conta+domínio. (D11)

**Diagnóstico quando falha**
- Em resultado negativo, o produto consulta os NS autoritativos e separa "você não criou" de "ainda não propagou" — e, no segundo caso, quantifica a espera pelo SOA MINIMUM. (D9, D12)
- Sondas ativas nos lugares onde o registro costuma acabar por engano: duplo append (`_x.acme.com.acme.com`), token no apex, token de outra conta, aspas/espaço, N TXT nenhum casando, CNAME conflitante, NXDOMAIN vs NODATA, confusão com `www`, autoritativo sem o registro, SERVFAIL, lame delegation. Cada uma vira uma frase de causa + uma de correção. (D16)

**Espera**
- A pendência é o estado primário do produto, não uma borda: tela dedicada, com o que já se sabe (autoritativo tem? cache negativo? quanto falta?), não um spinner.
- Pendência nunca expira. Sete dias de checagem ativa com intervalo decrescente, nudges em D+1 e D+3, depois dormência com [Retomar] que revive na hora. Token preservado. (D12)

**Revogação**
- Registro sumiu (`absent`) dispara e-mail imediato e abre 72h de graça: domínio segue válido, com aviso visível. Passado o prazo, a prova deixa de valer. Volta sozinho a válido se o registro reaparecer, sem token novo. (D13)
- Só `absent` avança o relógio. `unresolvable` nunca. (D6, D13)

**Coexistência e contestação**
- Duas contas provam o mesmo domínio e ambas ficam válidas; os donos existentes são notificados com data, método e o e-mail da conta nova como `m•••@acme.com` — local mascarado, domínio visível, porque o domínio é o sinal de reconhecimento. (D7, D17)
- "Não fui eu" mostra qual registro TXT remover da própria zona para derrubar a prova da outra conta — com o token do outro **sem máscara**, já que ele é publicamente consultável via `dig` — mais recheck imediato. A contestação entra na timeline dos dois lados. (D8)
- Se o contestante não consegue remover o registro, o produto diz explicitamente que alguém mais controla o DNS dele, e que esse é o problema urgente.

**Recuperação de erro**
- Remover um domínio arquiva: some da lista principal, token e histórico preservados, para de ser checado, deixa de contar como coexistência. (D18)
- O campo de adicionar domínio faz autocomplete sobre os arquivados; achou um, a ação é "Reativar e rechecar". Se o TXT continua na zona, verifica na hora e o usuário não toca no DNS. (D18)
- Existe "apagar definitivamente" para quem quer sumir de verdade.

**Histórico**
- Timeline por domínio a partir de eventos semânticos de produto, permanente. Evidência crua de cada checagem em log append-only separado, com retenção curta. (D6)
- O evento "provado em 12/mar" fica para sempre. O que expira é a validade corrente, não o registro de que aconteceu. (D13)

**Notificação**
- E-mail só em mudança de estado, nunca em repetição. `unresolvable` nunca gera e-mail. Teto de um e-mail por domínio por tipo de evento a cada 24h. (D19)

### Explicitamente fora de escopo

| Cortado | Por quê |
|---|---|
| Domínio de envio: DKIM, SPF, DMARC, MX | O enunciado diz "prove ownership of a domain", não "verify a sending domain", e não referencia o produto da Resend. A profundidade vem de métodos e de estados de falha, não de mais registros. (D1) |
| Prova por e-mail de papel (`admin@`, `postmaster@`) | Prova o MX, que é uma *delegação* que o dono da zona pode fabricar. Let's Encrypt nunca implementou e o CA/B Forum foi restringindo. (D3) |
| Prova por arquivo HTML | Prova o servidor web — mesma inversão. Sem capacidade destravada, não há escopo que justifique uma prova mais fraca. (D3) |
| Qualquer capacidade atrás da posse | A posse verificada é o produto. Acoplar uma capacidade obrigaria a inventar um produto em volta só pra justificar o fluxo. (D2) |
| Arbitragem de posse: aprovação, transferência, congelamento | O produto não consegue decidir quem é o dono legítimo — as duas contas provaram controle da zona. Aprovação daria poder de veto a quem provou primeiro, inclusive a um atacante. O remédio mora na mesma raiz de confiança da prova: quem controla a zona agora apaga o TXT do outro. (D7, D8) |
| Herança de escopo (`acme.com` → `app.acme.com`) | Consequência de não haver capacidade acoplada: herança seria uma asserção sem consequência. (D10) |
| Bloqueio de sufixos públicos | A prova se auto-protege — ninguém escreve TXT na zona de `github.io`. Aviso basta. (D10) |
| Times, papéis, convite de membro | Uma conta = um e-mail. Multi-tenant real não é o que o enunciado testa e consumiria a semana. |
| Fila dedicada (Redis/BullMQ) | `next_check_at` no Postgres já é uma fila, e mantém o estado do job na mesma transação do estado do domínio. O dual-write que Redis introduz não existe aqui. (D14) |

### Success criteria

- Um domínio com o TXT correto sai de reivindicado para provado sem intervenção manual, e a tela mostra o tempo estimado derivado do SOA em vez de um genérico "até 72h".
- Cada uma das 12 sondas do catálogo (D16) produz, num domínio de teste montado para reproduzi-la, uma frase de causa e uma de correção — não um dump de log.
- Uma queda simulada dos resolvers gera `unresolvable` em massa **sem** enviar um único e-mail e **sem** avançar um único relógio de graça.
- Apagar um domínio provado e reativá-lo pelo autocomplete devolve a prova sem que o usuário abra o painel de DNS.
- Uma segunda conta provando o mesmo domínio: as duas ficam válidas, a primeira recebe e-mail com o e-mail mascarado da segunda, e o fluxo de "não fui eu" mostra o token completo do outro e o botão de recheck.
- O revisor abre a URL pública em qualquer horário e a primeira tela pinta sem cold start perceptível.

---

## 3. Tech Design

> Desenhos: `docs/domain-ownership/diagrams/system-design.png` (topologia) e `context-map.png` (DDD estratégico). Fonte editável na layer `Engineering` do `designs.pen`.

### 3.1 Topologia

Uma origem só. O Worker da Cloudflare serve a SPA estática **e** faz reverse proxy de `/api/*` e `/p/*` para o container no Cloud Run. O browser nunca fala com dois hosts, então o cookie do better-auth é first-party: sem CORS, sem `SameSite=None`, sem subdomínio de API, sem certificado gerenciado.

```
browser → ownsi.dev → CF Worker ┬─ assets estáticos (Vite + React)
                                └─ /api/*, /p/* → Cloud Run (Bun + Elysia) → Neon
                                                        ▲
                                   Inngest Cloud ───────┘   DoH · UDP/53 · Resend
```

| Camada | Escolha | Por quê |
|---|---|---|
| Monorepo | Bun workspaces (`apps/api`, `apps/web`, `packages/db`), Biome | Mesma forma já rodando no Citou |
| API | Bun + Elysia, validação TypeBox (`t.Object`) | Um schema serve runtime, Eden e OpenAPI |
| Contrato | Eden Treaty + `@elysiajs/openapi` | Tipos sem codegen; o `/openapi` é artefato de review |
| Front | Vite + React 19 + TanStack Query + Tailwind 4 + shadcn/ui | Casa com `shadcn.lib.pen` |
| Borda | Cloudflare Worker com Static Assets | Origem única + zero cold start na primeira pintura |
| Runtime da API | Cloud Run (`gcloud run deploy --source .`, sem Terraform) | Caminho conhecido. **Condicionado ao spike de UDP/53** (§3.9) |
| Banco | Neon + Prisma 7 (`adapter-pg`, driver TCP) | Branch de banco por PR; `migrate deploy` no pipeline |
| Relógio | Inngest | `step.sleep` por claim mata o piso do cron |
| E-mail | Resend + React Email | D5/D19 |

Rejeitados e por quê: Next.js (front e back separados é preferência declarada, e a página pública renderizada no Elysia resolve SSR/OG sem framework fullstack) · Terraform/WIF (não se paga numa semana) · Redis (não há fila — §3.7) · Drizzle (Prisma já tem as pegadinhas documentadas e adapter no better-auth).

### 3.2 Contrato de API

Toda rota declara `body`/`params`/`query` **e `response`**. O `response` não é opcional por três motivos que se pagam juntos: fixa o tipo exato no front (elimina `as Foo[]`), impede que um objeto do Prisma serialize campo interno, e preenche a doc no `/openapi`.

```ts
.post("/claims/:id/check", ({ params }) => verifyClaim(params.id, deps), {
  params: t.Object({ id: t.String() }),
  response: CheckState,
})
```

`/api/auth/*` e `/api/inngest` saem da doc via `exclude`.

### 3.3 Arquitetura interna — functional core, imperative shell

A regra da dependência aplicada onde ela paga: o núcleo não importa Elysia, Prisma, Inngest nem `node:dns`.

```
apps/api/src/
  core/          ← puro, sem I/O
    domain.ts      Domain (value object)
    claim.ts       Claim + invariantes
    probes.ts      as 12 sondas (D16)
    diagnose.ts    DnsObservation → Diagnosis
    transition.ts  máquina de estado (D6/D12/D13)
    schedule.ts    nextCheckIn(soa, idade, falhas)
  app/           ← casos de uso, recebem portas por parâmetro
    claim-domain.ts  verify-claim.ts  recover-claim.ts  issue-proof-link.ts
  ports.ts       ← DnsPort · ClaimRepo · CheckLog · EventLog · Mailer · Clock
  infra/         ← dns-doh · dns-authoritative · dns-fake · prisma-repo · resend · inngest
  http/          ← rotas Elysia: valida → chama caso de uso → mapeia resposta
  inngest/       ← funções duráveis: chamam o MESMO caso de uso
```

O núcleo devolve **efeitos como dados**; a casca executa:

```ts
export async function verifyClaim(claimId: string, d: Deps) {
  const claim = await d.claims.load(claimId)

  const recursive = await d.dns.resolveTxtMulti(claim.challengeHost)
  const authoritative = recursive.found ? null
    : await d.dns.queryAuthoritative(claim.domain, claim.challengeHost)

  const diagnosis = diagnose({ recursive, authoritative }, claim.token)   // PURO
  const next = transition(claim, diagnosis, d.clock.now())                // PURO

  await d.tx(async t => {
    await t.checks.append(claimId, { recursive, authoritative, diagnosis })
    await t.claims.apply(claimId, next.state, next.nextCheckAt, diagnosis.code)
    await t.events.append(claimId, next.events)
  })

  for (const e of next.effects) await dispatch(e, d)
  return next
}
```

Consequência direta: "queda dos resolvers não envia um único e-mail" (critério de sucesso da §2) vira uma asserção sobre um array, sem mock de SMTP.

Sem container de DI — `Deps` é parâmetro.

### 3.4 Modelo de domínio

Core domain é **diagnóstico e recuperação**, não a prova. Provar posse é quase commodity; o que o enunciado pede é entender a falha e voltar dela.

**Agregados.** `Claim` (raiz, com as invariantes) · `CheckRun` (append-only, retenção curta) · `ProofLink` (contexto `attestation`, ciclo próprio).

**Value objects.** `Domain` · `Hostname` · `ChallengeToken` · `ClaimState` · `CheckOutcome` · `ResolverAnswer` · `DnsObservation` · `Diagnosis` · `SoaMinimum` · `ProviderProfile` · `MaskedEmail` · `ProofSlug`.

`Domain` é shared kernel entre `claims`, `dns` e `attestation` — normaliza (punycode, ponto final, `www`, esquema, porta, path), consulta a PSL e devolve **também a lista do que aplicou**, porque o modal de "Add domain" exibe o que foi removido. `MaskedEmail` é VO e não formatação de view: ele codifica a regra de privacidade do D17.

**Invariantes, todas testáveis:**
1. `token` imutável por (owner, `domain.ascii`) — recheck, arquivamento e reativação preservam (D4/D18)
2. `outcome` tem três valores; só `absent` avança o relógio de graça (D6/D13)
3. `archived` para de ser checado **e** deixa de contar para coexistência (D18)
4. `bindTo(account)`: se a conta já tem claim para o mesmo domínio, funde e mantém o **token mais antigo** — invariante que o fluxo anônimo dos wireframes introduziu
5. no máximo um e-mail por domínio por tipo a cada 24h (D19)

**Eventos.** `DomainClaimed` · `RecordFound` · `ProofGranted` · `CheckFailed(code)` · `PropagationDetected` · `ClaimDormant` · `ClaimResumed` · `ClaimArchived` · `ClaimReactivated` · `RecordDisappeared` · `ProofExpired` · `OtherAccountProved` · `ContestOpened` · `ProofLinkIssued`.

**Duas regras quebradas de propósito.** Uma transação escreve `Claim` + `CheckRun` + eventos — a invariante "evidência e estado nunca divergem" (D6) vale mais que "uma transação por agregado"; a alternativa ortodoxa é event sourcing e não se paga numa semana. E coexistência fica como domain service dentro de `claims`, não como contexto: é query atravessando contas, e fragmentar daria mapa mais bonito e código pior.

### 3.5 Esquema

```
Claim        id · ownerAccountId? · ownerSessionId? · domainAscii · domainUnicode
             token · state · provedAt? · graceStartedAt? · dormantSince? · archivedAt?
             consecutiveFailures · nextCheckAt? · lastDiagnosisCode?
             @@unique([ownerAccountId, domainAscii])
             @@index([domainAscii])          coexistência (D7)
             @@index([state, nextCheckAt])   reconciliação (§3.7)

CheckRun     id · claimId · outcome · diagnosisCode? · recursive Json · authoritative Json?
             soaMinimum? · latencyMs · createdAt        @@index([claimId, createdAt])

ClaimEvent   id · claimId · type · payload Json · createdAt   permanente

ProofLink    slug · claimId · issuedAt · expiresAt · revokedAt? · lastRecheckAt? · lastRecheckOutcome?
```

`ClaimState` tem **cinco** valores: `PENDING` · `PROVED` · `EXPIRED` · `DORMANT` · `ARCHIVED`. "Propagating" e "At risk" da UI **não são estados** — são derivados de (`state`, `lastDiagnosisCode`, `graceStartedAt`). Modelar cada rótulo da tela como estado explodiria a máquina sem ganho.

`lastDiagnosisCode` é denormalização deliberada: a lista do dashboard mostra a coluna "Next step" sem rodar DNS.

### 3.6 O caminho de uma checagem

1. **Recursivo decide.** Consulta TXT em Google, Cloudflare e Quad9 por DoH, em paralelo (`Promise.allSettled`). Todos falharam → `unresolvable`, e o caminho para aqui: não conta contra o usuário em lugar nenhum (D6).
2. **Autoritativo explica.** Só em resultado negativo: sobe labels até a zona autoritativa real, consulta os NS e lê o SOA. Aqui nasce a distinção "seu provedor não publicou" vs "é cache negativo, faltam ~N min".
3. **Sondas.** As 12 do D16 rodam sobre a `DnsObservation` já coletada — pattern matching, sem rede. Cada uma produz `Diagnosis` com `code`, frase de causa, frase de correção e `evidence { expected, found, highlight }`, que é o que o painel "Evidence" dos wireframes renderiza.
4. **Transição.** `transition` devolve estado novo, eventos, `nextCheckIn` e efeitos.

O resultado que a API devolve para a tela não é `found/absent`: é `{ stages[], diagnosis, resolvers[], nextCheckAt }` — as três etapas do diagrama do wireframe (Nameservers → Record → Token) mais a evidência por resolver.

### 3.7 Agendamento

**Inngest segura o relógio, Postgres segura o estado** (D20). Uma função durável por claim:

```ts
inngest.createFunction(
  { id: "watch-claim", concurrency: { limit: 1, key: "event.data.claimId" } },
  async ({ event, step }) => {
    for (;;) {
      const claim = await step.run("load", () => loadClaim(event.data.claimId))
      if (claim.state === "ARCHIVED" || claim.state === "DORMANT") return
      const r = await step.run("check", () => verifyClaim(claim.id, deps))
      if (r.terminal) return
      await step.sleep("wait", r.nextCheckIn)
    }
  })
```

- `concurrency.key = claimId` garante **um relógio por claim** — sem isso, dois `send` criam dois agendadores.
- Pausar e arquivar não interrompem um `sleep`: a função relê o claim no topo de cada volta e sai. A parada vale no próximo acordar; a UI já mostra "Paused" na hora porque lê do banco.
- `nextCheckAt` no Postgres é **coluna de leitura**, para a UI mostrar "próxima checagem em 22s". Não é fila. Não existe `SKIP LOCKED`, não existe cron de tick.
- Rede de segurança: um cron diário procura claim ativo com `nextCheckAt` vencido e redispara o `send`. É reconciliação, não agendamento.
- O "Check again" manual chama `verifyClaim` direto no request; a checagem é idempotente, então coexistir com o watcher custa uma query DNS a mais.

### 3.8 Segurança e abuso

| Superfície | Mitigação |
|---|---|
| Leitura de zona pré-login (wireframe "Reading the zone") | Rate limit por IP + cache de (NS, SOA) por domínio. Sem isso é um resolvedor DNS aberto |
| Página pública `/p/:slug` faz recheck ao abrir | Cache de 60s por slug + rate limit; acima disso mostra o último resultado |
| Token | 128 bits de aleatoriedade, por (owner, domínio), nunca reutilizado entre contas |
| E-mail de outra conta | `MaskedEmail` — local mascarado, domínio visível (D17) |
| Token do outro na contestação | Exibido **completo**, de propósito: já é publicamente consultável via `dig`, e mascarar só dificultaria achar o registro a apagar (D8) |
| Claim anônimo | Preso ao cookie de sessão; o magic link carrega o `claimId` e faz o `bindTo` |

### 3.9 Riscos e spikes do dia 1

| Risco | Impacto | Spike | Plano B |
|---|---|---|---|
| **UDP/53 de saída no Cloud Run** | Metade do catálogo de sondas depende de consultar nameserver arbitrário | 10 linhas com `dns.Resolver().setServers()` contra um NS conhecido | Direct VPC egress, ou trocar o host por Railway (container puro) |
| **`node:dns` no Bun com `setServers`** | Mesmo impacto | Mesmo spike, local | `dns-packet` sobre `Bun.udpSocket()` (~meio dia), que ainda dá controle fino de timeout por servidor |
| **Domínio verificado na Resend** | Magic link não entrega (D5) | Checar a conta no dia 1 | Managed Better Auth do Neon (e-mail/OTP + Google prontos), perdendo o envio on-brand |

Os três são verificáveis em menos de uma hora somados. Nenhum deve virar descoberta na quinta-feira.

### 3.10 Testes

`bun test`, com o peso no núcleo puro:

- **12 sondas × 1 fixture cada** — `DnsObservation` gravada, asserção sobre `diagnosis.code` e sobre a frase de correção
- **Tabela de transição** — cobre D6/D12/D13: `unresolvable` nunca avança graça, hibernação em 7 dias, reativação preserva token
- **Política de notificação** — o teto de 24h e o "queda em massa não envia e-mail"
- **`Domain.parse`** — punycode, ponto final, `www`, PSL, e a lista de normalizações aplicadas
- Um smoke end-to-end no caminho feliz

`DnsPort` tem duas implementações: DoH real e `dns-fake` reproduzindo respostas gravadas. É ela que torna a demo determinística — o vídeo não pode depender de DNS ao vivo.

### 3.11 Premissas em aberto

Quatro decisões de produto não foram confirmadas. Assumi a recomendação e registrei em D24–D27; reverter é barato e o ponto de reversão está nomeado.

| Premissa | Se mudar |
|---|---|
| "Witnesses" = 3 resolvers públicos independentes; o mapa é ilustração de anycast, não geografia | Fan-out real em 3 regiões: ~1 dia |
| Relógio de graça existe, mas só avança em recheck de verdade (manual ou disparado pela página pública). Sem cron sobre verificados | Restaurar o D13 original: ~1 dia + dois e-mails novos |
| Prova pública como desenhada: link sob demanda, slug próprio, 7 dias, recheck ao abrir | Link permanente tira o relógio; cortar a página tira o grupo `04 Public proof` |
| Magic link (Resend) + Google, better-auth self-hospedado | Só magic link tira as credenciais do Google Console |

---

## 4. Milestones

Uma semana, um dev. Cada dia termina com algo demonstrável no ar — o deploy é o **primeiro** milestone, não o último, porque o revisor abre a URL em horário aleatório.

### D1 — Esqueleto no ar
Spikes de UDP/53, `node:dns` no Bun e domínio na Resend (§3.9). Monorepo Bun, Elysia com uma rota, SPA em branco, Worker fazendo proxy, Neon com `migrate deploy` no pipeline, `gcloud run deploy`.
**Pronto quando:** `ownsi.dev` responde e `/api/health` volta do Cloud Run pelo proxy.

### D2 — Núcleo puro
`Domain`, `probes`, `diagnose`, `transition`, `schedule`. Zero infra, zero rota. Fixtures das 12 sondas.
**Pronto quando:** `bun test` cobre as 12 sondas e a tabela de transição, e nada em `core/` importa Prisma, Elysia ou `node:dns`.

### D3 — Verificação real
`DnsPort` com DoH e autoritativo, `claimDomain`, `verifyClaim`, persistência, timeline de eventos. Registry de ~6 provedores.
**Pronto quando:** um domínio de teste com o TXT correto sai de reivindicado a provado sem intervenção, e um domínio com erro plantado nomeia a causa certa.

### D4 — Relógio e identidade
Inngest `watch-claim` com `step.sleep`, cron de reconciliação, better-auth (magic link via Resend + Google), fluxo anônimo com `bindTo`, e-mails de mudança de estado com o teto de 24h.
**Pronto quando:** fecho a aba, o registro propaga e o e-mail chega.

### D5 — Front do fluxo principal
Claim → leitura da zona → sign-in → tela do registro com estado ao vivo → provado. Evidência estruturada e diagrama de três etapas.
**Pronto quando:** o caminho feliz inteiro roda no navegador, sem Postman.

### D6 — Recuperação e coexistência
`recoverClaim` unificando arquivar/reativar/hibernar/retomar, autocomplete sobre arquivados, coexistência com e-mail mascarado, contestação com instrução de despejo, página pública `/p/:slug` com OG.
**Pronto quando:** apago um domínio provado, digito de novo, e a prova volta sem eu abrir o painel de DNS.

### D7 — Demo
Zona de teste real com as 12 falhas pré-criadas, `dns-fake` com respostas gravadas, README com os tradeoffs (inclusive por que não Redis e a partir de que escala mudaria), vídeo de 3–5 min.
**Pronto quando:** cada uma das 12 sondas tem um domínio que a reproduz ao vivo.

### Escada de corte

Se atrasar, corta nesta ordem — de baixo para cima, e o que está acima nunca é sacrificado pelo que está abaixo:

1. Google OAuth (sobra magic link)
2. Página pública de prova (a prova vira só a tela interna)
3. Contestação (sobra a notificação de coexistência)
4. Provedores mapeados: de 6 para 3 + fallback genérico
5. Sondas: de 12 para as 6 de maior frequência

**Nunca corta:** as três-valias de `outcome`, o diagnóstico nomeado, e a recuperação por reativação. São os três que o enunciado pede pelo nome.

---

## Decisões que sustentam o resto

Tabela compacta. O log completo com alternativas rejeitadas está em `docs/domain-ownership/decisions.md`.

| Tema | Considerado | Escolhido | Por quê |
|---|---|---|---|
| Escopo da prova (D1) | Domínio de envio (DKIM/SPF/DMARC) vs posse genérica | Posse genérica | O enunciado pede "prove ownership", não "verify a sending domain" |
| Método (D3) | DNS + e-mail + arquivo HTML | Só DNS | E-mail e HTTP provam delegações da zona; a zona é a raiz. A força da prova tem que casar com o que ela desbloqueia |
| Registro (D4) | CNAME vs TXT | TXT em host com underscore | RFC 1034: um único CNAME por nome, e CNAME não coexiste com outros tipos. TXT aceita N — que é o formato da coexistência |
| Resultado da checagem (D6) | Booleano vs três valores | `found` / `absent` / `unresolvable` | Colapsar o terceiro faz uma queda nossa revogar domínio de quem não fez nada |
| Resolução (D9) | Autoritativo vs recursivo | Recursivo decide, autoritativo explica | Verificar o que o mundo enxerga; a diferença entre os dois *é* o diagnóstico de propagação |
| Coexistência (D7) | Transferência vs aprovação vs coexistência | Coexistem + notifica | Token por conta torna as duas provas fatos verdadeiros e independentes; casos legítimos (agência/cliente) são comuns |
| Contestação (D8) | Congelar vs arbitrar vs instruir despejo | Instruções de despejo | O produto não arbitra posse, mas quem controla a zona hoje apaga o TXT do outro — o remédio na mesma raiz de confiança |
| Revogação (D13) | Imediata vs nunca vs graça | Graça de 72h reversível | Tolera falha transitória, que é a maioria, sem deixar prova de 2024 de pé com registro sumido há 18 meses |
| Pendência (D12) | Expira em 72h vs nunca expira | Hiberna, não expira | Expirar puniria quem estava certo e era lento, e forçaria voltar ao DNS |
| Remoção (D18) | Apagar vs soft delete vs arquivar | Arquivar + autocomplete | Recuperação no ponto da intenção, sem exigir que o usuário saiba que existe um arquivo |
| Agendamento (D11) | Fila Redis vs `next_check_at` no Postgres | Postgres | Estado do job na mesma transação do estado do domínio; sem dual-write |
| Agendamento (D20) | Postgres como fila vs Inngest como relógio | Inngest | `step.sleep` por claim dá granularidade de segundos; sem fila, `next_check_at` vira leitura |
| Topologia (D21) | Front e back em hosts separados vs uma origem | Worker serve a SPA e proxia `/api/*` | Cookie first-party, sem CORS — e a prova pública sai renderizada no servidor sem framework fullstack |
| Arquitetura (D22) | Clean architecture completa vs núcleo puro | Functional core, imperative shell | O motor de diagnóstico é o produto; puro, cada sonda vira teste com fixture |
| Core domain (D23) | A prova vs o diagnóstico | Diagnóstico e recuperação | Provar posse é commodity; o enunciado pede entender a falha e voltar dela |
