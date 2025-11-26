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
}
