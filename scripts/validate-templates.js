#!/usr/bin/env node

/**
 * Auto-SaaS Template Validator
 *
 * Valida todos os templates JSON do projeto para garantir
 * que estao corretos antes de usar o generate.js
 *
 * Uso:
 *   node scripts/validate-templates.js           # Valida todos os templates
 *   node scripts/validate-templates.js --file templates/marketing/branding.json  # Valida arquivo especifico
 *   node scripts/validate-templates.js --verbose # Modo verbose com detalhes
 */

const fs = require('fs');
const path = require('path');

// Cores para output
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

// Parse argumentos
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Auto-SaaS Template Validator

Uso:
  node scripts/validate-templates.js [opcoes]

Opcoes:
  --file, -f     Valida apenas um arquivo especifico
  --verbose, -v  Mostra detalhes de cada validacao
  --help, -h     Mostra esta ajuda

Exemplos:
  node scripts/validate-templates.js
  node scripts/validate-templates.js --file templates/marketing/branding.json
  node scripts/validate-templates.js -v
`);
}

// Carregar labels validos
function loadValidLabels() {
  const labelsPath = path.join(__dirname, '..', 'config', 'labels.json');
  try {
    const data = JSON.parse(fs.readFileSync(labelsPath, 'utf-8'));
    return new Set(data.labels.map(l => l.name));
  } catch (error) {
    log('red', `Erro ao carregar labels.json: ${error.message}`);
    process.exit(1);
  }
}

// Encontrar todos os arquivos JSON de templates
function findTemplateFiles(baseDir) {
  const files = [];

  function scan(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  scan(baseDir);
  return files;
}

// Classe de validacao
class TemplateValidator {
  constructor(validLabels, verbose = false) {
    this.validLabels = validLabels;
    this.verbose = verbose;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      epics: 0,
      stories: 0,
      tasks: 0,
      labels_used: new Set(),
    };
  }

  addError(path, message) {
    this.errors.push({ path, message });
  }

  addWarning(path, message) {
    this.warnings.push({ path, message });
  }

  log(message) {
    if (this.verbose) {
      log('dim', `  ${message}`);
    }
  }

  // Validar JSON basico
  validateJSON(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.addError(filePath, `JSON invalido: ${error.message}`);
      return null;
    }
  }

  // Validar labels
  validateLabels(labels, context) {
    if (!labels || !Array.isArray(labels)) {
      this.addError(context, 'Labels deve ser um array');
      return false;
    }

    if (labels.length === 0) {
      this.addWarning(context, 'Nenhuma label definida');
      return true;
    }

    let valid = true;
    for (const label of labels) {
      this.stats.labels_used.add(label);
      if (!this.validLabels.has(label)) {
        this.addError(context, `Label desconhecida: "${label}". Adicione em config/labels.json`);
        valid = false;
      }
    }
    return valid;
  }

  // Validar task
  validateTask(task, storyTitle, epicTitle) {
    const context = `Task "${task.title || 'sem titulo'}" (Story: ${storyTitle}, Epic: ${epicTitle})`;
    let valid = true;

    // Campos obrigatorios
    if (!task.title || typeof task.title !== 'string' || task.title.trim() === '') {
      this.addError(context, 'Task deve ter titulo (string nao vazia)');
      valid = false;
    }

    if (!task.description || typeof task.description !== 'string') {
      this.addError(context, 'Task deve ter descricao (string)');
      valid = false;
    }

    if (!this.validateLabels(task.labels, context)) {
      valid = false;
    }

    // Validar depends_on
    if (task.depends_on) {
      if (!Array.isArray(task.depends_on)) {
        this.addError(context, 'depends_on deve ser um array');
        valid = false;
      } else {
        for (const dep of task.depends_on) {
          if (typeof dep !== 'string') {
            this.addError(context, 'Cada item de depends_on deve ser string');
            valid = false;
          } else if (!dep.startsWith('[EPIC]') && !dep.startsWith('[STORY]') && !dep.startsWith('[TASK]')) {
            this.addWarning(context, `Dependencia "${dep}" nao segue formato recomendado [EPIC/STORY/TASK]`);
          }
        }
      }
    }

    // Validar related_to
    if (task.related_to) {
      if (!Array.isArray(task.related_to)) {
        this.addError(context, 'related_to deve ser um array');
        valid = false;
      }
    }

    // Validar technical_details
    if (task.technical_details) {
      valid = this.validateTechnicalDetails(task.technical_details, context) && valid;
    }

    this.log(`Task: ${task.title}`);
    this.stats.tasks++;
    return valid;
  }

  // Validar technical_details
  validateTechnicalDetails(td, context) {
    if (typeof td !== 'object' || td === null) {
      this.addError(context, 'technical_details deve ser um objeto');
      return false;
    }

    let valid = true;

    // Validar stack
    if (td.stack && typeof td.stack !== 'string') {
      this.addError(context, 'technical_details.stack deve ser string');
      valid = false;
    }

    // Validar files
    if (td.files) {
      if (!Array.isArray(td.files)) {
        this.addError(context, 'technical_details.files deve ser array');
        valid = false;
      } else {
        for (const file of td.files) {
          if (typeof file !== 'string') {
            this.addError(context, 'Cada arquivo em files deve ser string');
            valid = false;
          }
        }
      }
    }

    // Validar packages
    if (td.packages) {
      if (Array.isArray(td.packages)) {
        for (const pkg of td.packages) {
          if (typeof pkg !== 'string') {
            this.addError(context, 'Cada pacote em packages deve ser string');
            valid = false;
          }
        }
      } else if (typeof td.packages === 'object') {
        // Formato { dependencies: {}, devDependencies: {} }
        if (td.packages.dependencies && typeof td.packages.dependencies !== 'object') {
          this.addError(context, 'packages.dependencies deve ser objeto');
          valid = false;
        }
        if (td.packages.devDependencies && typeof td.packages.devDependencies !== 'object') {
          this.addError(context, 'packages.devDependencies deve ser objeto');
          valid = false;
        }
      } else {
        this.addError(context, 'technical_details.packages deve ser array ou objeto');
        valid = false;
      }
    }

    // Validar comandos
    const comandos = ['comando_instalar', 'comando_criar', 'verificar'];
    for (const cmd of comandos) {
      if (td[cmd] && typeof td[cmd] !== 'string') {
        this.addError(context, `technical_details.${cmd} deve ser string`);
        valid = false;
      }
    }

    // Validar implementation_notes
    if (td.implementation_notes && typeof td.implementation_notes !== 'string') {
      this.addError(context, 'technical_details.implementation_notes deve ser string');
      valid = false;
    }

    return valid;
  }

  // Validar story
  validateStory(story, epicTitle) {
    const context = `Story "${story.title || 'sem titulo'}" (Epic: ${epicTitle})`;
    let valid = true;

    // Campos obrigatorios
    if (!story.title || typeof story.title !== 'string' || story.title.trim() === '') {
      this.addError(context, 'Story deve ter titulo (string nao vazia)');
      valid = false;
    }

    if (!story.description || typeof story.description !== 'string') {
      this.addError(context, 'Story deve ter descricao (string)');
      valid = false;
    }

    if (!this.validateLabels(story.labels, context)) {
      valid = false;
    }

    // Validar acceptance_criteria
    if (!story.acceptance_criteria || !Array.isArray(story.acceptance_criteria)) {
      this.addWarning(context, 'Story deveria ter acceptance_criteria (array)');
    } else if (story.acceptance_criteria.length === 0) {
      this.addWarning(context, 'acceptance_criteria esta vazio');
    }

    // Validar depends_on
    if (story.depends_on && !Array.isArray(story.depends_on)) {
      this.addError(context, 'depends_on deve ser um array');
      valid = false;
    }

    // Validar tasks
    if (!story.tasks || !Array.isArray(story.tasks)) {
      this.addWarning(context, 'Story deveria ter tasks (array)');
    } else if (story.tasks.length === 0) {
      this.addWarning(context, 'Story nao tem tasks');
    } else {
      for (const task of story.tasks) {
        if (!this.validateTask(task, story.title, epicTitle)) {
          valid = false;
        }
      }
    }

    this.log(`Story: ${story.title} (${story.tasks?.length || 0} tasks)`);
    this.stats.stories++;
    return valid;
  }

  // Validar epic
  validateEpic(epic, source = 'root') {
    const context = `Epic "${epic.title || 'sem titulo'}" (${source})`;
    let valid = true;

    // Campos obrigatorios
    if (!epic.title || typeof epic.title !== 'string' || epic.title.trim() === '') {
      this.addError(context, 'Epic deve ter titulo (string nao vazia)');
      valid = false;
    }

    if (!epic.description || typeof epic.description !== 'string') {
      this.addError(context, 'Epic deve ter descricao (string)');
      valid = false;
    }

    if (!this.validateLabels(epic.labels, context)) {
      valid = false;
    }

    this.log(`Epic: ${epic.title}`);
    this.stats.epics++;
    return valid;
  }

  // Validar template completo
  validateTemplate(filePath) {
    log('blue', `\nValidando: ${path.relative(process.cwd(), filePath)}`);

    const data = this.validateJSON(filePath);
    if (!data) return false;

    let valid = true;

    // Detectar formato do template
    if (data.epic && data.stories) {
      // Formato: { epic: {}, stories: [] }
      if (!this.validateEpic(data.epic, filePath)) {
        valid = false;
      }

      if (!Array.isArray(data.stories)) {
        this.addError(filePath, 'stories deve ser um array');
        valid = false;
      } else {
        for (const story of data.stories) {
          if (!this.validateStory(story, data.epic.title)) {
            valid = false;
          }
        }
      }
    } else if (data.epics && Array.isArray(data.epics)) {
      // Formato: { name: '', epics: [] }
      for (const epic of data.epics) {
        if (!this.validateEpic(epic, filePath)) {
          valid = false;
        }
        if (epic.stories) {
          for (const story of epic.stories) {
            if (!this.validateStory(story, epic.title)) {
              valid = false;
            }
          }
        }
      }
    } else if (data.labels && Array.isArray(data.labels)) {
      // Arquivo de labels - skip
      this.log('Arquivo de labels detectado, pulando validacao de template');
      return true;
    } else {
      this.addError(filePath, 'Formato de template desconhecido. Deve ter "epic + stories" ou "epics" array');
      valid = false;
    }

    return valid;
  }

  // Gerar relatorio
  getReport() {
    return {
      errors: this.errors,
      warnings: this.warnings,
      stats: {
        ...this.stats,
        labels_used: Array.from(this.stats.labels_used),
      },
      hasErrors: this.errors.length > 0,
      hasWarnings: this.warnings.length > 0,
    };
  }
}

// Funcao principal
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  log('cyan', '\n========================================');
  log('cyan', '   Auto-SaaS Template Validator');
  log('cyan', '========================================\n');

  const validLabels = loadValidLabels();
  log('dim', `${validLabels.size} labels carregadas de config/labels.json\n`);

  const validator = new TemplateValidator(validLabels, options.verbose);

  let files = [];

  if (options.file) {
    // Validar arquivo especifico
    const filePath = path.isAbsolute(options.file)
      ? options.file
      : path.join(process.cwd(), options.file);

    if (!fs.existsSync(filePath)) {
      log('red', `Arquivo nao encontrado: ${filePath}`);
      process.exit(1);
    }
    files = [filePath];
  } else {
    // Encontrar todos os templates
    const templatesDir = path.join(__dirname, '..', 'templates');
    files = findTemplateFiles(templatesDir);
    log('dim', `${files.length} arquivos de template encontrados\n`);
  }

  let allValid = true;
  for (const file of files) {
    if (!validator.validateTemplate(file)) {
      allValid = false;
    }
  }

  // Imprimir relatorio
  const report = validator.getReport();

  console.log('\n');
  log('cyan', '========================================');
  log('cyan', '             RESULTADO');
  log('cyan', '========================================\n');

  // Estatisticas
  log('blue', 'Estatisticas:');
  console.log(`  - Epics: ${report.stats.epics}`);
  console.log(`  - Stories: ${report.stats.stories}`);
  console.log(`  - Tasks: ${report.stats.tasks}`);
  console.log(`  - Labels usadas: ${report.stats.labels_used.length}`);

  // Warnings
  if (report.warnings.length > 0) {
    console.log('\n');
    log('yellow', `⚠ ${report.warnings.length} Warnings:`);
    for (const w of report.warnings) {
      log('yellow', `  - [${w.path}] ${w.message}`);
    }
  }

  // Errors
  if (report.errors.length > 0) {
    console.log('\n');
    log('red', `✗ ${report.errors.length} Erros:`);
    for (const e of report.errors) {
      log('red', `  - [${e.path}] ${e.message}`);
    }
  }

  console.log('\n');

  if (allValid && !report.hasErrors) {
    log('green', '✓ Todos os templates sao validos!\n');
    process.exit(0);
  } else {
    log('red', '✗ Validacao falhou. Corrija os erros acima.\n');
    process.exit(1);
  }
}

main().catch(error => {
  log('red', `Erro fatal: ${error.message}`);
  process.exit(1);
});
