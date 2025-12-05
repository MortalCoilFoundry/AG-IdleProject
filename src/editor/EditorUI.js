export class EditorUI {
    constructor(editorSystem) {
        this.editor = editorSystem;
        this.container = null;
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
        this.container.style.pointerEvents = 'none'; // Let clicks pass through to canvas by default
        this.container.style.zIndex = '20';
        this.container.style.display = 'none';
        this.container.style.fontFamily = '"Press Start 2P", cursive';

        // Top Bar
        const topBar = document.createElement('div');
        topBar.style.position = 'absolute';
        topBar.style.top = '10px';
        topBar.style.left = '10px';
        topBar.style.right = '10px';
        topBar.style.display = 'flex';
        topBar.style.justifyContent = 'space-between';
        topBar.style.pointerEvents = 'auto'; // Enable clicks on the bar

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

        // Export Button
        const exportBtn = this.createButton('EXPORT', () => {
            const code = this.editor.exportLevel();
            navigator.clipboard.writeText(code).then(() => {
                this.showToast('Level Code Copied!');
            });
        });

        // Import Button
        const importBtn = this.createButton('IMPORT', () => {
            // Simple prompt for now, can be improved to a modal later
            // We use a timeout to ensure we don't block the UI thread immediately on click
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

        // Settings Button (Gear)
        const settingsBtn = this.createButton('⚙️', () => {
            this.showToast('Settings: Coming Soon');
        });

        actions.appendChild(importBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(settingsBtn);
        topBar.appendChild(actions);

        this.container.appendChild(topBar);

        // Toast Notification Area
        this.toast = document.createElement('div');
        this.toast.style.position = 'absolute';
        this.toast.style.bottom = '80px'; // Above the ribbon
        this.toast.style.left = '50%';
        this.toast.style.transform = 'translateX(-50%)';
        this.toast.style.backgroundColor = '#0f380f';
        this.toast.style.color = '#9bbc0f';
        this.toast.style.padding = '10px 20px';
        this.toast.style.border = '2px solid #9bbc0f';
        this.toast.style.display = 'none';
        this.container.appendChild(this.toast);

        document.body.appendChild(this.container);

        // Stop Propagation on Container to prevent Canvas interaction
        // Actually, we set pointer-events: none on container, and auto on children.
        // But we want to make sure clicks on buttons don't fire game inputs.
        topBar.addEventListener('mousedown', (e) => e.stopPropagation());
        topBar.addEventListener('touchstart', (e) => e.stopPropagation());
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
