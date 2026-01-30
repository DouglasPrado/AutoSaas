#!/usr/bin/env node

/**
 * Auto-SaaS Backlog Generator
 *
 * Gera issues no GitHub com hierarquia de sub-issues:
 * - Epic (issue principal)
 *   - Story (sub-issue do Epic)
 *     - Task (sub-issue da Story)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    repo: null,
    type: null,
    name: 'SaaS Project',
    dryRun: false,
    baseOnly: false,
    epic: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--repo':
        options.repo = args[++i];
        break;
      case '--type':
        options.type = args[++i];
        break;
      case '--name':
        options.name = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--base-only':
        options.baseOnly = true;
        break;
      case '--epic':
        options.epic = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Auto-SaaS Backlog Generator

Estrutura criada:
  Epic (issue principal)
  └── Story (sub-issue do Epic)
      └── Task (sub-issue da Story)

Uso:
  node scripts/generate.js --repo owner/repo --type productivity --name "Meu SaaS"

Opcoes:
  --repo      Repositorio GitHub (owner/repo) [obrigatorio]
  --type      Tipo de SaaS: productivity, content-social [obrigatorio se nao usar --base-only]
  --name      Nome do projeto SaaS (default: "SaaS Project")
  --dry-run   Apenas mostra o que seria criado, sem criar issues
  --base-only Criar apenas modulos base (auth, billing, onboarding, settings) + marketing
  --epic      Criar apenas um epic especifico pelo titulo
  --help      Mostra esta ajuda
`);
}

function loadTemplatesFromDir(dir, maxDepth = 3) {
  const templates = [];
  if (!fs.existsSync(dir) || maxDepth < 0) return templates;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isFile() && item.endsWith('.json')) {
      try {
        const content = JSON.parse(fs.readFileSync(itemPath, 'utf-8'));
        content._sourcePath = itemPath;
        templates.push(content);
      } catch (error) {
        log('yellow', `Aviso: Erro ao carregar ${itemPath}: ${error.message}`);
      }
    } else if (stat.isDirectory()) {
      templates.push(...loadTemplatesFromDir(itemPath, maxDepth - 1));
    }
  }
  return templates;
}

function loadMarketingTemplates() {
  return loadTemplatesFromDir(path.join(__dirname, '..', 'templates', 'marketing'));
}

function loadBaseTemplates() {
  return loadTemplatesFromDir(path.join(__dirname, '..', 'templates', 'base'));
}

function loadTypeTemplate(type) {
  const typeDir = path.join(__dirname, '..', 'templates', type);
  if (!fs.existsSync(typeDir)) {
    log('red', `Template "${type}" nao encontrado`);
    process.exit(1);
  }

  const templatePath = path.join(typeDir, 'template.json');
  if (fs.existsSync(templatePath)) {
    return JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
  }

  const templates = loadTemplatesFromDir(typeDir);
  if (templates.length === 0) {
    log('red', `Nenhum template encontrado em ${typeDir}`);
    process.exit(1);
  }

  return {
    name: type,
    epics: templates.flatMap(t => {
      if (t.epic && t.stories) {
        return [{ ...t.epic, stories: t.stories }];
      }
      return t.epics || [];
    })
  };
}

function loadLabels() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'labels.json'), 'utf-8'));
}

function createLabels(repo, labels, dryRun) {
  log('cyan', '\n=== Criando Labels ===\n');
  for (const label of labels.labels) {
    if (dryRun) {
      log('yellow', `[DRY-RUN] Label: ${label.name}`);
    } else {
      try {
        execSync(`gh label create "${label.name}" --color "${label.color}" --description "${label.description}" --repo ${repo} --force`, { stdio: 'pipe' });
        log('green', `✓ ${label.name}`);
      } catch {
        try {
          execSync(`gh label edit "${label.name}" --color "${label.color}" --description "${label.description}" --repo ${repo}`, { stdio: 'pipe' });
        } catch {}
      }
    }
  }
}

// Sleep sincrono
function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

// Criar issue usando a API REST do GitHub com retry
function createIssue(repo, title, body, labels, dryRun, retries = 3) {
  if (dryRun) {
    return { number: Math.floor(Math.random() * 10000), id: Math.floor(Math.random() * 1000000000) };
  }

  const tmpFile = `/tmp/issue-payload-${Date.now()}.json`;
  const payload = JSON.stringify({ title, body, labels });
  fs.writeFileSync(tmpFile, payload, 'utf-8');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = execSync(
        `gh api repos/${repo}/issues --method POST --input "${tmpFile}" --jq '{number: .number, id: .id}'`,
        { stdio: 'pipe', encoding: 'utf-8' }
      );

      fs.unlinkSync(tmpFile);
      return JSON.parse(result);
    } catch (error) {
      const errMsg = error.stderr?.toString() || error.message;

      // Se for rate limit, esperar e tentar novamente
      if (errMsg.includes('rate limit') || errMsg.includes('HTTP 403')) {
        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 10000; // 20s, 40s, 80s
          log('yellow', `  ⏳ Rate limit - aguardando ${waitTime/1000}s (tentativa ${attempt}/${retries})...`);
          sleepSync(waitTime);
          continue;
        }
      }

      try { fs.unlinkSync(tmpFile); } catch {}
      log('red', `  ✗ Erro ao criar: ${title}`);
      if (attempt === retries) console.error(errMsg);
      return null;
    }
  }

  try { fs.unlinkSync(tmpFile); } catch {}
  return null;
}

// Adicionar sub-issue usando o ID numerico
function addSubIssue(repo, parentNumber, childId, dryRun) {
  if (dryRun) return true;

  try {
    execSync(`gh api repos/${repo}/issues/${parentNumber}/sub_issues --method POST -F sub_issue_id=${childId}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function formatEpicBody(epic, stories) {
  let body = `${epic.description}\n\n`;

  if (epic.depends_on?.length > 0) {
    body += '## Dependencias\n\n';
    epic.depends_on.forEach(dep => body += `- [ ] ${dep}\n`);
    body += '\n';
  }

  body += '## Stories\n\n';
  stories.forEach(s => body += `- [ ] ${s.title}\n`);

  return body;
}

function formatStoryBody(story) {
  let body = `${story.description}\n\n`;

  if (story.depends_on?.length > 0) {
    body += '## Dependencias\n\n';
    story.depends_on.forEach(dep => body += `- [ ] ${dep}\n`);
    body += '\n';
  }

  if (story.related_to?.length > 0) {
    body += '## Relacionado a\n\n';
    story.related_to.forEach(rel => body += `- ${rel}\n`);
    body += '\n';
  }

  body += '## Criterios de Aceitacao\n\n';
  (story.acceptance_criteria || []).forEach(c => body += `- [ ] ${c}\n`);

  if (story.tasks?.length > 0) {
    body += '\n## Tasks\n\n';
    story.tasks.forEach(t => body += `- [ ] ${t.title}\n`);
  }

  return body;
}

// Formata label do campo para exibição (snake_case/camelCase -> Title Case)
function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Renderiza um valor do technical_details para markdown
function renderTechnicalValue(key, value) {
  const label = formatLabel(key);

  // String simples
  if (typeof value === 'string') {
    // Comandos bash
    if (key.includes('comando') || key.includes('command') || key === 'verificar') {
      return `**${label}:**\n\`\`\`bash\n${value}\n\`\`\`\n\n`;
    }
    return `**${label}:** ${value}\n\n`;
  }

  // Array de strings
  if (Array.isArray(value) && value.length > 0) {
    let md = `**${label}:**\n`;
    value.forEach(item => {
      if (typeof item === 'string') {
        md += `- ${item}\n`;
      } else if (typeof item === 'object') {
        md += `- ${JSON.stringify(item)}\n`;
      }
    });
    return md + '\n';
  }

  // Objeto (packages, config, etc)
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    // Caso especial: packages com dependencies/devDependencies
    if (key === 'packages') {
      let md = '';
      const deps = value.dependencies ? Object.keys(value.dependencies) : [];
      const devDeps = value.devDependencies ? Object.keys(value.devDependencies) : [];
      if (deps.length > 0 || devDeps.length > 0) {
        md += '**Pacotes:**\n';
        if (deps.length > 0) md += '```bash\npnpm add ' + deps.join(' ') + '\n```\n';
        if (devDeps.length > 0) md += '```bash\npnpm add -D ' + devDeps.join(' ') + '\n```\n';
        md += '\n';
      }
      return md;
    }
    // Outros objetos: renderizar como JSON ou lista
    let md = `**${label}:**\n`;
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string') {
        md += `- **${formatLabel(k)}:** ${v}\n`;
      } else if (Array.isArray(v)) {
        md += `- **${formatLabel(k)}:** ${v.join(', ')}\n`;
      }
    }
    return md + '\n';
  }

  return '';
}

function formatTaskBody(task, storyTitle) {
  let body = `## Breve Descricao\n\n${task.description}\n\n`;
  body += `**Story:** ${storyTitle}\n`;

  if (task.depends_on?.length > 0) {
    body += '\n## Dependencias\n\n';
    task.depends_on.forEach(dep => body += `- [ ] ${dep}\n`);
  }

  if (task.related_to?.length > 0) {
    body += '\n## Relacionado a\n\n';
    task.related_to.forEach(rel => body += `- ${rel}\n`);
  }

  if (task.technical_details && Object.keys(task.technical_details).length > 0) {
    body += '\n---\n\n## Detalhes Tecnicos\n\n';

    // Renderizar cada campo do technical_details
    for (const [key, value] of Object.entries(task.technical_details)) {
      body += renderTechnicalValue(key, value);
    }
  }

  return body;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processEpic(repo, epicData, stories, projectName, options) {
  const epicTitle = `[${projectName}] ${epicData.title}`;
  log('cyan', `\n=== Epic: ${epicData.title} ===\n`);

  // 1. Criar Epic
  const epicIssue = createIssue(
    repo,
    epicTitle,
    formatEpicBody(epicData, stories),
    epicData.labels || ['epic'],
    options.dryRun
  );

  if (!epicIssue) {
    log('red', `✗ Falha ao criar Epic`);
    return;
  }
  log('green', `✓ Epic: ${epicTitle} (#${epicIssue.number})`);

  // 2. Criar Stories como sub-issues do Epic
  for (const story of stories) {
    if (!options.dryRun) await delay(2000);

    const storyIssue = createIssue(
      repo,
      story.title,
      formatStoryBody(story),
      story.labels || ['story'],
      options.dryRun
    );

    if (!storyIssue) {
      log('red', `  ✗ Falha: ${story.title}`);
      continue;
    }

    // Vincular Story ao Epic
    if (!options.dryRun) {
      addSubIssue(repo, epicIssue.number, storyIssue.id, options.dryRun);
    }
    log('green', `  ✓ Story: ${story.title} (#${storyIssue.number})`);

    // 3. Criar Tasks como sub-issues da Story
    for (const task of story.tasks || []) {
      if (!options.dryRun) await delay(1500);

      const taskIssue = createIssue(
        repo,
        task.title,
        formatTaskBody(task, story.title),
        task.labels || ['task'],
        options.dryRun
      );

      if (!taskIssue) {
        log('red', `    ✗ Falha: ${task.title}`);
        continue;
      }

      // Vincular Task a Story
      if (!options.dryRun) {
        addSubIssue(repo, storyIssue.number, taskIssue.id, options.dryRun);
      }
      log('green', `    ✓ Task: ${task.title} (#${taskIssue.number})`);
    }
  }
}

async function processTemplate(repo, template, projectName, options) {
  if (template.epic && template.stories) {
    if (options.epic && !template.epic.title.toLowerCase().includes(options.epic.toLowerCase())) {
      return;
    }
    await processEpic(repo, template.epic, template.stories, projectName, options);
    return;
  }

  if (template.epics) {
    for (const epic of template.epics) {
      if (options.epic && !epic.title.toLowerCase().includes(options.epic.toLowerCase())) {
        continue;
      }
      await processEpic(repo, epic, epic.stories || [], projectName, options);
    }
  }
}

async function main() {
  const options = parseArgs();

  if (!options.repo) {
    log('red', 'Erro: --repo e obrigatorio');
    showHelp();
    process.exit(1);
  }

  if (!options.baseOnly && !options.type) {
    log('red', 'Erro: --type e obrigatorio (ou use --base-only)');
    showHelp();
    process.exit(1);
  }

  try {
    execSync('gh --version', { stdio: 'pipe' });
    execSync('gh auth status', { stdio: 'pipe' });
  } catch {
    log('red', 'Erro: GitHub CLI nao configurado. Execute: gh auth login');
    process.exit(1);
  }

  log('blue', `\n🚀 Auto-SaaS Backlog Generator`);
  log('blue', `   Projeto: ${options.name}`);
  log('blue', `   Repo: ${options.repo}`);
  log('blue', `   Estrutura: Epic → Story (sub-issue) → Task (sub-issue)`);
  if (options.dryRun) log('yellow', `   [MODO DRY-RUN]\n`);

  const labels = loadLabels();
  createLabels(options.repo, labels, options.dryRun);

  log('cyan', '\n>>> Templates de Marketing...');
  for (const template of loadMarketingTemplates()) {
    await processTemplate(options.repo, template, options.name, options);
  }

  log('cyan', '\n>>> Templates Base...');
  for (const template of loadBaseTemplates()) {
    await processTemplate(options.repo, template, options.name, options);
  }

  if (!options.baseOnly && options.type) {
    log('cyan', `\n>>> Templates de ${options.type}...`);
    const typeTemplate = loadTypeTemplate(options.type);
    if (typeTemplate.epics) {
      for (const epic of typeTemplate.epics) {
        if (options.epic && !epic.title.toLowerCase().includes(options.epic.toLowerCase())) continue;
        await processEpic(options.repo, epic, epic.stories || [], options.name, options);
      }
    }
  }

  log('green', '\n✅ Backlog gerado com sucesso!\n');
  if (!options.dryRun) log('blue', `Acesse: https://github.com/${options.repo}/issues\n`);
}

main().catch(console.error);
