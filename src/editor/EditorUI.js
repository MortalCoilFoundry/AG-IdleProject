import { TOOLS } from './EditorTools.js';

export class EditorUI {
    constructor(editorSystem) {
        this.editor = editorSystem;
        this.container = null;
        this.buttons = {}; // Map tool -> button element
        this.init();
    }

    init() {
        // Create Container
        this.container = document.createElement('div');
        this.container.id = 'editor-hud';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '100';
        this.container.style.display = 'none';
        this.container.style.fontFamily = '"Press Start 2P", cursive';

        // --- Top Bar ---
        const topBar = document.createElement('div');
        topBar.style.position = 'absolute';
        topBar.style.top = '10px';
        topBar.style.left = '10px';
        topBar.style.right = '10px';
        topBar.style.display = 'flex';
        topBar.style.justifyContent = 'space-between';
        topBar.style.pointerEvents = 'auto';

        // Left: Title
        const title = document.createElement('div');
        title.textContent = 'EDITOR MODE';
        title.style.color = '#0f380f';
        title.style.backgroundColor = '#9bbc0f';
        title.style.padding = '5px 10px';
        title.style.border = '2px solid #0f380f';
        topBar.appendChild(title);

        // Right: Actions
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '10px';

        const exportBtn = this.createButton('EXPORT', () => {
            const code = this.editor.exportLevel();
            navigator.clipboard.writeText(code).then(() => {
                this.showToast('Level Code Copied!');
            });
        });

        const importBtn = this.createButton('IMPORT', () => {
            setTimeout(() => {
                const code = prompt("Paste Level Code (RP1:...):");
                if (code) {
                    if (this.editor.importLevel(code)) {
                        this.showToast('Level Loaded!');
                    } else {
                        this.showToast('Invalid Code!');
                    }
                }
            }, 10);
        });

        const settingsBtn = this.createButton('⚙️', () => {
            this.showToast('Settings: Coming Soon');
        });

        actions.appendChild(importBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(settingsBtn);
        topBar.appendChild(actions);

        this.container.appendChild(topBar);

        // --- Bottom Toolbar ---
        const toolbar = document.createElement('div');
        toolbar.style.position = 'absolute';
        toolbar.style.bottom = '90px';
        toolbar.style.left = '50%';
        toolbar.style.transform = 'translateX(-50%)';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '10px';
        toolbar.style.pointerEvents = 'auto';
        toolbar.style.backgroundColor = '#0f380f';
        toolbar.style.padding = '10px';
        toolbar.style.border = '2px solid #9bbc0f';
        toolbar.style.borderRadius = '8px';

        // Tools
        this.createToolButton(toolbar, TOOLS.HAND, '✋');
        this.createToolButton(toolbar, TOOLS.WALL, '🧱');
        this.createToolButton(toolbar, TOOLS.SAND, '🏜️');
        this.createToolButton(toolbar, TOOLS.ERASER, '🧼');
        this.createToolButton(toolbar, TOOLS.START, '📍');
        this.createToolButton(toolbar, TOOLS.HOLE, '⛳');
        this.createToolButton(toolbar, TOOLS.SLOPE, '↗️');

        this.container.appendChild(toolbar);

        // --- Toast ---
        this.toast = document.createElement('div');
        this.toast.style.position = 'absolute';
        this.toast.style.bottom = '100px'; // Above the toolbar
        this.toast.style.left = '50%';
        this.toast.style.transform = 'translateX(-50%)';
        this.toast.style.backgroundColor = '#0f380f';
        this.toast.style.color = '#9bbc0f';
        this.toast.style.padding = '10px 20px';
        this.toast.style.border = '2px solid #9bbc0f';
        this.toast.style.display = 'none';
        this.container.appendChild(this.toast);

        document.body.appendChild(this.container);

        // Stop Propagation
        topBar.addEventListener('mousedown', (e) => e.stopPropagation());
        topBar.addEventListener('touchstart', (e) => e.stopPropagation());
        toolbar.addEventListener('mousedown', (e) => e.stopPropagation());
        toolbar.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.backgroundColor = '#8bac0f';
        btn.style.color = '#0f380f';
        btn.style.border = '2px solid #0f380f';
        btn.style.padding = '5px 10px';
        btn.style.fontFamily = 'inherit';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '12px';

        btn.addEventListener('mouseenter', () => {
            btn.style.backgroundColor = '#9bbc0f';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = '#8bac0f';
        });

        btn.addEventListener('click', onClick);

        return btn;
    }

    createToolButton(parent, tool, icon) {
        const btn = document.createElement('button');
        btn.style.width = '44px';
        btn.style.height = '44px';
        btn.style.backgroundColor = '#8bac0f';
        btn.style.color = '#0f380f';
        btn.style.border = '2px solid #0f380f';
        btn.style.fontFamily = 'inherit';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '20px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.position = 'relative'; // For absolute children

        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icon;
        btn.appendChild(iconSpan);

        // Intensity Indicator (Specific to SLOPE)
        let indicator = null;
        if (tool === TOOLS.SLOPE) {
            indicator = document.createElement('span');
            indicator.textContent = '1';
            indicator.style.position = 'absolute';
            indicator.style.top = '2px';
            indicator.style.left = '4px';
            indicator.style.fontSize = '10px';
            indicator.style.fontWeight = 'bold';
            indicator.style.color = '#0f380f';
            btn.appendChild(indicator);
        }

        btn.addEventListener('click', () => {
            if (this.editor.currentTool === tool) {
                // Already active - check for secondary action
                if (tool === TOOLS.SLOPE) {
                    const newLevel = this.editor.cycleSlopeIntensity();
                    if (indicator) indicator.textContent = newLevel;
                }
            } else {
                this.editor.setTool(tool);
                this.updateActiveTool(tool);
            }
        });

        parent.appendChild(btn);
        this.buttons[tool] = btn;

        // Set initial active state
        if (tool === this.editor.currentTool) {
            this.updateActiveTool(tool);
        }
    }

    updateActiveTool(activeTool) {
        for (const [tool, btn] of Object.entries(this.buttons)) {
            if (tool === activeTool) {
                btn.style.backgroundColor = '#9bbc0f'; // Highlight
                btn.style.border = '2px solid #fff'; // White border for contrast
            } else {
                btn.style.backgroundColor = '#8bac0f';
                btn.style.border = '2px solid #0f380f';
            }
        }
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    showToast(msg) {
        this.toast.textContent = msg;
        this.toast.style.display = 'block';
        setTimeout(() => {
            this.toast.style.display = 'none';
        }, 2000);
    }
}
