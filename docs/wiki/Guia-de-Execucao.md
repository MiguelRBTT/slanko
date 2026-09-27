# Guia de Execução

Como subir o Slanko localmente (Windows ou Linux/macOS).

## Pré-requisitos

* Node.js 18+ (LTS recomendado; CI usa 22)
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

Abra [http://localhost:3000](http://localhost:3000). A home redireciona para `/login`.

### Telas

| Rota | Descrição |
|---|---|
| `/login` | Autenticação JWT |
| `/dashboard` | Painel SLA e rentabilidade (gestor) |
| `/clients` | Clientes (gestor) |
| `/contracts` | Contratos |
| `/tickets` | Chamados |

## 4. Testes

```bash
npm test
npm run test:coverage
```

`test:coverage` exige 100% nos módulos de back-end listados em `vitest.config.ts` e gera `coverage/lcov.info` (usado pelo SonarCloud).

## 5. Smoke da API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"gestor@slanko.local\",\"password\":\"Slanko@123\"}"
```

Use o `token` retornado:

```bash
curl http://localhost:3000/api/clients -H "Authorization: Bearer SEU_TOKEN"
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
