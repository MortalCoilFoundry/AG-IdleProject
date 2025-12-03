import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    console.log("Debug: main.js loaded");
    const game = new Game();
    window.game = game; // For debugging

    // Start Screen Logic
    const startScreen = document.getElementById('start-screen');

    if (startScreen) {
        function handleStartInteraction(e) {
            // Prevent default to stop double-firing on touch devices
            if (e.type === 'touchstart') e.preventDefault();

            console.log("Game Started: Audio Context Resuming...");

            // A. Ignite Audio (Crucial Step)
            // This uses the explicit user gesture to unlock the Web Audio API
            if (game.audio) {
                game.audio.resume();
            }

            // B. Hide the Overlay
            startScreen.classList.add('hidden');

            // C. Cleanup Listeners
            startScreen.removeEventListener('click', handleStartInteraction);
            startScreen.removeEventListener('touchstart', handleStartInteraction);
        }

        // 3. Attach Listeners
        // Listen for both click (desktop) and touchstart (mobile) for immediate response
        startScreen.addEventListener('click', handleStartInteraction);
        startScreen.addEventListener('touchstart', handleStartInteraction, { passive: false });
    }
});
