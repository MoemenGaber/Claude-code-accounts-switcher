const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { input, confirm, select } = require('@inquirer/prompts');
const {
  readAccounts, writeAccounts, MAX_ACCOUNTS, RESERVED,
} = require('./config');
const { SESSION_ARTIFACTS } = require('./clear');
const SESSION_SET = new Set(SESSION_ARTIFACTS);

async function promptName(accounts) {
  while (true) {
    const name = await input({ message: 'Account name (letters, numbers, hyphens, underscores):' });
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      console.log('  Invalid name. Use only letters, numbers, hyphens, underscores.'); continue;
    }
    if (RESERVED.has(name)) {
      console.log(`  '${name}' is reserved. Choose another.`); continue;
    }
    if (accounts.has(name)) {
      console.log(`  Account '${name}' already exists.`); continue;
    }
    return name;
  }
}

async function promptDir(name, existingAccounts) {
  const defaultDir = path.join(os.homedir(), `.claude-${name}`);
  while (true) {
    const raw = await input({
      message: `Config dir for '${name}':`,
      default: defaultDir,
    });
    const dir = raw.trim();
    if (!path.isAbsolute(dir)) {
      console.log('  Path must be absolute (start with /).'); continue;
    }

    if (fs.existsSync(dir)) return { dir, isNew: false };

    // Dir doesn't exist — offer to clone ~/.claude or create empty
    const dotClaude = path.join(os.homedir(), '.claude');
    const hasDotClaude = fs.existsSync(dotClaude);

    if (hasDotClaude) {
      const choice = await select({
        message: `'${dir}' doesn't exist. What to do?`,
        choices: [
          { name: `Copy ~/.claude config (settings, plugins, skills — auth stripped)`, value: 'clone' },
          { name: 'Create empty directory', value: 'empty' },
          { name: 'Enter a different path', value: 'retry' },
        ],
      });
      if (choice === 'retry') continue;
      if (choice === 'clone') {
        const withHistory = await confirm({
          message: 'Also copy conversation history and sessions? (default: no — start fresh)',
          default: false,
        });
        cloneConfig(dotClaude, dir, { includeHistory: withHistory });
        const suffix = withHistory ? 'auth tokens removed, history included' : 'auth tokens and history removed';
        console.log(`  Cloned ~/.claude into ${dir} (${suffix})`);
        return { dir, isNew: true };
      }
    } else {
      const create = await confirm({ message: `'${dir}' doesn't exist. Create it?`, default: true });
      if (!create) continue;
    }

    fs.mkdirSync(dir, { recursive: true });
    return { dir, isNew: true };
  }
}

function cloneConfig(src, dest, { includeHistory = false } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src);
  for (const entry of entries) {
    if (!includeHistory && SESSION_SET.has(entry)) continue;
    const srcPath  = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  // Strip auth tokens regardless
  const authFile = path.join(dest, '.claude.json');
  if (fs.existsSync(authFile)) fs.unlinkSync(authFile);
}

async function addAccount(nameArg, dirArg) {
  const accounts = readAccounts();

  if (accounts.size >= MAX_ACCOUNTS) {
    console.error(`Maximum of ${MAX_ACCOUNTS} accounts reached.`);
    process.exit(1);
  }

  const name = nameArg && /^[a-zA-Z0-9_-]+$/.test(nameArg) && !RESERVED.has(nameArg) && !accounts.has(nameArg)
    ? nameArg
    : await promptName(accounts);

  let dir;
  if (dirArg && path.isAbsolute(dirArg)) {
    dir = dirArg;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } else {
    ({ dir } = await promptDir(name, accounts));
  }

  accounts.set(name, dir);
  writeAccounts(accounts);
  console.log(`\nAccount '${name}' added.`);
  console.log(`Run: source ~/.zshrc   (to activate the 'claude${name}' alias)`);
}

module.exports = { addAccount, cloneConfig, promptName, promptDir };
