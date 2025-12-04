export class CourseModal {
    constructor(containerId, overlayId, callbacks) {
        this.container = document.getElementById(containerId);
        this.overlay = document.getElementById(overlayId);
        this.callbacks = callbacks || {}; // { onTestChamber: (), onCampaignLevel: (index) }
        this.isVisible = false;
    }

    open() {
        this.isVisible = true;
        this.render();
        this.overlay.classList.add('active');
        this.attachListeners();
    }

    close() {
        this.isVisible = false;
        this.overlay.classList.remove('active');
        // Clean up content after transition to avoid flicker, or just leave it.
        // For now, we leave it or clear it. Let's clear it to save DOM.
        setTimeout(() => {
            if (!this.isVisible) this.container.innerHTML = '';
        }, 400);
    }

    render() {
        this.container.innerHTML = `
            <button class="modal-close" id="course-close">&times;</button>
            <div class="settings-modal">
                <div class="modal-header">COURSE SELECT</div>
                
                <div class="course-section">
                    <div class="section-title">DEV TOOLS</div>
                    <button class="retro-btn full-width" id="btn-test-chamber">TEST CHAMBER</button>
                </div>

                <div class="course-section">
                    <div class="section-title">CAMPAIGN</div>
                    <div class="campaign-grid">
                        ${this.generateCampaignButtons()}
                    </div>
                </div>
            </div>
        `;
    }

    generateCampaignButtons() {
        let html = '';
        for (let i = 1; i <= 18; i++) {
            html += `<button class="campaign-btn" data-level="${i}">${i}</button>`;
        }
        return html;
    }

    attachListeners() {
        // Close button
        this.container.querySelector('#course-close').addEventListener('click', () => this.close());

        // Overlay click (optional, if we want to close on overlay click)
        // The overlay click is usually handled by main.js or global handler, but we can add it here if needed.
        // Assuming main.js handles the overlay click to close active modal.

        // Test Chamber
        const testBtn = this.container.querySelector('#btn-test-chamber');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                if (this.callbacks.onTestChamber) this.callbacks.onTestChamber();
                this.close();
            });
        }

        // Campaign Buttons
        const campaignBtns = this.container.querySelectorAll('.campaign-btn');
        campaignBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const levelIndex = parseInt(e.target.dataset.level, 10) - 1; // 0-indexed
                if (this.callbacks.onCampaignLevel) this.callbacks.onCampaignLevel(levelIndex);
                this.close();
            });
        });
    }
}
