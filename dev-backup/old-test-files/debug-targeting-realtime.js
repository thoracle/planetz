// Real-time Targeting Computer Monitoring
console.log('🔍 === REAL-TIME TARGETING MONITOR ===');

let isMonitoring = false;
let originalDock, originalUndock, originalToggleTargetComputer;

function startTargetingMonitor() {
    if (isMonitoring) {
        console.log('⚠️ Monitor already running');
        return;
    }
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not available');
        return;
    }
    
    isMonitoring = true;
    console.log('🟢 Starting real-time targeting monitor...');
    
    // Monitor dock() method
    originalDock = starfieldManager.dock;
    starfieldManager.dock = function(...args) {
        console.log('🚢 === DOCK SEQUENCE STARTED ===');
        logTargetingState('BEFORE DOCK');
        
        const result = originalDock.apply(this, args);
        
        console.log('🚢 === DOCK SEQUENCE COMPLETED ===');
        logTargetingState('AFTER DOCK');
        
        return result;
    };
    
    // Monitor undock() method
    originalUndock = starfieldManager.undock;
    starfieldManager.undock = async function(...args) {
        console.log('🚀 === UNDOCK SEQUENCE STARTED ===');
        logTargetingState('BEFORE UNDOCK');
        
        const result = await originalUndock.apply(this, args);
        
        console.log('🚀 === UNDOCK SEQUENCE COMPLETED ===');
        logTargetingState('AFTER UNDOCK');
        
        return result;
    };
    
    // Monitor TAB key toggles
    originalToggleTargetComputer = starfieldManager.toggleTargetComputer;
    starfieldManager.toggleTargetComputer = function(...args) {
        console.log('⌨️ === TAB KEY PRESSED ===');
        logTargetingState('BEFORE TAB TOGGLE');
        
        const result = originalToggleTargetComputer.apply(this, args);
        
        logTargetingState('AFTER TAB TOGGLE');
        
        return result;
    };
    
    console.log('✅ Monitor installed - dock/undock and TAB key presses will be logged');
    console.log('💡 Use stopTargetingMonitor() to stop monitoring');
}

function stopTargetingMonitor() {
    if (!isMonitoring) {
        console.log('⚠️ Monitor not running');
        return;
    }
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (starfieldManager) {
        starfieldManager.dock = originalDock;
        starfieldManager.undock = originalUndock;
        starfieldManager.toggleTargetComputer = originalToggleTargetComputer;
    }
    
    isMonitoring = false;
    console.log('🔴 Real-time targeting monitor stopped');
}

function logTargetingState(phase) {
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.log(`❌ ${phase}: Missing core components`);
        return;
    }
    
    const targetComputerSystem = ship.getSystem('target_computer');
    const hasCards = ship.hasSystemCardsSync('target_computer');
    
    console.log(`📊 ${phase}:`);
    console.log(`   • isDocked: ${starfieldManager.isDocked}`);
    console.log(`   • targetComputerEnabled: ${starfieldManager.targetComputerEnabled}`);
    
    if (targetComputerSystem) {
        console.log(`   • System level: ${targetComputerSystem.level}`);
        console.log(`   • System active: ${targetComputerSystem.isActive}`);
        console.log(`   • System operational: ${targetComputerSystem.isOperational()}`);
        console.log(`   • System can activate: ${targetComputerSystem.canActivate(ship)}`);
    } else {
        console.log(`   • ❌ No target computer system found`);
    }
    
    console.log(`   • Has targeting cards: ${hasCards}`);
    console.log(`   • Current target: ${starfieldManager.currentTarget?.name || 'None'}`);
    
    // Check TAB key requirements
    const canUseTab = targetComputerSystem && 
                     targetComputerSystem.canActivate(ship) && 
                     hasCards && 
                     !starfieldManager.isDocked;
    console.log(`   • TAB should work: ${canUseTab ? '✅' : '❌'}`);
}

function quickTargetingTest() {
    console.log('🧪 === QUICK TARGETING TEST ===');
    logTargetingState('CURRENT STATE');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (starfieldManager?.toggleTargetComputer) {
        console.log('🔄 Testing TAB toggle...');
        starfieldManager.toggleTargetComputer();
        setTimeout(() => {
            logTargetingState('AFTER TOGGLE');
        }, 100);
    }
}

// Export functions to global scope
window.startTargetingMonitor = startTargetingMonitor;
window.stopTargetingMonitor = stopTargetingMonitor;
window.quickTargetingTest = quickTargetingTest;

console.log('✅ Real-time targeting monitor loaded');
console.log('💡 Commands:');
console.log('   • startTargetingMonitor() - Monitor dock/undock/TAB sequences');
console.log('   • stopTargetingMonitor() - Stop monitoring'); 
console.log('   • quickTargetingTest() - Quick test current state'); 