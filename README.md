# vacFamily — Front-end

> PWA mobile-first para acompanhamento vacinal e gestão familiar

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)](#)
[![TCC](https://img.shields.io/badge/TCC-FAETERJ%202026-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

---

## Sobre o projeto

O **vacFamily** é uma aplicação web progressiva (PWA) desenvolvida como Trabalho de Conclusão de Curso na **FAETERJ — Análise e Desenvolvimento de Sistemas (2026)**.

O sistema permite que um responsável familiar centralize e acompanhe o histórico vacinal de todos os membros da família, com foco em **acessibilidade digital**, **facilidade de navegação** e **funcionamento offline**.

> Este repositório contém exclusivamente o **front-end** da aplicação.  
> O back-end está em: [vacFamily-back](https://github.com/LucasErico/vacFamily-back)

---

## Funcionalidades

- Cadastro e autenticação de usuário
- Cadastro e gerenciamento de perfis familiares
- Registro, consulta, edição e exclusão do histórico vacinal por membro
- Visualização de vacinas pendentes, doses futuras e reforços
- Lembretes e alertas internos de vacinação
- Indicador de situação vacinal simplificada (em dia / pendente / atenção)
- Funcionamento offline com sincronização automática ao retornar conectividade
- Interface acessível com linguagem clara e navegação simplificada

### Diferenciais previstos (fora do core)
- Integração com ferramentas de IA (chatbot assistente)
- Ferramentas de acessibilidade (transcrição de áudio, descrição de áudio)

---

## Stack tecnológica

| Tecnologia | Uso |
|---|---|
| **React** | Framework de interface |
| **Vite** | Build tool e dev server |
| **TypeScript** | Linguagem principal |
| **PWA (Service Worker)** | Suporte offline e instalabilidade |
| **IndexedDB** | Armazenamento local offline |
| **Vercel** | Deploy (free tier) |

---

## Arquitetura

A aplicação segue a regra arquitetural fundamental do projeto:

```
Front-end (PWA)  <-->  Back-end (API)  <-->  Banco de Dados
React + Vite          Node.js + Fastify      PostgreSQL (Supabase)
```

> O front-end **nunca** se comunica diretamente com o banco de dados.  
> Todo fluxo de informação respeita obrigatoriamente: `Front ↔ Back ↔ Banco`.

### Offline First

| Situação | Comportamento |
|---|---|
| **Online** | Requisições em tempo real via API |
| **Offline** | Operações salvas no IndexedDB como fila de operações |
| **Retorno de conexão** | Sincronização automática com o back-end |
| **Conflito de sincronização** | Notificação ao usuário com opção de resolução |

Estratégia de conflitos: **híbrida** — versionamento por campo `version` + fila de operações (Operation Log).

---

## Instalação e execução local

> Pré-requisitos: Node.js 18+ e npm ou yarn

```bash
# Clone o repositório
git clone https://github.com/LucasErico/vacFamily-front.git
cd vacFamily-front

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com a URL do back-end

# Inicie o servidor de desenvolvimento
npm run dev
```

---

## Variáveis de ambiente

```env
VITE_API_URL=http://localhost:3000
```

---

## Autores

- **Lucas Érico Quaresma Nunes**
- **Filipe Rodrigues Albuquerque**

Orientador: Prof. Alexandre Louzada  
Instituição: FAETERJ — Análise e Desenvolvimento de Sistemas
