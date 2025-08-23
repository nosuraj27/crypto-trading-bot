/**
 * Trading Pairs and Coins Configuration
 * Centralized management of cryptocurrencies and trading pairs
 */

// Import Top 100 Cryptocurrencies configuration
const { TOP_100_CRYPTOS } = require('./top100Cryptos');

// Use TOP_100_CRYPTOS as the primary CRYPTO_COINS configuration
const CRYPTO_COINS = TOP_100_CRYPTOS;


// Trading pair configuration
const TRADING_PAIRS_CONFIG = {
    // Maximum number of pairs to monitor simultaneously
    maxPairs: 100,

    // Volume filtering disabled - match coins only
    minVolume24h: 0, // No minimum volume requirement
    volumeFilteringEnabled: false, // Disable volume filtering

    // Maximum number of pairs to display in UI
    maxDisplayPairs: 50, // Show all available pairs

    // Auto-fetch top pairs from Binance
    autoFetchFromBinance: true,

    // Fallback to static list if API fails
    useFallbackOnError: true,

    // Update interval for pair list (in hours)
    updateIntervalHours: 24,

    // Quote currencies to support
    supportedQuotes: ['USDT', 'BUSD', 'USDC'],

    // Preferred quote currency
    preferredQuote: 'USDT'
};

// Exchange-specific pair mappings and support
const EXCHANGE_PAIR_SUPPORT = {
    binance: {
        // Binance supports all our configured pairs
        supportedPairs: Object.keys(CRYPTO_COINS).map(key => CRYPTO_COINS[key].symbol),
        pairMapping: {}, // Direct mapping (no conversion needed)
        enabled: true
    },

    kraken: {
        supportedPairs: [
            'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'LTCUSDT',
            'BCHUSDT', 'XLMUSDT', 'XRPUSDT', 'SOLUSDT', 'MATICUSDT', 'AVAXUSDT',
            'UNIUSDT', 'ATOMUSDT', 'ALGOUSDT'
        ],
        pairMapping: {
            'BTCUSDT': 'XXBTZUSD',
            'ETHUSDT': 'XETHZUSD',
            'ADAUSDT': 'ADAUSD',
            'DOTUSDT': 'DOTUSD',
            'LINKUSDT': 'LINKUSD',
            'LTCUSDT': 'XLTCZUSD',
            'BCHUSDT': 'BCHUSD',
            'XLMUSDT': 'XXLMZUSD',
            'XRPUSDT': 'XXRPZUSD',
            'SOLUSDT': 'SOLUSD',
            'MATICUSDT': 'MATICUSD',
            'AVAXUSDT': 'AVAXUSD',
            'UNIUSDT': 'UNIUSD',
            'ATOMUSDT': 'ATOMUSD',
            'ALGOUSDT': 'ALGOUSD'
        },
        enabled: true
    },

    coinbase: {
        supportedPairs: [
            'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'LTCUSDT',
            'BCHUSDT', 'XLMUSDT', 'XRPUSDT', 'SOLUSDT', 'MATICUSDT', 'AVAXUSDT',
            'UNIUSDT', 'ATOMUSDT', 'ALGOUSDT'
        ],
        pairMapping: {
            'BTCUSDT': 'BTC-USD',
            'ETHUSDT': 'ETH-USD',
            'ADAUSDT': 'ADA-USD',
            'DOTUSDT': 'DOT-USD',
            'LINKUSDT': 'LINK-USD',
            'LTCUSDT': 'LTC-USD',
            'BCHUSDT': 'BCH-USD',
            'XLMUSDT': 'XLM-USD',
            'XRPUSDT': 'XRP-USD',
            'SOLUSDT': 'SOL-USD',
            'MATICUSDT': 'MATIC-USD',
            'AVAXUSDT': 'AVAX-USD',
            'UNIUSDT': 'UNI-USD',
            'ATOMUSDT': 'ATOM-USD',
            'ALGOUSDT': 'ALGO-USD'
        },
        enabled: false // Disabled by default
    },

    mexc: {
        supportedPairs: [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT',
            'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'LTCUSDT', 'MATICUSDT'
        ],
        pairMapping: {}, // Direct mapping
        enabled: true // Now implemented and working
    },

    gateio: {
        supportedPairs: [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT',
            'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'LTCUSDT', 'MATICUSDT'
        ],
        pairMapping: {
            'BTCUSDT': 'BTC_USDT',
            'ETHUSDT': 'ETH_USDT',
            'BNBUSDT': 'BNB_USDT',
            'SOLUSDT': 'SOL_USDT',
            'ADAUSDT': 'ADA_USDT',
            'XRPUSDT': 'XRP_USDT',
            'DOTUSDT': 'DOT_USDT',
            'LINKUSDT': 'LINK_USDT',
            'AVAXUSDT': 'AVAX_USDT',
            'LTCUSDT': 'LTC_USDT',
            'MATICUSDT': 'MATIC_USDT'
        },
        enabled: true // Now implemented and working
    },

    bybit: {
        supportedPairs: [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT',
            'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'LTCUSDT', 'MATICUSDT'
        ],
        pairMapping: {}, // Direct mapping
        enabled: true // Now implemented and working
    }
};

// Configuration validation and utility functions
class TradingPairsConfig {
    /**
     * Get enabled cryptocurrencies ordered by index
     * @returns {Array} - Array of enabled crypto configurations
     */
    static getEnabledCryptos() {
        return Object.entries(CRYPTO_COINS)
            .filter(([_, crypto]) => crypto.enabled)
            .map(([pair, crypto]) => ({ ...crypto, pair }));
    }

    /**
     * Get all enabled trading pairs
     * @returns {Array} - Array of trading pair symbols
     */
    static getEnabledTradingPairs() {
        return this.getEnabledCryptos().map(crypto => crypto.pair);
    }

    /**
     * Get supported pairs for a specific exchange
     * @param {string} exchange - Exchange identifier
     * @returns {Array} - Array of supported pair symbols
     */
    static getSupportedPairsForExchange(exchange) {
        const exchangeConfig = EXCHANGE_PAIR_SUPPORT[exchange];
        if (!exchangeConfig || !exchangeConfig.enabled) {
            return [];
        }

        const enabledPairs = this.getEnabledTradingPairs();
        return enabledPairs.filter(pair =>
            exchangeConfig.supportedPairs.includes(pair)
        );
    }

    /**
     * Get pair mapping for an exchange
     * @param {string} exchange - Exchange identifier
     * @param {string} pair - Trading pair symbol
     * @returns {string} - Mapped pair symbol for the exchange
     */
    static getMappedPair(exchange, pair) {
        const exchangeConfig = EXCHANGE_PAIR_SUPPORT[exchange];
        if (!exchangeConfig) {
            return pair;
        }

        return exchangeConfig.pairMapping[pair] || pair;
    }

    /**
     * Get crypto configuration by symbol
     * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
     * @returns {Object|null} - Crypto configuration or null
     */
    static getCryptoBySymbol(symbol) {
        return Object.values(CRYPTO_COINS).find(crypto => crypto.symbol === symbol) || null;
    }

    /**
     * Enable/disable a cryptocurrency
     * @param {string} baseAsset - Base asset (e.g., 'BTC')
     * @param {boolean} enabled - Enable or disable
     */
    static setCryptoEnabled(baseAsset, enabled) {
        if (CRYPTO_COINS[baseAsset]) {
            CRYPTO_COINS[baseAsset].enabled = enabled;
        }
    }

    /**
     * Add a new cryptocurrency configuration
     * @param {string} baseAsset - Base asset symbol
     * @param {Object} config - Crypto configuration
     */
    static addCrypto(baseAsset, config) {
        CRYPTO_COINS[baseAsset] = {
            symbol: `${baseAsset}USDT`,
            name: config.name,
            icon: config.icon || 'fas fa-coins',
            image: config.image || `https://cryptoicons.org/api/white/${baseAsset.toLowerCase()}/32`,
            baseAsset: baseAsset,
            enabled: config.enabled !== false
        };
    }

    /**
     * Get trading pairs configuration
     * @returns {Object} - Trading pairs configuration
     */
    static getTradingPairsConfig() {
        return { ...TRADING_PAIRS_CONFIG };
    }

    /**
     * Get exchange pair support configuration
     * @returns {Object} - Exchange pair support configuration
     */
    static getExchangePairSupport() {
        return { ...EXCHANGE_PAIR_SUPPORT };
    }

    /**
     * Validate if a pair is supported across multiple exchanges
     * @param {string} pair - Trading pair symbol
     * @returns {Array} - Array of exchanges that support this pair
     */
    static getExchangesSupportingPair(pair) {
        // First try to find the crypto config by the pair symbol
        const cryptoConfig = CRYPTO_COINS[pair];
        if (cryptoConfig && cryptoConfig.supportedExchanges) {
            // Filter to only enabled exchanges using EXCHANGE_PAIR_SUPPORT
            return cryptoConfig.supportedExchanges.filter(exchange =>
                EXCHANGE_PAIR_SUPPORT[exchange] && EXCHANGE_PAIR_SUPPORT[exchange].enabled
            );
        }

        // Fallback to old method for backward compatibility
        const supportingExchanges = [];
        for (const [exchange, config] of Object.entries(EXCHANGE_PAIR_SUPPORT)) {
            if (config.enabled && config.supportedPairs.includes(pair)) {
                supportingExchanges.push(exchange);
            }
        }
        return supportingExchanges;
    }

    /**
     * Get pairs that are supported by at least minExchanges
     * @param {number} minExchanges - Minimum number of exchanges
     * @returns {Array} - Array of trading pairs
     */
    static getPairsWithMinExchangeSupport(minExchanges = 2) {
        const enabledPairs = this.getEnabledTradingPairs();

        return enabledPairs.filter(pair => {
            const supportingExchanges = this.getExchangesSupportingPair(pair);
            return supportingExchanges.length >= minExchanges;
        });
    }
}

module.exports = {
    CRYPTO_COINS,
    TRADING_PAIRS_CONFIG,
    EXCHANGE_PAIR_SUPPORT,
    TradingPairsConfig
};
