# Communication System Guide

## Overview

The Communication HUD system provides a retro-styled interface for displaying NPC communications during missions and AI interactions. It features an animated wireframe avatar, NPC name display, subtitle text with typewriter effect, and full audio integration.

## Visual Design

### Positioning
- **Location**: Upper-left corner of screen
- **Position**: Between energy display and Target CPU HUD
- **Coordinates**: `top: 50px, left: 10px`
- **Dimensions**: `320px × 120px` (matches Target CPU width)

### Styling
- **Theme**: Retro green terminal aesthetic matching game UI
- **Font**: VT323 monospace for authentic retro feel
- **Colors**: 
  - Primary: `#00ff41` (retro green)
  - Background: `rgba(0, 0, 0, 0.85)` with green border
  - Text: White (`#ffffff`) with green text-shadow
  - Status indicators: `#ffff44` (yellow)

### Layout Structure
```
┌─────────────────────────────────────┐
│ NPC NAME              ■ LIVE       │
├─────────────────────────────────────┤
│ [Avatar] │ Dialogue text appears   │
│  60×60   │ here with typewriter    │
│ wireframe│ effect animation...     │
├─────────────────────────────────────┤
│ CH: 127.5 MHz      SIG: ████▓░░░   │
└─────────────────────────────────────┘
```

## Wireframe Avatar System

### Animation Features
- **Blinking Eyes**: Eyes disappear for 1 frame every 8 frames
- **Mouth Movement**: 8-frame talking animation cycle
- **Grid Effects**: Subtle wireframe scanning effect with opacity variation
- **Frame Rate**: 5 FPS (200ms intervals) for retro feel

### Avatar Components
- **Head**: Oval wireframe outline
- **Eyes**: Animated dots that blink periodically  
- **Mouth**: Curved path that changes shape during speech
- **Nose**: Simple vertical line
- **Grid**: Wireframe overlay for scanning effect

## API Usage

### Basic Integration

```javascript
// Access through StarfieldManager
const starfieldManager = window.starfieldManager;

// Show a communication message
starfieldManager.showCommunication(
    'Admiral Chen',           // NPC name
    'Proceed to waypoint Alpha-7 for further orders.',  // Message
    {
        channel: 'FLEET.1',       // Radio channel (optional)
        signalStrength: '████████░', // Signal bars (optional)
        status: '■ SECURE',       // Connection status (optional)
        duration: 5000            // Auto-hide after 5 seconds (optional)
    }
);

// Hide communication HUD
starfieldManager.hideCommunication();

// Check if communication is visible
const isVisible = starfieldManager.isCommunicationVisible();
```

### Direct Access

```javascript
// Direct access to communication HUD (for advanced usage)
const commHUD = window.communicationHUD;

// Show message with full control
commHUD.showMessage('Commander Torres', 'Enemy contacts detected in sector 7');

// Toggle visibility
commHUD.toggle();

// Manual animation control
commHUD.startAvatarAnimation();
commHUD.stopAnimations();
```

## User Controls

### Keyboard Commands
- **N Key**: Toggle Communication HUD on/off
  - Plays command sound on toggle
  - Shows test sequence when enabled
  - Stops all animations when disabled

### Test Sequence
When toggled with N key, the system demonstrates:
1. **Test NPC**: "Admiral Chen" with secure connection
2. **Animated Avatar**: Full wireframe animation cycle
3. **Sample Dialogue**: 5-message sequence with navigation orders
4. **Auto-progression**: Messages advance every 3 seconds
5. **Typewriter Effect**: Text appears character by character

## Mission System Integration

### Message Queue System
```javascript
// Queue multiple messages for sequential display
const messages = [
    { npc: 'Admiral Chen', text: 'Commander, we have a situation.' },
    { npc: 'Admiral Chen', text: 'Proceed to coordinates 127.3, 45.7.' },
    { npc: 'Admiral Chen', text: 'Exercise extreme caution.' }
];

// Process messages sequentially
messages.forEach((msg, index) => {
    setTimeout(() => {
        starfieldManager.showCommunication(msg.npc, msg.text);
    }, index * 6000); // 6 second intervals
});
```

### Mission Event Triggers
```javascript
// Example: Trigger communication on mission events
class MissionEventHandler {
    onMissionStart(mission) {
        starfieldManager.showCommunication(
            mission.giver,
            `New mission: ${mission.title}`,
            { channel: 'MISSION.1', duration: 8000 }
        );
    }
    
    onObjectiveComplete(objective) {
        starfieldManager.showCommunication(
            'Mission Control',
            `Objective completed: ${objective.description}`,
            { status: '■ UPDATE', duration: 4000 }
        );
    }
}
```

## AI System Integration

### Combat Communications
```javascript
// Enemy AI taunts and warnings
class EnemyAI {
    onPlayerDetected() {
        starfieldManager.showCommunication(
            'Raider Captain',
            'You picked the wrong sector to fly through, pilot.',
            { 
                channel: 'OPEN.CH', 
                signalStrength: '███▓░░░░░', 
                status: '■ HOSTILE',
                duration: 4000 
            }
        );
    }
    
    onLowHealth() {
        starfieldManager.showCommunication(
            'Raider Captain',
            'This isn\'t over! We\'ll remember your ship!',
            { status: '■ RETREATING' }
        );
    }
}
```

### Friendly AI Communications
```javascript
// Station or friendly ship communications
class StationAI {
    onPlayerApproach() {
        starfieldManager.showCommunication(
            'Ceres Station Control',
            'Welcome to Ceres Mining Station. Requesting docking clearance.',
            { 
                channel: 'DOCK.7', 
                signalStrength: '████████▓',
                status: '■ TRAFFIC'
            }
        );
    }
}
```

## Audio Integration

### Sound Effects
- **Toggle Sound**: Uses `command` audio (volume: 0.5)
- **Message Sound**: Uses `blurb` audio (volume: 0.6)
- **Auto-fallback**: Works with or without audio manager

### Audio Manager Access
```javascript
// The system automatically finds audio manager through:
// 1. starfieldManager.audioManager
// 2. window.starfieldAudioManager
// 3. Graceful fallback if unavailable
```

## Configuration Options

### Message Options
```javascript
const options = {
    channel: 'COMM.1',        // Radio channel display
    signalStrength: '████████░', // Signal strength bars (9 chars max)
    status: '■ LIVE',         // Connection status
    duration: 5000            // Auto-hide delay (0 = manual hide)
};
```

### Status Indicators
- `■ LIVE` - Active transmission
- `■ SECURE` - Encrypted channel
- `■ HOSTILE` - Enemy communication
- `■ TRAFFIC` - Station control
- `■ UPDATE` - Mission update
- `■ EMERGENCY` - Priority message

### Channel Examples
- `FLEET.1` - Military fleet channel
- `COMM.1` - Standard communication
- `DOCK.7` - Docking control
- `MISSION.1` - Mission updates
- `OPEN.CH` - Open/public channel
- `DISTRESS` - Emergency frequency

## Technical Implementation

### File Structure
- **Component**: `frontend/static/js/ui/CommunicationHUD.js`
- **Integration**: `frontend/static/js/views/StarfieldManager.js`
- **Styling**: Inline CSS with retro terminal theme

### Dependencies
- **Three.js**: For coordinate system compatibility
- **StarfieldAudioManager**: For sound effects
- **DOM**: Standard HTML5 Canvas and SVG for wireframe

### Performance Notes
- **Animation**: 5 FPS for retro feel, minimal CPU impact
- **Memory**: Lightweight SVG wireframe, no heavy assets
- **Compatibility**: Works with existing HUD systems without conflicts

## Future Enhancements

### Planned Features
1. **Voice Synthesis**: Text-to-speech for dialogue
2. **Avatar Variations**: Different wireframe styles per faction
3. **Transmission Effects**: Static, interference, signal degradation
4. **Multi-speaker**: Support for multiple NPCs in single conversation
5. **History Log**: Scrollable communication history

### Integration Points
- **Mission System**: Automatic triggers for mission events
- **Faction System**: Faction-specific avatar styles and channels
- **AI System**: Context-aware combat and exploration communications
- **Trading System**: Merchant and station communications

## Console Testing

### Quick Tests
```javascript
// Toggle HUD
communicationHUD.toggle();

// Test with custom message
communicationHUD.showMessage('Test NPC', 'This is a test message');

// Test through StarfieldManager
starfieldManager.showCommunication('Captain Smith', 'Test communication system');

// Multiple rapid messages (queue test)
for(let i = 1; i <= 3; i++) {
    setTimeout(() => {
        starfieldManager.showCommunication(`NPC ${i}`, `Message number ${i}`);
    }, i * 2000);
}
```

The Communication HUD system provides a professional, immersive interface for NPC interactions that enhances the game's storytelling and mission experience while maintaining the retro aesthetic of the overall UI design.
