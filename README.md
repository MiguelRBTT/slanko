# Slanko

Sistema web para gestão de contratos de suporte técnico com análise de SLA e rentabilidade.

## Sobre o projeto

O **Slanko** é uma proposta de sistema web voltada para microempresas de Tecnologia da Informação que prestam serviços de suporte técnico. O objetivo é centralizar chamados, contratos, apontamento de horas, acompanhamento de SLA e indicadores de rentabilidade em uma única plataforma.

A proposta surgiu a partir do projeto acadêmico desenvolvido no PAC VII da Engenharia de Software, com foco na linha de Web Apps. O problema central identificado é que muitas microempresas utilizam planilhas ou ferramentas separadas para acompanhar chamados e contratos, dificultando a análise real da rentabilidade de cada cliente.

## Problema

Microempresas de TI geralmente conseguem acompanhar chamados e prazos de atendimento, mas nem sempre conseguem relacionar essas informações ao custo real das horas trabalhadas. Com isso, gestores podem ter dificuldade para identificar contratos que consomem mais recursos do que geram receita.

A pergunta que orienta o projeto é:

> Como microempresas de TI que prestam suporte técnico podem obter uma visão clara e integrada da rentabilidade de seus contratos, considerando chamados, SLA e custo real das horas trabalhadas?

## Solução Proposta

O Slanko integra três áreas principais:

- **Gestão de chamados:** abertura, atribuição, acompanhamento, apontamento de horas e encerramento de tickets.
- **Monitoramento de SLA:** definição de metas por contrato, cálculo de cumprimento e identificação de violações.
- **Análise de rentabilidade:** comparação entre horas trabalhadas, custo operacional e valor contratado.

Com esses dados consolidados, o sistema busca apoiar decisões como renegociação de contratos, ajuste de escopo e identificação de clientes ou contratos deficitários.

## Funcionalidades previstas

- Cadastro de clientes e contratos.
- Cadastro de usuários com perfis de gestor e técnico.
- Abertura e acompanhamento de chamados.
- Priorização e categorização de tickets.
- Registro de horas trabalhadas por atendimento.
- Configuração de metas de SLA por contrato.
- Painel com indicadores de SLA por cliente, contrato e período.
- Cálculo de custo operacional com base no custo/hora dos colaboradores.
- Relatórios de margem e rentabilidade por contrato.
- Alertas visuais para contratos deficitários ou com violações recorrentes de SLA.

## Diferencial

Ferramentas consolidadas de helpdesk, como Zendesk, Jira Service Management e Freshservice, oferecem recursos maduros para chamados e SLA. No entanto, o diferencial do Slanko está na integração entre desempenho operacional e análise financeira simplificada para microempresas.

A proposta não busca substituir um ERP ou sistema financeiro completo. O foco é oferecer uma visão objetiva da relação entre atendimento técnico, consumo de horas e rentabilidade dos contratos.

## Tecnologias planejadas

- **TypeScript**
- **Next.js**
- **React**
- **MySQL**
- **Prisma**
- **Docker**
- **Jest/Vitest**
- **GitHub Actions**
- **SonarCloud**
- **Grafana e/ou Prometheus**

## Arquitetura prevista

A arquitetura proposta segue o modelo cliente-servidor em camadas:

```text
Camada de Apresentação
Next.js, React e TypeScript

API REST interna

Camada de Aplicação
Rotas, validações, regras de SLA e rentabilidade

Camada de Dados
MySQL, Prisma e consultas parametrizadas

Infraestrutura
Docker, GitHub Actions, SonarCloud e monitoramento
```

## Roadmap

- [ ] Estruturar o repositório GitHub.
- [ ] Configurar ambiente de desenvolvimento.
- [ ] Criar RFC com requisitos, casos de uso e critérios de aceite.
- [ ] Modelar banco de dados.
- [ ] Implementar autenticação e perfis de acesso.
- [ ] Desenvolver módulo de clientes e contratos.
- [ ] Desenvolver módulo de chamados.
- [ ] Implementar regras de SLA.
- [ ] Implementar cálculo de rentabilidade.
- [ ] Criar dashboard com indicadores.
- [ ] Adicionar testes automatizados.
- [ ] Configurar CI/CD com GitHub Actions.
- [ ] Realizar deploy em nuvem.
- [ ] Documentar arquitetura, uso e deploy.

## Resultados esperados

Ao final do desenvolvimento, espera-se entregar uma aplicação web funcional, publicada em ambiente acessível, com os principais fluxos de negócio implementados:

- gestão de chamados;
- acompanhamento de SLA;
- análise de rentabilidade por cliente e contrato.

Também são esperados testes automatizados, pipeline de CI/CD, análise estática de código e documentação técnica para apoiar manutenção e evolução do projeto.

## Status do projeto

Projeto em fase de planejamento e preparação para desenvolvimento.

## Autor

**Miguel Ricardo Buttendorf**

Projeto acadêmico desenvolvido no contexto do PAC VII - Engenharia de Software, Centro Universitário Católica de Santa Catarina.

## Licença

Este projeto será disponibilizado para fins acadêmicos e de portfólio. A licença definitiva será definida no repositório.
