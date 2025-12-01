import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    console.log("Debug: main.js loaded");
    const game = new Game();
    window.game = game; // For debugging
});
