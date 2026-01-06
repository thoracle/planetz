/**
 * HelpStyles - CSS styling for the Help Interface (Tech Manual)
 * Extracted from HelpInterface.js to reduce file size.
 *
 * Contains all CSS for:
 * - Tech manual interface layout
 * - Tab system styling
 * - Achievement displays
 * - Collection card displays
 * - Ship's log entries
 * - Animations (scanLine, powerOn, fadeIn, etc.)
 */

/**
 * Inject tech manual styles into the document
 * @returns {HTMLStyleElement|null} The created style element, or null if already exists
 */
export function injectTechManualStyles() {
    if (document.getElementById('tech-manual-styles')) return null;

    const style = document.createElement('style');
    style.id = 'tech-manual-styles';
    style.textContent = getTechManualCSS();
    document.head.appendChild(style);
    return style;
}

/**
 * Remove tech manual styles from the document
 */
export function removeTechManualStyles() {
    const style = document.getElementById('tech-manual-styles');
    if (style) {
        style.remove();
    }
}

/**
 * Get the complete CSS for the tech manual interface
 * @returns {string} CSS content
 */
export function getTechManualCSS() {
    return `
        .tech-manual-interface {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: "Courier New", monospace;
            color: #00ff41;
            animation: powerOn 0.3s ease-in;
        }

        @keyframes powerOn {
            0% { opacity: 0; filter: brightness(2) blur(2px); }
            100% { opacity: 1; filter: brightness(1) blur(0); }
        }

        .tech-manual-display {
            background: rgba(0, 20, 0, 0.98);
            border: 3px solid #00ff41;
            border-radius: 12px;
            width: 90%;
            max-width: 1200px;
            height: 80vh;
            max-height: 700px;
            min-height: 600px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 0 30px rgba(0, 255, 65, 0.5), inset 0 0 20px rgba(0, 255, 65, 0.1);
            position: relative;
        }

        .tech-manual-display::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
                repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 255, 65, 0.03) 2px,
                    rgba(0, 255, 65, 0.03) 4px
                );
            pointer-events: none;
            z-index: 1;
        }

        .manual-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 25px;
            border-bottom: 2px solid #00ff41;
            background: rgba(0, 255, 65, 0.15);
            position: relative;
            z-index: 2;
        }

        .manual-title {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .ship-designation {
            font-size: 28px;
            font-weight: bold;
            color: #00ff41;
            text-shadow: 0 0 15px rgba(0, 255, 65, 0.8);
            letter-spacing: 2px;
        }

        .manual-type {
            font-size: 14px;
            color: #66ff66;
            letter-spacing: 1px;
            opacity: 0.8;
        }

        .manual-info {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
        }

        .timestamp {
            font-size: 12px;
            color: #66ff66;
            opacity: 0.7;
            font-family: monospace;
        }

        .manual-close-btn {
            background: rgba(0, 255, 65, 0.1);
            border: 2px solid #00ff41;
            color: #00ff41;
            font-size: 14px;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 6px;
            font-family: "Courier New", monospace;
            font-weight: bold;
            transition: all 0.2s;
            letter-spacing: 1px;
        }

        .manual-close-btn:hover {
            background: rgba(0, 255, 65, 0.2);
            box-shadow: 0 0 15px rgba(0, 255, 65, 0.5);
            text-shadow: 0 0 8px rgba(0, 255, 65, 0.8);
        }

        .manual-content {
            padding: 25px;
            position: relative;
            z-index: 2;
            line-height: 1.4;
            flex: 1;
            overflow-y: auto;
            min-height: 0;
        }

        .scan-line {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00ff41, transparent);
            animation: scanLine 3s linear infinite;
            opacity: 0.6;
            z-index: 5;
            pointer-events: none;
        }

        @keyframes scanLine {
            0% {
                transform: translateY(0);
                opacity: 0;
            }
            10% {
                opacity: 0.6;
            }
            90% {
                opacity: 0.6;
            }
            100% {
                transform: translateY(700px);
                opacity: 0;
            }
        }

        .manual-section {
            background: rgba(0, 255, 65, 0.08);
            border: 1px solid rgba(0, 255, 65, 0.4);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            position: relative;
        }

        .manual-section.disabled-section {
            background: rgba(255, 65, 65, 0.08);
            border-color: rgba(255, 65, 65, 0.4);
        }

        .section-header {
            margin: 0 0 15px 0;
            color: #00ff41;
            font-size: 16px;
            font-weight: bold;
            text-shadow: 0 0 8px rgba(0, 255, 65, 0.6);
            border-bottom: 1px solid rgba(0, 255, 65, 0.5);
            padding-bottom: 8px;
            letter-spacing: 1px;
        }

        .disabled-section .section-header {
            color: #ff4141;
            text-shadow: 0 0 8px rgba(255, 65, 65, 0.6);
            border-bottom-color: rgba(255, 65, 65, 0.5);
        }

        .subsection-header {
            margin: 20px 0 12px 0;
            color: #99ff99;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 6px rgba(153, 255, 153, 0.6);
            border-bottom: 1px dotted rgba(153, 255, 153, 0.4);
            padding-bottom: 6px;
            letter-spacing: 0.5px;
        }

        .system-status {
            font-size: 12px;
            color: #66ff66;
            margin-bottom: 12px;
            padding: 8px 12px;
            background: rgba(0, 255, 65, 0.1);
            border-left: 3px solid #00ff41;
            border-radius: 0 4px 4px 0;
        }

        .subsystem-header {
            font-size: 14px;
            color: #00ff41;
            font-weight: bold;
            margin: 15px 0 10px 0;
            padding-left: 12px;
            border-left: 2px solid #00ff41;
        }

        .control-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 8px;
            margin-bottom: 15px;
        }

        .control-entry {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 8px 12px;
            background: rgba(0, 255, 65, 0.05);
            border-radius: 4px;
            border-left: 2px solid transparent;
            transition: all 0.2s;
        }

        .control-entry:hover {
            background: rgba(0, 255, 65, 0.1);
            border-left-color: #00ff41;
        }

        .control-entry.disabled {
            opacity: 0.5;
            background: rgba(128, 128, 128, 0.05);
        }

        .key-binding {
            background: rgba(0, 255, 65, 0.2);
            border: 1px solid #00ff41;
            border-radius: 4px;
            padding: 6px 10px;
            font-weight: bold;
            min-width: 70px;
            text-align: center;
            font-size: 12px;
            box-shadow: 0 0 8px rgba(0, 255, 65, 0.3);
            text-shadow: 0 0 4px rgba(0, 255, 65, 0.8);
            font-family: "Courier New", monospace;
        }

        .control-desc {
            flex: 1;
            font-size: 14px;
            color: #ccffcc;
        }

        .weapon-loadout {
            margin-top: 15px;
            padding: 15px;
            background: rgba(0, 255, 65, 0.06);
            border: 1px dashed rgba(0, 255, 65, 0.3);
            border-radius: 6px;
        }

        .loadout-header {
            font-size: 13px;
            color: #00ff41;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .weapon-entry {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 6px 0;
            font-size: 13px;
            border-bottom: 1px solid rgba(0, 255, 65, 0.1);
        }

        .weapon-entry:last-child {
            border-bottom: none;
        }

        .weapon-slot {
            color: #00ff41;
            font-weight: bold;
            min-width: 30px;
        }

        .weapon-name {
            flex: 1;
            color: #ccffcc;
        }

        .weapon-level {
            color: #66ff66;
            font-size: 11px;
        }

        .tech-notes {
            margin-top: 15px;
            padding: 15px;
            background: rgba(0, 255, 65, 0.04);
            border: 1px solid rgba(0, 255, 65, 0.2);
            border-radius: 6px;
        }

        .notes-header {
            font-size: 13px;
            color: #00ff41;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .note-entry {
            font-size: 12px;
            color: #99ff99;
            margin-bottom: 6px;
            padding-left: 8px;
            border-left: 1px solid rgba(0, 255, 65, 0.3);
        }

        .system-status-footer {
            margin-top: 25px;
            padding: 15px;
            background: rgba(0, 255, 65, 0.08);
            border: 1px solid rgba(0, 255, 65, 0.3);
            border-radius: 6px;
            text-align: center;
        }

        .status-line {
            font-size: 12px;
            color: #66ff66;
            margin-bottom: 4px;
            letter-spacing: 1px;
        }

        .warning-text {
            color: #ff4141;
            font-weight: bold;
            text-shadow: 0 0 8px rgba(255, 65, 65, 0.6);
            text-align: center;
            padding: 15px;
            background: rgba(255, 65, 65, 0.1);
            border: 1px solid rgba(255, 65, 65, 0.3);
            border-radius: 6px;
            margin: 10px 0;
        }

        .caution-text {
            color: #ffa500;
            font-weight: bold;
            font-size: 12px;
            margin-top: 8px;
            padding: 8px 12px;
            background: rgba(255, 165, 0, 0.1);
            border: 1px solid rgba(255, 165, 0, 0.3);
            border-radius: 4px;
        }

        .basic-help {
            text-align: center;
            color: #66ff66;
            font-size: 14px;
            margin: 20px 0;
        }

        /* Scrollbar styling */
        .tech-manual-display::-webkit-scrollbar {
            width: 10px;
        }

        .tech-manual-display::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.5);
            border-radius: 5px;
        }

        .tech-manual-display::-webkit-scrollbar-thumb {
            background: rgba(0, 255, 65, 0.6);
            border-radius: 5px;
            border: 1px solid rgba(0, 255, 65, 0.8);
        }

        .tech-manual-display::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 255, 65, 0.8);
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .manual-content {
                padding: 15px;
            }

            .tech-manual-display {
                width: 95%;
                margin: 10px;
            }

            .ship-designation {
                font-size: 22px;
            }

            .manual-section {
                padding: 15px;
            }

            .control-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Tab System */
        .help-tabs {
            display: flex;
            border-bottom: 2px solid rgba(0, 255, 65, 0.3);
            margin-bottom: 0;
            background: rgba(0, 255, 65, 0.05);
            flex-shrink: 0;
            height: 50px;
        }

        .help-tab-button {
            background: rgba(0, 20, 0, 0.3);
            border: 1px solid rgba(0, 255, 65, 0.4);
            border-bottom: none;
            color: #00ff41;
            padding: 12px 20px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            flex: 1;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            margin-right: 2px;
            text-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
        }

        .help-tab-button:last-child {
            margin-right: 0;
        }

        .help-tab-button:hover {
            background: rgba(0, 255, 65, 0.15);
            border-color: #00ff41;
            text-shadow: 0 0 10px #00ff41;
            box-shadow: 0 0 8px rgba(0, 255, 65, 0.3);
        }

        .help-tab-button.active {
            background: rgba(0, 255, 65, 0.25);
            border-color: #00ff41;
            color: #ffffff;
            text-shadow: 0 0 15px #00ff41;
            box-shadow:
                inset 0 -3px 0 #00ff41,
                0 0 15px rgba(0, 255, 65, 0.4),
                inset 0 0 20px rgba(0, 255, 65, 0.1);
            z-index: 1;
        }

        .help-tab-content {
            display: none;
            animation: fadeIn 0.3s ease;
            height: 100%;
            overflow-y: auto;
        }

        .help-tab-content.active {
            display: block;
            height: 100%;
            overflow-y: auto;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Collection Card Styling - Scoped to help interface */
        .tech-manual-interface .collection-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 15px;
            padding: 15px 0;
            max-height: 400px;
            overflow-y: auto;
        }

        .tech-manual-interface .collection-card-item {
            background: rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(0, 255, 65, 0.4);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            min-height: 160px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .tech-manual-interface .collection-card-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 255, 65, 0.02) 2px,
                rgba(0, 255, 65, 0.02) 4px
            );
            pointer-events: none;
        }

        .tech-manual-interface .collection-card-item:hover {
            border-color: #00ff41;
            background: rgba(0, 255, 65, 0.1);
            box-shadow: 0 0 15px rgba(0, 255, 65, 0.3);
            transform: translateY(-2px);
        }

        /* Rarity-based border colors and background tinting */
        .tech-manual-interface .collection-card-item[data-rarity="common"] {
            border-color: rgba(128, 128, 128, 0.6);
            background: rgba(128, 128, 128, 0.15);
        }
        .tech-manual-interface .collection-card-item[data-rarity="rare"] {
            border-color: rgba(0, 150, 255, 0.6);
            background: rgba(0, 150, 255, 0.15);
        }
        .tech-manual-interface .collection-card-item[data-rarity="epic"] {
            border-color: rgba(163, 53, 238, 0.6);
            background: rgba(163, 53, 238, 0.15);
        }
        .tech-manual-interface .collection-card-item[data-rarity="legendary"] {
            border-color: rgba(255, 165, 0, 0.6);
            background: rgba(255, 165, 0, 0.15);
        }

        .tech-manual-interface .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }

        .tech-manual-interface .card-icon {
            font-size: 24px;
            filter: drop-shadow(0 0 5px rgba(0, 255, 65, 0.5));
            margin-right: auto;
            flex-shrink: 0;
        }

        .tech-manual-interface .card-count-badge {
            background: rgba(0, 255, 65, 0.3);
            color: #00ff41;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            border: 1px solid rgba(0, 255, 65, 0.5);
            text-shadow: 0 0 3px rgba(0, 255, 65, 0.8);
            margin-left: auto;
            flex-shrink: 0;
        }

        .tech-manual-interface .card-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
            position: relative;
            z-index: 1;
        }

        .tech-manual-interface .card-name {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-shadow: 0 0 3px rgba(0, 255, 65, 0.5);
            line-height: 1.2;
        }

        .tech-manual-interface .card-level {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #00ff41;
            font-weight: bold;
        }

        .tech-manual-interface .card-rarity {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.8;
        }

        .tech-manual-interface .card-rarity {
            color: #888;
        }
        .tech-manual-interface .collection-card-item[data-rarity="rare"] .card-rarity {
            color: #0096ff;
        }
        .tech-manual-interface .collection-card-item[data-rarity="epic"] .card-rarity {
            color: #a335ee;
        }
        .tech-manual-interface .collection-card-item[data-rarity="legendary"] .card-rarity {
            color: #ffa500;
        }

        .tech-manual-interface .card-footer {
            margin-top: 8px;
            position: relative;
            z-index: 1;
        }

        .tech-manual-interface .upgrade-button {
            background: rgba(0, 255, 65, 0.2);
            border: 1px solid #00ff41;
            color: #00ff41;
            padding: 4px 8px;
            font-size: 9px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            width: 100%;
            transition: all 0.2s ease;
            animation: pulse-upgrade 2s infinite;
        }

        .tech-manual-interface .upgrade-button:hover {
            background: rgba(0, 255, 65, 0.3);
            box-shadow: 0 0 8px rgba(0, 255, 65, 0.4);
            text-shadow: 0 0 5px #00ff41;
        }

        .tech-manual-interface .card-status {
            text-align: center;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            color: #66ff66;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        @keyframes pulse-upgrade {
            0%, 100% {
                box-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
            }
            50% {
                box-shadow: 0 0 12px rgba(0, 255, 65, 0.6);
            }
        }

        /* NEW Badge Styling - matches card-count-badge shape and position exactly */
        .tech-manual-interface .new-badge {
            background: linear-gradient(45deg, #ff4444, #ff6666);
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            border: 1px solid #ff4444;
            text-shadow: 0 0 3px rgba(255, 68, 68, 0.8);
            animation: pulse-new 2s infinite;
            box-shadow: 0 0 10px rgba(255, 68, 68, 0.6);
            margin-left: auto;
            flex-shrink: 0;
        }

        .tech-manual-interface .has-new-badge {
            position: relative;
        }

        .tech-manual-interface .has-new-badge::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #ff4444, #ff6666, #ff4444);
            border-radius: 10px;
            z-index: -1;
            animation: pulse-new-border 2s infinite;
        }

        @keyframes pulse-new {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.1);
                opacity: 0.8;
            }
        }

        @keyframes pulse-new-border {
            0%, 100% {
                opacity: 0.3;
            }
            50% {
                opacity: 0.6;
            }
        }

        @keyframes pulse-red {
            0%, 100% {
                background-color: #ff4444;
                transform: scale(1);
            }
            50% {
                background-color: #ff6666;
                transform: scale(1.05);
            }
        }

        /* Ship's Log Entry Styling */
        .tech-manual-interface .log-entry-system {
            color: #00ff41;
        }

        .tech-manual-interface .log-entry-ephemeral {
            color: #ffaa00;
            font-style: italic;
            background: rgba(255, 170, 0, 0.1);
            padding: 2px 4px;
            border-left: 2px solid #ffaa00;
            margin: 2px 0;
        }

        .tech-manual-interface .log-entry-ephemeral::before {
            content: '';
            display: inline-block;
            width: 6px;
            height: 6px;
            background: #ffaa00;
            border-radius: 50%;
            margin-right: 6px;
            animation: pulse-ephemeral 2s infinite;
        }

        @keyframes pulse-ephemeral {
            0%, 100% {
                opacity: 0.6;
                transform: scale(1);
            }
            50% {
                opacity: 1;
                transform: scale(1.2);
            }
        }

        /* Achievement Styles */
        .achievements-container {
            padding: 20px;
        }

        .achievements-header {
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(0, 255, 65, 0.3);
            padding-bottom: 10px;
        }

        .achievements-header h3 {
            color: #00ff41;
            margin: 0 0 10px 0;
            font-size: 18px;
        }

        .achievement-stats {
            color: #00dd88;
            font-size: 14px;
        }

        .achievement-category {
            margin-bottom: 25px;
        }

        .achievement-category h4 {
            color: #00ff41;
            margin: 0 0 15px 0;
            font-size: 16px;
            border-bottom: 1px solid rgba(0, 255, 65, 0.2);
            padding-bottom: 5px;
        }

        .achievement-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .achievement-item {
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(0, 20, 0, 0.4);
            border: 1px solid rgba(0, 255, 65, 0.3);
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
        }

        .achievement-item.unlocked {
            border-color: rgba(0, 255, 65, 0.6);
            background: rgba(0, 255, 65, 0.05);
            box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
        }

        .achievement-item.locked {
            opacity: 0.7;
        }

        .achievement-icon {
            font-size: 24px;
            min-width: 32px;
            text-align: center;
        }

        .achievement-info {
            flex: 1;
        }

        .achievement-name {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
        }

        .achievement-description {
            color: #cccccc;
            font-size: 14px;
            margin-bottom: 10px;
        }

        .achievement-progress {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 5px;
        }

        .progress-bar {
            flex: 1;
            height: 8px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(0, 255, 65, 0.3);
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 3px;
        }

        .progress-text {
            color: #00dd88;
            font-size: 12px;
            min-width: 80px;
            text-align: right;
        }

        .achievement-unlocked {
            color: #888;
            font-size: 12px;
            font-style: italic;
        }

        .achievements-loading, .achievements-error {
            text-align: center;
            padding: 40px;
            color: #00dd88;
        }
    `;
}
