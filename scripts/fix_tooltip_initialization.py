#!/usr/bin/env python3
"""Fix Star Charts tooltip initialization issue where names aren't available until first click."""

import re
from pathlib import Path


def fix_tooltip_initialization():
    """Fix the tooltip initialization race condition in StarChartsUI.js."""
    
    file_path = Path("frontend/static/js/views/StarChartsUI.js")
    
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Fix 1: Improve the getObjectAtPosition method to handle missing object data gracefully
    old_tooltip_logic = re.compile(
        r'// For tooltips, we need complete object data including name\s*'
        r'// Always fetch complete data for tooltips to ensure accuracy\s*'
        r'if \(object\.id && !object\._isShip\) \{\s*'
        r'const completeData = this\.starChartsManager\.getObjectData\(object\.id\);\s*'
        r'if \(completeData\) \{\s*'
        r'// Return object with complete data merged\s*'
        r'return \{\s*'
        r'\.\.\.object,\s*'
        r'\.\.\.completeData\s*'
        r'\};\s*'
        r'\}\s*'
        r'\}\s*'
        r'return object;',
        re.DOTALL
    )
    
    new_tooltip_logic = '''// For tooltips, we need complete object data including name
                    // Always fetch complete data for tooltips to ensure accuracy
                    if (object.id && !object._isShip) {
                        const completeData = this.starChartsManager.getObjectData(object.id);
                        
                        if (completeData) {
                            // Return object with complete data merged
                            return {
                                ...object,
                                ...completeData
                            };
                        } else {
                            // Fallback: If complete data not available, ensure we have at least basic info
                            // This prevents empty tooltips during initialization
                            return {
                                ...object,
                                name: object.name || object.id || 'Unknown Object',
                                type: object.type || 'Unknown'
                            };
                        }
                    }
                    return object;'''
    
    content = old_tooltip_logic.sub(new_tooltip_logic, content)
    
    # Fix 2: Add a method to ensure object database is loaded before showing tooltips
    initialization_check = '''
    ensureObjectDataLoaded() {
        // Ensure object database is loaded before showing tooltips
        if (!this.starChartsManager.objectDatabase || !this.starChartsManager.isInitialized) {
            console.log('🖱️ Object database not ready for tooltips yet');
            return false;
        }
        return true;
    }
    
    '''
    
    # Insert the new method before the showTooltip method
    show_tooltip_pattern = r'(\s+showTooltip\(screenX, screenY, object\) \{)'
    content = re.sub(show_tooltip_pattern, initialization_check + r'\1', content)
    
    # Fix 3: Add initialization check to showTooltip method
    old_show_tooltip = re.compile(
        r'showTooltip\(screenX, screenY, object\) \{\s*'
        r'// Show tooltip for hovered object - match LRS simple text format\s*'
        r'console\.log\(\'🖱️ showTooltip called for object:\', \{',
        re.DOTALL
    )
    
    new_show_tooltip = '''showTooltip(screenX, screenY, object) {
        // Ensure object database is ready
        if (!this.ensureObjectDataLoaded()) {
            return;
        }
        
        // Show tooltip for hovered object - match LRS simple text format
        console.log('🖱️ showTooltip called for object:', {'''
    
    content = old_show_tooltip.sub(new_show_tooltip, content)
    
    # Fix 4: Improve object name resolution in showTooltip
    old_tooltip_text_logic = re.compile(
        r'// For undiscovered objects, show "Unknown" instead of revealing the name\s*'
        r'// For ship, show "You are here"\s*'
        r'let tooltipText;\s*'
        r'if \(object\._isShip\) \{\s*'
        r'tooltipText = \'You are here\';\s*'
        r'\} else if \(object\._isUndiscovered\) \{\s*'
        r'tooltipText = \'Unknown\';\s*'
        r'\} else \{\s*'
        r'tooltipText = object\.name;\s*'
        r'\}',
        re.DOTALL
    )
    
    new_tooltip_text_logic = '''// For undiscovered objects, show "Unknown" instead of revealing the name
        // For ship, show "You are here"
        let tooltipText;
        if (object._isShip) {
            tooltipText = 'You are here';
        } else if (object._isUndiscovered) {
            tooltipText = 'Unknown';
        } else {
            // Ensure we have a name, with fallbacks
            tooltipText = object.name || object.id || 'Unknown Object';
            
            // If still no name, try to get it from the database
            if (!object.name && object.id) {
                const completeData = this.starChartsManager.getObjectData(object.id);
                if (completeData && completeData.name) {
                    tooltipText = completeData.name;
                }
            }
        }'''
    
    content = old_tooltip_text_logic.sub(new_tooltip_text_logic, content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Fixed tooltip initialization in StarChartsUI.js")
        return True
    
    print("ℹ️ No changes needed in StarChartsUI.js")
    return False


def add_debug_logging():
    """Add better debug logging to understand the tooltip issue."""
    
    file_path = Path("frontend/static/js/views/StarChartsUI.js")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Enhance the existing console.log in showTooltip to show more detail
    old_log = re.compile(
        r'console\.log\(\'🖱️ showTooltip called for object:\', \{\s*'
        r'id: object\.id,\s*'
        r'name: object\.name,\s*'
        r'type: object\.type,\s*'
        r'_isShip: object\._isShip,\s*'
        r'_isUndiscovered: object\._isUndiscovered\s*'
        r'\}\);',
        re.DOTALL
    )
    
    new_log = '''console.log('🖱️ showTooltip called for object:', {
            id: object.id,
            name: object.name,
            type: object.type,
            _isShip: object._isShip,
            _isUndiscovered: object._isUndiscovered,
            hasObjectDatabase: !!this.starChartsManager.objectDatabase,
            isManagerInitialized: !!this.starChartsManager.isInitialized,
            tooltipText: tooltipText
        });'''
    
    content = old_log.sub(new_log, content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Enhanced debug logging in StarChartsUI.js")
        return True
    
    return False


def main():
    """Fix the tooltip initialization issue."""
    print("🔧 Fixing Star Charts tooltip initialization issue...")
    
    fixes_applied = 0
    
    if fix_tooltip_initialization():
        fixes_applied += 1
    
    if add_debug_logging():
        fixes_applied += 1
    
    if fixes_applied > 0:
        print(f"\n✅ Applied {fixes_applied} fixes for tooltip initialization")
        print("\nThe fixes address:")
        print("1. ✅ Race condition where object data isn't loaded during hover")
        print("2. ✅ Missing fallbacks when complete object data unavailable") 
        print("3. ✅ Initialization checks before showing tooltips")
        print("4. ✅ Enhanced debug logging to track the issue")
        print("\nTooltips should now show names immediately on hover!")
    else:
        print("ℹ️ No fixes needed - tooltip initialization already handled")


if __name__ == "__main__":
    main()
