#!/bin/bash

# update_status_enhanced.sh - Dynamically update restart.md with current project status AND accurate key bindings
# Usage: ./scripts/update_status_enhanced.sh

set -e

RESTART_FILE="docs/restart.md"
TEMP_FILE=$(mktemp)
STARFIELD_MANAGER="frontend/static/js/views/StarfieldManager.js"
VIEW_MANAGER="frontend/static/js/views/ViewManager.js"
HELP_INTERFACE="frontend/static/js/ui/HelpInterface.js"

echo "🔄 Updating project status and extracting key bindings from source code..."

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

# Export values so the Python step can access them via os.environ
export CURRENT_BRANCH
export LAST_COMMIT_DATE
export STATUS
export JS_FILES
export PY_FILES
export DOC_FILES
export RECENT_COMMITS

# Create enhanced update script using Python for complex parsing
python3 << 'EOF'
import re
import os
import sys

def extract_key_bindings():
    """Extract key bindings from StarfieldManager.js and ViewManager.js"""
    
    # Read StarfieldManager.js
    try:
        with open('frontend/static/js/views/StarfieldManager.js', 'r') as f:
            starfield_content = f.read()
    except FileNotFoundError:
        print("❌ StarfieldManager.js not found")
        return {}, {}
    
    # Read ViewManager.js  
    try:
        with open('frontend/static/js/views/ViewManager.js', 'r') as f:
            view_content = f.read()
    except FileNotFoundError:
        print("❌ ViewManager.js not found")
        view_content = ""
    
    # Extract basic key bindings
    basic_controls = {}
    ai_debug_controls = {}
    
    # Parse StarfieldManager key bindings
    key_patterns = [
        (r"event\.key === 'Tab'", "Tab", "Cycle targets"),
        (r"event\.key === ' '", "Space", "Fire weapons"),
        (r"event\.key === 'z' \|\| event\.key === 'Z'", "Z", "Previous weapon"),
        (r"event\.key === 'x' \|\| event\.key === 'X'", "X", "Next weapon"),
        (r"event\.key === 'c' \|\| event\.key === 'C'", "C", "Toggle autofire"),
        (r"event\.key === '<' \|\| event\.key === ','", "< / ,", "Previous sub-target"),
        (r"event\.key === '>' \|\| event\.key === '\.'", "> / .", "Next sub-target"),
        (r"event\.key === '=' \|\| event\.key === '\+'", "+ / =", "Increase speed"),
        (r"event\.key === '-' \|\| event\.key === '_'", "- / _", "Decrease speed"),
        (r"event\.key === '\\\\'", "\\", "Emergency stop"),
        (r"/\^\[0-9\]\$/.test\(event\.key\)", "0-9", "Set impulse speed"),
    ]
    
    # Command key patterns (using commandKey variable)
    command_patterns = [
        (r"commandKey === 'q'", "Q", "Create target dummies"),
        (r"commandKey === 'r'", "R", "Subspace Radio"),
        (r"commandKey === 'n'", "N", "Communication HUD"),
        (r"commandKey === 'm'", "M", "Mission Status"),
        (r"commandKey === 'h'", "H", "Help screen"),
        (r"commandKey === 'l'", "L", "Long Range Scanner"),
        (r"commandKey === 'g'", "G", "Galactic Chart"),
        (r"commandKey === 'd'", "D", "Damage Control"),
        (r"commandKey === 's'", "S", "Ship Status"),
        (r"commandKey === 't'", "T", "Tactical Display"),
        (r"commandKey === 'i'", "I", "Intel Display"),
        (r"commandKey === 'p'", "P", "Performance Stats"),
        (r"commandKey === 'o'", "O", "Objectives/Orders"),
        (r"commandKey === 'f'", "F", "Fore View"),
        (r"commandKey === 'a'", "A", "Aft View"),
    ]
    
    # Extract basic controls
    for pattern, key, description in key_patterns + command_patterns:
        if re.search(pattern, starfield_content):
            basic_controls[key] = description
    
    # Extract AI debug controls (Cmd+Shift combinations) using brace matching
    guard = 'if (event.metaKey && event.shiftKey)'
    idx = starfield_content.find(guard)
    if idx != -1:
        # Find the opening brace after the guard
        brace_start = starfield_content.find('{', idx)
        if brace_start != -1:
            depth = 0
            end = brace_start
            while end < len(starfield_content):
                ch = starfield_content[end]
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        end += 1
                        break
                end += 1
            ai_debug_section = starfield_content[brace_start:end]

            # Map known cases
            case_map = {
                'a': "Toggle AI debug",
                'e': "Force engage",
                'i': "Force idle",
                'f': "Force flee",
                's': "Show AI stats",
                'v': "V-Formation",
                'c': "Column formation",
                'l': "Line formation",
                'b': "Show flocking stats",
                't': "Combat stats",
                'w': "Weapon debug",
                'x': "Target player",
                'p': "Performance stats",
                'd': "Debug visualization",
            }

            for m in re.findall(r"case\s+'([a-zA-Z])':", ai_debug_section):
                key = m.lower()
                ai_debug_controls[key.upper()] = case_map.get(key, "Debug action")
    
    return basic_controls, ai_debug_controls

def generate_controls_documentation(basic_controls, ai_debug_controls):
    """Generate the controls documentation sections"""
    
    # Organize controls by category
    combat_controls = {}
    navigation_controls = {}
    system_controls = {}
    speed_controls = {}
    
    # Categorize controls
    combat_keys = ['Space', 'Z', 'X', 'C', '< / ,', '> / .', 'Tab', 'Q']
    navigation_keys = ['F', 'A', 'G', 'L']
    system_keys = ['R', 'N', 'M', 'H', 'D', 'S', 'T', 'I', 'P', 'O']
    speed_keys = ['0-9', '+ / =', '- / _', '\\']
    
    for key, desc in basic_controls.items():
        if key in combat_keys:
            combat_controls[key] = desc
        elif key in navigation_keys:
            navigation_controls[key] = desc
        elif key in system_keys:
            system_controls[key] = desc
        elif key in speed_keys:
            speed_controls[key] = desc
    
    # Generate combat section
    combat_section = "### **Combat System**\n"
    combat_items = []
    
    # Specific order for combat controls
    combat_order = ['Tab', 'Q', 'Space', 'Z', 'X', 'C', '< / ,', '> / .']
    for key in combat_order:
        if key in combat_controls:
            combat_items.append(f"**{key}**: {combat_controls[key]}")
    
    if combat_items:
        # Group them nicely
        combat_section += f"- {' | '.join(combat_items[:3])}\n"
        if len(combat_items) > 3:
            combat_section += f"- {' | '.join(combat_items[3:])}\n"
    
    combat_section += "- **Beam weapons**: Instant hit with sub-system targeting (+30% damage)\n"
    combat_section += "- **Projectiles**: Physics-based flight with random subsystem damage\n"
    
    # Generate navigation section
    nav_section = "### **Navigation & UI**\n"
    nav_items = []
    
    # Specific order for navigation
    nav_order = ['R', 'N', 'M', 'H', 'L', 'G', 'F', 'A', 'D']
    for key in nav_order:
        if key in system_controls or key in navigation_controls:
            desc = system_controls.get(key) or navigation_controls.get(key)
            nav_items.append(f"**{key}**: {desc}")
    
    if nav_items:
        # Group them nicely  
        nav_section += f"- {' | '.join(nav_items[:4])}\n"
        if len(nav_items) > 4:
            nav_section += f"- {' | '.join(nav_items[4:])}\n"
    
    nav_section += "- **Docking**: Automatic when approaching stations\n"
    
    # Generate speed controls section
    speed_section = ""
    if speed_controls:
        speed_section = "### **Speed Controls**\n"
        speed_items = []
        speed_order = ['0-9', '+ / =', '- / _', '\\']
        for key in speed_order:
            if key in speed_controls:
                speed_items.append(f"**{key}**: {speed_controls[key]}")
        
        if speed_items:
            speed_section += f"- {' | '.join(speed_items)}\n"
    
    # Generate AI debug section
    ai_section = "### **AI Debug Controls** (Mac: Cmd+Shift+[Key])\n"
    if ai_debug_controls:
        ai_items = []
        # Group AI controls logically
        basic_ai = ['A', 'S', 'E', 'F', 'I']
        formation_ai = ['V', 'C', 'L', 'B']
        debug_ai = ['T', 'W', 'X', 'P', 'D']
        
        for key in basic_ai:
            if key in ai_debug_controls:
                ai_items.append(f"**{key}**: {ai_debug_controls[key]}")
        
        if ai_items:
            ai_section += f"- {' | '.join(ai_items)}\n"
        
        # Formation controls
        formation_items = []
        for key in formation_ai:
            if key in ai_debug_controls:
                formation_items.append(f"**{key}**: {ai_debug_controls[key]}")
        
        if formation_items:
            ai_section += f"- {' | '.join(formation_items)}\n"
        
        # Debug controls
        debug_items = []
        for key in debug_ai:
            if key in ai_debug_controls:
                debug_items.append(f"**{key}**: {ai_debug_controls[key]}")
        
        if debug_items:
            ai_section += f"- {' | '.join(debug_items)}\n"
    else:
        ai_section += "- **A**: Toggle AI debug | **S**: State display | **E/F**: Force engage/flee\n"
        ai_section += "- **V/C/L**: Formation patterns | **P**: Performance stats\n"
    
    return combat_section, nav_section, speed_section, ai_section

# Main execution
try:
    # Read the original restart.md file
    with open('docs/restart.md', 'r') as f:
        content = f.read()
    
    # Extract key bindings from source code
    print("🔍 Extracting key bindings from source code...")
    basic_controls, ai_debug_controls = extract_key_bindings()
    
    print(f"✅ Found {len(basic_controls)} basic controls and {len(ai_debug_controls)} AI debug controls")
    
    # Generate documentation sections
    combat_section, nav_section, speed_section, ai_section = generate_controls_documentation(basic_controls, ai_debug_controls)
    
    # Generate dynamic status section
    dynamic_status = f"""**Branch**: `{os.environ.get('CURRENT_BRANCH', 'unknown')}` | **Status**: {os.environ.get('STATUS', 'unknown')} | **Last Updated**: {os.environ.get('LAST_COMMIT_DATE', 'unknown')}

**Recent Work** (Last 5 commits):
{os.environ.get('RECENT_COMMITS', '- No commits found')}

**Codebase Stats**: 
- JavaScript Files: {os.environ.get('JS_FILES', '0')} | Python Files: {os.environ.get('PY_FILES', '0')} | Documentation: {os.environ.get('DOC_FILES', '0')} files
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
    
    # Replace the controls section (everything between "## 🎮 Essential Controls & Features" and the next "##")
    # NOTE: Static sections like "Physics Engine Refactor" and "Core Game Vision" are preserved
    controls_replacement = f"""## 🎮 Essential Controls & Features

{combat_section}
{nav_section}
{speed_section if speed_section else ""}
{ai_section}"""

    content = re.sub(
        r'## 🎮 Essential Controls & Features.*?(?=\n## )',
        controls_replacement + '\n\n',
        content,
        flags=re.DOTALL
    )
    
    # Write updated content
    with open('docs/restart.md', 'w') as f:
        f.write(content)
    
    print("✅ Enhanced documentation generated successfully!")
    print(f"📊 Extracted controls: {len(basic_controls)} basic + {len(ai_debug_controls)} AI debug")
    
except Exception as e:
    print(f"❌ Error updating documentation: {e}")
    sys.exit(1)

EOF

echo "✅ Enhanced status and controls updated successfully!"
echo "📊 Current stats: $JS_FILES JS files, $PY_FILES Python files, $DOC_FILES docs"
echo "🌿 Branch: $CURRENT_BRANCH ($STATUS)"
echo "📝 Recent commits: $(echo "$RECENT_COMMITS" | wc -l | tr -d ' ') entries"
echo "🎮 Key bindings extracted from source code automatically"
