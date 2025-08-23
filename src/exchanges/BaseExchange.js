/**
 * Base Exchange Class
 * Abstract class that defines the interface for all exchange implementations
 */

const HttpUtils = require('../utils/http');

class BaseExchange {
    constructor(config) {
        this.name = config.name;
        this.apiUrl = config.api;
        this.wsUrl = config.wsUrl;
        this.fee = config.fee;
        this.timeout = config.timeout;
        this.retries = config.retries;
        this.enabled = config.enabled;
        this.color = config.color;
    }

    /**
     * Fetch prices from the exchange (to be implemented by subclasses)
     * @param {Array} tradingPairs - Array of trading pair objects
     * @returns {Promise<Object>} - Object with symbol-price mappings
     */
    async fetchPrices(tradingPairs) {
        throw new Error('fetchPrices method must be implemented by subclass');
    }

    /**
     * Initialize WebSocket connection (to be implemented by subclasses)
     * @param {Array} tradingPairs - Array of trading pair objects
     * @param {Function} onPriceUpdate - Callback for price updates
     * @returns {WebSocket} - WebSocket connection
     */
    initializeWebSocket(tradingPairs, onPriceUpdate) {
        throw new Error('initializeWebSocket method must be implemented by subclass');
    }

    /**
     * Check if exchange is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get exchange configuration for API responses
     * @returns {Object}
     */
    getConfig() {
        return {
            name: this.name,
            color: this.color,
            enabled: this.enabled,
            fee: this.fee
        };
    }

    /**
     * Protected method to make HTTP requests with retry logic
     * @param {string} url - URL to fetch
     * @returns {Promise<Object>} - Response data
     */
    async _fetchWithRetry(url) {
        return await HttpUtils.fetchWithRetry(url, this.retries, this.timeout);
    }

    /**
     * Log exchange-specific messages
     * @param {string} level - Log level (info, warn, error)
     * @param {string} message - Log message
     */
    _log(level, message) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.name}]`;

        switch (level) {
            case 'info':
                console.log(`${prefix} ℹ️  ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️  ${message}`);
                break;
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }

    /**
     * Get balance for a specific asset (to be implemented by subclasses)
     * @param {string} asset - Asset symbol (e.g., 'USDT', 'BTC')
     * @returns {Promise<Object>} - Balance information
     */
    async getBalance(asset) {
        throw new Error('getBalance method must be implemented by subclass');
    }

    /**
     * Create an order (to be implemented by subclasses)
     * @param {Object} orderParams - Order parameters
     * @returns {Promise<Object>} - Order result
     */
    async createOrder(orderParams) {
        throw new Error('createOrder method must be implemented by subclass');
    }

    /**
     * Check if trading is enabled for this exchange
     * @returns {boolean}
     */
    isTradingEnabled() {
        return this.enabled && this.apiKey && this.apiSecret;
    }

    /**
     * Set API credentials
     * @param {string} apiKey - API key
     * @param {string} apiSecret - API secret
     */
    setCredentials(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }
}

module.exports = BaseExchange;
