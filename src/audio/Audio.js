export class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.windInitialized = false;
        this.gustTimer = 0;
        this.nextGustTime = 2.5;
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
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHit() {
        // Shoot sound
        this.playTone(150, 'square', 0.1);
        setTimeout(() => this.playTone(100, 'square', 0.1), 50);
    }

    playWallHit() {
        // Thud
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
    }

    initWind() {
        if (this.windInitialized) return;
        this.windInitialized = true;

        // Node Graph: [Osc1, Osc2] -> [GustGain] -> [MasterGain] -> [Destination]

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0;
        this.masterGain.connect(this.ctx.destination);

        this.gustGain = this.ctx.createGain();
        this.gustGain.gain.value = 1.0;
        this.gustGain.connect(this.masterGain);

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
        this.lfoOsc.frequency.value = 0.2; // 0.2Hz
        this.lfoGain.gain.value = 3; // ±3Hz

        this.lfoOsc.connect(this.lfoGain);
        this.lfoGain.connect(this.windOsc1.frequency);
        this.lfoGain.connect(this.windOsc2.frequency);

        this.windOsc1.connect(this.gustGain);
        this.windOsc2.connect(this.gustGain);

        // Start everything forever
        this.windOsc1.start();
        this.windOsc2.start();
        this.lfoOsc.start();
    }

    setWind(zones) {
        this.initWind();

        const now = this.ctx.currentTime;
        const hasWind = zones && zones.length > 0;

        // Calculate target parameters
        let targetGain = 0;
        let targetFreq = 60;

        if (hasWind) {
            const totalStr = zones.reduce((sum, z) => sum + z.strength, 0);
            const avgStr = totalStr / zones.length;
            targetGain = 0.08;
            targetFreq = 60 + avgStr * 15;
        }

        // Ramp Master Gain (Volume)
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(targetGain, now, 0.5); // Smooth fade

        // Ramp Frequency (Pitch)
        this.windOsc1.frequency.cancelScheduledValues(now);
        this.windOsc1.frequency.setTargetAtTime(targetFreq, now, 0.5);

        this.windOsc2.frequency.cancelScheduledValues(now);
        this.windOsc2.frequency.setTargetAtTime(targetFreq + 4, now, 0.5);
    }

    update(dt) {
        if (!this.windInitialized) return;

        // Only process gusts if wind is audible
        if (this.masterGain.gain.value < 0.01) return;

        this.gustTimer += dt;
        if (this.gustTimer > this.nextGustTime) {
            this.triggerGust();
            this.gustTimer = 0;
            this.nextGustTime = 2.0 + Math.random() * 3.0; // Random interval 2-5s
        }
    }

    triggerGust() {
        const now = this.ctx.currentTime;
        const duration = 0.5 + Math.random();
        const boost = 0.5 + Math.random() * 0.5; // Boost gust gain to 1.5-2.0

        this.gustGain.gain.cancelScheduledValues(now);
        this.gustGain.gain.setValueAtTime(this.gustGain.gain.value, now);
        this.gustGain.gain.linearRampToValueAtTime(1.0 + boost, now + 0.2);
        this.gustGain.gain.linearRampToValueAtTime(1.0, now + duration);
    }
}
