const fs            = require('fs');
const os            = require('os');
const path          = require('path');
const { execSync }  = require('child_process');

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

function findRealClaudeBinary() {
  const pathDirs = (process.env.PATH || '').split(path.delimiter);
  const selfDir  = path.dirname(require.resolve('../bin/_cca.js'));

  for (const dir of pathDirs) {
    const candidate = path.join(dir, 'claude');
    if (candidate.includes('claud-code-account-switcher')) continue;
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile() && (stat.mode & 0o111)) return candidate;
    } catch { /* not found in this dir */ }
  }

  // fallback: try `which` but exclude npm shims wrapping _cca
  try {
    const result = execSync('which -a claude 2>/dev/null', { encoding: 'utf8' });
    for (const line of result.split('\n')) {
      const p = line.trim();
      if (!p) continue;
      try {
        const real = fs.realpathSync(p);
        if (real.includes('claud-code-account-switcher')) continue;
        return p;
      } catch { continue; }
    }
  } catch { /* which not available */ }

  return null;
}

module.exports = { detectExistingConfigs, findRealClaudeBinary };
