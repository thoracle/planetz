/**
 * GiveItemAction - Give items to player inventory
 * 
 * Adds items to player inventory when waypoint is triggered. Supports
 * quantity, quality levels, and integration with existing inventory system.
 */

import { WaypointAction, ActionType } from '../WaypointAction.js';
import { debug } from '../../debug.js';

// Item quality levels
export const ItemQuality = {
    POOR: 'poor',
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
};

// Item categories
export const ItemCategory = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    CONSUMABLE: 'consumable',
    MATERIAL: 'material',
    TOOL: 'tool',
    CARD: 'card',
    BLUEPRINT: 'blueprint',
    KEY_ITEM: 'key_item'
};

export class GiveItemAction extends WaypointAction {
    constructor(type, parameters) {
        super(type, parameters);
        
        // Validate item parameters
        this.validateItemParameters();
    }

    /**
     * Perform item giving action
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} - Item giving result
     */
    async performAction(context) {
        const {
            itemId,
            quantity = 1,
            quality = ItemQuality.COMMON,
            level = 1,
            durability = 100,
            enchantments = null,
            message = null,
            showNotification = true,
            notificationDuration = 4000
        } = this.parameters;

        debug('WAYPOINTS', `🎁 Giving item: ${itemId} x${quantity} (${quality}, level ${level})`);

        try {
            // Create item data
            const itemData = {
                itemId: itemId,
                quantity: quantity,
                quality: quality,
                level: level,
                durability: durability,
                enchantments: enchantments,
                source: 'waypoint',
                timestamp: new Date()
            };

            // Add item to inventory
            const inventoryResult = await this.addToInventory(itemData);

            // Show notification if requested
            if (showNotification) {
                await this.showItemNotification({
                    itemData,
                    inventoryResult,
                    message,
                    duration: notificationDuration,
                    waypoint: context.waypoint
                });
            }

            // Log item for analytics
            this.logItem({
                itemData,
                inventoryResult,
                waypoint: context.waypoint,
                timestamp: new Date()
            });

            const result = {
                itemId,
                quantity,
                quality,
                level,
                inventoryResult,
                success: true,
                message: message
            };

            debug('WAYPOINTS', `✅ Item given successfully: ${itemId} x${quantity}`);
            return result;

        } catch (error) {
            debug('P1', `Failed to give item: ${error.message}`);

            // Show error notification
            if (showNotification) {
                await this.showErrorNotification(error.message);
            }

            throw error;
        }
    }

    /**
     * Add item to player inventory
     * @param {Object} itemData - Item data
     * @returns {Promise<Object>} - Inventory result
     */
    async addToInventory(itemData) {
        // Try player inventory system first
        if (window.playerInventory && window.playerInventory.addItem) {
            debug('WAYPOINTS', '🎒 Using PlayerInventory.addItem()');
            return await window.playerInventory.addItem(itemData);
        }

        // Try inventory manager
        if (window.inventoryManager && window.inventoryManager.addItem) {
            debug('WAYPOINTS', '🎒 Using InventoryManager.addItem()');
            return await window.inventoryManager.addItem(itemData);
        }

        // Try starfield manager inventory
        if (window.starfieldManager && window.starfieldManager.inventory) {
            debug('WAYPOINTS', '🎒 Using StarfieldManager.inventory');
            return await window.starfieldManager.inventory.addItem(itemData);
        }

        // Fallback: Direct API call to backend
        return await this.addItemFallback(itemData);
    }

    /**
     * Fallback item addition via direct API call
     * @param {Object} itemData - Item data
     * @returns {Promise<Object>} - Inventory result
     */
    async addItemFallback(itemData) {
        debug('WAYPOINTS', '🎒 Using fallback API call for item addition');
        
        try {
            const response = await fetch('/api/inventory/add_item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            if (!response.ok) {
                throw new Error(`Inventory API call failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown inventory error');
            }

            return result;

        } catch (error) {
            debug('P1', `Fallback inventory API call failed: ${error.message}`);

            // Final fallback: simulate item addition for testing
            return this.simulateItemAddition(itemData);
        }
    }

    /**
     * Simulate item addition for testing/fallback
     * @param {Object} itemData - Item data
     * @returns {Object} - Simulated inventory result
     */
    simulateItemAddition(itemData) {
        debug('WAYPOINTS', '🎒 Simulating item addition (fallback mode)');
        
        // Store in local storage for persistence
        const inventoryKey = 'planetz_simulated_inventory';
        let inventory = [];
        
        try {
            const stored = localStorage.getItem(inventoryKey);
            if (stored) {
                inventory = JSON.parse(stored);
            }
        } catch (error) {
            debug('P1', `Failed to load simulated inventory: ${error.message}`);
        }

        // Add item to simulated inventory
        const existingIndex = inventory.findIndex(item => 
            item.itemId === itemData.itemId && 
            item.quality === itemData.quality &&
            item.level === itemData.level
        );

        if (existingIndex !== -1) {
            // Stack with existing item
            inventory[existingIndex].quantity += itemData.quantity;
        } else {
            // Add new item
            inventory.push({
                ...itemData,
                id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
        }

        // Save back to storage
        try {
            localStorage.setItem(inventoryKey, JSON.stringify(inventory));
        } catch (error) {
            debug('P1', `Failed to save simulated inventory: ${error.message}`);
        }

        return {
            success: true,
            item: itemData,
            newQuantity: existingIndex !== -1 ? 
                inventory[existingIndex].quantity : itemData.quantity,
            wasStacked: existingIndex !== -1,
            simulated: true
        };
    }

    /**
     * Show item notification to player
     * @param {Object} config - Notification configuration
     */
    async showItemNotification(config) {
        const {
            itemData,
            inventoryResult,
            message,
            duration,
            waypoint
        } = config;

        // Create notification content
        const notificationContent = this.createItemNotificationContent(itemData, inventoryResult, message);
        
        // Show notification using existing message system
        if (window.waypointManager && window.waypointManager.showNotification) {
            window.waypointManager.showNotification(
                notificationContent.text,
                'success',
                {
                    title: notificationContent.title,
                    duration: duration,
                    icon: this.getItemIcon(itemData)
                }
            );
        } else {
            // Fallback: Create simple notification
            this.showSimpleNotification(notificationContent, duration);
        }

        debug('WAYPOINTS', `💬 Item notification shown: ${notificationContent.title}`);
    }

    /**
     * Create item notification content
     * @param {Object} itemData - Item data
     * @param {Object} inventoryResult - Inventory result
     * @param {string} customMessage - Custom message
     * @returns {Object} - Notification content
     */
    createItemNotificationContent(itemData, inventoryResult, customMessage) {
        if (customMessage) {
            return {
                title: 'Item Received',
                text: customMessage
            };
        }

        const { itemId, quantity, quality, level } = itemData;
        
        // Get item display name
        const displayName = this.getItemDisplayName(itemId);
        
        // Create quantity text
        const quantityText = quantity > 1 ? ` x${quantity}` : '';
        
        // Create quality text
        const qualityText = quality !== ItemQuality.COMMON ? ` (${quality})` : '';
        
        // Create level text
        const levelText = level > 1 ? ` [Level ${level}]` : '';
        
        // Check if item was stacked
        const stackText = inventoryResult.wasStacked ? ' (stacked)' : '';

        const text = `Received: ${displayName}${quantityText}${qualityText}${levelText}${stackText}`;

        return {
            title: 'Item Acquired',
            text: text
        };
    }

    /**
     * Get item display name
     * @param {string} itemId - Item ID
     * @returns {string} - Display name
     */
    getItemDisplayName(itemId) {
        // Item display name mapping
        const displayNames = {
            'credits': 'Credits',
            'star_chart_fragment': 'Star Chart Fragment',
            'mission_token': 'Mission Token',
            'rare_equipment_card': 'Rare Equipment Card',
            'energy_cell': 'Energy Cell',
            'repair_kit': 'Repair Kit',
            'shield_booster': 'Shield Booster',
            'weapon_upgrade': 'Weapon Upgrade',
            'navigation_data': 'Navigation Data',
            'faction_badge': 'Faction Badge',
            'encrypted_data': 'Encrypted Data',
            'salvage_material': 'Salvage Material'
        };

        return displayNames[itemId] || this.formatItemName(itemId);
    }

    /**
     * Format item name from ID
     * @param {string} itemId - Item ID
     * @returns {string} - Formatted name
     */
    formatItemName(itemId) {
        return itemId
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Get item icon based on category
     * @param {Object} itemData - Item data
     * @returns {string} - Icon character/emoji
     */
    getItemIcon(itemData) {
        const { itemId, quality } = itemData;
        
        // Category-based icons
        if (itemId.includes('weapon')) return '⚔️';
        if (itemId.includes('armor') || itemId.includes('shield')) return '🛡️';
        if (itemId.includes('card')) return '🃏';
        if (itemId.includes('blueprint')) return '📋';
        if (itemId.includes('material') || itemId.includes('salvage')) return '🔧';
        if (itemId.includes('data') || itemId.includes('chart')) return '💾';
        if (itemId.includes('token') || itemId.includes('badge')) return '🏅';
        if (itemId.includes('key')) return '🗝️';
        
        // Quality-based fallback icons
        switch (quality) {
            case ItemQuality.LEGENDARY:
                return '💎';
            case ItemQuality.EPIC:
                return '🌟';
            case ItemQuality.RARE:
                return '💜';
            case ItemQuality.UNCOMMON:
                return '💚';
            default:
                return '📦';
        }
    }

    /**
     * Show simple notification fallback
     * @param {Object} content - Notification content
     * @param {number} duration - Display duration
     */
    showSimpleNotification(content, duration) {
        const notification = document.createElement('div');
        notification.className = 'waypoint-item-notification';
        notification.innerHTML = `
            <div class="notification-icon">🎁</div>
            <div class="notification-content">
                <div class="notification-title">${content.title}</div>
                <div class="notification-text">${content.text}</div>
            </div>
        `;

        // Apply styling
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(33, 150, 243, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border: 2px solid #2196f3;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            animation: slideInRight 0.3s ease-out;
        `;

        // Add CSS animation
        this.ensureNotificationStyles();

        // Add to DOM
        document.body.appendChild(notification);

        // Remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }

    /**
     * Show error notification
     * @param {string} errorMessage - Error message
     */
    async showErrorNotification(errorMessage) {
        const notification = document.createElement('div');
        notification.className = 'waypoint-item-error-notification';
        notification.innerHTML = `
            <div class="notification-icon">❌</div>
            <div class="notification-content">
                <div class="notification-title">Item Failed</div>
                <div class="notification-text">${errorMessage}</div>
            </div>
        `;

        // Apply error styling
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(244, 67, 54, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border: 2px solid #f44336;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remove after 6 seconds (longer for errors)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 6000);
    }

    /**
     * Ensure notification CSS styles are available
     */
    ensureNotificationStyles() {
        if (document.getElementById('waypoint-item-notification-styles')) {
            return; // Already added
        }

        const style = document.createElement('style');
        style.id = 'waypoint-item-notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                0% {
                    opacity: 0;
                    transform: translateX(100%);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutRight {
                0% {
                    opacity: 1;
                    transform: translateX(0);
                }
                100% {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
            
            .waypoint-item-notification .notification-content,
            .waypoint-item-error-notification .notification-content {
                display: flex;
                flex-direction: column;
            }
            
            .waypoint-item-notification .notification-title,
            .waypoint-item-error-notification .notification-title {
                font-size: 14px;
                margin-bottom: 4px;
            }
            
            .waypoint-item-notification .notification-text,
            .waypoint-item-error-notification .notification-text {
                font-size: 12px;
                opacity: 0.9;
                font-weight: normal;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Log item for analytics
     * @param {Object} itemLog - Item log data
     */
    logItem(itemLog) {
        if (!window.itemHistory) {
            window.itemHistory = [];
        }

        window.itemHistory.push({
            ...itemLog,
            id: `item_log_${Date.now()}`,
            waypointId: itemLog.waypoint?.id,
            waypointName: itemLog.waypoint?.name
        });

        // Keep only last 100 item logs
        if (window.itemHistory.length > 100) {
            window.itemHistory.shift();
        }

        debug('WAYPOINTS', `📝 Item logged: ${itemLog.itemData.itemId} x${itemLog.itemData.quantity}`);
    }

    /**
     * Validate item parameters
     */
    validateItemParameters() {
        const { itemId, quantity, level, durability } = this.parameters;

        if (!itemId || typeof itemId !== 'string') {
            throw new Error('itemId parameter is required and must be a string');
        }

        if (quantity !== undefined && (typeof quantity !== 'number' || quantity <= 0)) {
            throw new Error('quantity must be a positive number');
        }

        if (level !== undefined && (typeof level !== 'number' || level < 1)) {
            throw new Error('level must be a number >= 1');
        }

        if (durability !== undefined && (typeof durability !== 'number' || durability < 0 || durability > 100)) {
            throw new Error('durability must be a number between 0 and 100');
        }
    }

    /**
     * Get required parameters for this action
     * @returns {Array<string>} - Required parameter names
     */
    getRequiredParameters() {
        return ['itemId'];
    }

    /**
     * Get parameter types for validation
     * @returns {Object} - Parameter name to type mapping
     */
    getParameterTypes() {
        return {
            itemId: 'string',
            quantity: 'number',
            quality: 'string',
            level: 'number',
            durability: 'number',
            message: 'string',
            showNotification: 'boolean',
            notificationDuration: 'number'
        };
    }

    /**
     * Get action summary for debugging
     * @returns {Object} - Action summary
     */
    getSummary() {
        const baseSummary = super.getSummary();
        const { itemId, quantity, quality, level } = this.parameters;
        
        return {
            ...baseSummary,
            itemId: itemId,
            quantity: quantity || 1,
            quality: quality || ItemQuality.COMMON,
            level: level || 1,
            displayName: this.getItemDisplayName(itemId),
            estimatedValue: this.estimateItemValue(itemId, quantity, quality, level)
        };
    }

    /**
     * Estimate item value for summary
     * @param {string} itemId - Item ID
     * @param {number} quantity - Quantity
     * @param {string} quality - Quality
     * @param {number} level - Level
     * @returns {string} - Estimated value description
     */
    estimateItemValue(itemId, quantity = 1, quality = ItemQuality.COMMON, level = 1) {
        // Base values for common items
        const baseValues = {
            'credits': 1,
            'energy_cell': 50,
            'repair_kit': 100,
            'shield_booster': 200,
            'weapon_upgrade': 500,
            'rare_equipment_card': 1000
        };

        const baseValue = baseValues[itemId] || 100;
        
        // Quality multipliers
        const qualityMultipliers = {
            [ItemQuality.POOR]: 0.5,
            [ItemQuality.COMMON]: 1.0,
            [ItemQuality.UNCOMMON]: 2.0,
            [ItemQuality.RARE]: 5.0,
            [ItemQuality.EPIC]: 10.0,
            [ItemQuality.LEGENDARY]: 25.0
        };

        const qualityMultiplier = qualityMultipliers[quality] || 1.0;
        const levelMultiplier = 1 + (level - 1) * 0.1; // 10% per level
        
        const totalValue = Math.floor(baseValue * qualityMultiplier * levelMultiplier * quantity);
        
        return `~${totalValue.toLocaleString()} credits value`;
    }
}

export default GiveItemAction;
