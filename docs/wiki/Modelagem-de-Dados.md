# Modelagem de Dados

Persistência em **MySQL** via **Prisma**.

## Entidades principais

* **User** — usuários (gestor / técnico), senha hash, ativo
* **Client** — clientes atendidos
* **Contract** — contrato com valor, vigência, status e metas de SLA (resposta/resolução em minutos)
* **Ticket** — chamado vinculado a contrato, prioridade, status, atribuição
* **TimeEntry** — horas trabalhadas (`hours`, `hourlyRate`, `workedAt`) para custo e margem

## Regras relevantes

* Soft delete / desativação onde aplicável (ex.: cliente)
* SLA calcula cumprimento de resposta e resolução por chamado
* Rentabilidade: custo = soma(horas × custo/hora); margem = valor do contrato − custo

## Onde ver o detalhe

* Schema: [`prisma/schema.prisma`](https://github.com/MiguelRBTT/slanko/blob/main/prisma/schema.prisma)
* DER e dicionário: [`docs/modelagem.md`](https://github.com/MiguelRBTT/slanko/blob/main/docs/modelagem.md)
