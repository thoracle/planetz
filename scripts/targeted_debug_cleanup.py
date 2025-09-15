#!/usr/bin/env python3
"""Targeted cleanup for the most spammy debug messages in PlanetZ."""

import re
from pathlib import Path


def clean_proximity_detector_spam():
    """Clean up the very spammy debug messages in ProximityDetector3D.js."""
    file_path = Path("frontend/static/js/ui/ProximityDetector3D.js")
    
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Remove the spammy edge detection debug block (lines 1500-1511)
    edge_debug_pattern = re.compile(
        r'if \(this\.viewMode === \'topDown\' && \(obj\.isTargetDummy \|\| obj\.type === \'enemy_ship\'\) && distance >= 24 && distance <= 26\) \{\s*'
        r'debug\(\'INSPECTION\', `🎯 EDGE DETECTION DEBUG.*?`\);\s*'
        r'debug\(\'TARGETING\', `\s*Type:.*?`\);\s*'
        r'debug\(\'UI\', `\s*World distance:.*?`\);\s*'
        r'debug\(\'UI\', `\s*Player pos:.*?`\);\s*'
        r'debug\(\'TARGETING\', `\s*Target pos:.*?`\);\s*'
        r'debug\(\'UI\', `\s*Relative pos:.*?`\);\s*'
        r'debug\(\'UI\', `\s*Detection range:.*?`\);\s*'
        r'debug\(\'UI\', `\s*Scale factor:.*?`\);\s*'
        r'debug\(\'UI\', `\s*Grid pos:.*?`\);\s*'
        r'debug\(\'UI\', `\s*Grid distance from center:.*?`\);\s*'
        r'\s*\}',
        re.DOTALL
    )
    
    # Replace with a single, less spammy debug message
    replacement = '''// Edge detection debug (simplified to reduce spam)
        if (this.viewMode === 'topDown' && (obj.isTargetDummy || obj.type === 'enemy_ship') && distance >= 24 && distance <= 26 && Math.random() < 0.01) {
            debug('TARGETING', `🎯 Edge detection: ${obj.name || obj.type} at ${distance.toFixed(1)}km`);
        }'''
    
    content = edge_debug_pattern.sub(replacement, content)
    
    # Remove the large block of commented console.log statements
    commented_block_pattern = re.compile(
        r'// Debug ALL detected objects to see what we\'re working with \(DISABLED to reduce console spam\)\s*'
        r'(?://\s*console\.log\(.*?\);\s*)*',
        re.DOTALL
    )
    
    content = commented_block_pattern.sub('// Detailed object debug disabled to reduce spam\n        ', content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Cleaned ProximityDetector3D.js - removed spammy edge detection debug")
        return True
    
    return False


def clean_physics_manager_spam():
    """Clean up spammy debug messages in PhysicsManager.js."""
    file_path = Path("frontend/static/js/PhysicsManager.js")
    
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Remove spammy wireframe debug messages
    patterns_to_remove = [
        r'debug\(\'PERFORMANCE\', `🔍 Enhanced wireframe.*?\);',
        r'debug\(\'UTILITY\', `\s*• Three\.js position:.*?\);',
        r'debug\(\'PERFORMANCE\', `🔍 Testing wireframe visibility.*?\);',
    ]
    
    for pattern in patterns_to_remove:
        content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Cleaned PhysicsManager.js - removed spammy wireframe debug")
        return True
    
    return False


def clean_star_charts_spam():
    """Clean up spammy debug messages in StarChartsManager.js."""
    file_path = Path("frontend/static/js/views/StarChartsManager.js")
    
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Remove the verbose radius debug function
    radius_debug_pattern = re.compile(
        r'// Debug helper: Diagnose discovery radius issues\s*'
        r'debugRadiusIssues\(\) \{.*?\}\s*',
        re.DOTALL
    )
    
    replacement = '''// Debug helper: Diagnose discovery radius issues (simplified)
    debugRadiusIssues() {
        debug('STAR_CHARTS', `Discovery radius: ${this.getEffectiveDiscoveryRadius()}km`);
        const playerPos = this.getPlayerPosition();
        if (playerPos) {
            const nearby = this.getNearbyObjects(playerPos, 100);
            debug('STAR_CHARTS', `Objects within 100km: ${nearby.length}`);
        }
    }
    '''
    
    content = radius_debug_pattern.sub(replacement, content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Cleaned StarChartsManager.js - simplified radius debug")
        return True
    
    return False


def clean_target_computer_spam():
    """Clean up conditional debug spam in TargetComputerManager.js."""
    file_path = Path("frontend/static/js/views/TargetComputerManager.js")
    
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Remove the random conditional debug messages for beacons
    beacon_debug_pattern = re.compile(
        r'if \(isBeacon && Math\.random\(\) < 0\.001\) debug\(\'TARGETING\', .*?\);',
        re.MULTILINE
    )
    
    content = beacon_debug_pattern.sub('', content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Cleaned TargetComputerManager.js - removed random beacon debug spam")
        return True
    
    return False


def main():
    """Run targeted cleanup for the most spammy debug messages."""
    print("🎯 Running targeted cleanup for spammy debug messages...")
    
    cleaners = [
        clean_proximity_detector_spam,
        clean_physics_manager_spam,
        clean_star_charts_spam,
        clean_target_computer_spam,
    ]
    
    files_cleaned = 0
    for cleaner in cleaners:
        if cleaner():
            files_cleaned += 1
    
    print(f"\n✅ Targeted cleanup complete: {files_cleaned} files cleaned")
    print("This should significantly reduce debug spam while keeping important messages.")


if __name__ == "__main__":
    main()
