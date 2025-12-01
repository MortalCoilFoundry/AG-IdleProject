export class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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

    startWind(zones) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (this.windOsc) return; // Already playing

        const totalStr = zones.reduce((sum, z) => sum + z.strength, 0);
        const avgStr = totalStr / zones.length;

        this.windOsc = this.ctx.createOscillator();
        this.windGain = this.ctx.createGain();

        this.windOsc.type = 'sine'; // Softer sound
        // Lower pitch: Base 60Hz + 15Hz per strength unit
        this.windOsc.frequency.setValueAtTime(60 + avgStr * 15, this.ctx.currentTime);

        // Fade in with lower max gain
        this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.windGain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 0.5);

        this.windOsc.connect(this.windGain);
        this.windGain.connect(this.ctx.destination);

        this.windOsc.start();
    }

    stopWind() {
        if (!this.windOsc) return;

        const now = this.ctx.currentTime;
        this.windGain.gain.cancelScheduledValues(now);
        this.windGain.gain.setValueAtTime(this.windGain.gain.value, now);
        this.windGain.gain.linearRampToValueAtTime(0, now + 0.5);

        const osc = this.windOsc;
        osc.stop(now + 0.5);
        setTimeout(() => {
            osc.disconnect();
        }, 600);

        this.windOsc = null;
        this.windGain = null;
    }
}
