/**
 * Exchange Factory
 * Creates and manages exchange instances with testnet/live mode support
 */

const { EXCHANGES_CONFIG } = require('../config/exchanges');
const BinanceExchange = require('./BinanceExchange');
const KrakenExchange = require('./KrakenExchange');
const MexcExchange = require('./MexcExchange');
const GateioExchange = require('./GateioExchange');
const BybitExchange = require('./BybitExchange');
const ExchangeManager = require('./ExchangeManager');

class ExchangeFactory {
    static exchanges = new Map();
    static tradingMode = process.env.TRADING_MODE || 'testnet';

    /**
     * Create exchange manager instance (recommended approach)
     * @returns {ExchangeManager} Exchange manager instance
     */
    static createExchangeManager() {
        return new ExchangeManager();
    }

    /**
     * Initialize all exchanges with trading mode support
     * @param {string} tradingMode - 'testnet' or 'live'
     * @returns {Map} - Map of exchange instances
     */
    static initializeExchanges(tradingMode = null) {
        if (tradingMode) {
            this.tradingMode = tradingMode;
        }

        // Clear existing exchanges
        this.exchanges.clear();

        console.log(`🚀 Initializing exchanges in ${this.tradingMode.toUpperCase()} mode`);

        // Create exchange instances
        for (const [key, config] of Object.entries(EXCHANGES_CONFIG)) {
            if (config.enabled) {
                // Apply trading mode to configuration
                const modeConfig = {
                    ...config,
                    testnet: this.tradingMode === 'testnet'
                };

                const exchange = this.createExchange(key, modeConfig);
                if (exchange) {
                    this.exchanges.set(key, exchange);
                }
            }
        }

        console.log(`✅ Initialized ${this.exchanges.size} enabled exchanges`);
        return this.exchanges;
    }

    /**
     * Create a specific exchange instance
     * @param {string} exchangeKey - Exchange identifier
     * @param {Object} config - Exchange configuration
     * @returns {BaseExchange|null} - Exchange instance or null
     */
    static createExchange(exchangeKey, config) {
        try {
            switch (exchangeKey) {
                case 'binance':
                    return new BinanceExchange(config);
                case 'kraken':
                    return new KrakenExchange(config);
                case 'mexc':
                    return new MexcExchange(config);
                case 'gateio':
                    return new GateioExchange(config);
                case 'bybit':
                    return new BybitExchange(config);
                default:
                    console.warn(`⚠️  Exchange ${exchangeKey} not implemented yet`);
                    return null;
            }
        } catch (error) {
            console.error(`❌ Failed to create ${exchangeKey} exchange:`, error.message);
            return null;
        }
    }

    /**
     * Get all initialized exchanges
     * @returns {Map} - Map of exchange instances
     */
    static getExchanges() {
        return this.exchanges;
    }

    /**
     * Get a specific exchange
     * @param {string} exchangeKey - Exchange identifier
     * @returns {BaseExchange|null} - Exchange instance or null
     */
    static getExchange(exchangeKey) {
        return this.exchanges.get(exchangeKey) || null;
    }

    /**
     * Get enabled exchanges only
     * @returns {Map} - Map of enabled exchange instances
     */
    static getEnabledExchanges() {
        const enabledExchanges = new Map();
        for (const [key, exchange] of this.exchanges) {
            if (exchange.isEnabled()) {
                enabledExchanges.set(key, exchange);
            }
        }
        return enabledExchanges;
    }

    /**
     * Get trading-enabled exchanges only
     * @returns {Map} - Map of trading-enabled exchange instances
     */
    static getTradingEnabledExchanges() {
        const tradingExchanges = new Map();
        for (const [key, exchange] of this.exchanges) {
            if (exchange.isEnabled() && exchange.isTradingEnabled && exchange.isTradingEnabled()) {
                tradingExchanges.set(key, exchange);
            }
        }
        return tradingExchanges;
    }

    /**
     * Set trading mode for all exchanges
     * @param {string} mode - 'testnet' or 'live'
     */
    static setTradingMode(mode) {
        if (!['testnet', 'live'].includes(mode)) {
            throw new Error('Trading mode must be either "testnet" or "live"');
        }

        this.tradingMode = mode;
        console.log(`🔧 Switching to ${mode.toUpperCase()} mode`);

        // Reinitialize exchanges with new mode
        this.initializeExchanges();
    }

    /**
     * Get current trading mode
     * @returns {string} Current trading mode
     */
    static getTradingMode() {
        return this.tradingMode;
    }

    /**
     * Get exchange configurations for API responses
     * @returns {Object} - Exchange configurations
     */
    static getExchangeConfigs() {
        const configs = {};
        for (const [key, config] of Object.entries(EXCHANGES_CONFIG)) {
            configs[key] = {
                name: config.name,
                color: config.color,
                enabled: config.enabled,
                fee: config.fee
            };
        }
        return configs;
    }
}

module.exports = ExchangeFactory;
