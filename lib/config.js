const fs   = require('fs');
const os   = require('os');
const path = require('path');

const ACCOUNTS_FILE = path.join(os.homedir(), '.claude-accounts.conf');
const ACTIVE_FILE   = path.join(os.homedir(), '.claude-active-account');
const REAL_BIN_FILE = path.join(os.homedir(), '.claude-real-bin');
const MAX_ACCOUNTS  = 5;

const RESERVED = new Set(['setup', 'add', 'use', 'who', 'list']);

function readAccounts() {
  const map = new Map();
  if (!fs.existsSync(ACCOUNTS_FILE)) return map;
  const lines = fs.readFileSync(ACCOUNTS_FILE, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    const dir  = trimmed.slice(eq + 1).trim();
    if (name && dir) map.set(name, dir);
  }
  return map;
}

function writeAccounts(map) {
  const tmp = ACCOUNTS_FILE + '.tmp';
  const lines = [...map.entries()].map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(tmp, lines, 'utf8');
  fs.renameSync(tmp, ACCOUNTS_FILE);
}

function readActiveAccount() {
  if (!fs.existsSync(ACTIVE_FILE)) return null;
  return fs.readFileSync(ACTIVE_FILE, 'utf8').trim() || null;
}

function writeActiveAccount(name) {
  fs.writeFileSync(ACTIVE_FILE, name + '\n', 'utf8');
}

function getDir(name) {
  if (!name) return null;
  return readAccounts().get(name) || null;
}

function isKnownAccount(name) {
  return readAccounts().has(name);
}

function readRealBin() {
  if (!fs.existsSync(REAL_BIN_FILE)) return null;
  return fs.readFileSync(REAL_BIN_FILE, 'utf8').trim() || null;
}

function writeRealBin(binPath) {
  fs.writeFileSync(REAL_BIN_FILE, binPath + '\n', 'utf8');
}

function printWho() {
  const name = readActiveAccount();
  if (!name) {
    console.error('No active account. Run: claude-switcher setup');
    process.exit(1);
  }
  const dir = getDir(name);
  if (!dir) {
    console.error(`Active account '${name}' not found in config. Run: claude-switcher setup`);
    process.exit(1);
  }
  console.log(`Active account : ${name}`);
  console.log(`Config dir     : ${dir}`);
}

function listAccounts() {
  const accounts = readAccounts();
  if (accounts.size === 0) {
    console.error('No accounts configured. Run: claude-switcher setup');
    process.exit(1);
  }
  const active = readActiveAccount();
  for (const [name, dir] of accounts) {
    const marker = name === active ? '*' : ' ';
    console.log(`  ${marker} ${name.padEnd(15)}  ->  ${dir}`);
  }
}

module.exports = {
  ACCOUNTS_FILE, ACTIVE_FILE, REAL_BIN_FILE, MAX_ACCOUNTS, RESERVED,
  readAccounts, writeAccounts,
  readActiveAccount, writeActiveAccount,
  getDir, isKnownAccount,
  readRealBin, writeRealBin,
  printWho, listAccounts,
};
