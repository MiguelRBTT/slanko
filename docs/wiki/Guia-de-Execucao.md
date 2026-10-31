# Guia de Execução

Como subir o Slanko localmente (Windows ou Linux/macOS).

## Pré-requisitos

* Node.js 22.12+ (versão em `.nvmrc`, a mesma do CI)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* Git

## 1. Clone e ambiente

```bash
git clone https://github.com/MiguelRBTT/slanko.git
cd slanko
```

Copie o arquivo de ambiente:

```bash
# Linux / macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Instale dependências:

```bash
npm install
```

## 2. Banco MySQL (Docker)

```bash
npm run db:up
```

Aguarde o container `slanko-db` saudável (`docker ps`).

Crie as tabelas:

```bash
npm run db:migrate
```

Na primeira execução, confirme o nome da migração (ex.: `init`).

Popule dados de exemplo:

```bash
npm run db:seed
```

**Usuários do seed**

| Email | Senha | Perfil |
|---|---|---|
| `gestor@slanko.local` | `Slanko@123` | GESTOR |
| `tecnico@slanko.local` | `Slanko@123` | TECNICO |

Scripts úteis:

* `npm run db:down` — para o MySQL
* `npm run db:logs` — logs do container
* `npm run db:studio` — Prisma Studio
* `npm run db:reset` — apaga e recria o banco (cuidado)

## 3. Aplicação

```bash
npm run dev
```

Abra [https://localhost:3000](https://localhost:3000). A home redireciona para `/login`.

Na primeira execução, o `next dev --experimental-https` cria uma autoridade certificadora local (mkcert) e o Windows pede confirmação para instalá-la. Aceite para o navegador confiar no certificado. Sem HTTPS: `npm run dev:http`.

App em container (opcional): `npm run app:up` → http://localhost:3002.

### Telas

| Rota | Descrição |
|---|---|
| `/login` | Autenticação JWT |
| `/dashboard` | Painel SLA e rentabilidade (gestor) |
| `/clients` | Clientes (gestor) |
| `/contracts` | Contratos (gestor) |
| `/tickets` | Chamados (com histórico) |
| `/users` | Equipe e custo por hora (gestor) |

## 4. Testes

```bash
npm test                  # unitários (backend)
npm run test:coverage     # backend ≥75% e frontend ≥25%
npm run test:integration  # MySQL real, banco slanko_test
npm run typecheck         # TypeScript do projeto inteiro, incluindo testes
```

`test:coverage` gera `coverage/lcov.info` (usado pelo SonarCloud). `test:integration` aplica as migrations no banco `slanko_test` e só roda em bancos cujo nome termina em `_test`.

## 5. Smoke da API

```bash
curl -k -X POST https://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"gestor@slanko.local\",\"password\":\"Slanko@123\"}"
```

Use o `token` retornado:

```bash
curl -k https://localhost:3000/api/clients -H "Authorization: Bearer SEU_TOKEN"
```

Mais endpoints: [API](API).

## 6. Observabilidade (opcional)

Com a app na porta 3000:

```bash
npm run obs:up
```

* Prometheus: http://localhost:9090  
* Grafana: http://localhost:3001 (`admin` / `slanko`)  

Detalhes: [Observabilidade](Observabilidade).
