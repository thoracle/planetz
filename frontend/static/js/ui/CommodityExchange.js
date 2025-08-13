/**
 * CommodityExchange - UI for buying and selling commodities at stations
 * Phase 1 Implementation: Basic buy/sell interface
 */

export class CommodityExchange {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.currentStation = null;
        this.marketData = new Map();
        this.container = null;
        this.dockingInterface = null; // Reference to return to docking
        
        console.log('🏪 CommodityExchange: Initialized');
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
        
        console.log(`🏪 CommodityExchange: Opened at ${stationKey}`);
    }
    
    /**
     * Hide commodity exchange interface
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.isVisible = false;
        
        console.log('🏪 CommodityExchange: Closed');
    }
    
    /**
     * Create the exchange UI
     */
    createExchangeUI() {
        this.container = document.createElement('div');
        this.container.className = 'commodity-exchange';
        this.container.style.cssText = `
            position: fixed;
            top: 5%;
            left: 5%;
            width: 90%;
            height: 90%;
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
                <h2 style="color: #00ff41; margin: 0 0 10px 0; font-size: 24px;">COMMODITY EXCHANGE</h2>
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
                    background: #0066cc;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-family: 'Courier New', monospace;
                    margin-left: 10px;
                ">RETURN TO DOCKING</button>
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
        returnBtn.addEventListener('click', () => {
            this.hide();
            if (this.dockingInterface) {
                this.dockingInterface.show(this.currentStation);
            }
        });
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
            'europa_station': {
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
            
            itemEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold;">${commodityData.name}</div>
                        <div style="color: #888; font-size: 12px;">Available: ${data.available} units</div>
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
        if (!ship || !ship.cargoHoldManager) return;
        
        const manifest = ship.cargoHoldManager.getCargoManifest();
        
        // Update capacity display
        const capacityEl = this.container.querySelector('#cargo-capacity');
        capacityEl.textContent = `${manifest.usedCapacity}/${manifest.totalCapacity}`;
        
        // Update credits display (mock for now)
        const creditsEl = this.container.querySelector('#player-credits');
        creditsEl.textContent = '15,000'; // TODO: Get from player data
        
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
            
            itemEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold;">${cargoItem.name}</div>
                        <div style="color: #888; font-size: 12px;">Hold ${cargoItem.holdSlot} • ${timeSinceLoaded}m ago</div>
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
                    <button id="confirm-buy" style="background: #006600; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        CONFIRM PURCHASE
                    </button>
                    <button id="cancel-transaction" style="background: #666; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
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
                    <button id="confirm-sell" style="background: #660000; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        CONFIRM SALE
                    </button>
                    <button id="cancel-transaction" style="background: #666; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
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
    }
    
    /**
     * Execute buy transaction
     */
    executeBuy(commodityId, quantity, unitPrice) {
        const ship = this.starfieldManager.ship;
        if (!ship.cargoHoldManager) return;
        
        const totalCost = quantity * unitPrice;
        console.log(`🏪 Buying ${quantity} units of ${commodityId} for ${totalCost} CR`);
        
        // Load cargo into ship
        const result = ship.cargoHoldManager.loadCargo(commodityId, quantity);
        
        if (result.success) {
            console.log(`✅ Purchase successful: ${quantity} units loaded`);
            
            // TODO: Deduct credits from player
            // TODO: Reduce station availability
            
            // Refresh displays
            this.refreshCargoDisplay();
            this.refreshMarketDisplay();
            
            // Send mission event if applicable
            if (this.starfieldManager.missionEventService) {
                this.starfieldManager.missionEventService.cargoLoaded(
                    commodityId, 
                    quantity, 
                    this.currentStation,
                    { playerShip: ship.shipType }
                );
            }
        } else {
            console.error(`❌ Purchase failed: ${result.error}`);
            alert(`Purchase failed: ${result.error}`);
        }
    }
    
    /**
     * Execute sell transaction
     */
    executeSell(cargoItem, quantity, unitPrice) {
        const ship = this.starfieldManager.ship;
        if (!ship.cargoHoldManager) return;
        
        const totalValue = quantity * unitPrice;
        console.log(`🏪 Selling ${quantity} units of ${cargoItem.commodityId} for ${totalValue} CR`);
        
        // Unload cargo from ship
        const result = ship.cargoHoldManager.unloadCargo(cargoItem.id, quantity);
        
        if (result.success) {
            console.log(`✅ Sale successful: ${quantity} units sold for ${totalValue} CR`);
            
            // TODO: Add credits to player
            // TODO: Update station availability
            
            // Refresh displays
            this.refreshCargoDisplay();
            this.refreshMarketDisplay();
            
            // Send mission event if applicable
            if (this.starfieldManager.missionEventService) {
                this.starfieldManager.missionEventService.cargoDelivered(
                    result.commodityId,
                    quantity,
                    this.currentStation,
                    { 
                        integrity: result.integrity,
                        playerShip: this.starfieldManager.ship?.shipType || 'starter_ship'
                    }
                );
            }
        } else {
            console.error(`❌ Sale failed: ${result.error}`);
            alert(`Sale failed: ${result.error}`);
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
        console.log('🏪 Testing commodity exchange...');
        
        this.show('terra_prime');
        
        // Test loading some cargo
        const ship = this.starfieldManager.ship;
        if (ship && ship.cargoHoldManager) {
            ship.cargoHoldManager.testCargoOperations();
            this.refreshCargoDisplay();
        }
    }
}
