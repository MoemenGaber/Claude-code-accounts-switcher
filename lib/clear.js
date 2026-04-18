'use strict';

const fs   = require('fs');
const path = require('path');
const { confirm, select } = require('@inquirer/prompts');
const { readAccounts } = require('./config');

const SESSION_ARTIFACTS = [
  'sessions',
  'history.jsonl',
  'file-history',
  'session-env',
];

async function clearHistory(nameArg) {
  const accounts = readAccounts();
  if (accounts.size === 0) {
    console.error('No accounts configured. Run: claude-switcher setup');
    process.exit(1);
  }

  let name = nameArg;
  if (!name || !accounts.has(name)) {
    if (nameArg) {
      console.error(`Account '${nameArg}' not found.`);
    }
    name = await select({
      message: 'Which account do you want to clear history for?',
      choices: [...accounts.keys()].map(n => ({ name: n, value: n })),
    });
  }

  const dir = accounts.get(name);
  const ok = await confirm({
    message: `Delete sessions and history for '${name}' (${dir})? This cannot be undone.`,
    default: false,
  });
  if (!ok) { console.log('Cancelled.'); return; }

  let cleared = 0;
  for (const artifact of SESSION_ARTIFACTS) {
    const target = path.join(dir, artifact);
    if (!fs.existsSync(target)) continue;
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`  Removed: ${target}`);
    cleared++;
  }

  if (cleared === 0) {
    console.log(`No history or session data found in '${dir}'.`);
  } else {
    console.log(`\nHistory cleared for account '${name}'.`);
  }
}

module.exports = { clearHistory, SESSION_ARTIFACTS };
