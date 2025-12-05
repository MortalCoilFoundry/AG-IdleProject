export class PlayerState {
    constructor() {
        this.storageKey = 'retro-putt-profile';
        this.data = this.load();
    }

    load() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse player state, resetting defaults.', e);
            }
        }
        return this.getDefaults();
    }

    getDefaults() {
        return {
            inventory: {
                prediction: 5
            },
            currency: 0
        };
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    hasItem(itemId) {
        return (this.data.inventory[itemId] || 0) > 0;
    }

    getItemCount(itemId) {
        return this.data.inventory[itemId] || 0;
    }

    useItem(itemId) {
        if (this.hasItem(itemId)) {
            this.data.inventory[itemId]--;
            this.save();
            return true;
        }
        return false;
    }

    addItem(itemId, amount) {
        if (!this.data.inventory[itemId]) {
            this.data.inventory[itemId] = 0;
        }
        this.data.inventory[itemId] += amount;
        this.save();
    }
}
