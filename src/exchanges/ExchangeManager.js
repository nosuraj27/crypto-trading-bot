/**
 * Exchange Manager with Testnet/Live Mode Support
 * Manages all exchanges and provides unified trading interface
 */

const BinanceExchange = require('./BinanceExchange');
const KrakenExchange = require('./KrakenExchange');
const MexcExchange = require('./MexcExchange');
const GateioExchange = require('./GateioExchange');
const BybitExchange = require('./BybitExchange');

const { EXCHANGES_CONFIG } = require('../config/exchanges');

class ExchangeManager {
    constructor() {
        this.exchanges = new Map();
        this.tradingMode = process.env.TRADING_MODE || 'testnet';
        this.logger = console;

        this.initialize();
    }

    /**
     * Initialize all exchanges
     */
    initialize() {
        this.logger.log(`🚀 Initializing ExchangeManager in ${this.tradingMode.toUpperCase()} mode`);

        // Initialize each exchange with proper configuration
        this.initializeBinance();
        this.initializeOtherExchanges();

        this.logger.log(`✅ ExchangeManager initialized with ${this.exchanges.size} exchanges`);
    }

    /**
     * Initialize Binance exchange
     */
    initializeBinance() {
        try {
            const config = {
                ...EXCHANGES_CONFIG.binance,
                testnet: this.tradingMode === 'testnet'
            };

            const binance = new BinanceExchange(config);
            this.exchanges.set('binance', binance);

            this.logger.log(`✅ Binance initialized: ${config.testnet ? 'TESTNET' : 'MAINNET'}`);
        } catch (error) {
            this.logger.error(`❌ Failed to initialize Binance: ${error.message}`);
        }
    }

    /**
     * Initialize other exchanges
     */
    initializeOtherExchanges() {
        const exchangeConfigs = {
            kraken: { ...EXCHANGES_CONFIG.kraken, testnet: this.tradingMode === 'testnet' },
            mexc: { ...EXCHANGES_CONFIG.mexc, testnet: this.tradingMode === 'testnet' },
            gateio: { ...EXCHANGES_CONFIG.gateio, testnet: this.tradingMode === 'testnet' },
            bybit: { ...EXCHANGES_CONFIG.bybit, testnet: this.tradingMode === 'testnet' }
        };

        Object.entries(exchangeConfigs).forEach(([name, config]) => {
            if (config && config.enabled) {
                try {
                    let exchange;
                    switch (name) {
                        case 'kraken':
                            exchange = new KrakenExchange(config);
                            break;
                        case 'mexc':
                            exchange = new MexcExchange(config);
                            break;
                        case 'gateio':
                            exchange = new GateioExchange(config);
                            break;
                        case 'bybit':
                            exchange = new BybitExchange(config);
                            break;
                        default:
                            this.logger.log(`📝 ${name} implementation not ready yet`);
                            return;
                    }

                    this.exchanges.set(name, exchange);
                    this.logger.log(`✅ ${name} initialized: ${config.testnet ? 'TESTNET' : 'MAINNET'}`);
                } catch (error) {
                    this.logger.error(`❌ Failed to initialize ${name}: ${error.message}`);
                }
            }
        });
    }    /**
     * Get all enabled exchanges
     * @returns {Map} Map of exchange instances
     */
    getEnabledExchanges() {
        const enabledExchanges = new Map();

        this.exchanges.forEach((exchange, name) => {
            if (exchange.isEnabled && exchange.isEnabled()) {
                enabledExchanges.set(name, exchange);
            }
        });

        return enabledExchanges;
    }

    /**
     * Get exchanges that support trading
     * @returns {Map} Map of trading-enabled exchange instances
     */
    getTradingEnabledExchanges() {
        const tradingExchanges = new Map();

        this.exchanges.forEach((exchange, name) => {
            if (exchange.isTradingEnabled && exchange.isTradingEnabled()) {
                tradingExchanges.set(name, exchange);
            }
        });

        return tradingExchanges;
    }

    /**
     * Get specific exchange by name
     * @param {string} exchangeName - Name of the exchange
     * @returns {Object|null} Exchange instance or null
     */
    getExchange(exchangeName) {
        return this.exchanges.get(exchangeName.toLowerCase()) || null;
    }

    /**
     * Set trading mode for all exchanges
     * @param {string} mode - 'testnet' or 'live'
     */
    setTradingMode(mode) {
        if (!['testnet', 'live'].includes(mode)) {
            throw new Error('Trading mode must be either "testnet" or "live"');
        }

        this.tradingMode = mode;
        this.logger.log(`🔧 Switching to ${mode.toUpperCase()} mode`);

        // Reinitialize exchanges with new mode
        this.exchanges.clear();
        this.initialize();
    }

    /**
     * Get current trading mode
     * @returns {string} Current trading mode
     */
    getTradingMode() {
        return this.tradingMode;
    }

    /**
     * Test connectivity for all exchanges
     * @returns {Promise<Object>} Test results
     */
    async testAllConnections() {
        const results = {};

        for (const [name, exchange] of this.exchanges) {
            try {
                if (exchange.testConnection) {
                    await exchange.testConnection();
                    results[name] = { status: 'success', message: 'Connected successfully' };
                } else {
                    results[name] = { status: 'pending', message: 'Test method not implemented' };
                }
            } catch (error) {
                results[name] = { status: 'error', message: error.message };
            }
        }

        return results;
    }

    /**
     * Get account details for all exchanges
     * @returns {Promise<Object>} Account details for all exchanges
     */
    async getAllAccountDetails() {
        const accounts = {};

        const tradingExchanges = this.getTradingEnabledExchanges();

        for (const [name, exchange] of tradingExchanges) {
            try {
                if (exchange.getAccountDetails) {
                    accounts[name] = await exchange.getAccountDetails();
                }
            } catch (error) {
                accounts[name] = { error: error.message };
            }
        }

        return accounts;
    }

    /**
     * Get balances for all exchanges
     * @param {string} asset - Optional asset to filter by
     * @returns {Promise<Object>} Balances for all exchanges
     */
    async getAllBalances(asset = null) {
        const balances = {};

        const tradingExchanges = this.getTradingEnabledExchanges();

        for (const [name, exchange] of tradingExchanges) {
            try {
                if (exchange.getBalance) {
                    balances[name] = await exchange.getBalance(asset);
                }
            } catch (error) {
                balances[name] = { error: error.message };
            }
        }

        return balances;
    }

    /**
     * Execute order on specific exchange
     * @param {string} exchangeName - Name of the exchange
     * @param {Object} orderParams - Order parameters
     * @returns {Promise<Object>} Order result
     */
    async executeOrder(exchangeName, orderParams) {
        const exchange = this.getExchange(exchangeName);

        if (!exchange) {
            throw new Error(`Exchange ${exchangeName} not found`);
        }

        if (!exchange.isTradingEnabled()) {
            throw new Error(`Trading not enabled for ${exchangeName}`);
        }

        return await exchange.createOrder(orderParams);
    }

    /**
     * Get exchange statistics
     * @returns {Object} Exchange statistics
     */
    getStats() {
        const stats = {
            totalExchanges: this.exchanges.size,
            enabledExchanges: this.getEnabledExchanges().size,
            tradingEnabledExchanges: this.getTradingEnabledExchanges().size,
            tradingMode: this.tradingMode,
            exchanges: {}
        };

        this.exchanges.forEach((exchange, name) => {
            stats.exchanges[name] = {
                enabled: exchange.isEnabled ? exchange.isEnabled() : false,
                tradingEnabled: exchange.isTradingEnabled ? exchange.isTradingEnabled() : false,
                testnet: exchange.testnet || false
            };
        });

        return stats;
    }
}

module.exports = ExchangeManager;
