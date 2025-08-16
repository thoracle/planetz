# Project Scripts

## update_status.sh

Dynamically updates `docs/restart_condensed.md` with current project status.

**Usage**:
```bash
./scripts/update_status.sh
```

**What it updates**:
- Current branch and repository status
- Recent commit history (last 5 commits)
- File counts (JS, Python, documentation)
- Auto-discovery of key documentation files
- Last updated timestamp

**When to run**:
- Before creating new chat sessions
- After major feature completions
- When switching branches
- Weekly maintenance updates
