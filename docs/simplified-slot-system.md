# Diverse Ship Slot System

## Overview

The card inventory system now features a diverse slot system where each ship class has unique slot counts and specializations, making ship choice meaningful and strategic.

## Ship Class Diversity

### 🚀 **Heavy Fighter** (16 slots)
**Role**: Maximum combat capability
- **Strengths**: 
  - 6 weapon slots (3 primary + 3 secondary) - Most firepower
  - 2 armor slots for heavy protection
  - 2 power cores for sustained combat
  - Advanced targeting systems
- **Weaknesses**: 
  - Limited cargo capacity (2 utility slots)
  - Higher resource requirements
- **Best For**: Frontline combat, assault missions, heavy engagement

### 🔍 **Scout** (11 slots)
**Role**: Speed and reconnaissance specialist
- **Strengths**:
  - 3 sensor slots for maximum detection capability
  - Lightweight design (minimal core systems)
  - Enhanced communications for long-range operations
- **Weaknesses**:
  - Only 1 weapon slot (minimal combat ability)
  - Light armor (1 slot only)
  - Very limited cargo (2 utility slots)
- **Best For**: Exploration, reconnaissance, stealth missions

### ⚔️ **Light Fighter** (12 slots)
**Role**: Balanced patrol ship
- **Strengths**:
  - Well-balanced capabilities across all areas
  - 4 weapon slots for good combat ability
  - 3 utility slots for versatility
- **Weaknesses**:
  - No particular specialization
  - Average in all areas
- **Best For**: Patrol duties, escort missions, general purpose

### 📦 **Light Freighter** (14 slots)
**Role**: Cargo transport with defense
- **Strengths**:
  - 6 cargo/utility slots for good hauling capacity
  - 2 armor slots for cargo protection
  - Industrial-grade power systems
- **Weaknesses**:
  - Only 2 weapon slots (minimal defense)
  - Limited sensor capability (1 slot)
  - Slower and less maneuverable
- **Best For**: Trade runs, supply missions, medium cargo transport

### 🏭 **Heavy Freighter** (18 slots)
**Role**: Maximum cargo capacity
- **Strengths**:
  - 10 cargo/utility slots for massive hauling capacity
  - 3 armor slots for maximum protection
  - Industrial reactor for heavy operations
- **Weaknesses**:
  - Only 1 weapon slot (token defense)
  - Very slow and cumbersome
  - Limited sensors and communications
- **Best For**: Major cargo operations, station supply, bulk transport

## Slot Type Specializations

### 🔥 **Weapon Slots**
- **Primary Weapons**: Main firepower (primary fire key)
- **Secondary Weapons**: Special weapons (secondary fire key)
- **Distribution**: Heavy Fighter (6) > Light Fighter (4) > Light Freighter (2) > Scout (1) > Heavy Freighter (1)

### 🛡️ **Armor Slots**
- Multiple armor slots allow for layered protection
- **Distribution**: Heavy Freighter (3) > Heavy Fighter (2) = Light Freighter (2) > Scout (1) = Light Fighter (1)

### ⚡ **Power Slots**
- Additional power cores provide more energy capacity
- **Distribution**: Heavy Fighter (2) > All others (1)

### 📡 **Sensor Slots**
- Enhanced detection and targeting capabilities
- **Distribution**: Scout (3) > Heavy Fighter (2) > All others (1)

### 📦 **Utility/Cargo Slots**
- Combined utility and cargo functionality
- **Distribution**: Heavy Freighter (10) > Light Freighter (6) > Scout (3) > Light Fighter (3) > Heavy Fighter (2)

## Strategic Implications

### **Ship Selection Strategy**
- **Combat Missions**: Choose Heavy Fighter for maximum firepower
- **Exploration**: Choose Scout for sensor advantage and speed
- **Trade Routes**: Choose freighters based on cargo requirements
- **Patrol Duties**: Choose Light Fighter for balanced capabilities

### **Equipment Loadout Strategy**
- **Weapon Focus**: Heavy Fighter can mount diverse weapon combinations
- **Sensor Focus**: Scout can stack multiple sensor types for detection
- **Cargo Focus**: Freighters can optimize for specific cargo types
- **Balanced Focus**: Light Fighter allows flexible loadouts

### **Resource Management**
- More slots = higher equipment costs
- Specialized ships excel in their role but struggle outside it
- Balanced ships are versatile but not optimal for any specific task

## User Experience Benefits

### 🎯 **Clear Ship Identity**
- Each ship class feels unique and purposeful
- Visual slot layout immediately shows ship specialization
- Players can quickly understand ship capabilities

### 🔄 **Meaningful Choices**
- Ship selection impacts gameplay strategy
- Equipment choices matter more with slot limitations
- Trade-offs between specialization and versatility

### 📈 **Progression System**
- Players can upgrade to larger ships for more slots
- Specialized ships reward focused playstyles
- Multiple viable ship choices for different activities

## Technical Implementation

### **Slot Validation**
- Each slot type accepts specific card categories
- Weapon slots distinguish between primary/secondary
- Utility slots accept both utility and cargo cards

### **Dynamic UI**
- Ship selection updates available slots immediately
- Visual indicators show slot specialization
- Drag-and-drop validates card compatibility

### **Balance Considerations**
- Total slot count reflects ship size and complexity
- Weapon slot distribution balances combat capability
- Cargo slot distribution reflects intended role

## Migration Notes

### Breaking Changes
- Slot IDs changed from specific types to generic types
- Filter categories simplified
- Card validation logic updated

### Backward Compatibility
- Existing save files may need migration
- Card types remain the same
- Ship configurations updated but maintain balance

## Testing

Use `test-simplified-slots.html` to verify:
1. All weapon types work in weapon slots
2. Primary/Secondary distinction is clear
3. Ship type switching works correctly
4. Filter system shows correct categories
5. Drag and drop validation works properly

## Future Enhancements

1. **Visual Indicators**: Different icons for Primary vs Secondary slots
2. **Weapon Grouping**: Show which weapons fire together
3. **Slot Recommendations**: Suggest optimal card placements
4. **Quick Swap**: Easy weapon switching between slots
5. **Loadout Presets**: Save and load weapon configurations 