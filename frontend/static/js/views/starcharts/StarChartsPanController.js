/**
 * StarChartsPanController
 *
 * Extracted from StarChartsUI to reduce file size.
 * Handles pan/drag functionality for the Star Charts interface.
 *
 * Features:
 * - Mouse drag panning
 * - Two-finger touch drag panning
 * - Screen-to-world coordinate conversion
 */

import { debug } from '../../debug.js';

export class StarChartsPanController {
    /**
     * Create a StarChartsPanController
     * @param {Object} starChartsUI - Reference to parent StarChartsUI
     */
    constructor(starChartsUI) {
        this.ui = starChartsUI;

        // Pan state
        this.panState = {
            isDragging: false,
            isTouchDragging: false,
            lastMousePos: { x: 0, y: 0 },
            lastTouchCenter: { x: 0, y: 0 },
            startCenter: { x: 0, y: 0 }
        };

        // Bound event handlers for cleanup
        this._boundMouseDownHandler = null;
        this._boundDocMouseMoveHandler = null;
        this._boundDocMouseUpHandler = null;
        this._boundTouchStartHandler = null;
        this._boundTouchMoveHandler = null;
        this._boundTouchEndHandler = null;
    }

    /**
     * Set up pan controls on the SVG element
     */
    setupPanControls() {
        // Mouse drag events
        this._boundMouseDownHandler = (event) => {
            // Only start drag on primary button (left click)
            if (event.button === 0) {
                this.startMouseDrag(event);
            }
        };
        this.ui.svg.addEventListener('mousedown', this._boundMouseDownHandler);

        this._boundDocMouseMoveHandler = (event) => {
            if (this.panState.isDragging) {
                this.handleMouseDrag(event);
            }
        };
        document.addEventListener('mousemove', this._boundDocMouseMoveHandler);

        this._boundDocMouseUpHandler = (event) => {
            if (this.panState.isDragging) {
                this.endMouseDrag(event);
            }
        };
        document.addEventListener('mouseup', this._boundDocMouseUpHandler);

        // Touch drag events (two-finger drag)
        this._boundTouchStartHandler = (event) => {
            if (event.touches.length === 2) {
                this.startTouchDrag(event);
                event.preventDefault();
            }
        };
        this.ui.svg.addEventListener('touchstart', this._boundTouchStartHandler, { passive: false });

        this._boundTouchMoveHandler = (event) => {
            if (event.touches.length === 2) {
                if (this.panState.isTouchDragging) {
                    this.handleTouchDrag(event);
                }
                event.preventDefault();
            }
        };
        this.ui.svg.addEventListener('touchmove', this._boundTouchMoveHandler, { passive: false });

        this._boundTouchEndHandler = (event) => {
            if (this.panState.isTouchDragging) {
                this.endTouchDrag(event);
            }
        };
        this.ui.svg.addEventListener('touchend', this._boundTouchEndHandler);
    }

    /**
     * Start mouse drag operation
     * @param {MouseEvent} event - Mouse event
     */
    startMouseDrag(event) {
        this.panState.isDragging = true;
        this.panState.lastMousePos = { x: event.clientX, y: event.clientY };
        this.panState.startCenter = { ...this.ui.currentCenter };

        // Change cursor to indicate dragging
        this.ui.svg.style.cursor = 'grabbing';
        this.ui.mapContainer.classList.add('dragging');

        // Prevent text selection during drag
        event.preventDefault();
    }

    /**
     * Handle mouse drag movement
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDrag(event) {
        if (!this.panState.isDragging) return;

        const deltaX = event.clientX - this.panState.lastMousePos.x;
        const deltaY = event.clientY - this.panState.lastMousePos.y;

        // Convert screen delta to world coordinates
        const worldDelta = this.screenDeltaToWorldDelta(deltaX, deltaY);

        // Update center (subtract because we're moving the view, not the content)
        this.ui.currentCenter.x -= worldDelta.x;
        this.ui.currentCenter.y -= worldDelta.y;

        // Update last position
        this.panState.lastMousePos = { x: event.clientX, y: event.clientY };

        // Re-render with new center
        this.ui.setupCoordinateSystem();
    }

    /**
     * End mouse drag operation
     * @param {MouseEvent} event - Mouse event
     */
    endMouseDrag(event) {
        this.panState.isDragging = false;

        // Restore cursor
        this.ui.svg.style.cursor = 'default';
        this.ui.mapContainer.classList.remove('dragging');
    }

    /**
     * Start two-finger touch drag
     * @param {TouchEvent} event - Touch event
     */
    startTouchDrag(event) {
        if (event.touches.length !== 2) return;

        this.panState.isTouchDragging = true;

        // Calculate center point of two touches
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        this.panState.lastTouchCenter = { x: centerX, y: centerY };
        this.panState.startCenter = { ...this.ui.currentCenter };
    }

    /**
     * Handle two-finger touch drag movement
     * @param {TouchEvent} event - Touch event
     */
    handleTouchDrag(event) {
        if (!this.panState.isTouchDragging || event.touches.length !== 2) return;

        // Calculate new center point of two touches
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        const deltaX = centerX - this.panState.lastTouchCenter.x;
        const deltaY = centerY - this.panState.lastTouchCenter.y;

        // Convert screen delta to world coordinates
        const worldDelta = this.screenDeltaToWorldDelta(deltaX, deltaY);

        // Update center (subtract because we're moving the view, not the content)
        this.ui.currentCenter.x -= worldDelta.x;
        this.ui.currentCenter.y -= worldDelta.y;

        // Update last position
        this.panState.lastTouchCenter = { x: centerX, y: centerY };

        // Re-render with new center
        this.ui.setupCoordinateSystem();
    }

    /**
     * End two-finger touch drag
     * @param {TouchEvent} event - Touch event
     */
    endTouchDrag(event) {
        this.panState.isTouchDragging = false;
    }

    /**
     * Convert screen pixel delta to world coordinate delta
     * @param {number} screenDeltaX - Screen X delta in pixels
     * @param {number} screenDeltaY - Screen Y delta in pixels
     * @returns {Object} World delta {x, y}
     */
    screenDeltaToWorldDelta(screenDeltaX, screenDeltaY) {
        // Get current viewBox dimensions
        const viewBox = this.ui.svg.getAttribute('viewBox');
        if (!viewBox) return { x: 0, y: 0 };

        const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);

        // Get SVG element dimensions
        const svgRect = this.ui.svg.getBoundingClientRect();

        // Calculate world units per screen pixel
        const worldPerPixelX = vbW / svgRect.width;
        const worldPerPixelY = vbH / svgRect.height;

        return {
            x: screenDeltaX * worldPerPixelX,
            y: screenDeltaY * worldPerPixelY
        };
    }

    /**
     * Convert screen pixels to world units (for tolerance calculations)
     * @param {number} screenPixels - Screen pixels
     * @returns {number} World units
     */
    screenPixelsToWorldUnits(screenPixels) {
        // Get current viewBox dimensions
        const viewBox = this.ui.svg.getAttribute('viewBox');
        if (!viewBox) return screenPixels;

        const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);

        // Get SVG element dimensions
        const svgRect = this.ui.svg.getBoundingClientRect();

        // Calculate world units per screen pixel (use average of X and Y)
        const worldPerPixelX = vbW / svgRect.width;
        const worldPerPixelY = vbH / svgRect.height;
        const worldPerPixel = (worldPerPixelX + worldPerPixelY) / 2;

        return screenPixels * worldPerPixel;
    }

    /**
     * Check if currently dragging
     * @returns {boolean} True if dragging
     */
    isDragging() {
        return this.panState.isDragging || this.panState.isTouchDragging;
    }

    /**
     * Dispose of resources and remove event listeners
     */
    dispose() {
        // Remove mouse event listeners
        if (this._boundMouseDownHandler && this.ui.svg) {
            this.ui.svg.removeEventListener('mousedown', this._boundMouseDownHandler);
        }
        if (this._boundDocMouseMoveHandler) {
            document.removeEventListener('mousemove', this._boundDocMouseMoveHandler);
        }
        if (this._boundDocMouseUpHandler) {
            document.removeEventListener('mouseup', this._boundDocMouseUpHandler);
        }

        // Remove touch event listeners
        if (this._boundTouchStartHandler && this.ui.svg) {
            this.ui.svg.removeEventListener('touchstart', this._boundTouchStartHandler);
        }
        if (this._boundTouchMoveHandler && this.ui.svg) {
            this.ui.svg.removeEventListener('touchmove', this._boundTouchMoveHandler);
        }
        if (this._boundTouchEndHandler && this.ui.svg) {
            this.ui.svg.removeEventListener('touchend', this._boundTouchEndHandler);
        }

        // Clear references
        this._boundMouseDownHandler = null;
        this._boundDocMouseMoveHandler = null;
        this._boundDocMouseUpHandler = null;
        this._boundTouchStartHandler = null;
        this._boundTouchMoveHandler = null;
        this._boundTouchEndHandler = null;
        this.ui = null;
    }
}
