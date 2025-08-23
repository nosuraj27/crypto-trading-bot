/**
 * Configuration Service
 * Manages application configuration with database persistence
 * Allows runtime configuration updates from user settings
 */

const APP_CONFIG = require('../config/app');
const UserSettingService = require('./UserSettingService');

class ConfigService {
    constructor() {
        this.config = { ...APP_CONFIG }; // Start with default config
        this.listeners = new Map(); // For config change listeners
        this.isInitialized = false;
    }

    /**
     * Initialize configuration from database
     */
    async initialize() {
        try {
            await this.loadFromDatabase();
            this.isInitialized = true;
            console.log('✅ ConfigService initialized with database settings');
        } catch (error) {
            console.warn('⚠️ ConfigService fallback to default config:', error.message);
            this.isInitialized = true;
        }
    }

    /**
     * Load configuration overrides from database
     */
    async loadFromDatabase() {
        try {
            const settings = await UserSettingService.getUserSettings('default');

            // Apply database settings to config
            settings.forEach(setting => {
                this.applySettingToConfig(setting.key, setting.value);
            });

            console.log('🔄 Configuration updated from database');
        } catch (error) {
            throw new Error(`Failed to load config from database: ${error.message}`);
        }
    }

    /**
     * Apply a setting from database to the configuration
     */
    applySettingToConfig(key, value) {
        const numericValue = parseFloat(value);
        const booleanValue = value === 'true';

        switch (key) {
            case 'capitalAmount':
            case 'defaultCapital':
                this.config.trading.defaultCapital = numericValue || this.config.trading.defaultCapital;
                break;

            case 'profitThreshold':
            case 'minProfitThreshold':
                this.config.trading.minProfitThreshold = numericValue || this.config.trading.minProfitThreshold;
                break;

            case 'maxTradingPairs':
                this.config.trading.maxTradingPairs = numericValue || this.config.trading.maxTradingPairs;
                break;

            case 'topPairsToShow':
                this.config.trading.topPairsToShow = numericValue || this.config.trading.topPairsToShow;
                break;

            case 'broadcastThrottleMs':
                this.config.trading.broadcastThrottleMs = numericValue || this.config.trading.broadcastThrottleMs;
                break;

            case 'healthCheckInterval':
                this.config.intervals.healthCheckInterval = numericValue || this.config.intervals.healthCheckInterval;
                break;

            case 'webSocketReconnectDelay':
                this.config.intervals.webSocketReconnectDelay = numericValue || this.config.intervals.webSocketReconnectDelay;
                break;

            case 'updateFrequency':
                // Convert seconds to milliseconds for internal use
                this.config.intervals.updateFrequency = (numericValue * 1000) || 10000;
                break;

            default:
                // Store unknown settings in a custom section
                if (!this.config.custom) this.config.custom = {};
                this.config.custom[key] = value;
                break;
        }
    }

    /**
     * Update configuration setting and save to database
     */
    async updateSetting(key, value, userId = 'default') {
        try {
            // Save to database first
            await UserSettingService.saveUserSetting(userId, key, String(value));

            // Apply to current config
            this.applySettingToConfig(key, value);

            // Notify listeners
            this.notifyListeners(key, value);

            console.log(`⚙️ Configuration updated: ${key} = ${value}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to update setting ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get specific configuration value by path
     */
    get(path) {
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            value = value?.[key];
            if (value === undefined) break;
        }

        return value;
    }

    /**
     * Get trading configuration
     */
    getTradingConfig() {
        return { ...this.config.trading };
    }

    /**
     * Get intervals configuration
     */
    getIntervalsConfig() {
        return { ...this.config.intervals };
    }

    /**
     * Get WebSocket configuration
     */
    getWebSocketConfig() {
        return { ...this.config.websocket };
    }

    /**
     * Add listener for configuration changes
     */
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }

    /**
     * Remove listener for configuration changes
     */
    removeListener(key, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);
        }
    }

    /**
     * Notify listeners of configuration changes
     */
    notifyListeners(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error(`❌ Config listener error for ${key}:`, error);
                }
            });
        }
    }

    /**
     * Reset to default configuration
     */
    async resetToDefaults(userId = 'default') {
        try {
            // Clear user settings from database
            const settings = await UserSettingService.getUserSettings(userId);
            for (const setting of settings) {
                await UserSettingService.saveUserSetting(userId, setting.key, '');
            }

            // Reset to default config
            this.config = { ...APP_CONFIG };

            console.log('🔄 Configuration reset to defaults');
            return true;
        } catch (error) {
            console.error('❌ Failed to reset configuration:', error);
            throw error;
        }
    }

    /**
     * Get configuration summary for API
     */
    getConfigSummary() {
        return {
            trading: this.getTradingConfig(),
            intervals: this.getIntervalsConfig(),
            websocket: {
                maxUpdateAge: this.config.websocket.maxUpdateAge,
                priceChangeThreshold: this.config.websocket.priceChangeThreshold
            },
            isInitialized: this.isInitialized,
            lastUpdated: new Date().toISOString()
        };
    }
}

// Create singleton instance
const configService = new ConfigService();

module.exports = configService;