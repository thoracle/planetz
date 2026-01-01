import { debug } from '../debug.js';

/**
 * ErrorReporter - Captures and reports JavaScript errors for debugging
 */
export class ErrorReporter {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this._originalConsoleError = null;
        this._boundErrorHandler = null;
        this._boundRejectionHandler = null;
        this._boundKeyHandler = null;
        this.setupErrorHandlers();
    }

    setupErrorHandlers() {
        // Capture unhandled errors
        this._boundErrorHandler = (event) => {
            this.reportError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.stack || event.error
            });
        };
        window.addEventListener('error', this._boundErrorHandler);

        // Capture unhandled promise rejections
        this._boundRejectionHandler = (event) => {
            this.reportError('Unhandled Promise Rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        };
        window.addEventListener('unhandledrejection', this._boundRejectionHandler);

        // Override console.error to capture console errors
        this._originalConsoleError = console.error;
        console.error = (...args) => {
            this._originalConsoleError.apply(console, args);
            this.reportError('Console Error', args);
        };
    }

    reportError(type, details) {
        const errorReport = {
            timestamp: new Date().toISOString(),
            type: type,
            details: details,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.errors.push(errorReport);

        // Keep only the most recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log to debug channel for visibility
        debug('P1', `🐛 ErrorReporter captured: ${type} - ${JSON.stringify(details)}`);
    }

    getErrorReport() {
        return {
            timestamp: new Date().toISOString(),
            errorCount: this.errors.length,
            errors: this.errors
        };
    }

    downloadErrorReport() {
        const report = this.getErrorReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planetz-error-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearErrors() {
        this.errors = [];
    }

    // Add keyboard shortcut to download error report
    setupKeyboardShortcuts() {
        this._boundKeyHandler = (event) => {
            // Ctrl+Shift+E to download error report
            if (event.ctrlKey && event.shiftKey && event.key === 'E') {
                event.preventDefault();
                this.downloadErrorReport();
                debug('P1', '📥 Error report downloaded');
            }
            // Ctrl+Shift+C to clear errors
            if (event.ctrlKey && event.shiftKey && event.key === 'C') {
                event.preventDefault();
                this.clearErrors();
                debug('P1', '🧹 Error report cleared');
            }
        };
        document.addEventListener('keydown', this._boundKeyHandler);
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        debug('UTILITY', '🧹 ErrorReporter: Disposing...');

        // Remove event listeners
        if (this._boundErrorHandler) {
            window.removeEventListener('error', this._boundErrorHandler);
            this._boundErrorHandler = null;
        }

        if (this._boundRejectionHandler) {
            window.removeEventListener('unhandledrejection', this._boundRejectionHandler);
            this._boundRejectionHandler = null;
        }

        if (this._boundKeyHandler) {
            document.removeEventListener('keydown', this._boundKeyHandler);
            this._boundKeyHandler = null;
        }

        // Restore original console.error
        if (this._originalConsoleError) {
            console.error = this._originalConsoleError;
            this._originalConsoleError = null;
        }

        // Clear errors
        this.errors = [];

        // Remove global references
        if (window.errorReporter === this) {
            delete window.errorReporter;
        }
        delete window.getErrorReport;
        delete window.downloadErrorReport;
        delete window.clearErrors;

        debug('UTILITY', '🧹 ErrorReporter: Disposed');
    }

    /**
     * Alias for dispose()
     */
    destroy() {
        this.dispose();
    }
}

// Create global error reporter
window.errorReporter = new ErrorReporter();
window.errorReporter.setupKeyboardShortcuts();

// Add console commands for easy access
window.getErrorReport = () => window.errorReporter.getErrorReport();
window.downloadErrorReport = () => window.errorReporter.downloadErrorReport();
window.clearErrors = () => window.errorReporter.clearErrors();

        debug('UTILITY', 'ErrorReporter initialized. Use Ctrl+Shift+E to download error report, Ctrl+Shift+C to clear.');
