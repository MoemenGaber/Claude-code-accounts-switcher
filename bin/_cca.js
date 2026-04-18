#!/usr/bin/env node
'use strict';

const [,, cmd, ...rest] = process.argv;

switch (cmd) {
  case 'setup':
    require('../lib/setup').run().catch(err => { console.error(err.message); process.exit(1); });
    break;

  case 'add':
    require('../lib/add').addAccount(rest[0], rest[1])
      .catch(err => { console.error(err.message); process.exit(1); });
    break;

  case 'use': {
    const silent = rest.includes('--silent');
    const name   = rest.find(a => !a.startsWith('-'));
    require('../lib/switch').switchAccount(name, { silent })
      .catch(err => { console.error(err.message); process.exit(1); });
    break;
  }

  case 'who':
    require('../lib/config').printWho();
    break;

  case 'list':
    require('../lib/config').listAccounts();
    break;

  case '--real-bin': {
    const bin = require('../lib/config').readRealBin();
    if (!bin) { process.exit(1); }
    process.stdout.write(bin + '\n');
    break;
  }

  case '--shell-block':
    process.stdout.write(require('../lib/shell').buildShellBlock());
    break;

  default:
    require('../lib/run').runClaude([cmd, ...rest].filter(Boolean));
    break;
}
