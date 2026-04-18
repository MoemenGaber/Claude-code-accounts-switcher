'use strict';
const fs            = require('fs');
const os            = require('os');
const path          = require('path');
const { execSync }  = require('child_process');
const { getOS }     = require('./os');

function detectExistingConfigs() {
  const home = os.homedir();
  const results = [];
  let entries;
  try { entries = fs.readdirSync(home); } catch { return results; }

  for (const entry of entries) {
    if (!entry.startsWith('.claude-')) continue;
    const full = path.join(home, entry);
    try {
      if (!fs.statSync(full).isDirectory()) continue;
    } catch { continue; }
    const suggestedName = entry.replace(/^\.claude-/, '');
    if (suggestedName) results.push({ name: suggestedName, dir: full });
  }
  return results;
}

function isExecutable(filePath) {
  if (getOS() === 'windows') return true; // Windows doesn't use mode bits
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && (stat.mode & 0o111) !== 0;
  } catch { return false; }
}

function candidateNames() {
  if (getOS() === 'windows') return ['claude.cmd', 'claude.exe', 'claude'];
  return ['claude'];
}

function findRealClaudeBinary() {
  const pathDirs = (process.env.PATH || '').split(path.delimiter);
  const names    = candidateNames();

  for (const dir of pathDirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (candidate.toLowerCase().includes('claud-code-account-switcher')) continue;
      if (isExecutable(candidate)) return candidate;
    }
  }

  // Fallback: use `where` (Windows) or `which -a` (Unix/WSL)
  try {
    const cmd    = getOS() === 'windows' ? 'where claude' : 'which -a claude 2>/dev/null';
    const result = execSync(cmd, { encoding: 'utf8' });
    for (const line of result.split('\n')) {
      const p = line.trim();
      if (!p) continue;
      if (p.toLowerCase().includes('claud-code-account-switcher')) continue;
      try {
        const real = fs.realpathSync(p);
        if (real.toLowerCase().includes('claud-code-account-switcher')) continue;
        return p;
      } catch { continue; }
    }
  } catch { /* command not available */ }

  return null;
}

module.exports = { detectExistingConfigs, findRealClaudeBinary };
