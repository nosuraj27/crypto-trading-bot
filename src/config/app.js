/**
 * Application Configuration
 * Contains general app settings, environment variables, and constants
 */

const APP_CONFIG = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
        env: process.env.NODE_ENV || 'development'
    },

    // Trading Mode Configuration
    mode: {
        trading: process.env.TRADING_MODE || 'testnet', // 'testnet' or 'live'
        isTestnet: (process.env.TRADING_MODE || 'testnet') === 'testnet'
    },

    // Update intervals (configurable via environment)
    intervals: {
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 10000, // 10 seconds
        webSocketReconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY) || 3000, // 3 seconds
        priceUpdateInterval: parseInt(process.env.PRICE_UPDATE_INTERVAL) || 1000 // 1 second
    },

    // Trading Configuration (all configurable via environment)
    trading: {
        defaultCapital: parseFloat(process.env.DEFAULT_CAPITAL) || 100, // Reduced for testnet
        minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD) || 0.1, // 0.1% minimum profit threshold
        maxTradingPairs: parseInt(process.env.MAX_TRADING_PAIRS) || 50, // Reduced for testnet
        topPairsToShow: parseInt(process.env.TOP_PAIRS_TO_SHOW) || 50,
        broadcastThrottleMs: parseInt(process.env.BROADCAST_THROTTLE_MS) || 500, // 500ms
        maxTradeAmount: parseFloat(process.env.MAX_TRADE_AMOUNT) || 1000, // Maximum single trade amount
        minTradeAmount: parseFloat(process.env.MIN_TRADE_AMOUNT) || 10, // Minimum single trade amount
        // Demo mode settings
        demoSpreadMin: parseFloat(process.env.DEMO_SPREAD_MIN) || 0.002, // 0.2%
        demoSpreadMax: parseFloat(process.env.DEMO_SPREAD_MAX) || 0.005, // 0.5%
        // Arbitrage thresholds
        directArbitrageThreshold: parseFloat(process.env.DIRECT_ARBITRAGE_THRESHOLD) || 0.01, // 0.01%
        triangularArbitrageThreshold: parseFloat(process.env.TRIANGULAR_ARBITRAGE_THRESHOLD) || 0.1, // 0.1%
        maxArbitrageProfit: parseFloat(process.env.MAX_ARBITRAGE_PROFIT) || 1.0 // 1.0% cap
    },

    // WebSocket Configuration
    websocket: {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"]
        },
        maxUpdateAge: parseInt(process.env.WS_MAX_UPDATE_AGE) || 30000, // 30 seconds
        priceChangeThreshold: parseFloat(process.env.PRICE_CHANGE_THRESHOLD) || 0.01 // 0.01%
    },

    // API Configuration
    api: {
        userAgent: process.env.USER_AGENT || 'Arbitrage-Bot/1.0',
        maxRetries: parseInt(process.env.API_MAX_RETRIES) || 3,
        baseTimeout: parseInt(process.env.API_BASE_TIMEOUT) || 5000,
        exponentialBackoffMs: parseInt(process.env.API_EXPONENTIAL_BACKOFF) || 1000
    },

    // Exchange Fee Configuration (fallback defaults)
    fees: {
        binance: parseFloat(process.env.BINANCE_FEE) || 0.001, // 0.1%
        gateio: parseFloat(process.env.GATEIO_FEE) || 0.002, // 0.2%
        bybit: parseFloat(process.env.BYBIT_FEE) || 0.001, // 0.1%
        kraken: parseFloat(process.env.KRAKEN_FEE) || 0.0026, // 0.26%
        mexc: parseFloat(process.env.MEXC_FEE) || 0.002 // 0.2%
    },

    // Currency Configuration
    currencies: {
        baseCurrencies: (process.env.BASE_CURRENCIES || 'USDT,BTC,ETH').split(','),
        quoteCurrency: process.env.QUOTE_CURRENCY || 'USDT',
        supportedQuotes: (process.env.SUPPORTED_QUOTES || 'USDT,BUSD,USDC').split(',')
    }
};

module.exports = APP_CONFIG;
