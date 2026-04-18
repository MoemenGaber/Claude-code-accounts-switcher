const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { input, confirm, select, number } = require('@inquirer/prompts');
const { detectExistingConfigs, findRealClaudeBinary } = require('./detect');
const { cloneConfig, promptName, promptDir } = require('./add');
const { detectShellProfile, patchShellProfile } = require('./shell');
const {
  readAccounts, writeAccounts, writeActiveAccount, writeRealBin,
  MAX_ACCOUNTS, RESERVED, ACCOUNTS_FILE,
} = require('./config');

async function run() {
  console.log('\n=== Claude Code Account Switcher — Setup ===\n');

  // 1. Find real claude binary
  const realBin = findRealClaudeBinary();
  if (!realBin) {
    console.error('Claude Code binary not found on PATH.');
    console.error('Install Claude Code first: https://claude.ai/download');
    process.exit(1);
  }
  console.log(`Claude found: ${realBin} ✓`);
  writeRealBin(realBin);

  // 2. Re-run prompt if already configured
  const existing = readAccounts();
  if (existing.size > 0) {
    console.log('\nExisting accounts:');
    for (const [n, d] of existing) console.log(`  ${n}  ->  ${d}`);
    const redo = await confirm({ message: 'Re-run setup and overwrite?', default: false });
    if (!redo) { console.log('Setup cancelled.'); return; }
  }

  // 3. Auto-detect existing ~/.claude-* dirs
  const detected = detectExistingConfigs();
  let accounts = new Map();

  if (detected.length > 0) {
    console.log('\nDetected existing config directories:');
    for (const { name, dir } of detected) console.log(`  ~/.claude-${name}  ->  ${dir}`);

    const useDetected = await confirm({
      message: 'Use these detected accounts?',
      default: true,
    });

    if (useDetected) {
      // Ask once about cloning ~/.claude — only relevant for new dirs (detected ones already exist)
      for (const { name, dir } of detected) {
        if (accounts.size >= MAX_ACCOUNTS) break;
        accounts.set(name, dir);
      }
    }
  }

  // 4. Ask how many additional accounts to add (if not using detected, or adding more)
  const remaining = MAX_ACCOUNTS - accounts.size;
  if (accounts.size === 0 || (accounts.size < MAX_ACCOUNTS && await confirm({
    message: `Add more accounts? (${accounts.size} configured, up to ${MAX_ACCOUNTS} total)`,
    default: accounts.size === 0,
  }))) {
    let count = 0;
    if (accounts.size === 0) {
      count = await number({
        message: `How many accounts to configure? (1–${MAX_ACCOUNTS}):`,
        default: 2,
        validate: v => (v >= 1 && v <= MAX_ACCOUNTS) || `Enter 1–${MAX_ACCOUNTS}`,
      });
    } else {
      count = await number({
        message: `How many more accounts? (1–${remaining}):`,
        default: 1,
        validate: v => (v >= 1 && v <= remaining) || `Enter 1–${remaining}`,
      });
    }

    for (let i = 0; i < count; i++) {
      console.log(`\nAccount ${accounts.size + 1}:`);
      const name = await promptName(accounts);
      const { dir } = await promptDir(name, accounts);
      accounts.set(name, dir);
    }
  }

  if (accounts.size === 0) {
    console.error('No accounts configured. Exiting.');
    process.exit(1);
  }

  // 5. Write accounts file
  writeAccounts(accounts);

  // 6. Choose active account
  const names = [...accounts.keys()];
  let active = names[0];
  if (names.length > 1) {
    active = await select({
      message: 'Which account should be active by default?',
      choices: names.map(n => ({ name: n, value: n })),
    });
  }
  writeActiveAccount(active);
  console.log(`\nActive account set to: ${active}`);

  // 7. Patch shell profile
  const profile = detectShellProfile();
  if (!profile) {
    console.log('\nShell not detected (not zsh or bash). Add the claude() function manually.');
    console.log('Run `_cca --shell-block` to print the block to copy.');
  } else {
    const patched = patchShellProfile(profile);
    if (patched) {
      console.log(`Shell integration added to ${profile}`);
    }
  }

  console.log('\nSetup complete!');
  console.log('Run: source ~/.zshrc');
  console.log(`Then try: claude ${names[0]}`);
}

module.exports = { run };
