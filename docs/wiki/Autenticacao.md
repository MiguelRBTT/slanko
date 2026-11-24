# Autenticação

## Mecanismo

* Login: `POST /api/auth/login` com email e senha
* Resposta: JWT (Bearer), guardado pelo front no `localStorage` e enviado no cabeçalho `Authorization`
* Middleware Next.js (runtime Node) valida o token e confere no banco se o usuário segue ativo e qual é o perfil atual: desativação e troca de perfil valem na hora
* O middleware descarta cabeçalhos `x-user-*` vindos do cliente e injeta o contexto real nas rotas protegidas; as rotas de gestor checam o perfil de novo
* Senhas armazenadas com hash (bcrypt)
* Força bruta: 5 falhas por email em 15 min bloqueiam novas tentativas (HTTP 429 com `Retry-After`); o IP só entra na chave com `TRUST_PROXY=true`
* CSRF não se aplica: o token não vai em cookie, então o navegador não o envia sozinho em requisições de outros sites
* XSS: CSP com nonce por requisição, além do escape padrão do React

## Perfis

| Perfil | Pode |
|---|---|
| **GESTOR** | Clientes, contratos, equipe (custo/hora), SLA, rentabilidade, dashboard, atribuição, chamados e horas |
| **TECNICO** | Listar contratos (sem valor), abrir/atualizar chamados, assumir chamado sem responsável, registrar e corrigir as próprias horas, encerrar |

## Variáveis de ambiente

Definidas no `.env` (veja `.env.example`):

* `DATABASE_URL` — conexão MySQL
* `JWT_SECRET` — chave de assinatura do JWT (em produção, uma sequência longa e aleatória)
* `JWT_EXPIRES_IN` — validade do token (padrão `8h`)
* `METRICS_TOKEN` — token exigido pelo `/api/metrics` (o mesmo do `docker/prometheus/prometheus.yml`)
* `TRUST_PROXY` — `true` só atrás de um proxy reverso confiável (o IP passa a contar no limite de login)

## Seed

Após `npm run db:seed`:

* `gestor@slanko.local` / `Slanko@123` (gestor)
* `tecnico@slanko.local` / `Slanko@123` (técnico responsável no chamado de exemplo)
* `tecnico2@slanko.local` / `Slanko@123` (técnico observador)

A tela de login começa com os campos vazios; no ambiente local, uma dica abaixo do formulário lembra os emails.
