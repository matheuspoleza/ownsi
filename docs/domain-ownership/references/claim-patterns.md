---
feature: domain-ownership
phase: prd
updated: 2026-08-19
---

# Recorte: o padrão "claim" — reivindicar algo que já tem dono

Este documento aprofunda uma dimensão específica da pesquisa geral em
`docs/domain-ownership/references/README.md`: como produtos desenham o momento em que
**alguém reivindica um recurso que outra conta já registrou**, e o momento simétrico em que
**o dono existente reage**.

O gatilho foi a tela `15-conflict-vercel-claim-domain-ownership.webp` — *"Claim Domain
Ownership: This domain is registered with another Vercel account. Verify DNS ownership to
claim it."* É a única referência da primeira rodada que trata o conflito de posse como fluxo
de produto em vez de ticket de suporte, e é a mesma tese do PRD (D7/D8): não há árbitro; a
disputa se resolve na mesma raiz de confiança que a prova.

Screenshots `41` a `55` em `screenshots/`. Os `01`–`40` são da pesquisa geral.

---

## 1. As quatro famílias de "claim"

### A. Reivindicar um recurso já registrado por outra conta

O recurso existe, alguém já o tem, e você prova que também controla a raiz.

- **Vercel (`15`)** — o modelo. Diz *quem* tem (outra conta Vercel), *o que fazer* (TXT em
  `_vercel.<domínio>`), e — o detalhe que quase ninguém tem — *o que acontece depois*: "You
  can remove the record after verification is complete". O usuário recebe o fim da história
  junto com o começo.
- **Otter.ai (`46`)** — claim implícito por domínio de e-mail: *"Based on your email, you may
  be interested in joining the workspace with other @content-mobbin.com members"*, e mostra
  **quem administra**, sem máscara: `Managed by jsmith@content-mobbin.com`. Note a assimetria
  com o nosso caso: aqui o e-mail do dono aparece inteiro porque os dois já compartilham o
  domínio; no nosso, contas de domínios diferentes podem provar o mesmo domínio, e por isso a
  D17 mascara o local (`m•••@acme.com`) mantendo o domínio visível.
- **Hex (`47`)** — lista os workspaces que o e-mail alcança + *"If you don't see your
  workspace, try a different email"*. Nomeia a hipótese mais provável de erro (conta errada)
  em vez de deixar o usuário travado.
- **Notion (`48`)** — "Join teammates or create a workspace": as duas saídas no mesmo peso,
  sem empurrar nenhuma.

**Para nós:** o cenário do PRD é mais brando que todos esses — as duas contas ficam válidas,
não há "entrar no workspace do outro". Mas a estrutura da mensagem de `15` é reaproveitável
inteira: *quem já tem* → *o que você faz* → *o que acontece depois*.

### B. Reivindicar uma listagem/perfil com atestação de identidade

Quando não existe raiz técnica de confiança, o produto compensa com declaração formal e
documentos.

- **Tripadvisor (`41`)** — "Claim your listing" em dois passos (*Claim your listing* →
  *Verify your identity*), com **Role at business** e uma atestação assinada por checkbox:
  *"I certify that I am an authorized representative or affiliate of this establishment and
  have the authority to register as a business representative. The information I have entered
  into this form is neither false nor fraudulent, and I understand that Tripadvisor may
  disclose my name and affiliation to other verified representatives of this establishment."*
  Duas ideias fortes: (1) a reivindicação é **on the record**; (2) o produto avisa, no ato,
  que **vai contar aos outros representantes verificados**. É exatamente a notificação de
  coexistência da D17 — só que declarada *antes*, para quem está reivindicando, e não só
  *depois*, para quem já provou. Vale trazer: quem prova um domínio que já tem dono deve
  saber, na hora do claim, que o outro lado será avisado.
  Detalhes menores: "Not the right one? Change location" (saída para o alvo errado) e um
  bloco "Frequently asked claiming questions" na mesma página.
- **TikTok (`44`)** — três passos, sendo o último literalmente **"Verify your access"** por
  SMS ou ligação: separa "quem é o negócio" de "você tem acesso a ele". É a mesma distinção
  entre identidade e controle que sustenta a prova por DNS.
- **Faire (`43`)** — *"Next, we need some proof of business ownership. What documents do you
  have on hand?"* com quatro opções, cada uma explicada em uma linha (permit, EIN, **registro
  do domínio**, print do admin do Instagram/Facebook), e a nota *"It's OK if you don't have
  all of this info right now. You can save your progress and complete the form later."*
  A pergunta "o que você tem em mãos?" é boa forma de oferecer métodos alternativos — mas o
  PRD corta métodos fracos (D3) e fica só no TXT. Fica como referência do caminho não tomado.
- **Mercury** (visto na busca, não arquivado) — o extremo oposto: upload de passaporte. Mostra
  onde a escada de fricção termina quando não existe prova técnica.

### C. Escolher o método de prova

- **Pinterest (`42`)** — "Choose how you want to claim" com três colunas lado a lado: *Add HTML
  tag*, *Upload HTML file*, *Add TXT record*, cada uma com o artefato já gerado e pronto pra
  copiar. Layout excelente; produto que o nosso PRD **decidiu não ser** (D3 corta arquivo HTML
  e e-mail de papel, porque provam o servidor web ou o MX, não a zona). Guardado como o
  contraste que justifica a decisão: sem capacidade destravada pela posse, não há razão para
  aceitar uma prova mais fraca.
- **Google Workspace (`45`)** — *"Verify that you own content-mobbin.com"* com dois caminhos:
  **"Sign in to Cloudflare"** (autoriza o Google a escrever o registro por você) ou *"Switch
  to manual verification"*. O caminho delegado elimina o copiar-e-colar inteiro — e traz
  dependência de OAuth por provedor, fora do escopo de uma semana. O que dá pra roubar é a
  ordem: caminho fácil primeiro, manual sempre visível ao lado, nunca escondido.

### D. Os modelos que o PRD recusa — e o que custa cada um

Aprovação e transferência aparecem muito na amostra. Servem para mostrar o preço:

- **Aprovação** — Asana (`52`): *"You've requested access to this project on Jan 6. We'll
  notify you when a project admin approves your request."* O reivindicante fica **parado,
  dependente de um humano**, sem nada a fazer. Miro (`53`) mostra o outro lado: uma fila de
  pedidos com ✓/✗ e prazo de expiração ("Expires in 26d"). É o desenho que a D7 rejeita:
  aprovação dá poder de veto a quem provou primeiro — inclusive a um atacante que provou
  primeiro. Bom detalhe do Asana, aproveitável em qualquer estado de espera: *"You're
  currently signed in as …@gmail.com"*, que resolve o erro mais comum sem exigir suporte.
- **Transferência** — Whop (`51`): "This action cannot be undone"; Maze (`50`): transferir
  "will give full control to Jane Doe & demote you to an admin role", com nome digitado pra
  confirmar. Ambos assumem **dono único**: para um ganhar, o outro perde. Wix (`49`) é a
  exceção interessante — *"You'll remain a Co-Owner of this site after transfer"* —, a única
  tela da amostra que normaliza posse compartilhada. É o mais perto que o mercado chega da
  coexistência do PRD (as duas contas válidas, ninguém rebaixado).

---

## 2. Copy — o que as referências realmente escrevem

O que faz a tela da Vercel funcionar é a copy, não o layout. Frases verbatim das referências,
e o que elas ensinam:

| Frase (verbatim) | Onde | O que faz bem |
|---|---|---|
| "This domain is registered with another Vercel account. Verify DNS ownership to claim it." | Vercel `15` | Nomeia o fato sem dramatizar, e a ação sai do mesmo lugar da prova |
| "You can remove the record after verification is complete." | Vercel `15` | Devolve o fim da história junto com o começo |
| "TXT record not found: The verification TXT record was not found. Please add the record shown above and wait a few minutes for it to propagate before trying again." | Vercel `15` | Fato → ação → expectativa de tempo, nessa ordem |
| "I certify that I am an authorized representative… I understand that Tripadvisor may disclose my name and affiliation to other verified representatives of this establishment." | Tripadvisor `41` | A reivindicação é registrada e a divulgação é avisada **antes** |
| "Not the right one? Change location" | Tripadvisor `41` | Saída barata para quem mirou no alvo errado |
| "Based on your email, you may be interested in joining… Managed by jsmith@content-mobbin.com" | Otter `46` | Diz **quem** está do outro lado, não "um outro usuário" |
| "If you don't see your workspace, try a different email." | Hex `47` | Nomeia a hipótese mais provável de erro |
| "You're currently signed in as …@gmail.com" | Asana `52` | Desfaz o erro de conta sem suporte |
| "You'll remain a Co-Owner of this site after transfer." | Wix `49` | Posse compartilhada dita como estado normal, não como falha |
| "If you don't recognize one of them, report it to your admin below." | Okta `54` | Contestação ancorada na linha exata do evento |

**Proposta de copy para o nosso produto**, derivada dessas (a decidir na Seção 3 do PRD):

- Ao reivindicar um domínio que já tem dono provado:
  *"Outra conta já provou posse de `acme.com`. Você pode provar também — as duas provas
  coexistem. Quem já provou será avisado de que você provou, com seu e-mail parcialmente
  mascarado."*
  (o "será avisado" vem do Tripadvisor `41`; a coexistência, do Wix `49`; o mascaramento, D17)
- Na notificação ao dono existente:
  *"`m•••@acme.com` provou posse de `acme.com` em 19/ago, por registro TXT. Se não foi você
  nem alguém do seu time: [Não fui eu]."*
  (estrutura de linha-de-evento + ação na própria linha, do Okta `54`)
- No fluxo "não fui eu", antes de qualquer ação — lista "o que vai acontecer" (Wise `55`):
  1. *Você apaga este registro TXT da sua zona:* `_app-challenge.acme.com` → `<token do outro>`
  2. *A gente recheca na hora.*
  3. *Sem o registro, a prova da outra conta deixa de valer.*
  4. *Se você não conseguir apagar esse registro, outra pessoa controla o DNS de `acme.com` —
     e esse é o problema urgente, não a prova dela.*

---

## 3. Contestação: as duas referências que faltavam

Ninguém desenha "não fui eu" para domínio, mas duas telas dão a forma inteira:

- **Okta (`54`)** — "Recent Activity": tabela de sign-ins (device, quando, onde) com um link
  **"Report"** em cada linha, sob a instrução *"These are the last 100 successful sign-ins to
  your account. If you don't recognize one of them, report it to your admin below."* Traduz
  direto: a timeline do domínio lista cada prova (conta mascarada, data, método) e a
  contestação é uma ação **na linha do evento**, não um item de menu perdido em Settings.
- **Wise (`55`)** — "Securing your account" com um bloco **"What happens"** de quatro
  consequências explicadas (nova senha, logout de todos os aparelhos, transferências
  canceladas, cartões suspensos) antes do botão "Confirm and secure". É o modelo do parágrafo
  acima: quem contesta precisa ver a consequência inteira antes de agir — inclusive a
  consequência ruim (não consigo apagar → o DNS não é meu).

Complementos já catalogados na pesquisa geral: **Supabase (`37`)** para o formato do diálogo
de risco (risco nomeado + duas saídas rotuladas pela consequência, nunca "OK/Cancelar") e
**OKX (`38`)** para enumerar o que acontece depois de reportar.

---

## 4. O que esta rodada muda no PRD

Nada de escopo — três ajustes de superfície, todos dentro do que já está decidido:

1. **Avisar no ato do claim que o outro lado será notificado** (Tripadvisor `41`). Hoje a D17
   descreve a notificação para quem já provou; falta a contrapartida na tela de quem
   reivindica. Barato e evita a sensação de denúncia pelas costas.
2. **A contestação mora na linha do evento** (Okta `54`), não numa tela separada.
3. **"O que vai acontecer" antes do "não fui eu"** (Wise `55`), com o quarto item — "se você
   não consegue apagar, o DNS não é seu" — como parte da lista, não como consolo depois da
   falha. Isso já está escrito no PRD em prosa; aqui vira componente.

---

## 5. Inventário desta rodada

| # | Arquivo | App | O que mostra |
|---|---|---|---|
| 41 | `41-claim-tripadvisor-listing-attestation.webp` | Tripadvisor | "Claim your listing" em 2 passos, papel no negócio, atestação com aviso de divulgação a outros representantes verificados, FAQ de claiming — [Mobbin](https://mobbin.com/screens/73a90981-8111-4176-bb6d-74eaa0f8fe8a) |
| 42 | `42-claim-pinterest-three-methods.webp` | Pinterest | "Choose how you want to claim": HTML tag / arquivo HTML / registro TXT lado a lado, artefatos prontos — [Mobbin](https://mobbin.com/screens/2a1e5ad5-9762-468b-a781-11acc1d9a6b4) |
| 43 | `43-claim-faire-evidence-options.webp` | Faire | "What documents do you have on hand?" — quatro provas alternativas explicadas + salvar progresso — [Mobbin](https://mobbin.com/screens/31467b9a-df07-4434-8f31-6d5bdea956c4) |
| 44 | `44-claim-tiktok-verify-your-access.webp` | TikTok | Passo 3 chamado "Verify your access": identidade e controle como coisas separadas — [Mobbin](https://mobbin.com/screens/44044d1e-8577-4493-9851-f70e02c964dc) |
| 45 | `45-claim-google-workspace-authorize-dns-host.webp` | Google Workspace | "Sign in to Cloudflare" (delegar a escrita do registro) com "Switch to manual verification" ao lado — [Mobbin](https://mobbin.com/screens/6f812186-ca4f-44a5-ab9c-1ac8c3c72056) |
| 46 | `46-claim-otter-existing-workspace-managed-by.webp` | Otter.ai | Workspace existente sugerido pelo domínio do e-mail, com "Managed by …" visível — [Mobbin](https://mobbin.com/screens/c6a2effd-d510-40e9-8472-8b17689a245b) |
| 47 | `47-claim-hex-choose-workspace-wrong-email.webp` | Hex | Escolher workspace + "try a different email" como hipótese nomeada — [Mobbin](https://mobbin.com/screens/65d8d999-28f4-4f14-bd00-e25852008893) |
| 48 | `48-claim-notion-join-or-create.webp` | Notion | "Join teammates or create a workspace": duas saídas de peso igual — [Mobbin](https://mobbin.com/screens/1f794a8f-3b4d-4f47-99a5-158c604317dc) |
| 49 | `49-transfer-wix-remain-co-owner.webp` | Wix | "You'll remain a Co-Owner of this site after transfer" — posse compartilhada como estado normal — [Mobbin](https://mobbin.com/screens/bfe98b41-b291-4504-9796-441618298d93) |
| 50 | `50-transfer-maze-demote-to-admin.webp` | Maze | Transferência com rebaixamento explícito + nome digitado pra confirmar — [Mobbin](https://mobbin.com/screens/2c0bad91-7796-492a-b479-d4eea6f3382f) |
| 51 | `51-transfer-whop-cannot-be-undone.webp` | Whop | Transferência irreversível em diálogo curto, sobre um audit log — [Mobbin](https://mobbin.com/screens/4b004bb8-c0cb-48c6-90a1-ac09630f56d6) |
| 52 | `52-approval-asana-waiting-signed-in-as.webp` | Asana | Espera por aprovação humana + "You're currently signed in as …" — o custo do modelo de aprovação — [Mobbin](https://mobbin.com/screens/319b68c7-1833-48ad-a28b-b9a750973943) |
| 53 | `53-approval-miro-request-queue-expiry.webp` | Miro | Fila de pedidos de acesso com ✓/✗ e prazo de expiração — o outro lado da aprovação — [Mobbin](https://mobbin.com/screens/05e59db8-5f5a-4f08-ae23-292fd64fe663) |
| 54 | `54-contest-okta-report-per-row.webp` | Okta | Lista de eventos com "Report" em cada linha e instrução de quando usar — [Mobbin](https://mobbin.com/screens/fb308537-7c43-442d-b231-b3b278195fc5) |
| 55 | `55-contest-wise-what-happens-list.webp` | Wise | Bloco "What happens" com as quatro consequências antes de confirmar a ação de segurança — [Mobbin](https://mobbin.com/screens/34af0d7e-d329-4b95-b6a0-1ced5fd27121) |
