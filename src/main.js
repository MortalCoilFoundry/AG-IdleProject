import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    window.game = game; // For debugging
});
