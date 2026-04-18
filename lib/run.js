const { spawnSync } = require('child_process');
const { readActiveAccount, getDir, readRealBin } = require('./config');

function runClaude(args) {
  const name = readActiveAccount();
  const dir  = name ? getDir(name) : null;

  if (!dir) {
    console.error('No active account. Run: claude setup');
    process.exit(1);
  }

  const bin = readRealBin();
  if (!bin) {
    console.error('Real claude binary not found. Run: claude setup');
    process.exit(1);
  }

  const result = spawnSync(bin, args, {
    env: { ...process.env, CLAUDE_CONFIG_DIR: dir },
    stdio: 'inherit',
  });

  process.exit(result.status ?? 1);
}

module.exports = { runClaude };
