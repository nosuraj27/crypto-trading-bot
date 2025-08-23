/**
 * Settings Module
 * Handles application settings and preferences
 */

class SettingsModule {
    constructor() {
        this.settings = {};
        this.loadSettingsFromBackend().then(() => {
            this.initializeElements();
        });
    }

    /**
     * Initialize settings UI elements
     */
    initializeElements() {
        this.setupSoundToggle();
        this.setupSettingsForm();
        this.setupSubmitButton();
    }
    /**
     * Setup submit button functionality
     */
    setupSubmitButton() {
        const submitBtn = document.getElementById('submitSettings');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                try {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                    // Capture current form values before saving
                    this.captureFormValues();
                    await this.saveSettingsToBackend();
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                    setTimeout(() => {
                        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
                        submitBtn.disabled = false;
                    }, 2000);
                } catch (error) {
                    console.error('Error saving settings:', error);
                    submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                    submitBtn.disabled = false;
                    alert('Failed to save settings: ' + error.message);
                }
            });
        }
    }


    /**
     * Capture current form values into settings object
     */
    captureFormValues() {
        const capitalInput = document.getElementById('capitalAmount');
        const thresholdInput = document.getElementById('profitThreshold');
        const frequencySelect = document.getElementById('updateFrequency');
        const broadcastInput = document.getElementById('broadcastThrottleMs');
        const maxPairsInput = document.getElementById('maxTradingPairs');
        const topPairsInput = document.getElementById('topPairsToShow');
        const soundToggle = document.getElementById('soundAlerts');

        if (capitalInput) this.settings.capitalAmount = capitalInput.value;
        if (thresholdInput) this.settings.profitThreshold = thresholdInput.value;
        if (frequencySelect) this.settings.updateFrequency = frequencySelect.value;
        if (broadcastInput) this.settings.broadcastThrottleMs = broadcastInput.value;
        if (maxPairsInput) this.settings.maxTradingPairs = maxPairsInput.value;
        if (topPairsInput) this.settings.topPairsToShow = topPairsInput.value;
        if (soundToggle) this.settings.soundEnabled = soundToggle.checked;
    }


    /**
     * Setup sound toggle functionality
     */
    setupSoundToggle() {
        const soundToggle = document.getElementById('soundAlerts');
        if (soundToggle) {
            soundToggle.checked = this.settings.soundEnabled;
            soundToggle.addEventListener('change', (e) => {
                this.updateSetting('soundEnabled', e.target.checked);
            });
        }
    }

    /**
     * Setup settings form
     */
    setupSettingsForm() {
        // Capital amount
        const capitalInput = document.getElementById('capitalAmount');
        if (capitalInput) {
            capitalInput.value = this.settings.capitalAmount;
            capitalInput.addEventListener('change', (e) => {
                this.updateSetting('capitalAmount', e.target.value);
            });
        }

        // Profit threshold
        const thresholdInput = document.getElementById('profitThreshold');
        if (thresholdInput) {
            thresholdInput.value = this.settings.profitThreshold;
            thresholdInput.addEventListener('change', (e) => {
                this.updateSetting('profitThreshold', e.target.value);
            });
        }

        // Update frequency
        const frequencySelect = document.getElementById('updateFrequency');
        if (frequencySelect) {
            frequencySelect.value = this.settings.updateFrequency;
            frequencySelect.addEventListener('change', (e) => {
                this.updateSetting('updateFrequency', e.target.value);
            });
        }

        // Broadcast throttle
        const broadcastInput = document.getElementById('broadcastThrottleMs');
        if (broadcastInput) {
            broadcastInput.value = this.settings.broadcastThrottleMs;
            broadcastInput.addEventListener('change', (e) => {
                this.updateSetting('broadcastThrottleMs', e.target.value);
            });
        }

        // Max trading pairs
        const maxPairsInput = document.getElementById('maxTradingPairs');
        if (maxPairsInput) {
            maxPairsInput.value = this.settings.maxTradingPairs;
            maxPairsInput.addEventListener('change', (e) => {
                this.updateSetting('maxTradingPairs', e.target.value);
            });
        }

        // Top pairs to show
        const topPairsInput = document.getElementById('topPairsToShow');
        if (topPairsInput) {
            topPairsInput.value = this.settings.topPairsToShow;
            topPairsInput.addEventListener('change', (e) => {
                this.updateSetting('topPairsToShow', e.target.value);
            });
        }
    }

    /**
     * Load settings from backend
     */
    async loadSettingsFromBackend() {
        try {
            // For demo, use userId = 'default'
            const res = await fetch('/api/settings?userId=default');
            if (res.ok) {
                const data = await res.json();
                this.settings = {
                    soundEnabled: data.soundEnabled === 'true',
                    capitalAmount: data.capitalAmount || '2000',
                    profitThreshold: data.profitThreshold || '0.001',
                    updateFrequency: data.updateFrequency || '10',
                    broadcastThrottleMs: data.broadcastThrottleMs || '500',
                    maxTradingPairs: data.maxTradingPairs || '100',
                    topPairsToShow: data.topPairsToShow || '100'
                };
            } else {
                this.settings = this.getDefaultSettings();
            }
        } catch (err) {
            console.warn('Failed to load settings from backend:', err);
            this.settings = this.getDefaultSettings();
        }
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            soundEnabled: false,
            capitalAmount: '2000',
            profitThreshold: '0.001',
            updateFrequency: '10',
            broadcastThrottleMs: '500',
            maxTradingPairs: '100',
            topPairsToShow: '100'
        };
    }
    /**
     * Save settings to backend
     */
    async saveSettingsToBackend() {
        try {
            // For demo, use userId = 'default'
            const payload = {
                userId: 'default',
                settings: {
                    soundEnabled: this.settings.soundEnabled,
                    capitalAmount: this.settings.capitalAmount,
                    profitThreshold: this.settings.profitThreshold,
                    updateFrequency: this.settings.updateFrequency,
                    broadcastThrottleMs: this.settings.broadcastThrottleMs,
                    maxTradingPairs: this.settings.maxTradingPairs,
                    topPairsToShow: this.settings.topPairsToShow
                }
            };

            console.log('Saving settings to backend:', payload);

            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('Backend response:', result);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save settings');
            }

            // Show success notification
            this.showNotification('Settings saved successfully!', 'success');
        } catch (err) {
            console.error('Error saving settings:', err);
            this.showNotification('Failed to save settings: ' + err.message, 'error');
            throw err;
        }
    }


    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('settings-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'settings-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 9999;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        // Set notification style based on type
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3',
            warning: '#ff9800'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        notification.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    /**
     * Update a specific setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem(key, value);

        // Emit event for other modules to listen
        window.dispatchEvent(new CustomEvent('settingChanged', {
            detail: { key, value, settings: this.settings }
        }));
    }

    /**
     * Get a specific setting
     * @param {string} key - Setting key
     * @returns {any} - Setting value
     */
    getSetting(key) {
        return this.settings[key];
    }

    /**
     * Get all settings
     * @returns {Object} - All settings
     */
    getAllSettings() {
        return { ...this.settings };
    }


    /**
     * Export settings to JSON
     * @returns {string} - JSON string of settings
     */
    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * Import settings from JSON
     * @param {string} jsonString - JSON string of settings
     * @returns {boolean} - Success status
     */
    importSettings(jsonString) {
        try {
            const importedSettings = JSON.parse(jsonString);

            // Validate settings structure
            const validKeys = ['soundEnabled', 'capitalAmount', 'profitThreshold', 'updateFrequency'];
            const isValid = Object.keys(importedSettings).every(key => validKeys.includes(key));

            if (!isValid) {
                throw new Error('Invalid settings format');
            }

            // Update settings
            for (const [key, value] of Object.entries(importedSettings)) {
                this.updateSetting(key, value);
            }

            // Update UI elements
            this.initializeElements();

            console.log('Settings imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }

    /**
     * Toggle sound enabled/disabled
     */
    toggleSound() {
        const newValue = !this.settings.soundEnabled;
        this.updateSetting('soundEnabled', newValue);

        // Update the checkbox if it exists
        const soundToggle = document.getElementById('soundAlerts');
        if (soundToggle) {
            soundToggle.checked = newValue;
        }

        // Show feedback
        console.log(`🔊 Sound ${newValue ? 'enabled' : 'disabled'}`);
        return newValue;
    }
}

// Export for use in main app
window.SettingsModule = SettingsModule;
