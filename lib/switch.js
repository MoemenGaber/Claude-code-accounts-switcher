const { confirm }          = require('@inquirer/prompts');
const { readAccounts, readActiveAccount, writeActiveAccount, listAccounts } = require('./config');

async function switchAccount(name, { silent = false } = {}) {
  const accounts = readAccounts();

  if (!name || !accounts.has(name)) {
    console.error(`Unknown account: '${name || ''}'`);
    console.error('Configured accounts:');
    listAccounts();
    process.exit(1);
  }

  const current = readActiveAccount();
  if (current === name) {
    if (!silent) console.log(`Already using account '${name}'`);
    return;
  }

  if (!silent) {
    const ok = await confirm({
      message: `Switch from '${current || 'none'}' to '${name}' (${accounts.get(name)})?`,
      default: true,
    });
    if (!ok) { console.log('Cancelled.'); return; }
  }

  writeActiveAccount(name);
  if (!silent) console.log(`Switched to '${name}'.`);
}

module.exports = { switchAccount };
