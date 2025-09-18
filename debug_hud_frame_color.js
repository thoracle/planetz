/**
 * 🔍 DEBUG HUD FRAME COLOR
 * 
 * Investigates why HUD frame is still teal instead of magenta
 */

console.log('🔍 Debugging HUD Frame Color Issue...\n');

// 1. CHECK CURRENT HUD STATE
console.log('📊 Current HUD State:');
if (window.targetComputerManager) {
    const tcm = window.targetComputerManager;
    
    console.log(`Current target: ${tcm.currentTarget?.name}`);
    console.log(`Is waypoint: ${tcm.currentTarget?.isWaypoint}`);
    console.log(`Target faction: ${tcm.currentTarget?.faction}`);
    
    if (tcm.targetHUD) {
        const borderColor = tcm.targetHUD.style.borderColor;
        const textColor = tcm.targetHUD.style.color;
        const backgroundColor = tcm.targetHUD.style.backgroundColor;
        
        console.log(`HUD border color: ${borderColor}`);
        console.log(`HUD text color: ${textColor}`);
        console.log(`HUD background color: ${backgroundColor}`);
        console.log(`HUD display: ${tcm.targetHUD.style.display}`);
        console.log(`HUD visible: ${tcm.targetHUD.offsetWidth > 0 && tcm.targetHUD.offsetHeight > 0}`);
    } else {
        console.log('❌ No targetHUD element found');
    }
}

// 2. TEST setTargetHUDBorderColor DIRECTLY
console.log('\n🔧 Testing setTargetHUDBorderColor directly...');
if (window.targetComputerManager && window.targetComputerManager.currentTarget?.isWaypoint) {
    const tcm = window.targetComputerManager;
    
    console.log('Before calling setTargetHUDBorderColor:');
    if (tcm.targetHUD) {
        console.log(`  Border: ${tcm.targetHUD.style.borderColor}`);
        console.log(`  Text: ${tcm.targetHUD.style.color}`);
    }
    
    // Call the method directly with teal (should be overridden to magenta)
    tcm.setTargetHUDBorderColor('#44ffff');
    
    console.log('After calling setTargetHUDBorderColor with teal:');
    if (tcm.targetHUD) {
        console.log(`  Border: ${tcm.targetHUD.style.borderColor}`);
        console.log(`  Text: ${tcm.targetHUD.style.color}`);
        
        const isMagenta = tcm.targetHUD.style.borderColor.includes('255, 0, 255') || 
                         tcm.targetHUD.style.borderColor.includes('#ff00ff');
        
        if (isMagenta) {
            console.log('✅ setTargetHUDBorderColor override is working!');
        } else {
            console.log('❌ setTargetHUDBorderColor override is NOT working');
        }
    }
}

// 3. CHECK WHAT'S CALLING setTargetHUDBorderColor
console.log('\n🔍 Monitoring setTargetHUDBorderColor calls...');
if (window.targetComputerManager) {
    const tcm = window.targetComputerManager;
    const originalMethod = tcm.setTargetHUDBorderColor;
    
    tcm.setTargetHUDBorderColor = function(color) {
        console.log(`🔧 setTargetHUDBorderColor called with: ${color}`);
        console.log(`🔧 Current target: ${this.currentTarget?.name}`);
        console.log(`🔧 Is waypoint: ${this.currentTarget?.isWaypoint}`);
        
        const result = originalMethod.call(this, color);
        
        if (this.targetHUD) {
            console.log(`🔧 Result border color: ${this.targetHUD.style.borderColor}`);
        }
        
        return result;
    };
    
    console.log('✅ setTargetHUDBorderColor monitoring enabled');
}

// 4. CHECK StarfieldManager updateTargetDisplay
console.log('\n🔍 Checking StarfieldManager updateTargetDisplay...');
if (window.starfieldManager && window.starfieldManager.updateTargetDisplay) {
    console.log('⚠️ StarfieldManager.updateTargetDisplay exists');
    
    // Check if it's calling setTargetHUDBorderColor
    const updateDisplayStr = window.starfieldManager.updateTargetDisplay.toString();
    if (updateDisplayStr.includes('setTargetHUDBorderColor')) {
        console.log('⚠️ StarfieldManager.updateTargetDisplay calls setTargetHUDBorderColor');
        
        // Find the line that calls it
        const lines = updateDisplayStr.split('\n');
        lines.forEach((line, index) => {
            if (line.includes('setTargetHUDBorderColor')) {
                console.log(`Line ${index + 1}: ${line.trim()}`);
            }
        });
    }
}

// 5. FORCE UPDATE TARGET DISPLAY
console.log('\n🔄 Force updating target display...');
if (window.starfieldManager && window.starfieldManager.updateTargetDisplay) {
    console.log('Calling StarfieldManager.updateTargetDisplay...');
    window.starfieldManager.updateTargetDisplay();
    
    if (window.targetComputerManager && window.targetComputerManager.targetHUD) {
        const borderColor = window.targetComputerManager.targetHUD.style.borderColor;
        console.log(`After updateTargetDisplay: ${borderColor}`);
    }
}

// 6. MANUAL FIX FUNCTION
console.log('\n🔧 Manual fix available:');
console.log('Run: forceHUDMagenta()');

window.forceHUDMagenta = function() {
    if (window.targetComputerManager && window.targetComputerManager.targetHUD) {
        const hud = window.targetComputerManager.targetHUD;
        hud.style.setProperty('border-color', '#ff00ff', 'important');
        hud.style.setProperty('color', '#ff00ff', 'important');
        hud.style.setProperty('box-shadow', '0 0 15px #ff00ff', 'important');
        
        console.log('✅ HUD colors forced to magenta');
        console.log(`Border: ${hud.style.borderColor}`);
        console.log(`Text: ${hud.style.color}`);
    } else {
        console.log('❌ No HUD to fix');
    }
};

console.log('\n✅ HUD frame color debugging complete!');
