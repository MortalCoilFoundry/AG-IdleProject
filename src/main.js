import { Game } from './core/Game.js';
import { SettingsModal } from './ui/SettingsModal.js';

window.addEventListener('DOMContentLoaded', () => {
    console.log("Debug: main.js loaded");
    const game = new Game();
    window.game = game; // For debugging

    // Preload Music
    if (game.audio) {
        game.audio.loadMusic('assets/music/track1.mp3');
    }

    // Initialize UI Components
    const settingsModal = new SettingsModal(game.audio);

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
                game.audio.playMusic();
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

    // Ribbon Logic
    const bottomRibbon = document.getElementById('bottom-ribbon');
    if (bottomRibbon) {
        bottomRibbon.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const section = btn.dataset.section;
            if (section === 'settings') {
                settingsModal.render();
                game.audio.playUiBlip();
            }
        });
    }
});
