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

* `JWT_SECRET` — chave com pelo menos 32 caracteres
* `JWT_EXPIRES_IN` — ex.: `1h`
* `DATABASE_URL` — conexão MySQL

## Seed

Após `npm run db:seed`:

* `gestor@slanko.local` / `Slanko@123`
* `tecnico@slanko.local` / `Slanko@123`
