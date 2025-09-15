import { debug } from '../debug.js';

/**
 * NavigationSystemManager - Dual system architecture with fallback
 * 
 * This class manages the transition between Long Range Scanner and Star Charts:
 * - Configuration-driven system selection
 * - Graceful fallback mechanisms
 * - Error handling and recovery
 * - Performance monitoring
 * - Seamless user experience
 * 
 * Phase 0 Implementation: A0 sector with LRS fallback
 */

import { LongRangeScanner } from './LongRangeScanner.js';
import { StarChartsManager } from './StarChartsManager.js';
import { createStarChartsTargetComputerIntegration } from './StarChartsTargetComputerIntegration.js';
import { StarChartsUI } from './StarChartsUI.js';

export class NavigationSystemManager {
    constructor(viewManager, scene, camera, solarSystemManager, targetComputerManager) {
        this.viewManager = viewManager;
        this.scene = scene;
        this.camera = camera;
        this.solarSystemManager = solarSystemManager;
        this.targetComputerManager = targetComputerManager;
        
        // System configuration
        this.config = {
            starCharts: {
                enabled: true,
                fallbackToLRS: true,
                sectors: ['A0'], // Phase 0: A0 only
                performanceMonitoring: true
            },
            longRangeScanner: {
                alwaysAvailable: true,
                deprecationWarning: false
            }
        };
        
        // System state
        this.activeSystem = 'star_charts';
        this.fallbackSystem = 'long_range_scanner';
        this.systemHealth = {
            starCharts: 'unknown',
            longRangeScanner: 'healthy'
        };
        
        // Performance monitoring
        this.performanceMetrics = {
            systemSwitches: 0,
            fallbackActivations: 0,
            errorCount: 0,
            lastHealthCheck: 0
        };
        
        // Initialize systems
        this.initializeSystems();
    }
    
    async initializeSystems() {
        // Initialize both navigation systems
        
debug('NAVIGATION', 'NavigationSystemManager: Initializing dual system architecture...');
        
        try {
            // Initialize Long Range Scanner (always available)
            this.longRangeScanner = new LongRangeScanner(this.viewManager);
            this.systemHealth.longRangeScanner = 'healthy';
debug('UTILITY', '✅ Long Range Scanner: Initialized successfully');
            
            // Initialize Star Charts system
            if (this.config.starCharts.enabled) {
                await this.initializeStarCharts();
            }
            
            // Set up health monitoring
            this.startHealthMonitoring();
            
debug('NAVIGATION', `🧭 NavigationSystemManager: Active system is ${this.activeSystem}`);
            
        } catch (error) {
            console.error('❌ NavigationSystemManager: Initialization failed:', error);
            this.handleSystemFailure('star_charts', error);
        }
    }
    
    async initializeStarCharts() {
        // Initialize Star Charts system with error handling
        
        try {
            // Create Star Charts Manager
            this.starChartsManager = new StarChartsManager(
                this.scene,
                this.camera,
                this.viewManager,
                this.solarSystemManager,
                this.targetComputerManager
            );
            
            // Wait for initialization
            await this.starChartsManager.initialize();

            // Initialize Star Charts ↔ Target Computer Integration
            this.initializeStarChartsIntegration();

            // Create Star Charts UI
            this.starChartsUI = new StarChartsUI(this.viewManager, this.starChartsManager);
            
            this.systemHealth.starCharts = 'healthy';
debug('UTILITY', '✅ Star Charts: Initialized successfully');
            
        } catch (error) {
            console.error('❌ Star Charts: Initialization failed:', error);
            this.systemHealth.starCharts = 'failed';
            
            if (this.config.starCharts.fallbackToLRS) {
                this.activateFallback(error);
            } else {
                throw error;
            }
        }
    }

    initializeStarChartsIntegration() {
        // Initialize Star Charts ↔ Target Computer Integration
        try {
            this.starChartsIntegration = createStarChartsTargetComputerIntegration(
                this.starChartsManager,
                this.targetComputerManager,
                this.solarSystemManager
            );

debug('TARGETING', 'Star Charts ↔ Target Computer Integration initialized');
        } catch (error) {
            console.error('❌ Star Charts Integration initialization failed:', error);
        }
    }

    startHealthMonitoring() {
        // Start periodic health monitoring
        
        const healthCheck = () => {
            this.performHealthCheck();
            setTimeout(healthCheck, 30000); // Check every 30 seconds
        };
        
        healthCheck();
    }
    
    performHealthCheck() {
        // Perform health check on active systems
        
        const now = Date.now();
        this.performanceMetrics.lastHealthCheck = now;
        
        // Check Star Charts health
        if (this.starChartsManager && this.config.starCharts.enabled) {
            try {
                const metrics = this.starChartsManager.getPerformanceMetrics();
                
                // Check for performance issues
                if (metrics.averageDiscoveryCheckTime > 20) {
                    console.warn('⚠️  Star Charts: Performance degradation detected');
                    this.systemHealth.starCharts = 'degraded';
                } else if (metrics.averageDiscoveryCheckTime > 50) {
                    console.error('❌ Star Charts: Severe performance issues');
                    this.systemHealth.starCharts = 'critical';
                    this.handleSystemFailure('star_charts', new Error('Performance critical'));
                } else {
                    this.systemHealth.starCharts = 'healthy';
                }
                
            } catch (error) {
                console.error('❌ Star Charts: Health check failed:', error);
                this.systemHealth.starCharts = 'failed';
                this.handleSystemFailure('star_charts', error);
            }
        }
        
        // Log health status
        if (this.config.starCharts.performanceMonitoring) {
debug('UTILITY', `🏥 System Health: Star Charts: ${this.systemHealth.starCharts}, LRS: ${this.systemHealth.longRangeScanner}`);
        }
    }
    
    handleSystemFailure(systemName, error) {
        // Handle system failure with fallback
        
        console.error(`❌ ${systemName} system failure:`, error);
        this.performanceMetrics.errorCount++;
        
        if (systemName === 'star_charts' && this.config.starCharts.fallbackToLRS) {
            this.activateFallback(error);
        }
    }
    
    activateFallback(error) {
        // Activate fallback to Long Range Scanner
        
debug('UTILITY', '🔄 Activating fallback to Long Range Scanner');
        
        this.activeSystem = this.fallbackSystem;
        this.performanceMetrics.fallbackActivations++;
        
        // Show user notification
        this.showFallbackNotification(error);
        
        // Disable Star Charts
        if (this.starChartsManager) {
            this.starChartsManager.config.enabled = false;
        }
    }
    
    showFallbackNotification(error) {
        // Show user notification about fallback activation
        
        const notification = document.createElement('div');
        notification.className = 'navigation-fallback-notification';
        notification.innerHTML = `
            <div style="color: #ffaa00; font-weight: bold;">⚠️ Navigation System Notice</div>
            <div>Star Charts temporarily unavailable</div>
            <div>Using Long Range Scanner</div>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(255, 170, 0, 0.9)',
            color: '#000',
            padding: '15px',
            borderRadius: '5px',
            fontSize: '14px',
            zIndex: '10001',
            maxWidth: '300px'
        });
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    // Public API for navigation
    
    showNavigationInterface() {
        // Show the active navigation interface
        
        try {
            if (this.activeSystem === 'star_charts' && this.starChartsUI && this.systemHealth.starCharts === 'healthy') {
                this.starChartsUI.show();
debug('UI', 'Showing Star Charts interface');
            } else {
                this.longRangeScanner.show();
debug('UI', 'Showing Long Range Scanner interface');
            }
        } catch (error) {
            console.error('❌ Failed to show navigation interface:', error);
            
            // Emergency fallback
            if (this.longRangeScanner) {
                this.longRangeScanner.show();
debug('UTILITY', '🚨 Emergency fallback to Long Range Scanner');
            }
        }
    }
    
    hideNavigationInterface() {
        // Hide the active navigation interface
        
        try {
            if (this.starChartsUI && this.starChartsUI.isVisible()) {
                this.starChartsUI.hide();
            }
            
            if (this.longRangeScanner && this.longRangeScanner.isVisible()) {
                this.longRangeScanner.hide();
            }
        } catch (error) {
            console.error('❌ Failed to hide navigation interface:', error);
        }
    }
    
    isNavigationVisible() {
        // Check if any navigation interface is visible
        
        try {
            return (this.starChartsUI && this.starChartsUI.isVisible()) ||
                   (this.longRangeScanner && this.longRangeScanner.isVisible());
        } catch (error) {
            console.error('❌ Failed to check navigation visibility:', error);
            return false;
        }
    }
    
    toggleNavigationSystem() {
        // Toggle between Star Charts and Long Range Scanner (if both available)
        
        if (this.systemHealth.starCharts === 'healthy' && this.starChartsManager && this.starChartsManager.isEnabled()) {
            if (this.activeSystem === 'star_charts') {
                this.switchToSystem('long_range_scanner');
            } else {
                this.switchToSystem('star_charts');
            }
        } else {
debug('AI', '🔄 Star Charts not available, using Long Range Scanner');
        }
    }
    
    switchToSystem(systemName) {
        // Switch to specified navigation system
        
        if (systemName === this.activeSystem) {
            return; // Already active
        }
        
debug('NAVIGATION', `🔄 Switching navigation system: ${this.activeSystem} → ${systemName}`);
        
        // Hide current interface
        this.hideNavigationInterface();
        
        // Switch system
        this.activeSystem = systemName;
        this.performanceMetrics.systemSwitches++;
        
        // Show new interface
        this.showNavigationInterface();
    }
    
    // System information and diagnostics
    
    getSystemStatus() {
        // Get current system status
        
        return {
            activeSystem: this.activeSystem,
            systemHealth: this.systemHealth,
            performanceMetrics: this.performanceMetrics,
            config: this.config,
            starChartsAvailable: this.systemHealth.starCharts === 'healthy' && 
                                this.starChartsManager && 
                                this.starChartsManager.isEnabled(),
            longRangeScannerAvailable: this.systemHealth.longRangeScanner === 'healthy'
        };
    }
    
    getPerformanceReport() {
        // Get comprehensive performance report
        
        const report = {
            navigationSystem: this.getSystemStatus(),
            starCharts: null,
            longRangeScanner: {
                status: 'available',
                health: this.systemHealth.longRangeScanner
            }
        };
        
        if (this.starChartsManager) {
            report.starCharts = this.starChartsManager.getPerformanceMetrics();
        }
        
        return report;
    }
    
    logPerformanceReport() {
        // Log comprehensive performance report
        
        const report = this.getPerformanceReport();
        
debug('NAVIGATION', '📊 Navigation System Performance Report:');
debug('NAVIGATION', `   - Active System: ${report.navigationSystem.activeSystem}`);
debug('NAVIGATION', `   - System Switches: ${report.navigationSystem.performanceMetrics.systemSwitches}`);
debug('NAVIGATION', `   - Fallback Activations: ${report.navigationSystem.performanceMetrics.fallbackActivations}`);
debug('P1', `   - Error Count: ${report.navigationSystem.performanceMetrics.errorCount}`);
        
        if (report.starCharts) {
debug('UTILITY', '   - Star Charts:');
debug('UTILITY', `     • Average discovery check: ${report.starCharts.averageDiscoveryCheckTime.toFixed(2)}ms`);
debug('UTILITY', `     • Total discoveries: ${report.starCharts.totalDiscoveries}`);
debug('UTILITY', `     • Discovered objects: ${report.starCharts.discoveredObjectsCount}`);
        }
        
        if (this.starChartsManager) {
            this.starChartsManager.logPerformanceReport();
        }
    }
    
    // Configuration management
    
    updateConfig(newConfig) {
        // Update system configuration
        
        this.config = { ...this.config, ...newConfig };
        
        // Apply configuration changes
        if (this.starChartsManager) {
            this.starChartsManager.config = { ...this.starChartsManager.config, ...newConfig.starCharts };
        }
    }
    
    // Emergency functions
    
    emergencyReset() {
        // Emergency reset to Long Range Scanner
        
debug('NAVIGATION', '🚨 Emergency navigation system reset');
        
        this.activeSystem = 'long_range_scanner';
        this.systemHealth.starCharts = 'disabled';
        
        if (this.starChartsManager) {
            this.starChartsManager.config.enabled = false;
        }
        
        // Hide any open interfaces
        this.hideNavigationInterface();
        
        // Show LRS
        if (this.longRangeScanner) {
            this.longRangeScanner.show();
        }
    }
    
    // Cleanup
    
    destroy() {
        // Clean up navigation systems
        
debug('NAVIGATION', 'NavigationSystemManager: Cleaning up...');
        
        if (this.starChartsUI) {
            this.starChartsUI.hide();
        }
        
        if (this.longRangeScanner) {
            this.longRangeScanner.hide();
        }
    }
}
