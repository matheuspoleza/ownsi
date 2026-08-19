---
feature: domain-ownership
phase: prd
updated: 2026-08-18
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

*Em aberto. É aqui que a infra adiada (D14) fecha.*

---

## 4. Milestones

*Em aberto. Depois da Seção 3.*

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
