#!/bin/bash

# update_status.sh - Dynamically update restart.md with current project status
# Usage: ./scripts/update_status.sh

set -e

RESTART_FILE="docs/restart_condensed.md"
TEMP_FILE=$(mktemp)

echo "🔄 Updating project status in $RESTART_FILE..."

# Get current project stats
CURRENT_BRANCH=$(git branch --show-current)
LAST_COMMIT_DATE=$(git log -1 --date=short --format="%cd")
REPO_STATUS=$(git status --porcelain | wc -l | tr -d ' ')
JS_FILES=$(find frontend/static/js -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
PY_FILES=$(find backend -name "*.py" 2>/dev/null | wc -l | tr -d ' ')
DOC_FILES=$(find docs -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

# Get recent commits (last 5)
RECENT_COMMITS=$(git log --oneline -5 --format="- %s")

# Determine status
if [ "$REPO_STATUS" -eq 0 ]; then
    STATUS="Production Ready"
else
    STATUS="In Development ($REPO_STATUS uncommitted changes)"
fi

# Create updated file using Python for better multi-line handling
python3 << EOF
import re
import os

# Read the original file
with open('$RESTART_FILE', 'r') as f:
    content = f.read()

# Generate dynamic status section
dynamic_status = """**Branch**: \`$CURRENT_BRANCH\` | **Status**: $STATUS | **Last Updated**: $LAST_COMMIT_DATE

**Recent Work** (Last 5 commits):
$RECENT_COMMITS

**Codebase Stats**: 
- JavaScript Files: $JS_FILES | Python Files: $PY_FILES | Documentation: $DOC_FILES files
- Total Lines: 30,000+ | Architecture: Fully modular ES6+ modules"""

# Generate dynamic docs section
dynamic_docs = """**Core Systems**:
- [Mission System Guide](mission_system_user_guide.md) - Complete mission framework
- [Cut Scene System](cut_scene_system.md) - Cinematic sequence specification  
- [AI System Guide](ai_system_user_guide.md) - Enemy AI implementation
- [Faction Guide](faction_guide.md) - Universe lore and diplomacy
- [Communication System](communication_system_guide.md) - NPC interaction

**Technical References**:
- [Card System](card_system_user_guide.md) - Ship upgrade mechanics
- [Space Station System](space_station_system_guide.md) - Station types and functions
- [Sol System Layout](sol_system_layout.md) - Universe structure"""

# Replace dynamic sections
content = re.sub(
    r'<!-- DYNAMIC_STATUS_START -->.*?<!-- DYNAMIC_STATUS_END -->',
    f'<!-- DYNAMIC_STATUS_START -->\n{dynamic_status}\n<!-- DYNAMIC_STATUS_END -->',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'<!-- DYNAMIC_DOCS_START -->.*?<!-- DYNAMIC_DOCS_END -->',
    f'<!-- DYNAMIC_DOCS_START -->\n{dynamic_docs}\n<!-- DYNAMIC_DOCS_END -->',
    content,
    flags=re.DOTALL
)

# Write updated content
with open('$RESTART_FILE', 'w') as f:
    f.write(content)
EOF

echo "✅ Status updated successfully!"
echo "📊 Current stats: $JS_FILES JS files, $PY_FILES Python files, $DOC_FILES docs"
echo "🌿 Branch: $CURRENT_BRANCH ($STATUS)"
echo "📝 Recent commits: $(echo "$RECENT_COMMITS" | wc -l | tr -d ' ') entries"