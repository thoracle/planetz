import { debug } from '../debug.js';

/**
 * CommodityExchange - UI for buying and selling commodities at stations
 * Phase 1 Implementation: Basic buy/sell interface
 */

import { playerCredits } from '../utils/PlayerCredits.js';

export class CommodityExchange {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.currentStation = null;
        this.marketData = new Map();
        this.container = null;
        this.dockingInterface = null; // Reference to return to docking

        // Track active modal escape handlers for cleanup
        this._activeEscapeHandlers = new Set();

        // Track style elements for cleanup
        this._styleElements = new Set();

        // Bound event handlers for proper cleanup
        this._boundHandlers = {
            returnBtnClick: null,
            returnBtnMouseEnter: null,
            returnBtnMouseLeave: null
        };

        debug('UTILITY', '🏪 CommodityExchange: Initialized');
    }
    
    /**
     * Show commodity exchange interface
     */
    show(stationKey = null) {
        this.currentStation = stationKey;
        this.loadMarketData(stationKey);
        
        if (!this.container) {
            this.createExchangeUI();
        }
        
        this.container.style.display = 'block';
        this.isVisible = true;
        
        this.refreshMarketDisplay();
        this.refreshCargoDisplay();
        
debug('UI', `🏪 CommodityExchange: Opened at ${stationKey}`);
    }
    
    /**
     * Hide commodity exchange interface
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.isVisible = false;
        
debug('UI', '🏪 CommodityExchange: Closed');
    }
    
    /**
     * Create the exchange UI
     */
    createExchangeUI() {
        this.container = document.createElement('div');
        this.container.className = 'commodity-exchange';
        this.container.style.cssText = `
            position: fixed;
            top: 15%;
            left: 15%;
            width: 70%;
            height: 70%;
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            border: 2px solid #00ff41;
            border-radius: 12px;
            padding: 20px;
            color: #00ff41;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 10000;
            overflow-y: auto;
            box-shadow: 0 0 30px rgba(0, 255, 65, 0.3);
            display: none;
        `;
        
        this.container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #00ff41; margin: 0 0 10px 0; font-size: 28px; font-family: 'VT323', monospace;">COMMODITY EXCHANGE</h2>
                <div id="station-name" style="color: #888; font-size: 16px;">Station Unknown</div>
            </div>
            
            <div style="display: flex; gap: 20px; height: calc(100% - 120px);">
                <!-- Market Data Panel -->
                <div style="flex: 1; background: rgba(0, 0, 0, 0.3); border: 1px solid #333; border-radius: 8px; padding: 15px;">
                    <h3 style="color: #00ff41; margin-top: 0;">MARKET PRICES</h3>
                    <div id="market-list" style="overflow-y: auto; height: calc(100% - 40px);">
                        <!-- Market items will be populated here -->
                    </div>
                </div>
                
                <!-- Ship Cargo Panel -->
                <div style="flex: 1; background: rgba(0, 0, 0, 0.3); border: 1px solid #333; border-radius: 8px; padding: 15px;">
                    <h3 style="color: #00ff41; margin-top: 0;">SHIP CARGO</h3>
                    <div id="cargo-info" style="margin-bottom: 15px; color: #888;">
                        <div>Capacity: <span id="cargo-capacity">0/0</span> units</div>
                        <div id="cargo-progress-container" style="margin: 8px 0;">
                            <div id="cargo-progress-bar" class="progress-bar" style="
                                background: rgba(0, 0, 0, 0.5);
                                border: 1px solid #333;
                                height: 12px;
                                border-radius: 6px;
                                overflow: hidden;
                                position: relative;
                            ">
                                <div id="cargo-progress-fill" class="progress-fill" style="
                                    height: 100%;
                                    width: 0%;
                                    transition: width 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
                                    border-radius: 5px;
                                "></div>
                                <div id="cargo-progress-text" class="progress-text" style="
                                    position: absolute;
                                    top: 50%;
                                    left: 50%;
                                    transform: translate(-50%, -50%);
                                    font-size: 10px;
                                    color: #fff;
                                    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                                    pointer-events: none;
                                    z-index: 1;
                                    font-family: 'VT323', monospace;
                                ">0%</div>
                            </div>
                        </div>
                        <div>Credits: <span id="player-credits">0</span> CR</div>
                    </div>
                    <div id="cargo-list" style="overflow-y: auto; height: calc(100% - 80px);">
                        <!-- Cargo items will be populated here -->
                    </div>
                </div>
            </div>
            
            <!-- Transaction Panel -->
            <div id="transaction-panel" style="position: absolute; bottom: 20px; left: 20px; right: 20px; background: rgba(0, 0, 0, 0.5); border: 1px solid #555; border-radius: 8px; padding: 15px; display: none;">
                <h4 style="color: #00ff41; margin-top: 0;">TRANSACTION</h4>
                <div id="transaction-content">
                    <!-- Transaction details will be populated here -->
                </div>
            </div>
            
            <!-- Control Buttons -->
            <div style="position: absolute; bottom: 20px; right: 20px;">
                <button id="return-btn" style="
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid #00ff41;
                    color: #00ff41;
                    padding: 12px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-family: 'VT323', monospace;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    margin-left: 10px;
                ">RETURN TO STATION MENU</button>
            </div>
        `;
        
        document.body.appendChild(this.container);
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Return to docking button
        const returnBtn = this.container.querySelector('#return-btn');
        this._returnBtn = returnBtn; // Store reference for cleanup

        // Create bound handlers for later removal
        this._boundHandlers.returnBtnClick = () => {
            this.hide();
            if (this.dockingInterface) {
                this.dockingInterface.returnToStationMenu();
            }
        };

        this._boundHandlers.returnBtnMouseEnter = () => {
            returnBtn.style.background = 'rgba(0, 255, 65, 0.2)';
            returnBtn.style.borderColor = '#44ff44';
            returnBtn.style.transform = 'scale(1.05)';
        };

        this._boundHandlers.returnBtnMouseLeave = () => {
            returnBtn.style.background = 'rgba(0, 0, 0, 0.5)';
            returnBtn.style.borderColor = '#00ff41';
            returnBtn.style.transform = 'scale(1)';
        };

        returnBtn.addEventListener('click', this._boundHandlers.returnBtnClick);
        returnBtn.addEventListener('mouseenter', this._boundHandlers.returnBtnMouseEnter);
        returnBtn.addEventListener('mouseleave', this._boundHandlers.returnBtnMouseLeave);
    }
    
    /**
     * Get icon for commodity type
     */
    getCommodityIcon(commodityId) {
        const icons = {
            'medical_supplies': '🏥',
            'food_rations': '🍖',
            'raw_materials': '⚙️',
            'rare_elements': '💎',
            'illegal_weapons': '⚔️',
            'luxury_goods': '👑',
            'energy_cells': '🔋',
            'water': '💧',
            'oxygen': '🫁',
            'fuel': '⛽'
        };
        
        return icons[commodityId] || '📦'; // Default box icon for unknown commodities
    }

    /**
     * Load market data for station
     */
    loadMarketData(stationKey) {
        // Phase 1: Basic market data with static prices
        const basicMarkets = {
            'terra_prime': {
                name: 'Terra Prime',
                commodities: {
                    'medical_supplies': { buy_price: 65, sell_price: 45, available: 150 },
                    'food_rations': { buy_price: 12, sell_price: 8, available: 500 },
                    'raw_materials': { buy_price: 18, sell_price: 12, available: 1000 }
                }
            },
            'europa_research_station': {
                name: 'Europa Station',
                commodities: {
                    'medical_supplies': { buy_price: 75, sell_price: 55, available: 80 },
                    'food_rations': { buy_price: 15, sell_price: 10, available: 200 },
                    'rare_elements': { buy_price: 245, sell_price: 180, available: 25 }
                }
            },
            'ceres_outpost': {
                name: 'Ceres Outpost',
                commodities: {
                    'raw_materials': { buy_price: 15, sell_price: 10, available: 800 },
                    'food_rations': { buy_price: 10, sell_price: 6, available: 300 },
                    'rare_elements': { buy_price: 220, sell_price: 160, available: 50 }
                }
            }
        };
        
        this.marketData = basicMarkets[stationKey] || {
            name: 'Unknown Station',
            commodities: {}
        };
    }
    
    /**
     * Refresh market display
     */
    refreshMarketDisplay() {
        const stationNameEl = this.container.querySelector('#station-name');
        const marketListEl = this.container.querySelector('#market-list');
        
        stationNameEl.textContent = this.marketData.name;
        
        marketListEl.innerHTML = '';
        
        for (const [commodityId, data] of Object.entries(this.marketData.commodities)) {
            const commodityData = this.getCommodityData(commodityId);
            
            const itemEl = document.createElement('div');
            itemEl.style.cssText = `
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid #333;
                border-radius: 5px;
                padding: 10px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            
            const icon = this.getCommodityIcon(commodityId);
            itemEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="font-size: 24px;">${icon}</div>
                        <div>
                            <div style="font-weight: bold;">${commodityData.name}</div>
                            <div style="color: #888; font-size: 12px;">Available: ${data.available} units</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #ff6666;">Buy: ${data.buy_price} CR</div>
                        <div style="color: #66ff66;">Sell: ${data.sell_price} CR</div>
                    </div>
                </div>
            `;
            
            // Add click handler for buy/sell
            itemEl.addEventListener('click', () => {
                this.showTransactionPanel(commodityId, data);
            });
            
            itemEl.addEventListener('mouseenter', () => {
                itemEl.style.background = 'rgba(0, 255, 65, 0.1)';
            });
            
            itemEl.addEventListener('mouseleave', () => {
                itemEl.style.background = 'rgba(255, 255, 255, 0.05)';
            });
            
            marketListEl.appendChild(itemEl);
        }
    }
    
    /**
     * Refresh cargo display
     */
    refreshCargoDisplay() {
        const ship = this.starfieldManager.ship;
        if (!ship || !ship.cargoHoldManager) {
            debug('UI', '🚛 CommodityExchange: No ship or cargoHoldManager available');
            return;
        }
        
        // Force refresh cargo holds from cards
        ship.cargoHoldManager.initializeFromCards();
        
        const manifest = ship.cargoHoldManager.getCargoManifest();
debug('UI', '🚛 CommodityExchange: Cargo manifest:', manifest);
        
        // Update capacity display with red highlighting for zero capacity
        const capacityEl = this.container.querySelector('#cargo-capacity');
        capacityEl.textContent = `${manifest.usedCapacity}/${manifest.totalCapacity}`;
        
        // Highlight in red if no cargo capacity available
        if (manifest.totalCapacity === 0) {
            capacityEl.style.color = '#ff4444';
            capacityEl.style.fontWeight = 'bold';
        } else {
            capacityEl.style.color = '#888';
            capacityEl.style.fontWeight = 'normal';
        }
        
        // Update cargo progress bar
        this.updateCargoProgressBar(manifest);
        
        // Update credits display using unified system
        const creditsEl = this.container.querySelector('#player-credits');
        creditsEl.textContent = playerCredits.getFormattedCredits();
        
        // Register for automatic updates
        playerCredits.registerDisplay(creditsEl);
        
        // Update cargo list
        const cargoListEl = this.container.querySelector('#cargo-list');
        cargoListEl.innerHTML = '';
        
        if (manifest.cargo.length === 0) {
            cargoListEl.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No cargo loaded</div>';
            return;
        }
        
        for (const cargoItem of manifest.cargo) {
            const itemEl = document.createElement('div');
            itemEl.style.cssText = `
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid #333;
                border-radius: 5px;
                padding: 10px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            
            const timeSinceLoaded = Math.floor((Date.now() - cargoItem.loadedAt) / 1000 / 60);
            const icon = this.getCommodityIcon(cargoItem.commodityId);
            
            itemEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="font-size: 24px;">${icon}</div>
                        <div>
                            <div style="font-weight: bold;">${cargoItem.name}</div>
                            <div style="color: #888; font-size: 12px;">Hold ${cargoItem.holdSlot} • ${timeSinceLoaded}m ago</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #66ff66;">Qty: ${cargoItem.quantity}</div>
                        <div style="color: #888; font-size: 12px;">Int: ${Math.floor(cargoItem.integrity * 100)}%</div>
                    </div>
                </div>
            `;
            
            // Add click handler for selling
            itemEl.addEventListener('click', () => {
                this.showSellPanel(cargoItem);
            });
            
            itemEl.addEventListener('mouseenter', () => {
                itemEl.style.background = 'rgba(0, 255, 65, 0.1)';
            });
            
            itemEl.addEventListener('mouseleave', () => {
                itemEl.style.background = 'rgba(255, 255, 255, 0.05)';
            });
            
            cargoListEl.appendChild(itemEl);
        }
    }
    
    /**
     * Update cargo progress bar with current capacity
     */
    updateCargoProgressBar(manifest) {
        const progressFill = this.container.querySelector('#cargo-progress-fill');
        const progressText = this.container.querySelector('#cargo-progress-text');
        
        if (!progressFill || !progressText) {
            debug('UI', '🚛 CommodityExchange: Progress bar elements not found');
            return;
        }
        
        // Calculate percentage (avoid division by zero)
        const percentage = manifest.totalCapacity > 0 ? 
            Math.round((manifest.usedCapacity / manifest.totalCapacity) * 100) : 0;
        
        // Update progress bar width
        progressFill.style.width = `${percentage}%`;
        
        // Update progress text
        progressText.textContent = `${percentage}%`;
        
        // Update colors based on capacity thresholds
        let background, boxShadow;
        
        if (percentage <= 70) {
            // Neon Green - Normal operation (matching game's neon aesthetic)
            background = 'linear-gradient(90deg, #00ff41 0%, #00ff88 50%, #00ff41 100%)';
            boxShadow = '0 0 12px rgba(0, 255, 65, 0.6), inset 0 0 8px rgba(0, 255, 65, 0.3)';
        } else if (percentage <= 90) {
            // Neon Orange - Caution/warning  
            background = 'linear-gradient(90deg, #ff8800 0%, #ffaa00 50%, #ff8800 100%)';
            boxShadow = '0 0 12px rgba(255, 136, 0, 0.6), inset 0 0 8px rgba(255, 170, 0, 0.3)';
        } else {
            // Neon Red - Critical/full
            background = 'linear-gradient(90deg, #ff0033 0%, #ff3366 50%, #ff0033 100%)';
            boxShadow = '0 0 12px rgba(255, 51, 51, 0.6), inset 0 0 8px rgba(255, 51, 51, 0.3)';
        }
        
        progressFill.style.background = background;
        progressFill.style.boxShadow = boxShadow;
        
debug('UTILITY', `🚛 Updated cargo progress bar: ${manifest.usedCapacity}/${manifest.totalCapacity} (${percentage}%)`);
    }
    
    /**
     * Show transaction panel for buying
     */
    showTransactionPanel(commodityId, marketData) {
        const panel = this.container.querySelector('#transaction-panel');
        const content = this.container.querySelector('#transaction-content');
        
        const commodityData = this.getCommodityData(commodityId);
        const ship = this.starfieldManager.ship;
        const availableSpace = ship.cargoHoldManager.getAvailableCapacity();
        
        content.innerHTML = `
            <div style="display: flex; gap: 20px;">
                <div style="flex: 1;">
                    <h5 style="color: #00ff41; margin: 0 0 10px 0;">BUY: ${commodityData.name}</h5>
                    <div>Price: ${marketData.buy_price} CR per unit</div>
                    <div>Available: ${marketData.available} units</div>
                    <div>Available space: ${availableSpace} units</div>
                </div>
                <div style="flex: 1;">
                    <label>Quantity:</label>
                    <input type="number" id="buy-quantity" min="1" max="${Math.min(marketData.available, availableSpace)}" value="1" 
                           style="width: 100px; margin: 0 10px; padding: 5px; background: #333; color: white; border: 1px solid #555;">
                    <div style="margin: 10px 0;">
                        Total: <span id="buy-total">${marketData.buy_price}</span> CR
                    </div>
                    <button id="confirm-buy" style="background: rgba(0, 0, 0, 0.5); border: 1px solid #00ff41; color: #00ff41; padding: 12px 16px; border-radius: 4px; cursor: pointer; font-family: 'VT323', monospace; font-size: 16px; transition: all 0.3s ease;">
                        CONFIRM PURCHASE
                    </button>
                    <button id="cancel-transaction" style="background: rgba(0, 0, 0, 0.5); border: 1px solid #888; color: #888; padding: 12px 16px; border-radius: 4px; cursor: pointer; font-family: 'VT323', monospace; font-size: 16px; transition: all 0.3s ease; margin-left: 10px;">
                        CANCEL
                    </button>
                </div>
            </div>
        `;
        
        panel.style.display = 'block';
        
        // Setup transaction event listeners
        const quantityInput = content.querySelector('#buy-quantity');
        const totalEl = content.querySelector('#buy-total');
        const confirmBtn = content.querySelector('#confirm-buy');
        const cancelBtn = content.querySelector('#cancel-transaction');
        
        quantityInput.addEventListener('input', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            totalEl.textContent = quantity * marketData.buy_price;
        });
        
        confirmBtn.addEventListener('click', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            this.executeBuy(commodityId, quantity, marketData.buy_price);
            panel.style.display = 'none';
        });
        
        cancelBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });
        
        // Add hover effects to transaction buttons
        this.addButtonHoverEffects(confirmBtn, '#00ff41');
        this.addButtonHoverEffects(cancelBtn, '#888');
    }
    
    /**
     * Show sell panel
     */
    showSellPanel(cargoItem) {
        const panel = this.container.querySelector('#transaction-panel');
        const content = this.container.querySelector('#transaction-content');
        
        const marketPrice = this.marketData.commodities[cargoItem.commodityId]?.sell_price || 0;
        const integrityMultiplier = cargoItem.integrity;
        const effectivePrice = Math.floor(marketPrice * integrityMultiplier);
        
        content.innerHTML = `
            <div style="display: flex; gap: 20px;">
                <div style="flex: 1;">
                    <h5 style="color: #00ff41; margin: 0 0 10px 0;">SELL: ${cargoItem.name}</h5>
                    <div>Base price: ${marketPrice} CR per unit</div>
                    <div>Integrity: ${Math.floor(cargoItem.integrity * 100)}%</div>
                    <div>Effective price: ${effectivePrice} CR per unit</div>
                    <div>Available: ${cargoItem.quantity} units</div>
                </div>
                <div style="flex: 1;">
                    <label>Quantity:</label>
                    <input type="number" id="sell-quantity" min="1" max="${cargoItem.quantity}" value="${cargoItem.quantity}" 
                           style="width: 100px; margin: 0 10px; padding: 5px; background: #333; color: white; border: 1px solid #555;">
                    <div style="margin: 10px 0;">
                        Total: <span id="sell-total">${cargoItem.quantity * effectivePrice}</span> CR
                    </div>
                    <button id="confirm-sell" style="background: rgba(0, 0, 0, 0.5); border: 1px solid #00ff41; color: #00ff41; padding: 12px 16px; border-radius: 4px; cursor: pointer; font-family: 'VT323', monospace; font-size: 16px; transition: all 0.3s ease;">
                        CONFIRM SALE
                    </button>
                    <button id="cancel-transaction" style="background: rgba(0, 0, 0, 0.5); border: 1px solid #888; color: #888; padding: 12px 16px; border-radius: 4px; cursor: pointer; font-family: 'VT323', monospace; font-size: 16px; transition: all 0.3s ease; margin-left: 10px;">
                        CANCEL
                    </button>
                </div>
            </div>
        `;
        
        panel.style.display = 'block';
        
        // Setup transaction event listeners
        const quantityInput = content.querySelector('#sell-quantity');
        const totalEl = content.querySelector('#sell-total');
        const confirmBtn = content.querySelector('#confirm-sell');
        const cancelBtn = content.querySelector('#cancel-transaction');
        
        quantityInput.addEventListener('input', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            totalEl.textContent = quantity * effectivePrice;
        });
        
        confirmBtn.addEventListener('click', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            this.executeSell(cargoItem, quantity, effectivePrice);
            panel.style.display = 'none';
        });
        
        cancelBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });
        
        // Add hover effects to transaction buttons
        this.addButtonHoverEffects(confirmBtn, '#00ff41');
        this.addButtonHoverEffects(cancelBtn, '#888');
    }
    
    /**
     * Execute buy transaction
     */
    executeBuy(commodityId, quantity, unitPrice) {
        const ship = this.starfieldManager.ship;
        if (!ship.cargoHoldManager) return;
        
        const totalCost = quantity * unitPrice;
debug('UI', `🏪 Buying ${quantity} units of ${commodityId} for ${totalCost} CR`);
        
        // Check if player has enough credits
        if (!playerCredits.canAfford(totalCost)) {
            this.showTradeNotification(`❌ Insufficient credits - Need ${totalCost.toLocaleString()} CR`, 'error');
            return;
        }
        
        // Load cargo into ship
        const result = ship.cargoHoldManager.loadCargo(commodityId, quantity);
        
        if (result.success) {
            // Deduct credits from player
            const creditDeducted = playerCredits.spendCredits(totalCost, `Purchase ${quantity} ${commodityId}`);
            
            if (creditDeducted) {
debug('UTILITY', `✅ Purchase successful: ${quantity} units loaded`);
                
                // Show success notification
                const commodityData = this.getCommodityData(commodityId);
                this.showTradeNotification(`✅ Purchased ${quantity} units of ${commodityData.name} for ${totalCost.toLocaleString()} CR`, 'success');
                
                // TODO: Reduce station availability
            } else {
                // Failed to deduct credits - this should not happen after canAfford check
                debug('UI', '❌ Failed to deduct credits after successful cargo load');
                this.showTradeNotification(`❌ Credit transaction failed`, 'error');
                return;
            }
            
            // Refresh displays
            this.refreshCargoDisplay();
            this.refreshMarketDisplay();
            
            // Send mission event if applicable
            if (this.starfieldManager?.missionEventService) {
                this.starfieldManager.missionEventService.cargoLoaded(
                    commodityId, 
                    quantity, 
                    this.currentStation,
                    { playerShip: ship.shipType }
                ).catch(error => {
                    debug('MISSIONS', '🎯 Failed to send cargo loaded event:', error);
                });
            }
        } else {
debug('P1', `🏪 Purchase failed: ${result.error}`);
            this.showTradeNotification(`Purchase failed: ${result.error}`, 'error');
        }
    }
    
    /**
     * Execute sell transaction
     */
    executeSell(cargoItem, quantity, unitPrice) {
        const ship = this.starfieldManager.ship;
        if (!ship.cargoHoldManager) return;
        
        const totalValue = quantity * unitPrice;
debug('UI', `🏪 Selling ${quantity} units of ${cargoItem.commodityId} for ${totalValue} CR`);
        
        // Unload cargo from ship
        const result = ship.cargoHoldManager.unloadCargo(cargoItem.id, quantity);
        
        if (result.success) {
            // Add credits to player
            const creditsAdded = playerCredits.addCredits(totalValue, `Sale ${quantity} ${cargoItem.commodityId}`);
            
            if (creditsAdded) {
debug('UI', `✅ Sale successful: ${quantity} units sold for ${totalValue} CR`);
                
                // Show success notification
                this.showTradeNotification(`✅ Sold ${quantity} units of ${cargoItem.name} for ${totalValue.toLocaleString()} CR`, 'success');
                
                // TODO: Update station availability
            } else {
                debug('UI', '❌ Failed to add credits after successful cargo unload');
                this.showTradeNotification(`❌ Credit transaction failed`, 'error');
                return;
            }
            
            // Refresh displays
            this.refreshCargoDisplay();
            this.refreshMarketDisplay();
            
            // Send mission event if applicable  
            if (this.starfieldManager.missionEventService) {
                this.starfieldManager.missionEventService.cargoDelivered(
                    result.commodityId,  // cargoType
                    quantity,            // quantity  
                    this.currentStation, // delivery location
                    { 
                        integrity: result.integrity,
                        playerShip: this.starfieldManager.ship?.shipType || 'starter_ship',
                        source: 'market'  // Indicate this is a market sale
                    }
                );
            }
        } else {
debug('P1', `🏪 Sale failed: ${result.error}`);
            this.showTradeNotification(`Sale failed: ${result.error}`, 'error');
        }
    }
    
    /**
     * Get commodity data
     */
    getCommodityData(commodityId) {
        // Use ship's cargo manager for consistency
        const ship = this.starfieldManager.ship;
        if (ship && ship.cargoHoldManager) {
            return ship.cargoHoldManager.getCommodityData(commodityId);
        }
        
        // Fallback
        return {
            name: commodityId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            volume: 1,
            base_price: 10,
            legal_status: 'legal',
            special_requirements: []
        };
    }
    
    /**
     * Test commodity exchange (for debugging)
     */
    testExchange() {
debug('UI', '🏪 Testing commodity exchange...');
        
        this.show('terra_prime');
        
        // Test loading some cargo
        const ship = this.starfieldManager.ship;
        if (ship && ship.cargoHoldManager) {
            ship.cargoHoldManager.testCargoOperations();
            this.refreshCargoDisplay();
        }
    }
    
    /**
     * Add hover effects to buttons with consistent styling
     */
    addButtonHoverEffects(button, borderColor) {
        button.addEventListener('mouseenter', () => {
            if (borderColor === '#00ff41') {
                button.style.background = 'rgba(0, 255, 65, 0.2)';
                button.style.borderColor = '#44ff44';
            } else {
                button.style.background = 'rgba(136, 136, 136, 0.2)';
                button.style.borderColor = '#aaa';
            }
            button.style.transform = 'scale(1.05)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = 'rgba(0, 0, 0, 0.5)';
            button.style.borderColor = borderColor;
            button.style.transform = 'scale(1)';
        });
    }
    
    /**
     * Show in-game trade notification as centered modal popup
     * @param {string} message - The notification message
     * @param {string} type - Notification type ('info', 'success', 'error', 'warning')
     */
    showTradeNotification(message, type = 'info') {
        // Use centered modal popup for trading notifications
        // This ensures visibility over station interfaces and docking UI
        this.createTradingModal(message, type);
    }
    
    /**
     * Create centered modal popup for trading notifications
     * @param {string} message - The notification message  
     * @param {string} type - Notification type
     */
    createTradingModal(message, type) {
        // Remove any existing trading modal
        const existingModal = document.querySelector('.trading-notification-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const colors = {
            'info': '#00ff41',
            'success': '#44ff44', 
            'error': '#ff4444',
            'warning': '#ffff44'
        };
        
        const icons = {
            'info': 'ℹ️',
            'success': '✅', 
            'error': '❌',
            'warning': '⚠️'
        };
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'trading-notification-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 15000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.className = `trading-notification-content ${type}`;
        modal.style.cssText = `
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            border: 3px solid ${colors[type]};
            color: ${colors[type]};
            padding: 30px 40px;
            border-radius: 12px;
            font-family: 'VT323', monospace;
            font-size: 20px;
            text-align: center;
            max-width: 500px;
            min-width: 300px;
            box-shadow: 0 0 40px ${colors[type]}40, inset 0 0 20px rgba(0, 0, 0, 0.3);
            animation: scaleIn 0.3s ease;
            position: relative;
        `;
        
        // Create modal header with icon
        const header = document.createElement('div');
        header.style.cssText = `
            font-size: 24px;
            margin-bottom: 15px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        `;
        
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icons[type];
        iconSpan.style.fontSize = '28px';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = type.toUpperCase();
        
        header.appendChild(iconSpan);
        header.appendChild(titleSpan);
        
        // Create message content
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            font-size: 18px;
            line-height: 1.4;
            margin-bottom: 20px;
        `;
        messageDiv.textContent = message;
        
        // Create OK button
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid ${colors[type]};
            color: ${colors[type]};
            padding: 12px 24px;
            border-radius: 6px;
            font-family: 'VT323', monospace;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 80px;
        `;
        
        // Add hover effects to OK button
        okButton.addEventListener('mouseenter', () => {
            okButton.style.background = `${colors[type]}20`;
            okButton.style.transform = 'scale(1.05)';
        });
        
        okButton.addEventListener('mouseleave', () => {
            okButton.style.background = 'rgba(0, 0, 0, 0.6)';
            okButton.style.transform = 'scale(1)';
        });
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes scaleOut {
                from { transform: scale(1); opacity: 1; }
                to { transform: scale(0.8); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        this._styleElements.add(style);

        // Escape key handler - defined before closeModal so it can be referenced
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        // Track handler for cleanup
        this._activeEscapeHandlers.add(escapeHandler);

        // Close modal function - cleans up all resources
        const closeModal = () => {
            // Remove escape handler from document
            document.removeEventListener('keydown', escapeHandler);
            this._activeEscapeHandlers.delete(escapeHandler);

            // Remove style element
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
            this._styleElements.delete(style);

            // Animate and remove overlay
            overlay.style.animation = 'fadeOut 0.3s ease';
            modal.style.animation = 'scaleOut 0.3s ease';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        };

        // Event listeners
        okButton.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        document.addEventListener('keydown', escapeHandler);

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(messageDiv);
        modal.appendChild(okButton);
        overlay.appendChild(modal);

        // Add to DOM
        document.body.appendChild(overlay);

        // Auto-close after 5 seconds if user doesn't interact
        setTimeout(() => {
            if (overlay.parentNode) {
                closeModal();
            }
        }, 5000);

        // Focus the OK button for keyboard accessibility
        setTimeout(() => {
            okButton.focus();
        }, 100);
    }

    /**
     * Comprehensive cleanup of all resources
     */
    destroy() {
        debug('UI', '🏪 CommodityExchange: destroy() called - cleaning up all resources');

        // Remove any active escape handlers from document
        this._activeEscapeHandlers.forEach(handler => {
            document.removeEventListener('keydown', handler);
        });
        this._activeEscapeHandlers.clear();

        // Remove any style elements we added
        this._styleElements.forEach(style => {
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        });
        this._styleElements.clear();

        // Remove return button event listeners
        if (this._returnBtn) {
            if (this._boundHandlers.returnBtnClick) {
                this._returnBtn.removeEventListener('click', this._boundHandlers.returnBtnClick);
            }
            if (this._boundHandlers.returnBtnMouseEnter) {
                this._returnBtn.removeEventListener('mouseenter', this._boundHandlers.returnBtnMouseEnter);
            }
            if (this._boundHandlers.returnBtnMouseLeave) {
                this._returnBtn.removeEventListener('mouseleave', this._boundHandlers.returnBtnMouseLeave);
            }
            this._returnBtn = null;
        }

        // Clear bound handlers
        this._boundHandlers.returnBtnClick = null;
        this._boundHandlers.returnBtnMouseEnter = null;
        this._boundHandlers.returnBtnMouseLeave = null;

        // Remove any open trading modals
        const existingModal = document.querySelector('.trading-notification-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Remove container from DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;

        // Clear data structures
        this.marketData.clear();

        // Clear references
        this.starfieldManager = null;
        this.dockingInterface = null;
        this.currentStation = null;
        this.isVisible = false;

        debug('UI', '🏪 CommodityExchange: cleanup complete');
    }

    /**
     * Alias for destroy() for consistency with other UI components
     */
    dispose() {
        this.destroy();
    }
}
