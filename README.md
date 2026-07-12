# vacFamily — Front-end

> PWA mobile-first para acompanhamento vacinal e gestão familiar

[![Status](https://img.shields.io/badge/status-funcional-brightgreen)](#)
[![TCC](https://img.shields.io/badge/TCC-FAETERJ%202026-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

---

## Sobre o projeto

O **vacFamily** é uma aplicação web progressiva (PWA) desenvolvida como Trabalho de Conclusão de Curso na **FAETERJ — Análise e Desenvolvimento de Sistemas (2026)**.

O sistema permite que um responsável familiar centralize e acompanhe o histórico vacinal de todos os membros da família, com foco em **acessibilidade digital**, **facilidade de navegação** e **funcionamento offline**.

> Este repositório contém exclusivamente o **front-end** da aplicação.  
> O back-end está em: [vacFamily-back](https://github.com/LucasErico/vacFamily-back)

**Deploy:** [vacfamily-front.vercel.app](https://vacfamily-front.vercel.app) (Vercel, free tier)

---

## Funcionalidades implementadas

### Autenticação e Conta
- Login com e-mail e senha
- Criação de conta com validação de e-mail por token de 6 dígitos
- **Modo de teste**: criação de conta sem confirmação de e-mail (bypass)
- **Esqueci minha senha**: fluxo em 2 etapas — código por e-mail + redefinição de senha
- **Medidor de força de senha** com 5 níveis e sugestões inline em tempo real
- Campos de senha com show/hide e confirmação com erro inline
- Persistência de sessão (mantém login entre abas e recarregamentos)
- Logout via TopBar
- Ao fazer login, sempre redireciona para o Dashboard (`/`)

### Gestão familiar
- Cadastro e gerenciamento de perfis familiares (membros) com nome, data de nascimento, sexo e relação
- Seletor de membro ativo (Profile Switcher) na barra superior
- Avatar gerado automaticamente por iniciais e cor derivada do nome

### Vacinação
- Registro de doses aplicadas com vacina, número de dose, data, local e observações
- Suporte a **vacinas avulsas** (não catalogadas) pelo campo de observações
- Edição e exclusão de registros
- Filtro por membro, status (em dia / pendente / atrasado) e busca por nome
- Indicador de situação vacinal simplificada por membro
- Feedback multissensorial no registro (visual + vibração háptica)
- Geração automática de lembretes de reforço após registrar dose

### Agenda (Lembretes)
- Calendário mensal interativo — dias com eventos destacados com fundo colorido
- Navegação de mês bloqueada para meses anteriores ao atual
- Detalhe do dia selecionado direto no calendário
- Lembretes automáticos (reforços) e manuais listados separadamente
- Filtros: Todos / Pendentes / Concluídos / Ignorados
- Ações de marcar como concluído ou ignorar por lembrete

### Histórico Vacinal
- Linha do tempo vacinal por membro com separação em três seções: **Atrasadas**, **Agendadas** e **Histórico Aplicado**
- Aplicadas agrupadas por **ciclo de vida**: Pré-Natal, Recém-Nascido, Infância, Adolescência, Adulto, Idoso
- Filtro por ciclo via dropdown com cores por faixa
- Busca por nome de vacina ou local de aplicação
- Limpar filtros com um clique

### Dashboard
- Resumo do status vacinal da família com contadores por situação
- Registros recentes e próximos lembretes

### Conteúdo informativo
- Seção de artigos sobre vacinação (populados via seed no back-end)

### Assistente IA
- Interface de chat estruturada — integração com back-end pendente

### Acessibilidade
- Alto contraste
- Escala de fonte ajustável (4 níveis)
- Text-to-Speech via Web Speech API
- ARIA completo em todos os componentes interativos
- Painel de acessibilidade acessível via ícone ♿ na barra superior e na tela de login
- Tour de onboarding guiado (disparado automaticamente na 1ª visita)

### UX e navegação
- Scroll automático ao topo em toda troca de rota
- Sidebar para desktop, BottomNav para mobile
- Tema claro/escuro com persistência

---

## Stack tecnológica

| Tecnologia | Versão | Uso |
|---|---|---|
| **React** | 19 | Framework de interface |
| **Vite** | — | Build tool e dev server |
| **TypeScript** | — | Linguagem principal |
| **React Router** | 7 | Roteamento |
| **CSS Custom Properties** | — | Design tokens e temas (sem Tailwind) |
| **Lucide React** | — | Ícones |
| **vite-plugin-pwa** | — | PWA / Service Worker |
| **IndexedDB** | — | Armazenamento local offline |
| **Vercel** | — | Deploy (free tier) |

> **Nota:** o projeto migrou de Tailwind CSS para um sistema próprio de design tokens via CSS Custom Properties.

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
| `/membros/novo` | `NovoMembroPage` | Protegida |
| `/vacinas` | `VacinasPage` | Protegida |
| `/vacinas/registrar` | `RegistrarVacinaPage` | Protegida |
| `/lembretes` | `LembretesPage` (Agenda) | Protegida |
| `/historico` | `HistoricoPage` | Protegida |
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
| `AuthContext` | Sessão, login, logout, usuário atual, cold-start do Render |
| `AccessibilityContext` | Tema, fonte, alto contraste, TTS |
| `MembrosContext` | CRUD e membro ativo selecionado |
| `VacinasContext` | Catálogo de vacinas, registros vacinais |
| `LembretesContext` | Lembretes automáticos e manuais, status |

---

## Endpoints de back-end integrados

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
| `PUT /registros/:id` | `VacinasContext` | Atualiza registro |
| `DELETE /registros/:id` | `VacinasContext` | Remove registro |
| `GET /lembretes` | `LembretesContext` | Lembretes do usuário |
| `POST /lembretes` | `LembretesContext` | Cria lembrete manual |
| `PUT /lembretes/:id` | `LembretesContext` | Atualiza status do lembrete |
| `DELETE /lembretes/:id` | `LembretesContext` | Remove lembrete |
| `POST /sync` | Service Worker | Envia fila de operações offline |
| `POST /assistente/mensagem` | `AssistentePage` | Envia mensagem ao chatbot IA *(pendente)* |

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

- **Login via gov.br** — requer credenciamento como Serviço Público Digital junto à SGD/MGI
- **Biometria no acesso diário** — requer wrapper nativo (Capacitor ou React Native)
- **Importação automática do histórico vacinal (CadSUS / RNDS)** — depende de credenciamento no DATASUS
- **Push Notifications nativas** — requer servidor de push dedicado com chaves VAPID
- **Histórico de conversa com o Assistente IA** — tabela dedicada no banco com estratégia de expiração de contexto
- **Integração com Notivisa / VigiMed** — registro de eventos adversos pós-vacinação (ESAVI)

---

## Autores

- **Lucas Érico Quaresma Nunes**
- **Filipe Rodrigues Albuquerque**

Orientador: Prof. Alexandre Louzada  
Instituição: FAETERJ — Análise e Desenvolvimento de Sistemas
