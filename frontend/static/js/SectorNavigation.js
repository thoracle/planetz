import * as THREE from 'three';
import WarpFeedback from './WarpFeedback.js';

class SectorNavigation {
    constructor(scene, camera, warpDrive) {
        this.scene = scene;
        this.camera = camera;
        this.warpDrive = warpDrive;
        this.viewManager = warpDrive.viewManager; // Get ViewManager from WarpDrive
        
        // Navigation properties
        this.currentSector = 'A0';
        this.targetSector = null;
        this.isNavigating = false;
        this.navigationProgress = 0;
        
        // Sector size and grid properties
        this.SECTOR_SIZE = 100000;
        this.GRID_ROWS = 10; // A-J
        this.GRID_COLS = 9;  // 0-8
        
        // Navigation timing
        this.warpDuration = 5000; // 5 seconds
        this.startTime = 0;
        
        // Position tracking
        this.startPosition = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        
        // Initialize navigation feedback
        this.feedback = new WarpFeedback();
    }

    /**
     * Calculate sector coordinates from position
     * @param {THREE.Vector3} position - Current position
     * @returns {string} Sector coordinate (e.g., 'A0', 'B1')
     */
    calculateSectorFromPosition(position) {
        const x = Math.floor(position.x / this.SECTOR_SIZE);
        const z = Math.floor(position.z / this.SECTOR_SIZE);
        
        // Convert to sector notation (A0-J8)
        const col = Math.max(0, Math.min(8, x + 4)); // +4 to center around origin
        const row = Math.max(0, Math.min(9, z + 5)); // +5 to center around origin
        const rowLetter = String.fromCharCode(65 + row); // 65 is ASCII for 'A'
        
        return `${rowLetter}${col}`;
    }

    /**
     * Calculate position from sector coordinates
     * @param {string} sector - Sector coordinate (e.g., 'A0', 'B1')
     * @returns {THREE.Vector3} Center position of the sector
     */
    calculatePositionFromSector(sector) {
        const row = sector.charCodeAt(0) - 65; // Convert A-J to 0-9
        const col = parseInt(sector[1]);
        
        // Convert to world coordinates
        const x = (col - 4) * this.SECTOR_SIZE;
        const z = (row - 5) * this.SECTOR_SIZE;
        
        return new THREE.Vector3(x, 0, z);
    }

    /**
     * Calculate Manhattan distance between sectors
     * @param {string} sector1 - First sector coordinate
     * @param {string} sector2 - Second sector coordinate
     * @returns {number} Manhattan distance
     */
    calculateSectorDistance(sector1, sector2) {
        const row1 = sector1.charCodeAt(0) - 65;
        const col1 = parseInt(sector1[1]);
        const row2 = sector2.charCodeAt(0) - 65;
        const col2 = parseInt(sector2[1]);
        
        return Math.abs(row2 - row1) + Math.abs(col2 - col1);
    }

    /**
     * Calculate required energy for sector navigation
     * @param {string} fromSector - Starting sector
     * @param {string} toSector - Target sector
     * @returns {number} Required energy
     */
    calculateRequiredEnergy(fromSector, toSector) {
        const fromRow = fromSector.charCodeAt(0) - 65;
        const fromCol = parseInt(fromSector[1]);
        const toRow = toSector.charCodeAt(0) - 65;
        const toCol = parseInt(toSector[1]);
        
        const distance = Math.abs(toRow - fromRow) + Math.abs(toCol - fromCol);
        return Math.pow(distance, 2) * 50;
    }

    /**
     * Start navigation to a target sector
     * @param {string} targetSector - Target sector coordinate
     * @returns {boolean} True if navigation started successfully
     */
    startNavigation(targetSector) {
        console.log('Starting navigation sequence:', {
            from: this.currentSector,
            to: targetSector,
            isNavigating: this.isNavigating
        });

        if (this.isNavigating) {
            console.warn('Navigation already in progress');
            this.feedback.showWarning(
                'Navigation in Progress',
                'Cannot start new navigation while already navigating.',
                () => this.feedback.hideAll()
            );
            return false;
        }

        if (targetSector === this.currentSector) {
            console.warn('Attempted to navigate to current sector:', targetSector);
            this.feedback.showWarning(
                'Invalid Destination',
                'Cannot navigate to current sector.',
                () => this.feedback.hideAll()
            );
            return false;
        }

        const requiredEnergy = this.calculateRequiredEnergy(this.currentSector, targetSector);
        console.log('Energy check:', {
            required: requiredEnergy,
            available: this.viewManager.getShipEnergy()
        });

        if (requiredEnergy > this.viewManager.getShipEnergy()) {
            console.warn('Insufficient energy for navigation:', {
                required: requiredEnergy,
                available: this.viewManager.getShipEnergy()
            });
            this.feedback.showWarning(
                'Insufficient Energy',
                `Navigation to ${targetSector} requires ${requiredEnergy} energy units.`,
                () => this.feedback.hideAll()
            );
            return false;
        }

        console.log('Energy check passed, proceeding with navigation');

        // Clear target computer and old system after energy check but before warp
        if (this.viewManager.starfieldManager) {
            console.log('Clearing target computer');
            this.viewManager.starfieldManager.clearTargetComputer();
        }
        
        // Clear the old system now that we know we have enough energy
        if (this.viewManager.solarSystemManager) {
            console.log('Clearing old star system:', {
                sector: this.currentSector,
                timestamp: new Date().toISOString()
            });
            this.viewManager.solarSystemManager.clearSystem();
        }

        this.targetSector = targetSector;
        this.isNavigating = true;
        this.navigationProgress = 0;
        this.startTime = Date.now();
        
        // Store start position and calculate target position
        this.startPosition.copy(this.camera.position);
        this.targetPosition = this.calculatePositionFromSector(targetSector);
        
        console.log('Navigation parameters set:', {
            startPosition: this.startPosition.toArray(),
            targetPosition: this.targetPosition.toArray(),
            startTime: this.startTime
        });
        
        // Activate warp drive
        if (!this.warpDrive.activate()) {
            console.log('Failed to activate warp drive');
            this.isNavigating = false;
            return false;
        }

        // Change view to FORE when entering warp
        if (this.viewManager && this.viewManager.starfieldManager) {
            this.viewManager.starfieldManager.setView('FORE');
        }

        console.log('Warp drive activated, starting navigation');
        // Show initial progress
        this.feedback.showAll();
        this.feedback.updateProgress(0, 'Warp Navigation');
        return true;
    }

    /**
     * Update navigation state
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isNavigating) return;

        const elapsedTime = Date.now() - this.startTime;
        this.navigationProgress = Math.min(1, elapsedTime / this.warpDuration);

        if (this.navigationProgress >= 1) {
            this.completeNavigation();
            return;
        }

        // Update position using smooth interpolation
        const progress = this.warpDrive.accelerationCurve.getPoint(this.navigationProgress);
        this.camera.position.lerpVectors(
            this.startPosition,
            this.targetPosition,
            progress.y
        );

        // Update feedback with progress percentage
        const progressPercentage = Math.round(this.navigationProgress * 100);
        this.feedback.updateProgress(
            progressPercentage,
            'Warp Navigation'
        );
    }

    /**
     * Complete the navigation sequence
     */
    completeNavigation() {
        console.log('Completing navigation sequence:', {
            oldSector: this.currentSector,
            newSector: this.targetSector,
            timestamp: new Date().toISOString()
        });

        // Update sector and position first
        this.currentSector = this.targetSector;
        this.targetSector = null;
        
        // Ensure we're exactly at the target position
        this.camera.position.copy(this.targetPosition);
        
        // Update the ship's location in the galactic chart
        const row = this.currentSector.charCodeAt(0) - 65; // Convert A-J to 0-9
        const col = parseInt(this.currentSector[1]);
        const systemIndex = row * 9 + col;
        
        console.log('Updating galactic chart:', {
            sector: this.currentSector,
            systemIndex: systemIndex
        });
        
        if (this.viewManager && this.viewManager.galacticChart) {
            this.viewManager.galacticChart.setShipLocation(systemIndex);
        }
        
        // Hide feedback elements before deactivating warp
        this.feedback.hideAll();
        
        // Deactivate warp drive
        console.log('Deactivating warp drive');
        this.warpDrive.deactivate();
        
        // Only set isNavigating to false after warp drive is deactivated
        // This ensures handleWarpEnd can generate the new system
        this.isNavigating = false;
    }

    /**
     * Get current navigation status
     * @returns {Object} Navigation status
     */
    getStatus() {
        return {
            currentSector: this.currentSector,
            targetSector: this.targetSector,
            isNavigating: this.isNavigating,
            navigationProgress: this.navigationProgress
        };
    }
}

export default SectorNavigation; 