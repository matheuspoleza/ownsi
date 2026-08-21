# Decisões — Domain Ownership (Resend take-home)

Log de decisões da sessão de grilling. Uma linha por decisão: quem decidiu, o quê, por quê.

---

## D1 — Escopo do "provar posse"

**Decidido por:** Matheus
**Decisão:** Prova de posse genérica, não domínio de envio (DKIM/SPF/DMARC).
**Por quê:** O enunciado diz "prove ownership of a domain", não "verify a sending domain", e não referencia o produto da Resend. Modelar DKIM/SPF seria resolver um problema que não foi pedido.
**Ajuste acordado:** A profundidade (falha parcial, fallback, state modeling) vem de **múltiplos métodos de prova**, não de múltiplos registros DNS — mantendo o escopo genérico.

---

## D2 — O que a posse desbloqueia

**Decidido por:** Matheus
**Decisão:** Nada. A posse verificada é o produto em si — não há capacidade acoplada.
**Por quê:** É o que o enunciado literalmente pede. Acoplar uma capacidade obrigaria a inventar um produto em volta só pra justificar o fluxo, e diluiria o foco no que o enunciado enfatiza: entender o processo, falhar, e recuperar.

## D3 — Métodos de prova

**Decidido por:** Matheus (consequência de D2)
**Decisão:** Apenas DNS. E-mail de papel e arquivo HTML são non-goals documentados.
**Por quê:** Escrever na zona DNS é a raiz do controle; e-mail prova o MX e arquivo prova o servidor web — ambos são *delegações* que o dono da zona pode fabricar, nunca o contrário. Sem capacidade acoplada (D2), não há escopo que justifique uma prova mais fraca, então o default correto é a mais forte e só ela.
**Evidência de apoio:** Let's Encrypt nunca implementou validação por e-mail (só DNS-01 e HTTP-01) e o CA/B Forum foi restringindo o método ao longo dos anos.
**Princípio derivado:** A força da prova tem que casar com o que ela desbloqueia.

## D4 — Registro DNS

**Decidido por:** Matheus
**Decisão:** TXT, em host com underscore (`_<app>-challenge.<domínio>`), token estável por (conta, domínio).
**Por quê:** Força de prova é idêntica à do CNAME (ambos exigem escrita na zona; ambos detectam revogação quando o registro some). O que decide é coexistência: RFC 1034 permite um único CNAME por nome e proíbe CNAME coexistir com outros tipos, enquanto TXT aceita N registros no mesmo host — que é exatamente o formato de múltiplas contas provando o mesmo domínio. O ganho do CNAME (rotação server-side) só compensa com token de vida curta, que não é o caso.
**Robustez:** A pergunta pendente à Resend sobre coexistência não bloqueia isso. Se a resposta for "não coexiste", o CNAME volta a ser possível — mas o TXT continua válido. TXT serve os dois cenários.

## D5 — Identidade e login

**Decidido por:** Matheus
**Decisão:** Magic link por e-mail, enviado pela API da Resend. O e-mail é a identidade da conta.
**Por quê:** O cano de envio é necessário de qualquer forma para notificar donos existentes quando uma nova conta reivindica o mesmo domínio — com ele de pé, o magic link custa quase nada a mais. Dá isolamento real por revisor no deploy público (cada um com seu workspace, ninguém pisa no estado do outro) e é on-brand para o vídeo.
**Pré-requisito em aberto:** exige um domínio próprio verificado na conta Resend — `onboarding@resend.dev` só entrega para o dono da conta. Confirmar se há domínio disponível.

## D6 — Modelo de estado e histórico

**Decidido por:** Matheus
**Decisão:** Duas tabelas, não colunas de estado.
- `domain_events` — eventos semânticos de produto (reivindicado, prova concedida, registro sumiu, prova revogada, recheck pedido, dono notificado, outra conta reivindicou). Baixo volume, legível por humano, retenção permanente, alimenta a timeline da UI.
- `dns_checks` — log append-only de toda checagem, com evidência bruta (o que foi consultado, o que voltou, qual resolver, latência, TTL). Alto volume, retenção 30-90d, é o material de debug e de diagnóstico.

**Por quê:** A timeline de produto não é só "estado do DNS ao longo do tempo" — ela guarda eventos que não são checagem (notificação enviada, recheck manual, reivindicação concorrente). Colapsar runs de checagem modelaria só o eixo DNS. Públicos, volumes e retenções diferentes justificam a separação.
**Sub-decisão (tomada por Claude, sem objeção):** eventos semânticos (`prova.revogada`) em vez de transições `de → para` — carregam mais informação, renderizam direto como timeline, e permitem eventos que não mudam estado.
**Invariante crítica:** o outcome de uma checagem tem TRÊS valores — `found` / `absent` / `unresolvable`. Colapsar `unresolvable` em `absent` faz uma queda de infra *nossa* revogar domínios de usuários que não fizeram nada. O relógio de graça só avança em `absent`.
**Risco conhecido:** drift entre as tabelas. Mitigação: evento emitido na mesma transação do caminho de escrita da checagem; `dns_checks` é a fonte da verdade se divergirem.

## D7 — Duas contas provando o mesmo domínio

**Decidido por:** Matheus
**Decisão:** Coexistem, e os donos existentes são notificados quando uma nova conta prova o mesmo domínio (data, e-mail mascarado da conta nova, método, e um caminho de "não fui eu").
**Por quê:** Com token por conta, coexistência cai fora do mecanismo — as duas contas provam fatos independentes e verdadeiros, e casos legítimos são comuns (agência/cliente, staging/prod). Aprovação por dono existente bloquearia esses casos atrás de alguém que pode nunca responder, e o "dono existente" pode ser justamente quem provou primeiro de forma hostil. A notificação é barata e cobre o cenário que importa: DNS comprometido, domínio expirado e re-registrado, ex-funcionário.

## D8 — "Não fui eu" (contestação)

**Decidido por:** Matheus
**Decisão:** Instruções de despejo. O produto mostra qual registro TXT remover da própria zona pra derrubar a prova da outra conta, com recheck imediato, e registra a contestação na timeline dos dois lados.
**Por quê:** O produto não consegue arbitrar posse — as duas contas provaram controle da zona, e nenhuma UI muda isso. Mas quem controla a zona *agora* pode apagar o TXT do outro, então o remédio mora na mesma raiz de confiança que a prova. É a única opção que resolve pelo mecanismo real em vez de inventar uma autoridade. Congelamento automático daria poder de veto a quem reivindicou primeiro (inclusive a um atacante) e puniria o caso legítimo.
**Detalhe de UI:** mostrar o valor COMPLETO do token do outro, não mascarado — ele já está publicamente consultável na zona do próprio contestante via `dig`, então mascarar não protege nada e só dificulta identificar qual registro apagar.
**Mensagem de borda:** se o contestante não consegue remover o registro, alguém mais controla o DNS dele — e esse é o problema urgente, não o app. O produto diz isso explicitamente.

## D9 — Estratégia de resolução DNS

**Decidido por:** Matheus
**Decisão:** Recursivo decide, autoritativo explica.
- **Verificação:** múltiplos resolvers públicos via DoH (Google, Cloudflare, Quad9). É o que o mundo enxerga.
- **Diagnóstico:** consulta aos NS autoritativos do domínio, disparada apenas em resultado negativo, pra distinguir "não criou" de "não propagou".

**Por quê:** A prática de mercado para *verificação* é recursiva — Let's Encrypt, AWS ACM, Search Console, Cloudflare — e o CA/B Forum passou a exigir corroboração de múltiplas perspectivas de rede. O motivo é bom: você quer verificar o que o mundo enxerga, não o que a fonte diz; aprovar pelo autoritativo aprovaria quem ainda não propagou. Consulta autoritativa direta é prática de *ferramenta de diagnóstico* (`dig +trace`, dnschecker.org), não de serviço de verificação — então é exatamente aí que ela entra.
**Degradação:** se egress UDP/53 não passar no runtime, perde-se a camada de explicação, não a de verificação. O produto continua de pé.
**Risco a validar no dia 1:** spike de 10 linhas confirmando egress UDP/53 no runtime escolhido. Cloudflare Workers não suporta (só DoH); Vercel/Lambda geralmente sim; Node server dedicado sempre.
**Bordas conhecidas:** subir labels até achar a zona autoritativa real (subzona delegada), cadeia de CNAME, lame delegation, NS que só atende TCP, timeout e retry por servidor.

## D10 — Escopo de nome (decidido por Claude, sem objeção)

**Decisão:** Cada nome é independente. Provar `acme.com` não concede nada sobre `app.acme.com`.
**Por quê:** Consequência de D2 — sem capacidade acoplada, herança não tem payoff, então só adicionaria uma asserção sem consequência. Se um dia houver capacidade escopada, herança volta à mesa.
**Guardas de entrada:** normalização de input (punycode/IDN, ponto final, maiúsculas, `http://` colado, `www.`, path, porta) e aviso — não bloqueio — para sufixos públicos via Public Suffix List ("`co.uk` é um sufixo público, você provavelmente quis dizer algo.co.uk"). Não é controle de segurança: a prova já se auto-protege, porque ninguém consegue escrever TXT na zona de `github.io`.

## D11 — Cadência de checagem

**Decidido por:** Matheus
**Decisão:** `next_check_at` como política central + faixa rápida no cliente.
- **Política:** coluna `next_check_at` derivada de (estado, idade da reivindicação, TTL/SOA MINIMUM observado, falhas consecutivas), drenada por um cron de tick fixo. O cron não tem intervalo variável — o tick é só o piso da resolução.
- **Sinal principal:** o campo MINIMUM do SOA (RFC 2308) diz exatamente quanto tempo o "não existe" fica em cache negativo. `next_check_at = now() + SOA.minimum` é derivado, não chutado — e vira frase de UI ("os resolvers esquecem o 'não existe' em ~5min").
- **Faixa rápida:** com a aba aberta, o cliente chama o endpoint de check direto (backoff guiado pelo mesmo SOA), com rate limit por conta+domínio. O cron cuida da saúde em background.

**Por quê a faixa rápida no cliente e não empurrar `next_check_at`:** empurrar a data exige cron fino (no Hobby da Vercel o tick é diário, o que mata a opção) e *adiciona* uma camada assíncrona no cliente pra receber o resultado, em vez de remover. O ganho genuíno da alternativa é superfície de abuso menor (um UPDATE idempotente vs N queries DNS), o que importaria em produção com tráfego hostil — aqui o rate limit resolve no nível exigido.

## D12 — Ciclo de vida da pendência

**Decidido por:** Matheus
**Decisão:** Pendência nunca expira, mas hiberna. Checagem ativa com intervalo decrescente por 7 dias + nudges por e-mail em D+1 e D+3; depois marca dormente e para de checar, com [Retomar] que revive na hora. Token preservado.
**Por quê:** A espera pode legitimamente durar dias, então expirar em 72h puniria exatamente quem estava certo e só era lento — e forçaria token novo, ou seja, voltar no DNS de novo. Hibernar preserva o estado sem queimar recurso indefinidamente, e deixa a decisão de desistir com o usuário.

### Contexto de propagação (embasa D11 e D12)

O número "24-72h" vem de troca de nameserver e atualização de glue no registrar. Adicionar um TXT numa zona que já existe é outro problema: o atraso é limitado pelo cache negativo (SOA MINIMUM), tipicamente 300-3600s. **Mediana real: minutos.**

A cauda longa é real e tem três causas nomeáveis:
1. provedores que publicam a zona em lote, não no save
2. SOA MINIMUM absurdo (86400 = 24h de cache negativo)
3. resolvers que ignoram TTL

**A feature:** a consulta autoritativa (D9) diz em qual dos casos o usuário está.
- autoritativo NÃO tem → o provedor dele ainda não publicou. Não é propagação.
- autoritativo TEM, públicos não → é cache negativo, e dá pra dizer quantos minutos faltam.

O medo do 72h é ansiedade não quantificada. O produto quantifica — e a espera é o estado PRIMÁRIO do produto, não uma borda.

## D13 — Revogação

> **Revisado em 2026-08-21 — monitoramento contínuo virou NIT.** O enunciado pede provar posse, entender a verificação, entender a falha e recuperar de erro. Nenhum dos quatro exige rechecagem perpétua de um domínio já provado. A decisão original abaixo continua sendo o desenho certo; o que mudou é que ela sai do escopo do build.
>
> **Decisão vigente:** o produto não revoga sozinho. Ele diz a verdade sempre que perguntado.
>
> | | |
> |---|---|
> | **Fica no core** | Polling enquanto a reivindicação está pendente (D11/D12). Isso é a verificação única acontecendo, não monitoramento: a resposta do DNS não é instantânea. |
> | **Fica no core** | Recheck manual (`Check again`) em qualquer estado, inclusive verificado. Mesmo caminho de código, custo marginal zero, e responde "isso ainda é verdade?" sem cron. |
> | **Sai** | Cron sobre domínios verificados, relógio de graça de 72h, estado `At risk`, revogação automática, e os dois e-mails correspondentes (D19). |
> | **Vira UI** | A tela do domínio verificado mostra `Confirmed <data>` em vez de "checamos todo dia". Ela afirma quando foi confirmado, não que é verdade agora. |
>
> **Por quê:** revogar automático exige uma política (as 72h) que o enunciado não pede, e errar essa política é pior do que não tê-la — é exatamente o modo de falha que o D6 existe para evitar. O custo de acertar (cron sobre todos os verificados, retenção, máquina de restauração, teto anti-spam) é alto para uma semana de build, e nenhuma parte dele demonstra os quatro verbos do enunciado. Não enviando, a classe de risco inteira desaparece.
>
> **Custo aceito:** uma prova antiga cujo registro foi removido segue exibida como provada até alguém pedir recheck. A mitigação é de linguagem, não de mecanismo: a UI data a confirmação em vez de afirmar validade corrente.
>
> **Reativação:** se o monitoramento voltar, tudo abaixo vale como está. Nada aqui foi invalidado, só adiado.


**Decidido por:** Matheus
**Decisão:** Graça de 72h, reversível. `absent` dispara e-mail na hora e abre 72h em que o domínio segue válido mas com aviso visível; passado o prazo, a prova deixa de valer. Volta sozinho a válido se o registro reaparecer, a qualquer momento, sem token novo.
**Por quê:** Simétrico ao lado da pendência (D12) e tolera falha transitória, que é a maioria. Revogar na primeira checagem faria qualquer instabilidade virar revogação — exatamente o modo de falha que a distinção `absent` vs `unresolvable` (D6) existe pra evitar. Nunca revogar enganaria: uma prova de 2024 com registro sumido há 18 meses não deve seguir de pé, porque domínio troca de dono.
**Invariante:** só `absent` avança o relógio de graça. `unresolvable` nunca.
**Coerência com D6:** o evento histórico "provado em 12/mar" permanece no log para sempre. O que expira é a *validade corrente* da prova, não o registro de que ela aconteceu.

---

## D14 — Infra: ADIADO para o tech design

**Decidido por:** Matheus
**Decisão:** Não fechar stack/hospedagem agora. As decisões de produto vêm primeiro; infra volta num technical design.

### Levantamento preservado (não repetir esse trabalho)

**Restrições que caíram das decisões de produto:**
- Egress para consulta DNS autoritativa (D9). UDP/53 no ideal; TCP/53 serve (RFC 7766 torna TCP obrigatório em servidor autoritativo).
- Agendamento com granularidade ~15min ou melhor (D12 promete e-mail quando propagar, com a aba fechada).
- Sem spin-down: revisor abre o link em horário aleatório; free tier que hiberna devolve ~50s de tela branca como primeira impressão.

**Mapa de opções:**

| | Setup | Bun nativo | `node:dns` (D9) | Cron ~15min | Cold start | Provedores |
|---|---|---|---|---|---|---|
| Railway | minutos | sim | direto | first-class, ~$5 | não | 2 |
| Vercel | minutos | sim | direto | cron externo grátis, ou $20 | Fluid, baixo | 1 |
| Cloud Run | ~1h | sim | direto | Scheduler, grátis | não, `min-instances=1` | 2 |
| CF Containers | médio | sim | direto | DO alarm | sim, configurável | 1 |
| Elysia no Workers | minutos | não | TCP à mão (~meio dia) | DO alarm | não | 1 |
| AWS Lambda | horas | layer custom | direto | EventBridge | com provisioned | 2 |

**Fatos apurados:**
- Workers roda workerd (V8), não Bun (JavaScriptCore). `nodejs_compat` dá APIs do Node, não do Bun. Elysia no Workers = adaptador Web Standard, sem Bun por baixo.
- Cloudflare Containers fica *debaixo* do Workers, não ao lado: Worker é porta de entrada obrigatória → DO controla ciclo de vida → container roda. É o único arranjo com DO alarm + Bun nativo.
- Vercel roda Bun nativo em Functions; Elysia entra pelo handler `fetch`. Cron no Hobby é diário.
- Cloud Run: `gcloud run deploy --source .`, `--min-instances=1` mata o cold start. Parear com Neon/Supabase — Cloud SQL é caro demais pro escopo.

**Inclinação registrada (não fechada):** Railway. Processo longo devolve agendamento preciso por claim — a elegância do DO alarm sem depender de Durable Objects. Serverless sempre tem o piso do tick.

**Fila: Postgres, não Redis.** `next_check_at` no Postgres já é uma fila; `FOR UPDATE SKIP LOCKED` dá retirada atômica, e o estado do job fica na mesma transação que o estado do domínio — o dual-write que Redis+Postgres cria simplesmente não existe. Timer em memória vira otimização de precisão, não dependência (tick de 60s pega no pior caso; re-hidrata do banco no boot). Redis ganharia com volume alto, semântica rica de retry, ou rate limit entre instâncias — nenhum é o caso. Documentar no README *por que não* e a partir de qual escala mudaria: "thoughtful tradeoffs and scope" é critério de avaliação, e infra desnecessária é o tell clássico de over-engineering.

---

# Produto

## D15 — Entrega da instrução de setup

**Decidido por:** Matheus
**Decisão:** Detectar o provedor de DNS pelos NS no momento do claim e mostrar instruções adaptadas àquele painel — nomes de campo reais do provedor e o valor de host já no formato que ele espera. ~6 provedores cobertos + fallback genérico.
**Por quê:** O erro nº1 de verificação por DNS não é conceitual, é de nome de campo e de auto-anexo do domínio. Cloudflare chama de "Name", GoDaddy de "Host", Route53 de "Record name"; uns esperam `_acme-challenge`, outros o FQDN — daí sai o clássico `_acme-challenge.acme.com.acme.com`. Instrução genérica devolve ao usuário justamente a tradução em que ele erra. `dig NS` já entrega essa informação de graça antes de o usuário digitar qualquer coisa.
**Rejeitado:** deep link pro painel do provedor — URLs mudam sem aviso, várias exigem zone id que não temos, e link quebrado no momento do setup é pior que link nenhum.
**Atende diretamente:** "make complex setup feel simple" (enunciado) e "communicate technical setup clearly" (critério).

## D16 — Diagnóstico ativo

**Decidido por:** Matheus
**Decisão:** Ao não encontrar o registro no host esperado, disparar consultas nos lugares onde ele costuma acabar por engano e nomear a causa específica com a correção exata.
**Por quê:** Cada erro clássico tem explicação e conserto diferentes. São poucas queries a mais — o melhor retorno por linha de código do projeto. Evidência crua sozinha exige que o usuário saiba ler DNS, que é justamente quem NÃO está travado.

### Catálogo de sondas

| Sonda | O que significa | Correção que o produto dá |
|---|---|---|
| `_acme-challenge.acme.com.acme.com` | registrar auto-anexou o domínio | "use apenas `_acme-challenge` no campo Host" |
| TXT no apex `acme.com` com o token | colou no lugar errado | "mova para o subhost `_acme-challenge`" |
| Host certo, token antigo/de outra conta | resíduo de claim anterior | "esse token não é o seu; substitua por…" |
| Token com aspas / espaço / prefixo | painel adicionou formatação | mostra o valor exato esperado vs recebido |
| N registros TXT, nenhum casa | criou junto dos existentes, errado | lista os que achou, aponta a diferença |
| CNAME no host do desafio | conflita com TXT (RFC 1034) | "remova o CNAME; um nome não aceita os dois" |
| **NXDOMAIN vs NODATA** | nome não existe vs existe sem TXT | "nada foi criado" vs "criou outro tipo de registro" |
| `_acme-challenge.www.acme.com` | confusão com `www` | "o registro vai no domínio, não no www" |
| Autoritativo não tem | provedor não publicou a zona | "não é propagação — salvou mesmo?" |
| Autoritativo tem, públicos não | cache negativo | quantifica pelo SOA MINIMUM (D9/D12) |
| SERVFAIL | falha de DNSSEC ou zona quebrada | distinguir de "não existe" |
| NS não respondem | lame delegation | problema no provedor dele, não no registro |

**Nota:** NXDOMAIN vs NODATA é a distinção que quase nenhum produto expõe e é das mais úteis — separa "você não criou nada" de "você criou o registro errado".

## D17 — O que uma conta vê sobre as outras

**Decidido por:** Matheus
**Decisão:** A conta vê que outras existem, com data da prova e e-mail no formato `m•••@acme.com` — parte local mascarada, domínio revelado.
**Por quê:** O domínio do e-mail é exatamente o sinal de reconhecimento (`m•••@acme.com` é seu time; `r•••@gmail.com` é motivo de alarme) e a parte local é identidade pessoal que não precisa vazar. Mascarar o domínio junto (`m•••@•••.com`) esconderia o único bit útil. Transparência total entregaria o e-mail nominal do time real para quem provou primeiro — inclusive um atacante, que ganharia alvo de phishing.

## D18 — Remoção e re-reivindicação

**Decidido por:** Matheus
**Decisão:** Remoção some da lista principal e move para uma lista separada de arquivados, com token e histórico preservados.
- **Ponto de recuperação:** o campo de adicionar domínio faz autocomplete sobre os arquivados. Achou um, a ação é **"Reativar e rechecar"**, não uma reivindicação nova.
- **Efeito:** como o token é o mesmo, se o TXT ainda estiver na zona a verificação é instantânea — o usuário não toca no DNS.
- Arquivado para de ser checado e deixa de contar como coexistência para as outras contas (D7/D17).
- Existe "apagar definitivamente" para quem quer sumir de verdade.

**Por quê:** Transforma o erro mais comum ("apaguei sem querer") num não-evento, que é literalmente o que o enunciado pede em *recover from mistakes*. Colocar a recuperação no autocomplete do campo de adicionar é melhor que uma seção de arquivados, porque não exige que o usuário saiba que o arquivo existe — a recuperação aparece no momento da intenção.
**Unificação com D12:** duas formas de um claim parar de ser checado — arquivado pelo usuário, ou hibernado por inatividade. Mesma mecânica de estado, dois gatilhos, ambos voltam com um clique.

## D19 — Política de notificação (decidido por Claude, sem objeção)

**Decisão:** E-mail apenas em mudança de estado, nunca em repetição.
| Evento | E-mail |
|---|---|
| Magic link | sim (D5) |
| Prova concedida | sim |
| Registro sumiu (`absent`) | ~~sim, imediato (D13)~~ suspenso enquanto D13 estiver diferido |
| Prova revogada após graça | ~~sim~~ suspenso enquanto D13 estiver diferido |
| Pendência sem resolver | nudge em D+1 e D+3, e só (D12) |
| Nova conta provou seu domínio | sim (D7) |
| `unresolvable` | **não** — é falha nossa, não dele (D6) |

**Regra anti-spam:** no máximo um e-mail por domínio por tipo de evento a cada 24h, e nada de "continua quebrado" recorrente. O relógio de graça já comunica urgência sem repetir.

---

# Técnico

## D20 — Quem agenda

**Decidido por:** Matheus
**Decisão:** Inngest segura o relógio; o Postgres segura o estado. `next_check_at` vira coluna de leitura.
**Por quê:** `step.sleep` dá agendamento por claim com granularidade de segundos — o que a UI promete ("próxima checagem em 22s") e o que o D11/D14 tinham como problema em aberto, resolvido no serverless só com tick fixo. Com o relógio fora, a fila no Postgres deixa de existir: sem `FOR UPDATE SKIP LOCKED`, sem query de drain, sem cron de tick. A conclusão do D14 ("não traga Redis") continua de pé por outro motivo: não há fila para o Redis melhorar.
**Invariante:** um relógio por claim, garantido por `concurrency: { limit: 1, key: claimId }`. Dois `send` sem isso = dois agendadores disputando o mesmo domínio.
**Fronteira:** todo `step.run` lê e escreve o Postgres. Se o Inngest sumisse, o `next_check_at` ainda descreveria a verdade e um cron burro reconstruiria a fila. Se essa disciplina cair, o dual-write que o D14 rejeitou volta.
**Bordas:** pausar e arquivar não interrompem um `sleep` — a função relê o claim no topo de cada volta e sai; a parada vale no próximo acordar, e a UI já mostra o estado na hora porque lê do banco.

## D21 — Stack e topologia

**Decidido por:** Matheus
**Decisão:** Bun + Elysia + Eden na API, Vite + React na Cloudflare, Neon + Prisma, better-auth self-hospedado, Inngest, Resend. Uma origem só.
**Por quê:** preferência declarada por front e back separados com tipagem end-to-end, e é a stack já rodando no Citou — pegadinhas documentadas valem mais que preferência de ferramenta numa semana.
**Uma origem:** o Worker serve os assets e faz proxy de `/api/*` e `/p/*` para o Cloud Run. Cookie first-party, sem CORS, sem `SameSite=None`, sem subdomínio de API. E resolve a página pública de prova sem framework fullstack: o Elysia renderiza o HTML, o Worker proxia, as OG tags são reais.
**Prisma e não Drizzle:** as pegadinhas do Prisma 7 já estão escritas e o better-auth tem adapter. Trocar de ORM por preferência custaria mais do que rende.
**better-auth self-hospedado e não o Managed do Neon:** o Managed é real (better-auth 1.4.18 no schema `neon_auth`, Google OAuth pronto, free até 60k MAU), mas não documenta magic link com provedor de e-mail próprio — e mandar o magic link pela API da Resend é decisão de produto num take-home da Resend, não detalhe de implementação. Vira plano B se o domínio verificado na Resend não existir.
**Em aberto:** Cloud Run depende do spike de UDP/53. Railway é o plano B.

## D22 — Arquitetura interna

**Decidido por:** Matheus
**Decisão:** Functional core, imperative shell. `core/` puro (Domain, sondas, diagnose, transition, schedule) sem importar Elysia, Prisma, Inngest ou `node:dns`. Casos de uso recebem portas por parâmetro; sem container de DI.
**Por quê:** clean architecture inteira não se paga com seis tabelas, mas a regra da dependência tem um lugar óbvio aqui: o motor de diagnóstico é o produto. Puro, cada uma das 12 sondas vira teste com fixture — que é o que se demonstra no vídeo.
**Efeitos como dados:** o núcleo devolve `effects[]`, a casca executa. É isso que faz "queda dos resolvers não envia um único e-mail" ser asserção sobre array em vez de mock de SMTP.
**Payoff concreto:** o botão "Check again" e o `step.run` do Inngest chamam o mesmo `verifyClaim`. O Inngest é adaptador, não orquestrador.
**Custo aceito:** uma transação escreve dois agregados (`Claim` + `CheckRun`), violando "uma transação por agregado". A invariante do D6 vale mais que a regra; a alternativa ortodoxa é event sourcing.

## D23 — DDD e nomes

**Decidido por:** Matheus
**Decisão:** Core domain é **diagnóstico e recuperação**, não a prova. Contextos: `claims` e `dns` (core), `providers` e `attestation` (supporting), `identity`, `notifications`, `scheduling` (genéricos). `Domain` é shared kernel.
**Por quê:** provar posse é quase commodity — gera token, escreve TXT, lê de volta. O enunciado pede entender a falha e recuperar do erro, e é aí que mora a diferenciação. Isso muda onde o esforço vai: modelo rico e teste exaustivo em `Diagnosis`, mínimo suficiente em CRUD de claim.
**Relações:** `claims`→`dns` é Customer–Supplier com linguagem publicada (`DnsObservation`, `Diagnosis`); `dns`→`providers` é Open Host Service; `claims`→`identity` é Anticorruption Layer — nosso domínio nunca conhece o `User` do better-auth, porque a lib versiona o schema dela.
**Nome:** `Domain`, não `DomainName`. Cheguei a defender `DomainName` pela colisão com o vocabulário de DDD, mas o enunciado diz "claim a domain" e "prove ownership of a domain" — o enunciado é a linguagem ubíqua. Quem cede é a pasta: `core/` em vez de `domain/`.
**Casos de uso nomeados pelos verbos do enunciado:** `claimDomain`, `verifyClaim`, `diagnose`, `recoverClaim`. O último unifica D12 (hibernação) e D18 (arquivamento), que hoje são dois mecanismos com o mesmo desfecho.
**Contexto que não virou contexto:** coexistência. É query atravessando contas, não agregado; fica como domain service dentro de `claims`.

---

# Premissas — decididas por Claude sem confirmação, reversão barata

## D24 — "Witnesses"

**Decisão:** três resolvers públicos independentes (Google, Cloudflare, Quad9) a partir de uma região. A copy dos wireframes ("resolvers em seis continentes") é reescrita e o mapa-múndi passa a ilustrar anycast, não geografia.
**Por quê:** DoH a partir de um servidor não é multi-continente. Afirmar o que a arquitetura não entrega é o tipo de detalhe que um revisor técnico pega.
**Reverter custa:** ~1 dia para fan-out real em 3 regiões com agregação.

## D25 — Expiração

**Decisão:** o relógio de graça de 72h existe e as telas "Record disappeared" e "Proof expired" ficam — mas o relógio só avança quando um recheck acontece de verdade (manual, ou disparado por alguém abrindo a prova pública). Nenhum cron sobre domínios verificados.
**Por quê:** meio-termo entre o D13 original e a revisão que o suspendeu. Preserva as duas telas desenhadas e não traz o custo que a revisão queria evitar — cron sobre todos os verificados, retenção, máquina de restauração, teto anti-spam.
**Reverter custa:** ~1 dia para o D13 original, mais dois e-mails novos e a classe de risco que o D6 existe para evitar.

## D26 — Prova pública

**Decisão:** como desenhada. Link criado sob demanda ("Create a public link"), slug próprio — **não** o token DNS —, expiração de 7 dias, recheck ao abrir com cache de 60s e rate limit.
**Por quê:** é o clímax narrativo do produto e o que transforma a prova em artefato compartilhável. Slug separado do token porque são coisas diferentes: um identifica uma página, o outro é o segredo publicado na zona.
**Reverter custa:** link permanente tira o relógio (~meio dia a menos); cortar tira o grupo `04 Public proof` inteiro.

## D27 — Autenticação

**Decisão:** magic link pela Resend **e** Google OAuth, better-auth self-hospedado.
**Por quê:** o D5 fechou só magic link, mas o wireframe de sign-in mostra os dois, e o better-auth entrega ambos na mesma config. O Google tira o atrito do revisor que abre o link às 23h e não quer esperar e-mail.
**Reverter custa:** só magic link tira as credenciais do Google Console (~1h a menos).
