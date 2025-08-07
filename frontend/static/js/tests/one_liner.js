// ONE-LINER PROXIMITY DETECTOR TEST
// Copy this single line into the browser console:

window.starfieldManager?.toggleProximityDetector ? (console.log('🎯 Testing proximity detector...'), window.starfieldManager.toggleProximityDetector(), console.log('✅ Proximity detector test complete - check bottom of screen')) : console.error('❌ Game or proximity detector not loaded');

// OR for more detailed test, copy this:

(function(){console.log('🎯 Proximity Detector Quick Test');const s=window.starfieldManager;if(!s)return console.error('❌ Game not loaded');const r=s.radarHUD;const ship=s.viewManager?.getShip();console.log(`Proximity Detector HUD: ${r?'✅':'❌'}`);console.log(`Ship loaded: ${ship?'✅':'❌'}`);if(ship){const hasCards=ship.hasSystemCardsSync?.('radar');console.log(`Has cards: ${hasCards?'✅':'❌'}`);if(hasCards)console.log('💡 Press P key to toggle proximity detector');}})();