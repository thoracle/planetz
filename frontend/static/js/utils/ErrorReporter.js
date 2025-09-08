import { debug } from '../debug.js';

/**
 * ErrorReporter - Captures and reports JavaScript errors for debugging
 */
export class ErrorReporter {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.setupErrorHandlers();
    }

    setupErrorHandlers() {
        // Capture unhandled errors
        window.addEventListener('error', (event) => {
            this.reportError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.stack || event.error
            });
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.reportError('Unhandled Promise Rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });

        // Override console.error to capture console errors
        const originalError = console.error;
        console.error = (...args) => {
            originalError.apply(console, args);
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

        // Log to console for immediate visibility
        console.warn('🐛 ErrorReporter captured:', type, details);
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
        document.addEventListener('keydown', (event) => {
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
        });
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
