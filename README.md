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
- Seletor de membro ativo (Profile Switcher) na barra superior
- Feedback multissensorial no registro de vacinas (visual + vibração)
- Acessibilidade avançada: alto contraste, escala de fonte, Text-to-Speech (Web Speech API)

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

## Possibilidades futuras

As funcionalidades abaixo foram identificadas como evoluções desejáveis para versões pós-MVP, mas estão **fora do escopo do TCC** por exigirem credenciamentos, APIs nativas ou integrações institucionais inviáveis no contexto acadêmico atual.

### Login via gov.br

Autenticação federada via **gov.br**, permitindo ao usuário acessar o vacFamily com a mesma identidade digital de serviços públicos federais. Eliminaria o cadastro manual e aumentaria a confiança institucional na aplicação. Requer registro como Serviço Público Digital (SPD) junto à SGD/MGI, aplicável apenas a órgãos públicos ou parceiros credenciados.

### Biometria no acesso diário

Autenticação por impressão digital ou reconhecimento facial para desbloquear o aplicativo sem reinserir senha — especialmente útil para cuidadores de uso frequente. A Web Authentication API (WebAuthn) tem suporte limitado a biometria de desbloquear sessão em PWA; a implementação completa requer wrapper nativo (Capacitor ou React Native).

### Importação automática do histórico vacinal (CadSUS / RNDS)

Importação automática das doses registradas em postos públicos de saúde via integração com o **CadSUS** ou a **RNDS (HL7 FHIR R4)**, eliminando o preenchimento manual de histórico pré-existente. Depende de credenciamento no DATASUS — viabilizado no back-end, não no front-end.

### Push Notifications nativas

Envio de lembretes de vacinação via notificações push mesmo com o aplicativo fechado, utilizando **Firebase Cloud Messaging (FCM)** e a Web Push API. No MVP atual, os alertas funcionam apenas dentro do aplicativo. A implementação via PWA é tecnicamente possível, mas exige servidor de push dedicado com gerenciamento de chaves VAPID.

### Histórico de conversa com o Assistente IA

Persistência do histórico de conversa com o chatbot assistente entre sessões, permitindo ao assistente retomar o contexto de consultas anteriores. No MVP, o histórico de conversa existe apenas na memória da sessão atual. A persistência em banco requer uma tabela dedicada e estratégia de expiração de contexto por janela de tokens.

### Temas visuais personalizados por membro

Possibilidade de o usuário definir uma cor de identificação por membro familiar (ex: azul para o filho, verde para a avó), reforçando visualmente o Profile Switcher e os cards vacinais. Previsto como melhoria estética de baixo esforço para versões futuras.

---

## Autores

- **Lucas Érico Quaresma Nunes**
- **Filipe Rodrigues Albuquerque**

Orientador: Prof. Alexandre Louzada  
Instituição: FAETERJ — Análise e Desenvolvimento de Sistemas
