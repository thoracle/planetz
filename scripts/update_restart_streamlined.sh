#!/bin/bash

# Update streamlined restart.md with current git history
# This script keeps the essential onboarding info current

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESTART_FILE="$PROJECT_ROOT/docs/restart_streamlined.md"

echo "🔄 Updating streamlined restart.md with current git history..."

# Get last 5 commits with short hash and message
GIT_HISTORY=$(git log --oneline -5 | while read line; do
    hash=$(echo "$line" | cut -d' ' -f1)
    message=$(echo "$line" | cut -d' ' -f2-)
    echo "- \`$hash\` $message"
done)

# Create temporary file with updated content
TEMP_FILE=$(mktemp)

# Read the file and replace the git history section
{
    # Process the file line by line
    while IFS= read -r line; do
        if [[ "$line" == *"<!-- DYNAMIC_GIT_START -->"* ]]; then
            echo "$line"
            echo "**Last 5 Commits:**"
            echo "$GIT_HISTORY"
            # Skip lines until we find the end marker
            while IFS= read -r line && [[ "$line" != *"<!-- DYNAMIC_GIT_END -->"* ]]; do
                continue
            done
            echo "<!-- DYNAMIC_GIT_END -->"
        else
            echo "$line"
        fi
    done < "$RESTART_FILE"
} > "$TEMP_FILE"

# Replace the original file
mv "$TEMP_FILE" "$RESTART_FILE"

echo "✅ Updated git history in restart_streamlined.md"
echo "📋 Current commits:"
git log --oneline -5

# Make the script executable
chmod +x "$0"
