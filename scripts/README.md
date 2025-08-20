# Project Scripts

## update_status.sh

Dynamically updates `docs/restart.md` with current project status **AND** accurate key bindings extracted from source code.

**Usage**:
```bash
./scripts/update_status.sh
```

**What it updates**:
- Current branch and repository status
- Recent commit history (last 5 commits)
- File counts (JS, Python, documentation)
- Auto-discovery of key documentation files
- **Key bindings extracted from StarfieldManager.js** (Combat, Navigation, Speed controls)
- **AI debug controls extracted from source code**
- Last updated timestamp

**Key Features**:
- ✅ **Source Code Extraction**: Automatically parses `StarfieldManager.js` for accurate key bindings
- ✅ **No Manual Maintenance**: Controls documentation stays current with code changes
- ✅ **Organized Categories**: Combat, Navigation, Speed, and AI Debug controls properly grouped
- ✅ **Accurate Documentation**: No more hardcoded or outdated control information

**When to run**:
- Before creating new chat sessions
- After major feature completions or key binding changes
- When switching branches
- Weekly maintenance updates
