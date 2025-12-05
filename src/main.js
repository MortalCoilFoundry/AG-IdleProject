import { Game } from './core/Game.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { CourseModal } from './ui/CourseModal.js';
import { GameManager } from './core/GameManager.js';

window.addEventListener('DOMContentLoaded', () => {
    console.log("Debug: main.js loaded");
    const game = new Game();
    window.game = game; // For debugging

    // Preload Music
    if (game.audio) {
        game.audio.loadMusic('assets/music/track1.mp3');
    }

    // Initialize Core Managers
    const gameManager = new GameManager(game);

    // Initialize UI Components
    const settingsModal = new SettingsModal(game.audio);
    const courseModal = new CourseModal('modal-container', 'modal-overlay', {
        onTestChamber: () => gameManager.startTestSession(),
        onCampaignLevel: (index) => gameManager.startCampaignLevel(index)
    });

    // Initialize Editor
    // Dynamic import would be better for code splitting, but static is fine for now
    import('./editor/LevelEditor.js').then(module => {
        const LevelEditor = module.LevelEditor;
        const levelEditor = new LevelEditor(game);

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
                } else if (section === 'courses') {
                    courseModal.open();
                    game.audio.playUiBlip();
                } else if (section === 'editor') {
                    if (levelEditor.enabled) {
                        levelEditor.disable();
                        btn.classList.remove('active'); // Optional visual feedback
                    } else {
                        levelEditor.enable();
                        btn.classList.add('active'); // Optional visual feedback
                        alert("Editor Mode Enabled!\nCtrl+S: Export Level Code\nCtrl+L: Import Level Code");
                    }
                    game.audio.playUiBlip();
                }
            });
        }
    });

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
});
