# Modelagem de Dados

Persistência em **MySQL** via **Prisma**.

## Entidades principais

* **User** — usuários (gestor / técnico), senha hash, ativo
* **Client** — clientes atendidos
* **Contract** — contrato com valor mensal, vigência, status e metas de SLA (resposta/resolução em minutos)
* **Ticket** — chamado vinculado a contrato, prioridade, status, atribuição e metas de SLA copiadas do contrato na abertura
* **TimeEntry** — horas trabalhadas (`hours`, `hourlyCost` congelado no apontamento, `workedAt`) para custo e margem
* **TicketEvent** — histórico auditável de cada alteração do chamado
* **TicketObserver** — observadores do chamado (relação N:N entre chamado e usuário)
* **TicketAttachment** — metadados das imagens e vídeos anexados (o arquivo fica no volume `uploads`)

## Regras relevantes

* Soft delete / desativação onde aplicável (ex.: cliente)
* SLA calcula cumprimento de resposta e resolução por chamado
* Rentabilidade: custo = soma(horas × custo/hora do apontamento); receita = valor mensal proporcional aos dias de vigência no período; margem = receita − custo
* SLA: chamado sem resposta/resolução com prazo vencido já conta como violação
* SLA: mudar a meta do contrato vale só para chamados novos

## Onde ver o detalhe

* Schema: [`prisma/schema.prisma`](https://github.com/MiguelRBTT/slanko/blob/main/prisma/schema.prisma)
* DER e dicionário: [`docs/modelagem.md`](https://github.com/MiguelRBTT/slanko/blob/main/docs/modelagem.md)
