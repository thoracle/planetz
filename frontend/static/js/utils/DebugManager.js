/**
 * DebugManager - Smart Debug Logging System
 *
 * Provides channel-based debug logging with external configuration
 * Features:
 * - Channel toggling via JSON config
 * - Performance optimization (early returns when disabled)
 * - Special P1 channel for critical debugging (always enabled)
 * - Runtime configuration updates
 * - Statistics tracking
 */

export class SmartDebugManager {
    constructor() {
        this.channels = {};
        this.config = {};
        this.stats = {};
        this.configFile = 'debug-config.json';

        // Channel to icon mapping for clean output
        this.channelIcons = {
            'TARGETING': '🎯',
            'STAR_CHARTS': '🗺️',
            'INSPECTION': '🔍',
            'COMMUNICATION': '🗣️',
            'UTILITY': '🔧',
            'AI': '🤖',
            'INTERACTION': '👆',
            'MISSIONS': '🚀',
            'COMBAT': '⚔️',
            'NAVIGATION': '🧭',
            'SCANNER': '📡',
            'RADAR': '📡',
            'ECONOMY': '💰',
            'MONEY': '💵',
            'INFRASTRUCTURE': '🏗️',
            'TESTING': '🧪',
            'STATUS': '📊',
            'P1': '🔴'
        };

        // Load config asynchronously
        this.loadConfig().then(() => {
            console.log('🔧 DebugManager: Configuration loaded successfully');
        }).catch(error => {
            console.error('🔧 DebugManager: Failed to load configuration:', error);
        });
        this.setupGlobalAccess();
        this.setupBrowserCommands();
    }

    /**
     * Load configuration from file, localStorage, or create default
     */
    async loadConfig() {
        try {
            // Try to load from file first (prioritize persistent config)
            let configLoaded = false;

            // Always try file config first (don't check global settings before loading)
            configLoaded = await this.loadConfigFromFile();

            // Fallback to localStorage if file loading failed
            if (!configLoaded) {
                const configText = localStorage.getItem('debug_config');
                if (configText) {
                    this.config = JSON.parse(configText);
                    console.log('🔧 DebugManager: Loaded configuration from localStorage');
                    configLoaded = true;
                }
            }

            // Create default if nothing loaded
            if (!configLoaded) {
                this.config = this.getDefaultConfig();
                this.saveConfig();
                console.log('🔧 DebugManager: Created default configuration');
            }

            this.updateChannelStates();
        } catch (error) {
            console.error('🔧 DebugManager: Failed to load config:', error);
            this.config = this.getDefaultConfig();
        }
    }

    /**
     * Load configuration from file
     */
    async loadConfigFromFile() {
        try {
            const response = await fetch('/static/js/debug-config.json');
            if (response.ok) {
                const fileConfig = await response.json();
                this.config = fileConfig;
                console.log('🔧 DebugManager: Loaded configuration from file');
                return true;
            } else {
                console.log('🔧 DebugManager: Debug config file not found, will use localStorage');
                return false;
            }
        } catch (error) {
            console.log('🔧 DebugManager: Could not load file config, will use localStorage');
            return false;
        }
    }

    /**
     * Save configuration to both file and localStorage
     */
    async saveConfig() {
        try {
            this.config.lastModified = new Date().toISOString();

            // Save to localStorage if enabled
            if (this.config.global?.useLocalStorage !== false) {
                localStorage.setItem('debug_config', JSON.stringify(this.config));
            }

            // Save to file if enabled (try server API)
            if (this.config.global?.useFileConfig !== false) {
                await this.saveConfigToFile();
            }
        } catch (error) {
            console.error('🔧 DebugManager: Failed to save config:', error);
        }
    }

    /**
     * Save configuration to file via server API
     */
    async saveConfigToFile() {
        try {
            const response = await fetch('/api/debug-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.config)
            });

            if (response.ok) {
                console.log('🔧 DebugManager: Configuration saved to file successfully');
            } else {
                console.log('🔧 DebugManager: File saving failed (server API not available), config saved to localStorage only');
            }
        } catch (error) {
            console.log('🔧 DebugManager: File saving failed (server API not available), config saved to localStorage only');
        }
    }

    /**
     * Get default configuration with all channels defined
     */
    getDefaultConfig() {
        return {
            version: "1.0",
            lastModified: new Date().toISOString(),
            channels: {
                "TARGETING": {
                    enabled: true,
                    description: "Target acquisition and management"
                },
                "STAR_CHARTS": {
                    enabled: true,
                    description: "Star Charts navigation and UI"
                },
                "INSPECTION": {
                    enabled: false,
                    description: "Click detection and object inspection"
                },
                "COMMUNICATION": {
                    enabled: false,
                    description: "NPC and player communication"
                },
                "UTILITY": {
                    enabled: false,
                    description: "System utilities and positioning"
                },
                "AI": {
                    enabled: false,
                    description: "Enemy AI and ship behaviors"
                },
                "INTERACTION": {
                    enabled: false,
                    description: "Touch and mouse interactions"
                },
                "MISSIONS": {
                    enabled: true,
                    description: "Mission system operations"
                },
                "COMBAT": {
                    enabled: false,
                    description: "Combat mechanics and AI"
                },
                "NAVIGATION": {
                    enabled: false,
                    description: "Navigation and movement systems"
                },
                "SCANNER": {
                    enabled: false,
                    description: "Long range scanner operations"
                },
                "RADAR": {
                    enabled: false,
                    description: "Radar and proximity detector systems"
                },
                "ECONOMY": {
                    enabled: false,
                    description: "Trading and economy systems"
                },
                "MONEY": {
                    enabled: true,
                    description: "Credits and money transactions"
                },
                "INFRASTRUCTURE": {
                    enabled: false,
                    description: "Space stations and facilities"
                },
                "TESTING": {
                    enabled: false,
                    description: "Test functions and debugging helpers"
                },
                "STATUS": {
                    enabled: false,
                    description: "System status messages and connection tests"
                },
                "P1": {
                    enabled: false,
                    description: "HIGH PRIORITY - Critical debugging",
                    alwaysEnabled: false
                }
            },
            global: {
                enabled: true,
                timestamp: false,
                maxHistory: 1000
            }
        };
    }

    /**
     * Update channel states from configuration
     */
    updateChannelStates() {
        this.channels = {};
        for (const [channel, config] of Object.entries(this.config.channels)) {
            this.channels[channel] = {
                enabled: config.enabled,
                alwaysEnabled: config.alwaysEnabled || false
            };
        }
    }

    /**
     * Main debug logging method
     * @param {string} channel - Debug channel (e.g., 'TARGETING')
     * @param {string} message - Debug message
     */
    debug(channel, message) {
        // Early return for performance if channel is disabled
        if (!this.channels[channel]?.enabled && !this.channels[channel]?.alwaysEnabled) {
            return;
        }

        // Update statistics
        this.stats[channel] = (this.stats[channel] || 0) + 1;

        // Format and output
        const formattedMessage = this.formatMessage(channel, message);
        console.log(formattedMessage);
    }

    /**
     * Format debug message with channel and optional timestamp
     */
    formatMessage(channel, message) {
        // Get the icon for this channel
        const icon = this.channelIcons[channel] || '🔧'; // Default to utility icon

        if (this.config.global.timestamp) {
            const timestamp = new Date().toLocaleTimeString();
            return `[${timestamp}] ${icon} ${channel}: ${message}`;
        }
        return `${icon} ${channel}: ${message}`;
    }

    /**
     * Toggle a specific channel on/off
     * @param {string} channel - Channel to toggle
     * @param {boolean} enabled - Optional: set specific state
     */
    toggleChannel(channel, enabled = null) {
        if (!this.config.channels[channel]) {
            console.warn(`🔧 DebugManager: Unknown channel '${channel}'. Available channels:`, Object.keys(this.config.channels));
            return false;
        }

        // Allow toggling P1 channel (previously was always enabled)

        const newState = enabled !== null ? enabled : !this.channels[channel].enabled;
        this.channels[channel].enabled = newState;
        this.config.channels[channel].enabled = newState;
        this.saveConfig();

        console.log(`🔧 DebugManager: ${channel} ${newState ? 'ENABLED' : 'DISABLED'}`);
        return true;
    }

    /**
     * Enable a specific channel
     * @param {string} channel - Channel to enable
     */
    enableChannel(channel) {
        return this.toggleChannel(channel, true);
    }

    /**
     * Disable a specific channel
     * @param {string} channel - Channel to disable
     */
    disableChannel(channel) {
        return this.toggleChannel(channel, false);
    }

    /**
     * Get channel statistics
     */
    getChannelStats() {
        return { ...this.stats };
    }

    /**
     * Get current channel states
     */
    getChannelStates() {
        const states = {};
        for (const [channel, state] of Object.entries(this.channels)) {
            states[channel] = state.enabled;
        }
        return states;
    }

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            this.config.lastModified = new Date().toISOString();
            localStorage.setItem('debug_config', JSON.stringify(this.config));
        } catch (error) {
            console.error('🔧 DebugManager: Failed to save config:', error);
        }
    }

    /**
     * Reset configuration to defaults
     */
    resetConfig() {
        this.config = this.getDefaultConfig();
        this.updateChannelStates();
        this.saveConfig();
        console.log('🔧 DebugManager: Configuration reset to defaults');
    }

    /**
     * Setup global access (called from app.js)
     */
    setupGlobalAccess() {
        // Expose the SmartDebugManager instance globally
        window.smartDebugManager = this;

        // Make debug function globally available immediately
        if (typeof window !== 'undefined') {
            window.debug = (channel, message) => this.debug(channel, message);
        }
    }

    /**
     * Setup browser console commands for runtime management
     */
    setupBrowserCommands() {
        // Add convenience functions to window for console debugging
        window.debugToggle = (channel, enabled) => this.toggleChannel(channel, enabled);
        window.debugEnable = (channel) => this.enableChannel(channel);
        window.debugDisable = (channel) => this.disableChannel(channel);
        window.debugStats = () => this.getChannelStats();
        window.debugStates = () => this.getChannelStates();
        window.debugReset = () => this.resetConfig();
        window.debugList = () => {
            console.log('🔧 Available Debug Channels:');
            Object.entries(this.config.channels).forEach(([channel, config]) => {
                const status = this.channels[channel]?.enabled ? '✅' : '❌';
                console.log(`  ${status} ${channel} - ${config.description}`);
            });
        };

        // File-based configuration commands
        window.debugLoadFile = () => {
            console.log('🔄 Loading configuration from file...');
            return this.loadConfigFromFile().then(success => {
                if (success) {
                    console.log('✅ File configuration loaded successfully');
                    this.updateChannelStates();
                } else {
                    console.log('❌ Failed to load file configuration');
                }
            });
        };

        window.debugSaveFile = () => {
            console.log('💾 File saving requires server API - config saved to localStorage');
            console.log('To persist changes, edit: /static/js/debug-config.json');
        };

        window.debugConfigFile = () => {
            console.log('📁 Debug Configuration File:');
            console.log('Location: /static/js/debug-config.json');
            console.log('URL: http://127.0.0.1:5001/static/js/debug-config.json');
            console.log('Edit this file to persist debug settings between browser sessions');
            console.log('');
            console.log('Current file config:');
            console.log(JSON.stringify(this.config, null, 2));
        };

        window.debugSyncFile = () => {
            console.log('🔄 Syncing with file configuration...');
            return this.loadConfigFromFile().then(success => {
                if (success) {
                    console.log('✅ Synced with file configuration');
                    this.updateChannelStates();
                } else {
                    console.log('❌ Failed to sync with file');
                }
            });
        };

        console.log('🔧 DebugManager: File-based commands available:');
        console.log('  debugLoadFile()   - Load from /data/debug-config.json');
        console.log('  debugSaveFile()   - Save to file (localStorage for now)');
        console.log('  debugConfigFile() - Show file location and current config');
        console.log('  debugSyncFile()   - Sync browser config with file');
    }

    /**
     * Export configuration as JSON string
     */
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import configuration from JSON string
     */
    importConfig(jsonString) {
        try {
            const newConfig = JSON.parse(jsonString);
            if (this.validateConfig(newConfig)) {
                this.config = newConfig;
                this.updateChannelStates();
                this.saveConfig();
                console.log('🔧 DebugManager: Configuration imported successfully');
                return true;
            } else {
                console.error('🔧 DebugManager: Invalid configuration format');
                return false;
            }
        } catch (error) {
            console.error('🔧 DebugManager: Failed to import config:', error);
            return false;
        }
    }

    /**
     * Validate configuration structure
     */
    validateConfig(config) {
        return config &&
               typeof config === 'object' &&
               config.channels &&
               typeof config.channels === 'object' &&
               config.global &&
               typeof config.global === 'object';
    }
}
