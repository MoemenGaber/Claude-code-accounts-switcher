const fs   = require('fs');
const os   = require('os');
const path = require('path');

const MARKER_START = '# >>> claud-code-account-switcher >>>';
const MARKER_END   = '# <<< claud-code-account-switcher <<<';

function detectShellProfile() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh'))  return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  return null;
}

function buildShellBlock() {
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

function patchShellProfile(profilePath) {
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
