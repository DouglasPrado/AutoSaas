# Auto-SaaS

Sistema de automacao para criacao de backlogs de projetos SaaS. Gera issues estruturadas no GitHub a partir de templates pre-definidos.

## Instalacao

1. Clone o repositorio
2. Instale o [GitHub CLI](https://cli.github.com/)
3. Autentique: `gh auth login`

## Uso Rapido

```bash
# Gerar backlog completo de produtividade
node scripts/generate.js --repo seu-user/seu-repo --type productivity --name "Meu SaaS"

# Gerar backlog de conteudo/social
node scripts/generate.js --repo seu-user/seu-repo --type content-social --name "Minha Rede"

# Ver o que seria criado (dry-run)
node scripts/generate.js --repo seu-user/seu-repo --type productivity --dry-run
```

## Opcoes do CLI

| Opcao | Descricao |
|-------|-----------|
| `--repo` | Repositorio GitHub (owner/repo) - obrigatorio |
| `--type` | Tipo de SaaS: `productivity` ou `content-social` |
| `--name` | Nome do projeto (aparece nas issues) |
| `--dry-run` | Apenas mostra o que seria criado |
| `--base-only` | Criar apenas modulos base |
| `--epic` | Criar apenas um epic especifico |

## Templates Disponiveis

### Marketing (templates/marketing/)

- **landingpage/construcao.json** - Hero, features, pricing, FAQ, SEO, analytics

### Modulos Base (templates/base/)

- **auth.json** - Autenticacao, registro, login, 2FA, OAuth
- **billing.json** - Planos, pagamentos, assinaturas, Stripe
- **onboarding.json** - Welcome, tour guiado, checklist de ativacao
- **settings.json** - Perfil, preferencias, notificacoes, seguranca

### Produtividade/Tools

Template para ferramentas de trabalho e colaboracao:

- Dashboard e Overview
- Workspace e Projetos
- Tarefas e Todo Lists (Kanban, subtarefas, recorrencia)
- Colaboracao em Tempo Real (comentarios, mencoes, presenca)
- Automacoes e Integracoes (Slack, Calendar, Zapier)
- Relatorios e Analytics

### Conteudo/Social

Template para plataformas de conteudo e redes sociais:

- Feed e Timeline
- Criacao de Conteudo (editor, agendamento, templates)
- Interacoes Sociais (likes, comentarios, compartilhamento)
- Perfis e Seguidores
- Mensagens Diretas
- Comunidades e Grupos
- Notificacoes
- Analytics para Criadores

## Estrutura das Issues

O sistema cria uma hierarquia de issues:

```
[EPIC] Autenticacao e Gestao de Usuarios     <- Milestone
  └── [STORY] Registro de Usuario             <- Issue com criterios
        ├── [TASK] Criar pagina de registro   <- Issue tecnica
        ├── [TASK] Implementar API de registro
        └── [TASK] Configurar envio de email
```

### Labels

As issues sao automaticamente categorizadas com labels:

- **Tipo:** `epic`, `story`, `task`
- **Area:** `core`, `auth`, `billing`, `onboarding`, etc
- **Stack:** `frontend`, `backend`, `fullstack`
- **Outros:** `integration`, `security`, `growth`, `testing`, `marketing`, `seo`, `legal`

## Customizacao

### Criar Novo Template

1. Crie uma pasta em `templates/seu-tipo/`
2. Crie `template.json` seguindo a estrutura:

```json
{
  "name": "Nome do Template",
  "description": "Descricao",
  "base_modules": ["auth", "billing"],
  "epics": [
    {
      "title": "Titulo do Epic",
      "description": "Descricao",
      "labels": ["epic", "sua-label"],
      "stories": [
        {
          "title": "User Story",
          "description": "Como usuario...",
          "acceptance_criteria": ["Criterio 1", "Criterio 2"],
          "labels": ["story"],
          "tasks": [
            {
              "title": "Task Tecnica",
              "description": "Implementar...",
              "labels": ["task", "frontend"]
            }
          ]
        }
      ]
    }
  ]
}
```

### Adicionar Labels

Edite `config/labels.json` para adicionar novas labels com nome, cor e descricao.

## Fluxo de Trabalho

### 1. Planejamento (Criacao)

```bash
# Gerar backlog inicial
node scripts/generate.js --repo user/repo --type productivity --name "MeuApp"
```

### 2. Dia a Dia

- Trabalhe nas issues do GitHub
- Mova issues entre colunas no Projects
- Use milestones para acompanhar epics

### 3. Evolucao

- Adicione novos epics conforme necessario
- Use `--epic "Nome"` para adicionar epics especificos
- Customize templates para seu contexto

## Exemplos

```bash
# Criar apenas autenticacao para um MVP
node scripts/generate.js --repo user/mvp --base-only --epic "Autenticacao" --name "MVP"

# Backlog completo para SaaS de produtividade
node scripts/generate.js --repo user/taskapp --type productivity --name "TaskFlow"

# Backlog para rede social
node scripts/generate.js --repo user/social --type content-social --name "MySocial"
```

## Requisitos

- Node.js 16+
- GitHub CLI (`gh`) instalado e autenticado
- Permissao de escrita no repositorio alvo
