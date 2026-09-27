# Autenticação

## Mecanismo

* Login: `POST /api/auth/login` com email e senha
* Resposta: JWT (Bearer)
* Middleware Next.js injeta contexto do usuário nas rotas protegidas
* Senhas armazenadas com hash (bcrypt)

## Perfis

| Perfil | Pode |
|---|---|
| **GESTOR** | Clientes, contratos, SLA, rentabilidade, dashboard, chamados e horas |
| **TECNICO** | Listar contratos ativos, abrir/atualizar chamados, registrar horas, encerrar |

## Variáveis de ambiente

Definidas no `.env` (veja `.env.example`):

* `JWT_SECRET` — chave com pelo menos 32 caracteres
* `JWT_EXPIRES_IN` — ex.: `1h`
* `DATABASE_URL` — conexão MySQL

## Seed

Após `npm run db:seed`:

* `gestor@slanko.local` / `Slanko@123`
* `tecnico@slanko.local` / `Slanko@123`
