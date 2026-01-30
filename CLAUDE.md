# Auto-SaaS - Instrucoes para Claude

Este projeto automatiza a criacao de backlogs para projetos SaaS.

## Estrutura do Projeto

```
templates/
├── marketing/      # Templates de marketing (carregados primeiro)
│   ├── branding.json   # Identidade visual e verbal da marca
│   └── landingpage/
│       ├── construcao.json
│       ├── otimizacao.json
│       └── copy.json
├── base/           # Modulos comuns a todo SaaS
│   ├── stack.json      # PRIMEIRO: Infraestrutura tecnica
│   ├── auth.json
│   ├── billing.json
│   ├── onboarding.json
│   └── settings.json
├── productivity/   # Template para ferramentas de produtividade
│   └── template.json
└── content-social/ # Template para plataformas de conteudo/social
    └── template.json

scripts/
├── generate.js          # CLI para gerar issues no GitHub
└── validate-templates.js # Validador de templates (EXECUTAR ANTES DE COMPLETAR)

config/
└── labels.json     # Labels padrao do GitHub
```

## IMPORTANTE: Sistema de Dependencias

### Regra Principal

**SEMPRE que criar ou modificar templates, DEVE verificar e definir dependencias entre:**
- Epic para Epic
- Story para Story
- Task para Task
- Task para Story
- Story para Epic

### Campos de Dependencia

```json
{
  "title": "Nome da Story",
  "depends_on": ["Story A", "Story B"],
  "related_to": ["[EPIC] Outro Epic", "[STORY] Outra Story"]
}
```

- **depends_on**: Lista de itens que DEVEM ser concluidos ANTES
- **related_to**: Lista de itens relacionados (referencia, nao bloqueio)

### Formato de Referencias

Use prefixos para referenciar itens de outros templates:
- `[EPIC] Nome do Epic` - Referencia a um epic
- `[STORY] Nome da Story` - Referencia a uma story
- `[TASK] Nome da Task` - Referencia a uma task
- `Nome simples` - Referencia dentro do mesmo template

### Checklist de Dependencias

Ao criar/modificar templates, SEMPRE pergunte:

1. **Para cada Epic:**
   - Depende de algum outro epic estar pronto?
   - Exemplo: "Otimizacao" depende de "Construcao"

2. **Para cada Story:**
   - Qual story precisa estar pronta antes?
   - Qual epic pai esta relacionado?
   - Exemplo: "Secao de Features" depende de "Hero Section"

3. **Para cada Task:**
   - Qual task do mesmo story precisa estar pronta?
   - Qual task de outra story precisa estar pronta?
   - Exemplo: "Implementar toggle de periodo" depende de "Criar componente de pricing card"

4. **Entre templates diferentes:**
   - Marketing depende de Base?
   - Otimizacao depende de Construcao?
   - Copy esta relacionado a qual componente?

### Exemplo Completo com Dependencias

```json
{
  "epic": {
    "title": "Otimizacao de Landing Page",
    "labels": ["epic", "marketing", "growth"],
    "depends_on": ["[EPIC] Landing Page e Marketing"]
  },
  "stories": [
    {
      "title": "A/B Testing de Headlines",
      "description": "Como growth hacker, quero testar diferentes headlines",
      "depends_on": [
        "[STORY] Landing Page - Hero Section",
        "[STORY] Landing Page - Analytics e Tracking"
      ],
      "related_to": ["[STORY] Copywriting - Headline Principal"],
      "acceptance_criteria": ["..."],
      "labels": ["story", "marketing", "growth"],
      "tasks": [
        {
          "title": "Implementar sistema de A/B testing",
          "description": "Engine para criar e gerenciar experimentos",
          "labels": ["task", "backend"]
        },
        {
          "title": "Criar UI de gestao de experimentos",
          "description": "Dashboard para criar e acompanhar testes",
          "labels": ["task", "frontend"],
          "depends_on": ["Implementar sistema de A/B testing"]
        },
        {
          "title": "Integrar com analytics",
          "description": "Enviar eventos de experimento para GA",
          "labels": ["task", "frontend", "integration"],
          "depends_on": [
            "Implementar sistema de A/B testing",
            "[TASK] Integrar Google Analytics"
          ]
        }
      ]
    }
  ]
}
```

## Fluxo de Trabalho

### Quando o usuario pedir para criar um backlog:

1. **Pergunte o tipo de SaaS:**
   - Produtividade/Tools (usar `templates/productivity/`)
   - Conteudo/Social (usar `templates/content-social/`)
   - Outro tipo (criar novo template)

2. **Pergunte o nome do projeto**

3. **Pergunte o repositorio GitHub** (formato: `owner/repo`)

4. **Execute o script:**
   ```bash
   node scripts/generate.js --repo REPO --type TIPO --name "NOME"
   ```

### Quando o usuario pedir para criar um novo template:

1. Crie uma pasta em `templates/nome-do-tipo/`
2. Crie os arquivos JSON seguindo a estrutura
3. **OBRIGATORIO: Defina todas as dependencias entre itens**
4. Adicione labels necessarias em `config/labels.json`
5. **OBRIGATORIO: Execute o validador antes de concluir:**
   ```bash
   node scripts/validate-templates.js --file templates/novo-template.json
   ```
   ⚠️ **NAO CONCLUA A TAREFA SE A VALIDACAO FALHAR!**

## Estrutura dos Templates

### Template Base (auth.json, billing.json, etc)

```json
{
  "epic": {
    "title": "Nome do Epic",
    "description": "Descricao do epic",
    "labels": ["epic", "core", "area"],
    "depends_on": [],
    "related_to": []
  },
  "stories": [
    {
      "title": "Nome da Story",
      "description": "Como [usuario], quero [acao] para [beneficio]",
      "depends_on": ["Story anterior"],
      "related_to": ["[EPIC] Epic relacionado"],
      "acceptance_criteria": [
        "Criterio 1",
        "Criterio 2"
      ],
      "labels": ["story", "area"],
      "tasks": [
        {
          "title": "Nome da Task",
          "description": "Descricao tecnica",
          "labels": ["task", "frontend|backend|fullstack"],
          "depends_on": ["Task anterior"],
          "related_to": []
        }
      ]
    }
  ]
}
```

### Template de Tipo (productivity, content-social, etc)

```json
{
  "name": "Nome do Template",
  "description": "Descricao",
  "base_modules": ["auth", "billing", "onboarding", "settings"],
  "epics": [
    {
      "title": "Nome do Epic",
      "description": "Descricao",
      "labels": ["epic", "area"],
      "depends_on": ["[EPIC] Epic anterior"],
      "stories": [
        {
          "title": "Nome da Story",
          "description": "Como [usuario]...",
          "depends_on": ["Story anterior"],
          "related_to": [],
          "acceptance_criteria": ["..."],
          "labels": ["story", "area"],
          "tasks": [
            {
              "title": "Task",
              "description": "...",
              "labels": ["task", "stack"],
              "depends_on": [],
              "related_to": []
            }
          ]
        }
      ]
    }
  ]
}
```

## Labels Disponiveis

### Tipo de Issue
- `epic` - Grandes iniciativas
- `story` - User stories
- `task` - Tarefas tecnicas

### Area/Modulo
- `core`, `auth`, `billing`, `onboarding`, `settings`, `marketing`
- `dashboard`, `workspace`, `tasks`, `collaboration`
- `feed`, `content`, `social`, `profiles`, `messaging`
- `communities`, `notifications`, `analytics`

### Stack
- `frontend` - UI/UX
- `backend` - API/Server
- `fullstack` - Ambos
- `integration` - Servicos externos

### Outros
- `security`, `growth`, `testing`, `ux`, `enhancement`
- `moderation`, `trust`, `automation`
- `seo`, `legal`, `content`

## Ordem de Criacao de Issues

Ao criar um backlog completo, a ordem de execucao dos templates deve ser:

```
1. templates/base/stack.json       # Infraestrutura (SEMPRE PRIMEIRO)
2. templates/base/auth.json        # Autenticacao
3. templates/base/billing.json     # Pagamentos
4. templates/base/onboarding.json  # Onboarding
5. templates/base/settings.json    # Configuracoes
6. templates/marketing/landingpage/construcao.json  # Landing page
7. templates/marketing/landingpage/copy.json        # Copywriting
8. templates/marketing/landingpage/otimizacao.json  # Otimizacoes
9. templates/[tipo]/template.json  # Epics especificos do tipo
```

**Por que stack.json primeiro?**
- Define a base tecnica (Node.js, React, banco, etc.)
- Todas as outras funcionalidades dependem dessa infraestrutura
- CI/CD e Docker sao necessarios para qualquer deploy
- Monitoramento e necessario desde o inicio

## Comandos Uteis

```bash
# VALIDAR TEMPLATES (EXECUTAR SEMPRE ANTES DE COMPLETAR)
node scripts/validate-templates.js                    # Validar todos
node scripts/validate-templates.js --file template.json  # Validar arquivo especifico
node scripts/validate-templates.js --verbose          # Modo detalhado

# Ver ajuda
node scripts/generate.js --help

# Dry-run (apenas mostra o que seria criado)
node scripts/generate.js --repo owner/repo --type productivity --dry-run

# Criar apenas modulos base
node scripts/generate.js --repo owner/repo --base-only --name "Projeto"

# Criar apenas um epic especifico
node scripts/generate.js --repo owner/repo --type productivity --epic "Dashboard"

# Criar backlog completo
node scripts/generate.js --repo owner/repo --type productivity --name "MeuSaaS"
```

## Hierarquia de Issues no GitHub

```
Milestone: [Projeto] Nome do Epic
├── [EPIC] Nome do Epic
├── [STORY] User Story 1
│   ├── [TASK] Task tecnica 1.1
│   ├── [TASK] Task tecnica 1.2 (depende de 1.1)
│   └── [TASK] Task tecnica 1.3 (depende de 1.1)
└── [STORY] User Story 2 (depende de Story 1)
    ├── [TASK] Task tecnica 2.1
    └── [TASK] Task tecnica 2.2 (depende de 2.1)
```

## Boas Praticas ao Criar Templates

1. **User Stories** devem seguir o formato: "Como [persona], quero [acao] para [beneficio]"

2. **Criterios de Aceitacao** devem ser verificaveis e especificos

3. **Tasks** devem ser atomicas (1-4 horas de trabalho)

4. **Labels** devem categorizar corretamente:
   - Sempre incluir tipo (`epic`, `story`, `task`)
   - Sempre incluir stack (`frontend`, `backend`, `fullstack`)
   - Incluir area quando relevante

5. **Descricoes** devem ser claras e sem ambiguidade

6. **DEPENDENCIAS** - SEMPRE definir:
   - Qual item precisa estar pronto antes
   - Quais itens estao relacionados
   - Usar formato de referencia correto

## Mapa de Dependencias dos Templates Existentes

### Base > Stack Tecnica

```
Repositorio e Setup Inicial
  └── Backend Node.js/TypeScript
        ├── Framework Setup (Next.js)
        │     └── Frontend React
        │           ├── Design System
        │           │     └── Gerenciamento de Estado
        │           └── Testes Frontend
        ├── Banco de Dados
        │     └── Cache e Redis
        └── Testes Backend
              └── Docker e Containerizacao
                    └── CI/CD Pipeline
                          └── Infraestrutura Cloud
                                └── Monitoramento e Observabilidade
                                      └── Documentacao Tecnica
```

**Fluxo completo:**
1. Setup do repositorio (base para tudo)
2. Backend com TypeScript (depende do repo)
3. Framework e Banco de Dados (dependem do backend)
4. Frontend e Cache (dependem dos anteriores)
5. Design System e Testes (dependem do frontend)
6. Docker (depende dos testes)
7. CI/CD (depende do Docker)
8. Cloud (depende do CI/CD)
9. Monitoramento (depende da cloud)
10. Documentacao (depende de tudo)

### Marketing > Landingpage

```
construcao.json (base)
    ↓
copy.json (conteudo depende da estrutura)
    ↓
otimizacao.json (otimizacao depende de construcao + copy)
```

### Fluxo de Stories em construcao.json

```
Hero Section
  └── Secao de Features
        └── Social Proof e Depoimentos
              └── Secao de Pricing
                    └── FAQ Section
                          └── CTA Final e Footer

SEO e Meta Tags (depende de Hero + Features)
Analytics e Tracking (depende de Hero + CTA)
Performance (depende de todas as secoes)
Paginas Legais (independente)
```

## Templates Existentes

### Marketing (inclusos em todos)

#### Branding e Identidade (branding.json)
Template completo para construcao da marca:

- **Fundacao**: Missao, Visao, Valores, Proposito, Promessa
- **Personalidade**: Arquetipo, Tracos, Persona, Comportamentos
- **Posicionamento**: Publico-alvo, Analise de concorrentes, Diferenciais
- **Naming**: Nome, Tagline, Verificacao legal, Variantes
- **Tom de Voz**: Atributos, Guia de escrita, Vocabulario, Exemplos por canal
- **Mensagens**: Proposta de valor, Elevator pitch, Brand story
- **Logo**: Briefing, Conceitos, Variacoes, Arquivos finais
- **Cores**: Paleta primaria/secundaria, Dark mode, Acessibilidade
- **Tipografia**: Fontes, Escala, Hierarquia
- **Linguagem Visual**: Fotos, Ilustracoes, Icones, Prompts para IA
- **Aplicacoes**: Social media, Email, Apresentacoes, Business card
- **Brand Guidelines**: Brand book completo, Assets organizados

**Estatisticas:** 12 stories, ~55 tasks

#### Landing Page
- Construcao (construcao.json) - Hero, features, pricing, FAQ, SEO, analytics
- Copywriting (copy.json) - Headlines, CTAs, descricoes, social proof
- Otimizacao (otimizacao.json) - A/B testing, heatmaps, funil, personalizacao

### Modulos Base (inclusos em todos)

**IMPORTANTE: Ordem de Execucao**
Os modulos base devem ser criados nesta ordem devido as dependencias:

1. **Stack Tecnica** (stack.json) - SEMPRE PRIMEIRO
2. Auth (auth.json)
3. Billing (billing.json)
4. Onboarding (onboarding.json)
5. Settings (settings.json)

#### Stack Tecnica (stack.json)
Template fundamental que define toda a infraestrutura do projeto:

- **Repositorio e Setup Inicial**: Git, estrutura de pastas, configs
- **Backend Node.js/TypeScript**: Express/Fastify, estrutura MVC
- **Framework Setup**: Next.js ou framework escolhido
- **Banco de Dados**: PostgreSQL/MySQL, migrations, seeds
- **Cache e Redis**: Sessions, cache, rate limiting
- **Frontend React**: Estrutura, routing, hooks
- **Design System**: Componentes, Tailwind, temas
- **Gerenciamento de Estado**: Redux/Zustand/Context
- **Testes Backend**: Jest, integracao, mocks
- **Testes Frontend**: Testing Library, E2E com Playwright
- **Docker**: Containers dev/prod, docker-compose
- **CI/CD**: GitHub Actions, deploys automaticos
- **Infraestrutura Cloud**: AWS/Vercel, dominio, SSL
- **Monitoramento**: Logs, metricas, alertas
- **Documentacao**: API docs, README, arquitetura

**Este template DEVE ser executado antes de qualquer outro modulo base ou funcionalidade.**

**Estatisticas do stack.json:**
- 17 Stories
- ~80 Tasks
- Cobertura completa de infraestrutura

#### Outros Modulos Base
- Autenticacao e Gestao de Usuarios (5 stories, 16 tasks)
- Billing e Assinaturas (5 stories, 17 tasks)
- Onboarding de Usuarios (5 stories, 13 tasks)
- Configuracoes e Perfil (6 stories, 18 tasks)

### Produtividade/Tools
Epics inclusos:
- Dashboard e Overview
- Workspace e Projetos
- Tarefas e Todo Lists
- Colaboracao em Tempo Real
- Automacoes e Integracoes
- Relatorios e Analytics

### Conteudo/Social
Epics inclusos:
- Feed e Timeline
- Criacao de Conteudo
- Interacoes Sociais
- Perfis e Seguidores
- Mensagens Diretas
- Comunidades e Grupos
- Notificacoes
- Analytics para Criadores

---

## CHECKLIST OBRIGATORIO - Executar ao Final de Cada Task

> **IMPORTANTE:** Este checklist DEVE ser executado SEMPRE que finalizar qualquer modificacao em templates ou criacao de novos modulos. NAO pule nenhum item.

### 0. VALIDACAO DO TEMPLATE (PRIMEIRO!)

> ⚠️ **OBRIGATORIO:** Execute SEMPRE antes de considerar a tarefa concluida!

```bash
node scripts/validate-templates.js
# ou para arquivo especifico:
node scripts/validate-templates.js --file templates/seu-template.json
```

- [ ] **Validacao passou SEM ERROS** (warnings sao aceitaveis)
- [ ] Todos os JSONs tem sintaxe valida
- [ ] Todas as labels usadas existem em `config/labels.json`
- [ ] Estrutura do template esta correta (epic + stories ou epics array)

**Se a validacao falhar, corrija os erros antes de continuar!**

---

### 1. Qualidade das Descricoes Tecnicas

- [ ] **Enriquecer descricoes das tasks** com detalhes tecnicos
  - Incluir tecnologias especificas (ex: "Prisma ORM", "React Query")
  - Adicionar comandos ou snippets relevantes
  - Mencionar bibliotecas recomendadas
  - Especificar padroes de arquitetura quando aplicavel

  **Exemplo de descricao RUIM:**
  ```json
  "description": "Configurar banco de dados"
  ```

  **Exemplo de descricao BOA:**
  ```json
  "description": "Configurar PostgreSQL com Prisma ORM. Criar schema inicial com modelos User e Account. Configurar connection pooling para producao."
  ```

### 2. Verificacao de Dependencias

- [ ] **Verificar se existem dependencias de outras tasks**
  - Para cada task criada, perguntar: "Esta task precisa de algo pronto antes?"
  - Verificar se alguma task de OUTRO template e pre-requisito
  - Checar tasks de stack.json que podem ser dependencias

  **Perguntas obrigatorias para cada task:**
  - Precisa de banco de dados? → depende de `[TASK] Configurar PostgreSQL`
  - Precisa de autenticacao? → depende de `[TASK] Implementar JWT`
  - Precisa de componente UI? → depende de `[TASK] Criar componente X`
  - Precisa de API? → depende de `[TASK] Criar endpoint Y`

- [ ] Revisar dependencias entre tasks do mesmo story
- [ ] Revisar dependencias entre stories do mesmo epic
- [ ] Verificar referencias cruzadas entre templates diferentes
- [ ] Usar formato correto: `[EPIC]`, `[STORY]`, `[TASK]`

  **Exemplo de dependencia entre templates:**
  ```json
  {
    "title": "Implementar login social",
    "depends_on": [
      "Configurar OAuth providers",
      "[TASK] Configurar variaveis de ambiente",
      "[TASK] Implementar cliente Redis"
    ]
  }
  ```

### 3. Labels e Categorias

- [ ] Toda task tem label de tipo (`task`)
- [ ] Toda task tem label de stack (`frontend`, `backend`, `fullstack`)
- [ ] Labels adicionais relevantes estao presentes (`security`, `integration`, etc)

### 4. Consistencia

- [ ] Nomes de tasks sao claros e acionaveis (iniciar com verbo)
- [ ] User stories seguem formato "Como [persona], quero [acao] para [beneficio]"
- [ ] Criterios de aceitacao sao verificaveis
- [ ] Nao ha tasks duplicadas

### 5. Completude

- [ ] Todos os cenarios de erro foram considerados
- [ ] Tasks de teste estao incluidas quando relevante
- [ ] Documentacao esta prevista nas tasks

### 6. Revisao Final

- [ ] ✅ Executar `node scripts/validate-templates.js` - **OBRIGATORIO**
- [ ] Executar `node scripts/generate.js --dry-run` para testar geracao
- [ ] Verificar se JSON esta valido (sem erros de sintaxe)
- [ ] Confirmar que a ordem de execucao faz sentido

---

**Lembrete:** Templates bem documentados geram backlogs de alta qualidade. Invista tempo em descricoes tecnicas detalhadas!

> 🤖 **Para o Claude:** Ao criar ou modificar qualquer template, SEMPRE execute `node scripts/validate-templates.js` antes de informar ao usuario que a tarefa foi concluida. Se houver ERROS (nao warnings), corrija-os antes de finalizar.
