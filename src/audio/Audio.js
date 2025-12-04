export class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.windInitialized = false;
        this.sourcesStarted = false; // Flag to track if sources have started
        this.gustTimer = 0;
        this.nextGustTime = 2.5;
        this.silenceTimer = 0;
        this.nextSilenceTime = 10;
        this.isSilent = false;
        this.currentWindStrength = 0;

        // Load Settings
        this.settings = {
            master: 1.0,
            music: 1.0,
            ambience: 1.0,
            ui: 1.0,
            sfx: 1.0
        };

        try {
            const saved = localStorage.getItem('retro-putt-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load audio settings', e);
        }

        // Initialize Buses
        this.initBuses();

        this.musicSource = null;
        this.musicBuffer = null;
    }

    initBuses() {
        // Create Nodes
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.ambienceGain = this.ctx.createGain();
        this.uiGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        // Routing: Channel -> Master -> Destination
        this.musicGain.connect(this.masterGain);
        this.ambienceGain.connect(this.masterGain);
        this.uiGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Apply Initial Volumes
        this.updateVolumes();
    }

    updateVolumes() {
        const now = this.ctx.currentTime;
        this.masterGain.gain.setValueAtTime(this.settings.master, now);
        this.musicGain.gain.setValueAtTime(this.settings.music, now);
        this.ambienceGain.gain.setValueAtTime(this.settings.ambience, now);
        this.uiGain.gain.setValueAtTime(this.settings.ui, now);
        this.sfxGain.gain.setValueAtTime(this.settings.sfx, now);
    }

    setVolume(channel, value) {
        if (this.settings.hasOwnProperty(channel)) {
            this.settings[channel] = Math.max(0, Math.min(1, value));

            // Update Audio Node
            const now = this.ctx.currentTime;
            const targetGain = this.settings[channel];

            switch (channel) {
                case 'master': this.masterGain.gain.setTargetAtTime(targetGain, now, 0.1); break;
                case 'music': this.musicGain.gain.setTargetAtTime(targetGain, now, 0.1); break;
                case 'ambience': this.ambienceGain.gain.setTargetAtTime(targetGain, now, 0.1); break;
                case 'ui': this.uiGain.gain.setTargetAtTime(targetGain, now, 0.1); break;
                case 'sfx': this.sfxGain.gain.setTargetAtTime(targetGain, now, 0.1); break;
            }

            // Save Persistence
            try {
                localStorage.setItem('retro-putt-settings', JSON.stringify(this.settings));
            } catch (e) {
                console.warn('Failed to save audio settings', e);
            }
        }
    }

    async loadMusic(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.musicBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            console.log(`Music loaded: ${url}`);
        } catch (e) {
            console.error(`Failed to load music: ${url}`, e);
        }
    }

    playMusic() {
        if (!this.musicBuffer) return;

        // Cleanup existing source
        if (this.musicSource) {
            this.musicSource.stop();
            this.musicSource.disconnect();
            this.musicSource = null;
        }

        this.musicSource = this.ctx.createBufferSource();
        this.musicSource.buffer = this.musicBuffer;
        this.musicSource.loop = true;
        // --- NEW: The -12dB Trim Node ---
        // Create a gain node specifically to quiet this loud track
        const trimNode = this.ctx.createGain();

        // Math: 10^(-12/20) ≈ 0.2511
        trimNode.gain.value = 0.25;

        // Connect the chain: Source -> Trim -> Music Bus
        this.musicSource.connect(trimNode);
        trimNode.connect(this.musicGain);

        this.musicSource.start(0);
    }

    stopMusic() {
        if (this.musicSource) {
            this.musicSource.stop();
            this.musicSource.disconnect();
            this.musicSource = null;
        }
    }

    playUiBlip() {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.uiGain); // Route to UI Bus

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playTone(freq, type, duration) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain); // Route to SFX Bus

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHit() {
        this.playTone(150, 'square', 0.1);
        setTimeout(() => this.playTone(100, 'square', 0.1), 50);
    }

    playWallHit() {
        this.playTone(100, 'sawtooth', 0.05);
    }

    playHole() {
        this.playTone(400, 'sine', 0.1);
        setTimeout(() => this.playTone(600, 'sine', 0.1), 100);
        setTimeout(() => this.playTone(800, 'sine', 0.2), 200);
    }

    playWin() {
        this.playTone(300, 'square', 0.2);
        setTimeout(() => this.playTone(400, 'square', 0.2), 200);
        setTimeout(() => this.playTone(500, 'square', 0.4), 400);
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        // Start sources on first user interaction if initialized
        if (!this.sourcesStarted) {
            // If the level already called setWind(), windInitialized is true.
            // So we start the sources now that we have a user gesture.
            if (this.windInitialized) {
                this.startSources();
            }
        }
    }

    initWind() {
        if (this.windInitialized) return;
        this.windInitialized = true;

        // Node Graph: 
        // [Osc1, Osc2] -> [TriangleGain] -> [AmbienceGain]
        // [PinkNoise] -> [Filter1] -> [Filter2] -> [Filter3] -> [NoiseGain] -> [BreathingMultiplier] -> [AmbienceGain]
        // [BreathingLFO] -> [BreathingGain] -> [BreathingMultiplier.gain]
        // [AmbienceGain] -> [MasterGain] -> [Destination]

        // Note: masterGain and ambienceGain are already created in constructor

        this.triangleGain = this.ctx.createGain();
        this.triangleGain.gain.value = 0;
        this.triangleGain.connect(this.ambienceGain); // Route to Ambience Bus

        // Breathing Multiplier (Modulates Noise)
        this.breathingMultiplier = this.ctx.createGain();
        this.breathingMultiplier.gain.value = 1.0; // Default unity
        this.breathingMultiplier.connect(this.ambienceGain); // Route to Ambience Bus

        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.value = 0.445;
        this.noiseGain.connect(this.breathingMultiplier);

        // Oscillators
        this.windOsc1 = this.ctx.createOscillator();
        this.windOsc2 = this.ctx.createOscillator();
        this.windOsc1.type = 'triangle';
        this.windOsc2.type = 'triangle';
        this.windOsc1.frequency.value = 60;
        this.windOsc2.frequency.value = 64;

        // Pitch LFO
        this.lfoOsc = this.ctx.createOscillator();
        this.lfoGain = this.ctx.createGain();
        this.lfoOsc.type = 'sine';
        this.lfoOsc.frequency.value = 0.2;
        this.lfoGain.gain.value = 3;

        this.lfoOsc.connect(this.lfoGain);
        this.lfoGain.connect(this.windOsc1.frequency);
        this.lfoGain.connect(this.windOsc2.frequency);

        this.windOsc1.connect(this.triangleGain);
        this.windOsc2.connect(this.triangleGain);

        // Breathing LFO (Ultra-slow, random per session)
        this.breathingLfo = this.ctx.createOscillator();
        this.breathingGain = this.ctx.createGain();
        this.breathingLfo.type = 'sine';
        // Random freq between 0.022 and 0.035 Hz (28-45s cycle)
        this.breathingLfo.frequency.value = 0.022 + Math.random() * 0.013;
        this.breathingGain.gain.value = 0.3; // depth

        this.breathingLfo.connect(this.breathingGain);
        this.breathingGain.connect(this.breathingMultiplier.gain);

        // Add DC offset by setting default multiplier bias
        this.breathingMultiplier.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }

    async startSources() {
        if (this.sourcesStarted) return;
        this.sourcesStarted = true;

        // Cascaded Lowpass Filters (Created here to ensure context is ready)
        this.filter1 = this.ctx.createBiquadFilter();
        this.filter1.type = 'lowpass';
        this.filter1.frequency.value = 400;

        this.filter2 = this.ctx.createBiquadFilter();
        this.filter2.type = 'lowpass';
        this.filter2.frequency.value = 250;

        this.filter3 = this.ctx.createBiquadFilter();
        this.filter3.type = 'lowpass';
        this.filter3.frequency.value = 100;

        // Connect filters to each other and to noiseGain
        this.filter1.connect(this.filter2);
        this.filter2.connect(this.filter3);
        this.filter3.connect(this.noiseGain);

        // Lock filters to calm values initially
        this.filter1.frequency.setValueAtTime(400, 0);
        this.filter2.frequency.setValueAtTime(250, 0);
        this.filter3.frequency.setValueAtTime(100, 0);

        // Pink Noise (AudioWorklet -> Biquads)
        try {
            await this.ctx.audioWorklet.addModule('src/audio/NoiseProcessor.js');
            this.noiseNode = new AudioWorkletNode(this.ctx, 'noise-processor');
        } catch (e) {
            console.error("Failed to load AudioWorklet, falling back to ScriptProcessor", e);
            // Fallback if needed
            const bufferSize = 4096;
            this.noiseNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);
            this.noiseNode.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
            };
        }

        // Connect Noise to Filter Chain
        this.noiseNode.connect(this.filter1);

        this.windOsc1.start();
        this.windOsc2.start();
        this.lfoOsc.start();
        this.breathingLfo.start();
    }

    ensureCalmFilters() {
        if (!this.filter1) return;
        const now = this.ctx.currentTime;
        [this.filter1, this.filter2, this.filter3].forEach((filter, i) => {
            const baseFreq = [400, 250, 100][i];
            filter.frequency.cancelScheduledValues(now);
            filter.frequency.setValueAtTime(baseFreq, now);
        });
    }

    setWind(zones) {
        this.initWind();

        const now = this.ctx.currentTime;
        const hasWind = zones && zones.length > 0;

        let targetFreq = 60;
        this.currentWindStrength = 0;

        if (hasWind) {
            const totalStr = zones.reduce((sum, z) => sum + z.strength, 0);
            const avgStr = totalStr / zones.length;
            // FIX: Sanitize the result. If NaN, default to 0.
            this.currentWindStrength = Number.isFinite(avgStr) ? avgStr : 0;

            // Calculate target frequency
            let calculatedFreq = 60 + this.currentWindStrength * 15;

            // FIX: Sanitize frequency. If NaN, default to 60.
            targetFreq = Number.isFinite(calculatedFreq) ? calculatedFreq : 60;
        }

        // === ONLY APPLY CALM BREATHING IF WE ARE ACTUALLY IN CALM STATE ===
        if (this.currentWindStrength <= 0) {
            // Enable breathing + higher base
            this.noiseGain.gain.cancelScheduledValues(now);
            this.noiseGain.gain.setTargetAtTime(0.15, now, 4.0);  // Slightly higher base

            this.breathingGain.gain.cancelScheduledValues(now);
            this.breathingGain.gain.setTargetAtTime(0.3, now, 6.0);  // Stronger swell: 0.015 → 0.041

            // Force filters to stay calm
            this.ensureCalmFilters();
        }
        // === WHEN WIND IS ACTIVE: lock to normal floor (gusts will boost it) ===
        else {
            // Only set base floor if not already there — prevents killing breathing
            if (this.noiseGain.gain.value > 0.04 || this.breathingGain.gain.value > 0.1) {
                this.noiseGain.gain.cancelScheduledValues(now);
                this.noiseGain.gain.setTargetAtTime(0.015, now, 4.0);

                this.breathingGain.gain.cancelScheduledValues(now);
                this.breathingGain.gain.setTargetAtTime(0.0, now, 4.0);
            }
        }

        // When applying the ramp, use the sanitized targetFreq
        this.windOsc1.frequency.cancelScheduledValues(now);
        this.windOsc1.frequency.setTargetAtTime(targetFreq + 1, now, 2.0);

        this.windOsc2.frequency.cancelScheduledValues(now);
        this.windOsc2.frequency.setTargetAtTime(targetFreq + 2, now, 2.0);
    }

    update(dt) {
        if (!this.windInitialized) return;

        // Only process effects if wind is theoretically active
        if (this.currentWindStrength <= 0) {
            // If no wind, we might still want the floor, but maybe not gusts?
            // User said "pink noise floor must be truly always-on".
            // Gusts are wind events. If wind strength is 0, no gusts.
            return;
        }

        // Gusts
        this.gustTimer += dt;
        if (this.gustTimer > this.nextGustTime) {
            this.triggerGust();
            this.gustTimer = 0;
            this.nextGustTime = 2.0 + Math.random() * 3.0;
        }

        // Silence Gaps
        if (!this.isSilent) {
            this.silenceTimer += dt;
            if (this.silenceTimer > this.nextSilenceTime) {
                const chance = Math.max(0.1, 0.6 - (this.currentWindStrength * 0.1));

                if (Math.random() < chance) {
                    this.triggerSilence();
                } else {
                    this.silenceTimer = 0;
                    this.nextSilenceTime = 5 + Math.random() * 5;
                }
            }
        }
    }

    triggerSilence() {
        this.isSilent = true;
        const now = this.ctx.currentTime;
        const fadeOutTime = 2 + Math.random() * 2;
        const gapDuration = 1 + Math.random() * 3;
        const fadeInTime = 2 + Math.random() * 2;

        // Kill Triangles Only
        this.triangleGain.gain.cancelScheduledValues(now);
        this.triangleGain.gain.setTargetAtTime(0, now, fadeOutTime / 3);

        // Keep Pink Noise at Floor (0.015)
        this.noiseGain.gain.cancelScheduledValues(now);
        this.noiseGain.gain.setTargetAtTime(0.015, now, fadeOutTime / 3);

        // Schedule return
        setTimeout(() => {
            if (!this.windInitialized) return;
            const wakeTime = this.ctx.currentTime;

            // Restore Triangles (to base level, which is 0, wait for gust)
            this.triangleGain.gain.cancelScheduledValues(wakeTime);
            this.triangleGain.gain.setTargetAtTime(0, wakeTime, fadeInTime / 3);

            this.isSilent = false;
            this.silenceTimer = 0;
            this.nextSilenceTime = 10 + Math.random() * 10;
        }, (fadeOutTime + gapDuration) * 1000);
    }

    triggerGust() {
        // Guard: No gusts if calm
        if (this.currentWindStrength <= 0) return;
        if (this.isSilent) return;

        const now = this.ctx.currentTime;
        const duration = 0.5 + Math.random();

        // Target Levels
        // Pink Noise Boost: 0.015 -> ~0.06-0.09
        const pinkTarget = 0.06 + Math.random() * 0.03;

        // Triangle Boost: 0 -> ~0.008-0.012
        // Constraint: Triangles < 15% of Pink
        const triTarget = 0.008 + Math.random() * 0.004;

        // 1. Pink Noise Boost (Immediate)
        this.noiseGain.gain.cancelScheduledValues(now);
        this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, now);
        this.noiseGain.gain.linearRampToValueAtTime(pinkTarget, now + 0.5);
        this.noiseGain.gain.exponentialRampToValueAtTime(0.015, now + 0.5 + 8.0); // Ultra-long tail

        // 2. Triangle Boost (Delayed 200ms)
        const triStart = now + 0.2;
        this.triangleGain.gain.cancelScheduledValues(now);
        this.triangleGain.gain.setValueAtTime(this.triangleGain.gain.value, now);
        this.triangleGain.gain.setValueAtTime(this.triangleGain.gain.value, triStart);
        this.triangleGain.gain.linearRampToValueAtTime(triTarget, triStart + 0.5);
        this.triangleGain.gain.exponentialRampToValueAtTime(0.0001, triStart + 0.5 + 8.0); // Tail to near zero

        // Filter Sweep
        const filterAttack = 2.0;
        const filterDecay = 6.0;

        [this.filter1, this.filter2, this.filter3].forEach((filter, i) => {
            const baseFreq = [400, 250, 100][i];
            filter.frequency.cancelScheduledValues(now);
            filter.frequency.setValueAtTime(filter.frequency.value, now);
            filter.frequency.exponentialRampToValueAtTime(1600, now + filterAttack);
            filter.frequency.exponentialRampToValueAtTime(baseFreq, now + filterAttack + filterDecay);
        });
    }
}

