# Technical Design Document

## Project Overview
Planetz is a space exploration and combat game featuring procedurally generated planets, ship systems management, and NFT-based card collection mechanics inspired by Clash Royale.

## Core Architecture

### Frontend Architecture
- **Three.js**: 3D rendering engine for space environments and planets
- **Vanilla JavaScript**: Core game logic and UI management
- **Web Workers**: Offloaded mesh generation for performance
- **Module System**: ES6 modules for code organization

### Backend Architecture
- **Flask**: Python web framework for API endpoints
- **SQLite**: Local database for game state (development)
- **RESTful API**: Communication between frontend and backend

## Ship Systems Architecture

### Universal Slot System
All ship systems use a universal slot system where:
- Each system occupies exactly 1 slot regardless of type
- No specialized hardpoint types (weapons, utility, etc.)
- Slot availability determined by ship class
- Systems can be installed/removed freely within slot constraints

### Energy Management
- Centralized energy pool shared by all systems
- Systems consume energy directly when active
- No complex power grid or allocation system
- Auto-deactivation when insufficient energy

### System State Management
```javascript
class System {
    constructor(config) {
        this.level = config.level || 1;
        this.health = 1.0;
        this.isActive = false;
        this.energyConsumption = config.energyConsumption || 0;
    }
}
```

## NFT Card Collection System

### Pseudo-NFT Implementation (MVP)
For initial development, we implement a pseudo-NFT system that mimics real NFT behavior:
- Each card has a unique token ID and metadata
- Cards are never consumed or destroyed during upgrades
- Cards accumulate in a crypto wallet simulation
- Future integration with real NFT marketplaces (OpenSea, etc.)

```javascript
class NFTCard {
    constructor(cardType, rarity, tokenId) {
        this.cardType = cardType;           // e.g., "laser_cannon"
        this.rarity = rarity;               // common, rare, epic, legendary
        this.tokenId = tokenId;             // unique identifier
        this.quantity = 1;                  // always 1 for NFTs
        this.discovered = false;            // for silhouette display
        this.metadata = {
            name: cardType,
            description: "",
            image: "",
            attributes: []
        };
    }
}
```

### Card Stacking System (Clash Royale Style)
- **Card Stacking**: All cards of the same type stack together in inventory
- **Upgrade Requirements**: Multiple cards of the same type required for upgrades
  - Level 1→2: 3x cards
  - Level 2→3: 6x cards  
  - Level 3→4: 12x cards
  - Level 4→5: 24x cards
- **Card Preservation**: Cards are never consumed, only accumulated
- **No Stack Limits**: Unlimited cards per type can be collected

### Discovery and Rarity System
- **Undiscovered Cards**: Shown as silhouettes to build anticipation
- **Pokédex-Style Discovery**: Cards unlock full art and details when first found
- **Rarity by Drop Rates**: Controlled by availability, not card variants
  - Common: 70% drop rate
  - Rare: 20% drop rate
  - Epic: 8% drop rate
  - Legendary: 2% drop rate
- **System Inventory**: Game maintains stock of available NFTs for drops
- **Depletion Handling**: Alternative drops when specific types run out

### Inventory Management
```javascript
class CardInventory {
    constructor() {
        this.cards = new Map(); // cardType -> NFTCard[]
        this.discoveredTypes = new Set();
    }
    
    addCard(nftCard) {
        if (!this.cards.has(nftCard.cardType)) {
            this.cards.set(nftCard.cardType, []);
        }
        this.cards.get(nftCard.cardType).push(nftCard);
        this.discoveredTypes.add(nftCard.cardType);
    }
    
    getCardCount(cardType) {
        return this.cards.get(cardType)?.length || 0;
    }
    
    canUpgrade(cardType, currentLevel) {
        const required = this.getUpgradeRequirement(cardType, currentLevel);
        return this.getCardCount(cardType) >= required;
    }
}
```

### Rarity and Drop System
- Rarity controlled by drop rates, not card variants
- System maintains inventory of available NFTs for drops
- When NFT type depleted, alternative drops selected
- Drop rates by rarity:
  - Common: 70%
  - Rare: 20%
  - Epic: 8%
  - Legendary: 2%

### Discovery and Silhouettes
- Undiscovered cards shown as silhouettes
- Silhouettes build anticipation for new cards
- Discovery unlocks full card art and details
- Collection progress tracking (Pokédex style)

## User Interface Design

### Inventory Interface
- Grid-based card display
- Stack counters for each card type
- Silhouettes for undiscovered cards
- Drag-and-drop between inventory and ship slots
- Ship selection interface (station-only)

### Ship Editor (Ctrl-S)
- Modal overlay system similar to Planet Editor (Ctrl-E)
- Real-time ship configuration preview
- Drag-and-drop card installation
- Build validation and warnings
- Save/load ship configurations

### Station Interface
- Ship selection from player's collection
- Repair services integration
- Launch validation (prevents invalid builds)
- Access to all owned ships from any station

## Data Persistence

### Ship Configurations
```javascript
const shipConfig = {
    shipType: "heavy_fighter",
    installedSystems: {
        slot1: { cardType: "laser_cannon", level: 3 },
        slot2: { cardType: "shield_generator", level: 2 },
        // ... other slots
    },
    name: "Player Ship Name"
};
```

### Card Collection
```javascript
const playerCollection = {
    cards: {
        "laser_cannon": [
            { tokenId: "0x123...", rarity: "common" },
            { tokenId: "0x124...", rarity: "common" },
            // ... more cards of same type
        ]
    },
    discoveredTypes: ["laser_cannon", "shield_generator", ...],
    ships: [
        { id: 1, config: shipConfig1 },
        { id: 2, config: shipConfig2 }
    ]
};
```

## Build Validation System

### Core Rules
- Must have essential systems (engines, reactor, hull plating)
- Cannot exceed slot capacity
- Must have sufficient energy generation for active systems
- Launch prevention for invalid builds

### Validation Logic
```javascript
class BuildValidator {
    validateBuild(shipConfig) {
        const errors = [];
        
        if (!this.hasEssentialSystems(shipConfig)) {
            errors.push("Missing essential systems");
        }
        
        if (this.exceedsSlotCapacity(shipConfig)) {
            errors.push("Exceeds slot capacity");
        }
        
        if (!this.hasAdequateEnergy(shipConfig)) {
            errors.push("Insufficient energy generation");
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}
```

## Performance Considerations

### Card Rendering Optimization
- Virtual scrolling for large inventories
- Lazy loading of card images
- Efficient drag-and-drop implementation
- Minimal DOM manipulation

### Memory Management
- Card object pooling
- Efficient collection data structures
- Garbage collection optimization
- Asset preloading strategies

## Future NFT Integration

### Blockchain Preparation
- Token ID structure compatible with ERC-721
- Metadata standards compliance
- Marketplace integration hooks
- Wallet connection preparation

### Third-Party Integration
- OpenSea compatibility
- External marketplace support
- Trading functionality hooks
- Ownership verification systems

## Security Considerations

### Pseudo-NFT Security
- Secure token ID generation
- Collection integrity validation
- Anti-duplication measures
- Save game encryption

### Future Blockchain Security
- Smart contract integration points
- Wallet security best practices
- Transaction validation
- Ownership verification

## Testing Strategy

### Unit Testing
- Card collection mechanics
- Build validation logic
- Inventory management
- Upgrade calculations

### Integration Testing
- UI component interactions
- Drag-and-drop functionality
- Ship configuration persistence
- Station interface integration

### Performance Testing
- Large inventory handling
- Card rendering performance
- Memory usage optimization
- Load time measurements

## Deployment Architecture

### Development Environment
- Local Flask server
- File-based persistence
- Debug logging enabled
- Hot reload for development

### Production Considerations
- Database migration strategy
- Asset optimization
- CDN integration
- Monitoring and analytics

## API Design

### Card Management Endpoints
```
GET /api/cards/collection - Get player's card collection
POST /api/cards/discover - Discover new card
PUT /api/cards/upgrade - Upgrade system using cards
GET /api/cards/types - Get all available card types
```

### Ship Management Endpoints
```
GET /api/ships/collection - Get player's ships
POST /api/ships/create - Create new ship configuration
PUT /api/ships/update - Update ship configuration
DELETE /api/ships/delete - Delete ship configuration
```

### Validation Endpoints
```
POST /api/ships/validate - Validate ship build
GET /api/ships/requirements - Get build requirements
```

This technical design provides a solid foundation for implementing the NFT card collection system while maintaining compatibility with future blockchain integration.

## Architecture Diagrams

For detailed UML diagrams and visual architecture documentation, see [System Architecture Documentation](system_architecture.md), which includes:

- Class diagrams for the NFT card collection system
- Sequence diagrams for card discovery and upgrade flows
- State diagrams for ship configuration states
- Component diagrams for UI architecture
- Activity diagrams for user interaction flows
- Data flow diagrams showing system integration
