#!/usr/bin/env node
'use strict';

// Public-facing binary for account management.
// Users run `claude-switcher setup` to bootstrap, then use
// `claude-switcher add/use/list/who` to manage accounts.
// The `claude` command (shell function) handles launching Claude.

const { spawnSync } = require('child_process');
const path = require('path');

const cca = path.join(__dirname, '_cca.js');
const args = process.argv.slice(2);

// Default to 'setup' if no subcommand given
const cmd = args[0];
const finalArgs = cmd ? args : ['setup'];

const result = spawnSync(process.execPath, [cca, ...finalArgs], { stdio: 'inherit' });
process.exit(result.status ?? 1);
