export class SettingsModal {
    constructor(audio) {
        this.audio = audio;
        this.container = document.getElementById('modal-container');
        this.overlay = document.getElementById('modal-overlay');
        this.lastFeedbackTime = 0;
    }

    render() {
        const channels = [
            { id: 'master', label: 'MASTER' },
            { id: 'music', label: 'MUSIC' },
            { id: 'ambience', label: 'AMBIENCE' },
            { id: 'ui', label: 'UI' },
            { id: 'sfx', label: 'SFX' }
        ];

        let html = `
            <div class="retro-modal settings-modal">
                <div class="modal-header">AUDIO CONFIG</div>
                <div class="modal-content">
        `;

        channels.forEach(channel => {
            html += `
                <div class="setting-row">
                    <div class="setting-label">${channel.label}</div>
                    <div class="retro-meter" id="meter-${channel.id}">
                        <button class="arrow-btn left" data-channel="${channel.id}" data-dir="-1"><</button>
                        <div class="blocks-container">
                            ${this.renderBlocks(channel.id)}
                        </div>
                        <button class="arrow-btn right" data-channel="${channel.id}" data-dir="1">></button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div class="modal-footer">
                    <button id="settings-back-btn" class="retro-btn">BACK</button>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.setupListeners();
        this.overlay.classList.add('active');
    }

    renderBlocks(channelId) {
        const volume = this.audio.settings[channelId];
        const activeCount = Math.round(volume * 10);
        let blocksHtml = '';
        for (let i = 0; i < 10; i++) {
            const isActive = i < activeCount ? 'active' : '';
            blocksHtml += `<div class="block ${isActive}"></div>`;
        }
        return blocksHtml;
    }

    setupListeners() {
        // Arrow Buttons
        const arrows = this.container.querySelectorAll('.arrow-btn');
        arrows.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const channel = e.target.dataset.channel;
                const dir = parseInt(e.target.dataset.dir);
                this.adjustVolume(channel, dir);
            });
        });

        // Back Button
        const backBtn = this.container.querySelector('#settings-back-btn');
        backBtn.addEventListener('click', () => {
            this.close();
        });

        // Close on overlay click
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        };
    }

    adjustVolume(channel, dir) {
        let current = this.audio.settings[channel];
        let newVal = current + (dir * 0.1);

        // Clamp and Round to avoid float errors
        newVal = Math.max(0, Math.min(1, Math.round(newVal * 10) / 10));

        if (newVal !== current) {
            this.audio.setVolume(channel, newVal);
            this.updateMeter(channel);
            this.playFeedback(channel);
        }
    }

    updateMeter(channel) {
        const meter = this.container.querySelector(`#meter-${channel} .blocks-container`);
        if (meter) {
            meter.innerHTML = this.renderBlocks(channel);
        }
    }

    playFeedback(channel) {
        const now = Date.now();
        if (now - this.lastFeedbackTime < 150) return; // Debounce
        this.lastFeedbackTime = now;

        this.audio.playUiBlip(); // Always play blip for feedback

        // Channel specific previews
        switch (channel) {
            case 'ambience':
                // Short white noise burst
                if (this.audio.noiseNode) {
                    // We can't easily trigger just the noise node without affecting the main wind
                    // So we'll just rely on the blip + maybe a quick filter sweep if we could access it
                    // But for now, let's just do a distinct tone or just the blip.
                    // The prompt asked for: "Trigger a short 200ms white noise burst."
                    // I'll create a temporary noise buffer for this.
                    this.playNoiseBurst();
                }
                break;
            case 'music':
                // "Play a simple short chord"
                this.playChord();
                break;
            case 'sfx':
            case 'master':
            case 'ui':
                // Already covered by playUiBlip or generic feel
                break;
        }
    }

    playNoiseBurst() {
        const ctx = this.audio.ctx;
        const bufferSize = ctx.sampleRate * 0.2; // 200ms
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.2;

        noise.connect(gain);
        gain.connect(this.audio.ambienceGain); // Route to ambience bus
        noise.start();
    }

    playChord() {
        // C Major Triad
        const ctx = this.audio.ctx;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(this.audio.musicGain); // Route to music bus

            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        });
    }

    close() {
        this.overlay.classList.remove('active');
        this.overlay.onclick = null; // Cleanup
        this.audio.playUiBlip();
    }
}
