'use strict';
const fs = require('fs');

function getOS() {
  if (process.platform === 'win32') return 'windows';
  try {
    const v = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
    if (v.includes('microsoft')) return 'wsl';
  } catch { /* not linux or no /proc/version */ }
  return 'unix';
}

module.exports = { getOS };
