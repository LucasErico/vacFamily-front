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

## Funcionalidades implementadas

### Autenticação e Conta
- Login com e-mail e senha
- Criação de conta com validação de e-mail por token de confirmação
- **Modo de teste**: botão para criar conta sem confirmar e-mail (bypass do token)
- **Esqueci minha senha**: fluxo em 2 etapas — envio de código por e-mail + redefinição de senha
- **Medidor de força de senha** com 5 níveis (Muito fraca → Muito forte) e sugestões inline em tempo real
- Campos de senha com show/hide e confirmação de senha com erro inline
- Persistência de sessão (mantém login entre abas e recarregamentos)
- Logout via TopBar

### Gestão familiar
- Cadastro e gerenciamento de perfis familiares (membros)
- Seletor de membro ativo (Profile Switcher) na barra superior

### Vacinação
- Registro, consulta, edição e exclusão do histórico vacinal por membro
- Visualização de vacinas pendentes, doses futuras e reforços
- Indicador de situação vacinal simplificada (em dia / pendente / atenção)
- Feedback multissensorial no registro de vacinas (visual + vibração)

### Lembretes
- Lembretes e alertas de vacinação agrupados
- Geração automática de lembretes de reforço
- Suporte a campanhas gerais (sem membro específico)

### Dashboard
- Status vacinal geral da família
- Registros recentes e próximos lembretes

### Acessibilidade
- Alto contraste
- Escala de fonte ajustável
- Text-to-Speech via Web Speech API
- ARIA completo em todos os componentes interativos
- Painel de acessibilidade acessível via ícone na barra superior

### Conteúdo e Assistente
- Seção de conteúdos informativos sobre vacinação
- Estrutura do Assistente IA (chatbot) criada — integração com back pendente

---

## Stack tecnológica

| Tecnologia | Versão | Uso |
|---|---|---|
| **React** | 19 | Framework de interface |
| **Vite** | — | Build tool e dev server |
| **TypeScript** | — | Linguagem principal |
| **React Router** | 7 | Roteamento |
| **Tailwind CSS** | 4 | Estilização |
| **Lucide React** | — | Ícones |
| **vite-plugin-pwa** | — | PWA / Service Worker |
| **IndexedDB** | — | Armazenamento local offline |
| **Vercel** | — | Deploy (free tier) |

---

## Rotas implementadas

| Rota | Componente | Tipo |
|---|---|---|
| `/login` | `LoginPage` | Pública |
| `/cadastro` | `RegisterPage` | Pública |
| `/verificar-email` | `VerifyEmailPage` | Pública |
| `/esqueci-senha` | `ForgotPasswordPage` | Pública |
| `/` | `Dashboard` | Protegida |
| `/membros` | `MembrosPage` | Protegida |
| `/vacinas` | `VacinasPage` | Protegida |
| `/vacinas/registrar` | `RegistrarVacinaPage` | Protegida |
| `/lembretes` | `LembretesPage` | Protegida |
| `/configuracoes` | `ConfiguracoesPage` | Protegida |
| `/conteudo` | `ConteudoPage` | Protegida |
| `/assistente` | `AssistentePage` | Protegida |

---

## Arquitetura

A aplicação segue a regra arquitetural fundamental do projeto:

```
Front-end (PWA)  <-->  Back-end (API)  <-->  Banco de Dados
React + Vite          Node.js + Fastify      PostgreSQL (Supabase)
```

> O front-end **nunca** se comunica diretamente com o banco de dados.  
> Todo fluxo de informação respeita obrigatoriamente: `Front ↔ Back ↔ Banco`.

### Segurança — tratamento de credenciais

- O front-end envia **senha em texto plano sobre HTTPS** para o back-end
- **Hashing com bcrypt é responsabilidade exclusiva do back-end**
- O front-end nunca tenta criptografar ou hashar senhas localmente
- Tokens JWT recebidos do back-end são armazenados em memória (não em `localStorage` nem `sessionStorage`)

### Offline First

| Situação | Comportamento |
|---|---|
| **Online** | Requisições em tempo real via API |
| **Offline** | Operações salvas no IndexedDB como fila de operações |
| **Retorno de conexão** | Sincronização automática com o back-end |
| **Conflito de sincronização** | Notificação ao usuário com opção de resolução |

Estratégia de conflitos: **híbrida** — versionamento por campo `version` + fila de operações (Operation Log).

### Contexts globais

| Context | Responsabilidade |
|---|---|
| `AuthContext` | Sessão, login, logout, usuário atual |
| `AccessibilityContext` | Tema, fonte, alto contraste, TTS |
| `MembrosContext` | CRUD e membro ativo selecionado |
| `VacinasContext` | Catálogo de vacinas e registros vacinais |
| `LembretesContext` | Lembretes e geração automática de reforços |

---

## Endpoints de back-end esperados (TODOs no código)

O front-end possui `TODO` markers exatos em cada chamada pendente:

| Endpoint | Arquivo | Descrição |
|---|---|---|
| `POST /auth/register` | `RegisterPage.tsx` | Cria conta; retorna `{ requiresVerification, userId }` |
| `POST /auth/verify-email` | `VerifyEmailPage.tsx` | Valida token de 6 dígitos |
| `POST /auth/resend-verification` | `VerifyEmailPage.tsx` | Reenvia código de confirmação |
| `POST /auth/forgot-password` | `ForgotPasswordPage.tsx` | Envia código de recuperação por e-mail |
| `POST /auth/reset-password` | `ForgotPasswordPage.tsx` | Redefine senha com código válido |
| `POST /auth/login` | `AuthContext` | Retorna JWT |
| `GET /membros` | `MembrosContext` | Lista membros do usuário |
| `POST /membros` | `MembrosContext` | Cria membro familiar |
| `PUT /membros/:id` | `MembrosContext` | Atualiza membro |
| `DELETE /membros/:id` | `MembrosContext` | Remove membro |
| `GET /vacinas` | `VacinasContext` | Catálogo de vacinas (seed do banco) |
| `GET /registros` | `VacinasContext` | Histórico vacinal do membro ativo |
| `POST /registros` | `VacinasContext` | Registra dose aplicada |
| `GET /lembretes` | `LembretesContext` | Lembretes do usuário |
| `POST /lembretes` | `LembretesContext` | Cria lembrete manual |
| `POST /sync` | Service Worker | Envia fila de operações offline |
| `POST /assistente/mensagem` | `AssistentePage` | Envia mensagem ao chatbot IA |

---

## Instalação e execução local

> Pré-requisitos: Node.js 18+ e npm

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

## Possibilidades futuras (pós-TCC)

As funcionalidades abaixo foram identificadas como evoluções desejáveis para versões pós-MVP, mas estão **fora do escopo do TCC**.

- **Login via gov.br** — requer credenciamento como Serviço Público Digital junto à SGD/MGI
- **Biometria no acesso diário** — requer wrapper nativo (Capacitor ou React Native)
- **Importação automática do histórico vacinal (CadSUS / RNDS)** — depende de credenciamento no DATASUS
- **Push Notifications nativas** — requer servidor de push dedicado com chaves VAPID
- **Histórico de conversa com o Assistente IA** — tabela dedicada no banco com estratégia de expiração de contexto
- **Temas visuais personalizados por membro** — cor de identificação por membro no Profile Switcher

---

## Autores

- **Lucas Érico Quaresma Nunes**
- **Filipe Rodrigues Albuquerque**

Orientador: Prof. Alexandre Louzada  
Instituição: FAETERJ — Análise e Desenvolvimento de Sistemas
