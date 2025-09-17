/**
 * Exchange Configuration
 * Contains all exchange-specific settings, APIs, and fees
 */

const { EXCHANGE_PAIR_SUPPORT } = require('./tradingPairs');

// Check if we're in testnet mode
const isTestnet = (process.env.TRADING_MODE || 'testnet') === 'testnet';

const EXCHANGES_CONFIG = {
    binance: {
        name: 'Binance',
        // Use testnet or mainnet URLs based on environment
        api: isTestnet
            ? 'https://testnet.binance.vision/api/v3/ticker/price'
            : 'https://api.binance.com/api/v3/ticker/price',
        wsUrl: isTestnet
            ? 'wss://stream.testnet.binance.vision/ws/!ticker@arr'
            : 'wss://stream.binance.com:9443/ws/!ticker@arr',
        baseURL: isTestnet
            ? 'https://testnet.binance.vision'
            : 'https://api.binance.com',
        // Testnet URLs (kept for compatibility)
        testnetApiUrl: 'https://testnet.binance.vision/api/v3',
        testnetWsUrl: 'wss://stream.testnet.binance.vision/ws/!ticker@arr',
        fee: parseFloat(process.env.BINANCE_FEE) || 0.001, // 0.1%
        timeout: parseInt(process.env.BINANCE_TIMEOUT) || 5000,
        retries: parseInt(process.env.BINANCE_RETRIES) || 3,
        enabled: (process.env.BINANCE_ENABLED || 'true') === 'true',
        color: '#F3BA2F',
        // API credentials from environment
        apiKey: process.env.BINANCE_API_KEY,
        apiSecret: process.env.BINANCE_API_SECRET,
        testnet: (process.env.BINANCE_TESTNET || isTestnet.toString()) === 'true'
    },
    coinbase: {
        name: 'Coinbase Pro',
        api: 'https://api.exchange.coinbase.com/products',
        wsUrl: 'wss://ws-feed.exchange.coinbase.com',
        fee: parseFloat(process.env.COINBASE_FEE) || 0.005, // 0.5%
        timeout: parseInt(process.env.COINBASE_TIMEOUT) || 5000,
        retries: parseInt(process.env.COINBASE_RETRIES) || 3,
        enabled: (process.env.COINBASE_ENABLED || 'false') === 'true', // Disabled by default
        color: '#0052FF'
    },
    kraken: {
        name: 'Kraken',
        // Kraken doesn't have a separate testnet, uses sandbox with different auth
        api: isTestnet
            ? 'https://api.kraken.com/0/public/Ticker' // Same API for now
            : 'https://api.kraken.com/0/public/Ticker',
        wsUrl: 'wss://ws.kraken.com',
        baseURL: 'https://api.kraken.com',
        fee: parseFloat(process.env.KRAKEN_FEE) || 0.0026, // 0.26%
        timeout: parseInt(process.env.KRAKEN_TIMEOUT) || 5000,
        retries: parseInt(process.env.KRAKEN_RETRIES) || 3,
        enabled: (process.env.KRAKEN_ENABLED || 'false') === 'true',
        color: '#5741D9',
        // API credentials from environment
        apiKey: process.env.KRAKEN_API_KEY,
        apiSecret: process.env.KRAKEN_API_SECRET,
        testnet: (process.env.KRAKEN_TESTNET || isTestnet.toString()) === 'true'
    },
    bitmart: {
        name: 'Bitmart',
        api: 'https://api-cloud.bitmart.com/spot/v1/ticker',
        wsUrl: 'wss://ws-manager-compress.bitmart.com/api?protocol=1.1',
        fee: parseFloat(process.env.BITMART_FEE) || 0.0025, // 0.25%
        timeout: parseInt(process.env.BITMART_TIMEOUT) || 5000,
        retries: parseInt(process.env.BITMART_RETRIES) || 3,
        enabled: (process.env.BITMART_ENABLED || 'false') === 'true', // Disabled by default
        color: '#22B3E6'
    },
    mexc: {
        name: 'MEXC',
        // MEXC testnet/sandbox configuration
        api: isTestnet
            ? 'https://contract.mexc.com/api/v1/contract/ticker' // Testnet endpoint
            : 'https://api.mexc.com/api/v3/ticker/24hr',
        wsUrl: isTestnet
            ? 'wss://contract.mexc.com/edge' // Testnet WebSocket
            : 'wss://wbs.mexc.com/ws',
        baseURL: isTestnet
            ? 'https://contract.mexc.com'
            : 'https://api.mexc.com',
        fee: parseFloat(process.env.MEXC_FEE) || 0.002, // 0.2%
        timeout: parseInt(process.env.MEXC_TIMEOUT) || 5000,
        retries: parseInt(process.env.MEXC_RETRIES) || 3,
        enabled: (process.env.MEXC_ENABLED || 'false') === 'true',
        color: '#d2e1f4ff',
        // API credentials from environment
        apiKey: process.env.MEXC_API_KEY,
        apiSecret: process.env.MEXC_API_SECRET,
        testnet: (process.env.MEXC_TESTNET || isTestnet.toString()) === 'true'
    },
    huobi: {
        name: 'Huobi',
        api: 'https://api.huobi.pro/market/tickers',
        wsUrl: 'wss://api.huobi.pro/ws',
        fee: parseFloat(process.env.HUOBI_FEE) || 0.002, // 0.2%
        timeout: parseInt(process.env.HUOBI_TIMEOUT) || 5000,
        retries: parseInt(process.env.HUOBI_RETRIES) || 3,
        enabled: (process.env.HUOBI_ENABLED || 'false') === 'true', // Disabled by default
        color: '#1A38F3'
    },
    gateio: {
        name: 'Gate.io',
        // Gate.io testnet/mainnet configuration
        api: isTestnet
            ? 'https://api-testnet.gateapi.io/api/v4/spot/tickers'
            : 'https://api.gateio.ws/api/v4/spot/tickers',
        wsUrl: isTestnet
            ? 'wss://api-testnet.gateapi.io/ws/v4/'
            : 'wss://api.gateio.ws/ws/v4/',
        baseURL: isTestnet
            ? 'https://api-testnet.gateapi.io'
            : 'https://api.gateio.ws',
        fee: parseFloat(process.env.GATEIO_FEE) || 0.002, // 0.2%
        timeout: parseInt(process.env.GATEIO_TIMEOUT) || 5000,
        retries: parseInt(process.env.GATEIO_RETRIES) || 3,
        enabled: (process.env.GATEIO_ENABLED || 'true') === 'true',
        color: '#FF3A3A',
        // API credentials from environment
        apiKey: process.env.GATEIO_API_KEY,
        apiSecret: process.env.GATEIO_API_SECRET,
        testnet: (process.env.GATEIO_TESTNET || isTestnet.toString()) === 'true'
    },
    hitbtc: {
        name: 'HitBTC',
        api: 'https://api.hitbtc.com/api/3/public/ticker',
        wsUrl: 'wss://api.hitbtc.com/api/3/ws/public',
        fee: parseFloat(process.env.HITBTC_FEE) || 0.001, // 0.1%
        timeout: parseInt(process.env.HITBTC_TIMEOUT) || 5000,
        retries: parseInt(process.env.HITBTC_RETRIES) || 3,
        enabled: (process.env.HITBTC_ENABLED || 'false') === 'true', // Disabled by default
        color: '#0093DD'
    },
    bybit: {
        name: 'ByBit',
        // ByBit testnet configuration
        api: isTestnet
            ? 'https://api-testnet.bybit.com/v5/market/tickers?category=spot'
            : 'https://api.bybit.com/v5/market/tickers?category=spot',
        wsUrl: isTestnet
            ? 'wss://stream-testnet.bybit.com/v5/public/spot'
            : 'wss://stream.bybit.com/v5/public/spot',
        baseURL: isTestnet
            ? 'https://api-testnet.bybit.com'
            : 'https://api.bybit.com',
        fee: parseFloat(process.env.BYBIT_FEE) || 0.001, // 0.1%
        timeout: parseInt(process.env.BYBIT_TIMEOUT) || 5000,
        retries: parseInt(process.env.BYBIT_RETRIES) || 3,
        enabled: (process.env.BYBIT_ENABLED || 'false') === 'true',
        color: '#F9D342',
        // API credentials from environment
        apiKey: process.env.BYBIT_API_KEY,
        apiSecret: process.env.BYBIT_API_SECRET,
        testnet: (process.env.BYBIT_TESTNET || isTestnet.toString()) === 'true'
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