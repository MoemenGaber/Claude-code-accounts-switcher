'use strict';
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { getOS } = require('./os');

const MARKER_START = '# >>> claud-code-account-switcher >>>';
const MARKER_END   = '# <<< claud-code-account-switcher <<<';

function detectShellProfile() {
  const platform = getOS();
  if (platform === 'windows') {
    try {
      execSync('pwsh -NoProfile -NoLogo -Command exit', { encoding: 'utf8', timeout: 3000, stdio: 'pipe' });
      return path.join(os.homedir(), 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
    } catch {
      return path.join(os.homedir(), 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');
    }
  }
  // Unix / WSL: use SHELL env var
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh'))  return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  return null;
}

function buildShellBlock() {
  if (getOS() === 'windows') return buildPowerShellBlock();
  return buildBashBlock();
}

function buildBashBlock() {
  return `
${MARKER_START}

# Dynamically generate aliases from ~/.claude-accounts.conf at shell startup.
# New accounts added via \`claude add <name>\` get a \`claude<name>\` alias after source ~/.zshrc.
if [[ -f "$HOME/.claude-accounts.conf" ]]; then
  while IFS='=' read -r _cca_n _cca_d; do
    [[ "$_cca_n" =~ ^[[:space:]]*# ]] && continue
    [[ -z "\${_cca_n//[[:space:]]}" ]] && continue
    _cca_n="\${_cca_n//[$'\\t\\r\\n ']}"
    alias "claude\${_cca_n}"="claude \${_cca_n}"
  done < "$HOME/.claude-accounts.conf"
  unset _cca_n _cca_d
fi

claude() {
  local _REAL _CONF _ACTIVE _name _dir _key _val
  _CONF="$HOME/.claude-accounts.conf"
  _ACTIVE="$HOME/.claude-active-account"

  # Subcommands handled by _cca
  case "$1" in
    add|use|list) _cca "$@"; return ;;
    who|/who)     _cca who;  return ;;
  esac

  # Resolve real binary path (stored during setup, avoids recursion)
  _REAL="$(_cca --real-bin 2>/dev/null)"
  if [[ -z "$_REAL" ]]; then
    echo "claude: real binary not found. Run: claude-switcher setup"
    return 1
  fi

  # If first arg is a known account name → silent switch then launch
  if [[ -n "$1" ]] && grep -q "^$1=" "$_CONF" 2>/dev/null; then
    _cca use --silent "$1"
    _name="$1"
    shift
  fi

  # Resolve active account dir
  [[ -f "$_ACTIVE" ]] && _name="$(< "$_ACTIVE")" || _name=""
  _name="\${_name//[$'\\t\\r\\n ']}"
  _dir=""
  if [[ -n "$_name" && -f "$_CONF" ]]; then
    while IFS='=' read -r _key _val; do
      [[ "$_key" == "$_name" ]] && { _dir="\${_val//[$'\\t\\r\\n ']}"; break; }
    done < "$_CONF"
  fi

  if [[ -z "$_dir" ]]; then
    if [[ ! -f "$_CONF" ]] || ! grep -q "=" "$_CONF" 2>/dev/null; then
      echo "No Claude accounts configured. Starting setup..."
      _cca setup
      return
    fi
    echo "No active Claude account. Run: claude-switcher setup"
    return 1
  fi

  echo "→ [$_name]"
  env CLAUDE_CONFIG_DIR="$_dir" "$_REAL" "$@"
}
${MARKER_END}
`;
}

function buildPowerShellBlock() {
  return `
${MARKER_START}
function global:claude {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$PassArgs)
  $conf       = "$env:USERPROFILE\\.claude-accounts.conf"
  $activeFile = "$env:USERPROFILE\\.claude-active-account"

  # Subcommands handled by _cca
  if ($PassArgs.Count -gt 0 -and $PassArgs[0] -in @('add','use','list')) { & _cca @PassArgs; return }
  if ($PassArgs.Count -gt 0 -and $PassArgs[0] -in @('who','/who'))       { & _cca who; return }

  # Resolve real binary
  $realBin = & _cca --real-bin 2>$null
  if (-not $realBin) { Write-Error "claude: real binary not found. Run: claude-switcher setup"; return }

  # If first arg is a known account name, switch then strip it
  if ($PassArgs.Count -gt 0 -and (Test-Path $conf) -and (Select-String -Path $conf -Pattern ("^" + [regex]::Escape($PassArgs[0]) + "=") -Quiet 2>$null)) {
    & _cca use --silent $PassArgs[0]
    $PassArgs = @($PassArgs | Select-Object -Skip 1)
    if ($null -eq $PassArgs) { $PassArgs = @() }
  }

  # Resolve active account dir
  $name = if (Test-Path $activeFile) { (Get-Content $activeFile -Raw).Trim() } else { $null }
  $dir  = $null
  if ($name -and (Test-Path $conf)) {
    $line = Get-Content $conf | Where-Object { $_ -match ("^" + [regex]::Escape($name) + "=") } | Select-Object -First 1
    if ($line) { $dir = $line.Split('=',2)[1].Trim() }
  }

  if (-not $dir) {
    if (-not (Test-Path $conf) -or -not (Select-String -Path $conf -Pattern "=" -Quiet 2>$null)) {
      Write-Host "No Claude accounts configured. Starting setup..."
      & _cca setup
      return
    }
    Write-Error "No active Claude account. Run: claude-switcher setup"
    return
  }

  Write-Host "→ [$name]"
  $env:CLAUDE_CONFIG_DIR = $dir
  try { & $realBin @PassArgs }
  finally { Remove-Item Env:CLAUDE_CONFIG_DIR -ErrorAction SilentlyContinue }
}

# Generate per-account functions (aliases can't forward args in PowerShell)
if (Test-Path "$env:USERPROFILE\\.claude-accounts.conf") {
  Get-Content "$env:USERPROFILE\\.claude-accounts.conf" | Where-Object { $_ -match '^[^#].+=' } | ForEach-Object {
    $n = $_.Split('=',2)[0].Trim()
    $sb = [scriptblock]::Create("claude $n @args")
    Set-Item -Path "Function:global:claude$n" -Value $sb
  }
}
${MARKER_END}
`;
}

function patchShellProfile(profilePath) {
  // Ensure parent directories exist (PowerShell profile dir may not exist yet)
  const dir = path.dirname(profilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const existing = fs.existsSync(profilePath)
    ? fs.readFileSync(profilePath, 'utf8')
    : '';

  if (existing.includes(MARKER_START)) {
    console.log(`Shell integration already present in ${profilePath} — skipping.`);
    return false;
  }

  fs.appendFileSync(profilePath, buildShellBlock(), 'utf8');
  return true;
}

module.exports = { detectShellProfile, patchShellProfile, buildShellBlock };
