/**
 * Exchange Configuration
 * Contains all exchange-specific settings, APIs, and fees
 */

const { EXCHANGE_PAIR_SUPPORT } = require('./tradingPairs');

const EXCHANGES_CONFIG = {
    binance: {
        name: 'Binance',
        api: 'https://api.binance.com/api/v3/ticker/price',
        wsUrl: 'wss://stream.binance.com:9443/ws/!ticker@arr',
        // Testnet URLs
        testnetApiUrl: 'https://testnet.binance.vision/api/v3',
        testnetWsUrl: 'wss://testnet.binance.vision/ws-api/v3',
        fee: 0.001, // 0.1%
        timeout: 5000,
        retries: 3,
        enabled: true,
        color: '#F3BA2F',
        // API credentials from environment
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_API_SECRET,
        testnet: process.env.BINANCE_TESTNET === 'true'
    },
    coinbase: {
        name: 'Coinbase Pro',
        api: 'https://api.exchange.coinbase.com/products',
        wsUrl: 'wss://ws-feed.exchange.coinbase.com',
        fee: 0.005, // 0.5%
        timeout: 5000,
        retries: 3,
        enabled: false, // Disabled - using only real-time WebSocket exchanges
        color: '#0052FF'
    },
    kraken: {
        name: 'Kraken',
        api: 'https://api.kraken.com/0/public/Ticker',
        wsUrl: 'wss://ws.kraken.com',
        fee: 0.0026, // 0.26%
        timeout: 5000,
        retries: 3,
        enabled: false,
        color: '#5741D9',
        // API credentials from environment
        apiKey: process.env.KRAKEN_API_KEY,
        apiSecret: process.env.KRAKEN_API_SECRET,
        testnet: process.env.KRAKEN_TESTNET === 'true'
    },
    bitmart: {
        name: 'Bitmart',
        api: 'https://api-cloud.bitmart.com/spot/v1/ticker',
        wsUrl: 'wss://ws-manager-compress.bitmart.com/api?protocol=1.1',
        fee: 0.0025, // 0.25%
        timeout: 5000,
        retries: 3,
        enabled: false, // Disabled - using only real-time WebSocket exchanges
        color: '#22B3E6'
    },
    mexc: {
        name: 'MEXC',
        api: 'https://api.mexc.com/api/v3/ticker/24hr',
        wsUrl: 'wss://wbs.mexc.com/ws',
        fee: 0.002, // 0.2%
        timeout: 5000,
        retries: 3,
        enabled: false,
        color: '#d2e1f4ff',
        // API credentials from environment
        apiKey: process.env.MEXC_API_KEY,
        apiSecret: process.env.MEXC_API_SECRET,
        testnet: process.env.MEXC_TESTNET === 'true'
    },
    huobi: {
        name: 'Huobi',
        api: 'https://api.huobi.pro/market/tickers',
        wsUrl: 'wss://api.huobi.pro/ws',
        fee: 0.002, // 0.2%
        timeout: 5000,
        retries: 3,
        enabled: false, // Disabled - using only real-time WebSocket exchanges
        color: '#1A38F3'
    },
    gateio: {
        name: 'Gate.io',
        api: 'https://api.gateio.ws/api/v4/spot/tickers',
        wsUrl: 'wss://api.gateio.ws/ws/v4/',
        fee: 0.002, // 0.2%
        timeout: 5000,
        retries: 3,
        enabled: true,
        color: '#FF3A3A',
        // API credentials from environment
        apiKey: process.env.GATEIO_API_KEY,
        apiSecret: process.env.GATEIO_API_SECRET,
        testnet: process.env.GATEIO_TESTNET === 'true'
    },
    hitbtc: {
        name: 'HitBTC',
        api: 'https://api.hitbtc.com/api/3/public/ticker',
        wsUrl: 'wss://api.hitbtc.com/api/3/ws/public',
        fee: 0.001, // 0.1%
        timeout: 5000,
        retries: 3,
        enabled: false, // Disabled - using only real-time WebSocket exchanges
        color: '#0093DD'
    },
    bybit: {
        name: 'ByBit',
        api: 'https://api.bybit.com/v5/market/tickers?category=spot',
        wsUrl: 'wss://stream.bybit.com/v5/public/spot',
        fee: 0.001, // 0.1%
        timeout: 5000,
        retries: 3,
        enabled: false,
        color: '#F9D342',
        // API credentials from environment
        apiKey: process.env.BYBIT_API_KEY,
        apiSecret: process.env.BYBIT_API_SECRET,
        testnet: process.env.BYBIT_TESTNET === 'true'
    }
};

// Get pair mappings from trading pairs configuration
const EXCHANGE_PAIR_MAPPINGS = {};
Object.entries(EXCHANGE_PAIR_SUPPORT).forEach(([exchange, config]) => {
    if (config.pairMapping && Object.keys(config.pairMapping).length > 0) {
        EXCHANGE_PAIR_MAPPINGS[exchange] = config.pairMapping;
    }
});

module.exports = {
    EXCHANGES_CONFIG,
    EXCHANGE_PAIR_MAPPINGS
};