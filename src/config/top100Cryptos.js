/**
 * Top 100 Cryptocurrency Configuration
 * Updated with current market data and comprehensive trading pair support
 */

const TOP_100_CRYPTOS = {
    // Top 10 Cryptocurrencies
    'BTCUSDT': {
        name: 'Bitcoin',
        baseAsset: 'BTC',
        symbol: 'BTC',
        icon: '₿',
        image: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'ETHUSDT': {
        name: 'Ethereum',
        baseAsset: 'ETH',
        symbol: 'ETH',
        icon: 'Ξ',
        image: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'BNBUSDT': {
        name: 'BNB',
        baseAsset: 'BNB',
        symbol: 'BNB',
        icon: '🔶',
        image: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'SOLUSDT': {
        name: 'Solana',
        baseAsset: 'SOL',
        symbol: 'SOL',
        icon: '◎',
        image: 'https://cryptologos.cc/logos/solana-sol-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'XRPUSDT': {
        name: 'XRP',
        baseAsset: 'XRP',
        symbol: 'XRP',
        icon: '🪙',
        image: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'ADAUSDT': {
        name: 'Cardano',
        baseAsset: 'ADA',
        symbol: 'ADA',
        icon: '₳',
        image: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'DOGEUSDT': {
        name: 'Dogecoin',
        baseAsset: 'DOGE',
        symbol: 'DOGE',
        icon: '🐕',
        image: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'TRXUSDT': {
        name: 'TRON',
        baseAsset: 'TRX',
        symbol: 'TRX',
        icon: '🔴',
        image: 'https://cryptologos.cc/logos/tron-trx-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'MATICUSDT': {
        name: 'Polygon',
        baseAsset: 'MATIC',
        symbol: 'MATIC',
        icon: '⬟',
        image: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
        enabled: true,
        priority: 9,
        marketCap: 9,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'LINKUSDT': {
        name: 'Chainlink',
        baseAsset: 'LINK',
        symbol: 'LINK',
        icon: '🔗',
        image: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
        enabled: true,
        priority: 10,
        marketCap: 10,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },

    // Top 11-20
    'DOTUSDT': {
        name: 'Polkadot',
        baseAsset: 'DOT',
        symbol: 'DOT',
        icon: '●',
        image: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png',
        enabled: true,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'AVAXUSDT': {
        name: 'Avalanche',
        baseAsset: 'AVAX',
        symbol: 'AVAX',
        icon: '🔺',
        image: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
        enabled: true,
        priority: 12,
        minVolume: 2000000,
        marketCap: 12,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'LTCUSDT': {
        name: 'Litecoin',
        baseAsset: 'LTC',
        symbol: 'LTC',
        icon: 'Ł',
        image: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
        enabled: true,
        priority: 13,
        minVolume: 1500000,
        marketCap: 13,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'BCHUSDT': {
        name: 'Bitcoin Cash',
        baseAsset: 'BCH',
        symbol: 'BCH',
        icon: '⟠',
        image: 'https://cryptologos.cc/logos/bitcoin-cash-bch-logo.png',
        enabled: true,
        priority: 14,
        minVolume: 1000000,
        marketCap: 14,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'NEARUSDT': {
        name: 'NEAR Protocol',
        baseAsset: 'NEAR',
        symbol: 'NEAR',
        icon: '◇',
        image: 'https://cryptologos.cc/logos/near-protocol-near-logo.png',
        enabled: true,
        priority: 15,
        minVolume: 1000000,
        marketCap: 15,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'UNIUSDT': {
        name: 'Uniswap',
        baseAsset: 'UNI',
        symbol: 'UNI',
        icon: '🦄',
        image: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
        enabled: true,
        priority: 16,
        minVolume: 800000,
        marketCap: 16,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'APTUSDT': {
        name: 'Aptos',
        baseAsset: 'APT',
        symbol: 'APT',
        icon: '🅰️',
        image: 'https://cryptologos.cc/logos/aptos-apt-logo.png',
        enabled: true,
        priority: 17,
        minVolume: 800000,
        marketCap: 17,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'ATOMUSDT': {
        name: 'Cosmos',
        baseAsset: 'ATOM',
        symbol: 'ATOM',
        icon: '⚛️',
        image: 'https://cryptologos.cc/logos/cosmos-atom-logo.png',
        enabled: true,
        priority: 18,
        minVolume: 600000,
        marketCap: 18,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'ETCUSDT': {
        name: 'Ethereum Classic',
        baseAsset: 'ETC',
        symbol: 'ETC',
        icon: '⟐',
        image: 'https://cryptologos.cc/logos/ethereum-classic-etc-logo.png',
        enabled: true,
        priority: 19,
        minVolume: 500000,
        marketCap: 19,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'FILUSDT': {
        name: 'Filecoin',
        baseAsset: 'FIL',
        symbol: 'FIL',
        icon: '🗃️',
        image: 'https://cryptologos.cc/logos/filecoin-fil-logo.png',
        enabled: true,
        priority: 20,
        minVolume: 400000,
        marketCap: 20,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },

    // Top 21-50 (High Priority DeFi and Layer 1s)
    'ALGOUSDT': {
        name: 'Algorand',
        baseAsset: 'ALGO',
        symbol: 'ALGO',
        icon: '◉',
        image: 'https://cryptologos.cc/logos/algorand-algo-logo.png',
        enabled: true,
        priority: 21,
        minVolume: 300000,
        marketCap: 21,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'XLMUSDT': {
        name: 'Stellar',
        baseAsset: 'XLM',
        symbol: 'XLM',
        icon: '✦',
        image: 'https://cryptologos.cc/logos/stellar-xlm-logo.png',
        enabled: true,
        priority: 22,
        minVolume: 300000,
        marketCap: 22,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'VETUSDT': {
        name: 'VeChain',
        baseAsset: 'VET',
        symbol: 'VET',
        icon: '💎',
        image: 'https://cryptologos.cc/logos/vechain-vet-logo.png',
        enabled: true,
        priority: 23,
        minVolume: 250000,
        marketCap: 23,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'HBARUSDT': {
        name: 'Hedera',
        baseAsset: 'HBAR',
        symbol: 'HBAR',
        icon: '🔻',
        image: 'https://cryptologos.cc/logos/hedera-hbar-logo.png',
        enabled: true,
        priority: 24,
        minVolume: 200000,
        marketCap: 24,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'ICPUSDT': {
        name: 'Internet Computer',
        baseAsset: 'ICP',
        symbol: 'ICP',
        icon: '∞',
        image: 'https://cryptologos.cc/logos/internet-computer-icp-logo.png',
        enabled: true,
        priority: 25,
        minVolume: 200000,
        marketCap: 25,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'SUIUSDT': {
        name: 'Sui',
        baseAsset: 'SUI',
        symbol: 'SUI',
        icon: '〰️',
        image: 'https://cryptologos.cc/logos/sui-sui-logo.png',
        enabled: true,
        priority: 26,
        minVolume: 300000,
        marketCap: 26,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'AAVEUSDT': {
        name: 'Aave',
        baseAsset: 'AAVE',
        symbol: 'AAVE',
        icon: '👻',
        image: 'https://cryptologos.cc/logos/aave-aave-logo.png',
        enabled: true,
        priority: 27,
        minVolume: 150000,
        marketCap: 27,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },
    'INJUSDT': {
        name: 'Injective',
        baseAsset: 'INJ',
        symbol: 'INJ',
        icon: '💉',
        image: 'https://cryptologos.cc/logos/injective-inj-logo.png',
        enabled: true,
        priority: 28,
        minVolume: 150000,
        marketCap: 28,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'THETAUSDT': {
        name: 'Theta Network',
        baseAsset: 'THETA',
        symbol: 'THETA',
        icon: 'Θ',
        image: 'https://cryptologos.cc/logos/theta-token-theta-logo.png',
        enabled: true,
        priority: 29,
        minVolume: 100000,
        marketCap: 29,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'MKRUSDT': {
        name: 'Maker',
        baseAsset: 'MKR',
        symbol: 'MKR',
        icon: '🎯',
        image: 'https://cryptologos.cc/logos/maker-mkr-logo.png',
        enabled: true,
        priority: 30,
        minVolume: 100000,
        marketCap: 30,
        supportedExchanges: ['binance', 'kraken', 'mexc', 'gateio', 'bybit']
    },

    // Additional Top 50 cryptocurrencies
    'LDOUSDT': {
        name: 'Lido DAO',
        baseAsset: 'LDO',
        symbol: 'LDO',
        icon: '🔥',
        image: 'https://cryptologos.cc/logos/lido-dao-ldo-logo.png',
        enabled: true,
        priority: 31,
        minVolume: 80000,
        marketCap: 31,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'ARBUSDT': {
        name: 'Arbitrum',
        baseAsset: 'ARB',
        symbol: 'ARB',
        icon: '🔵',
        image: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
        enabled: true,
        priority: 32,
        minVolume: 200000,
        marketCap: 32,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'OPUSDT': {
        name: 'Optimism',
        baseAsset: 'OP',
        symbol: 'OP',
        icon: '🔴',
        image: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png',
        enabled: true,
        priority: 33,
        minVolume: 120000,
        marketCap: 33,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'PEPEUSDT': {
        name: 'Pepe',
        baseAsset: 'PEPE',
        symbol: 'PEPE',
        icon: '🐸',
        image: 'https://cryptologos.cc/logos/pepe-pepe-logo.png',
        enabled: true,
        priority: 34,
        minVolume: 500000,
        marketCap: 34,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'RENDERUSDT': {
        name: 'Render',
        baseAsset: 'RENDER',
        symbol: 'RENDER',
        icon: '🎨',
        image: 'https://cryptologos.cc/logos/render-token-rndr-logo.png',
        enabled: true,
        priority: 35,
        minVolume: 80000,
        marketCap: 35,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },

    // Top 50-100 (Medium Priority)
    'FTMUSDT': {
        name: 'Fantom',
        baseAsset: 'FTM',
        symbol: 'FTM',
        icon: '👻',
        image: 'https://cryptologos.cc/logos/fantom-ftm-logo.png',
        enabled: false,
        priority: 50,
        minVolume: 50000,
        marketCap: 50,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'SANDUSDT': {
        name: 'The Sandbox',
        baseAsset: 'SAND',
        symbol: 'SAND',
        icon: '🏖️',
        image: 'https://cryptologos.cc/logos/the-sandbox-sand-logo.png',
        enabled: false,
        priority: 51,
        minVolume: 40000,
        marketCap: 51,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'MANAUSDT': {
        name: 'Decentraland',
        baseAsset: 'MANA',
        symbol: 'MANA',
        icon: '🌐',
        image: 'https://cryptologos.cc/logos/decentraland-mana-logo.png',
        enabled: false,
        priority: 52,
        minVolume: 30000,
        marketCap: 52,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'CHZUSDT': {
        name: 'Chiliz',
        baseAsset: 'CHZ',
        symbol: 'CHZ',
        icon: '🌶️',
        image: 'https://cryptologos.cc/logos/chiliz-chz-logo.png',
        enabled: false,
        priority: 53,
        minVolume: 25000,
        marketCap: 53,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    },
    'FLOWUSDT': {
        name: 'Flow',
        baseAsset: 'FLOW',
        symbol: 'FLOW',
        icon: '🌊',
        image: 'https://cryptologos.cc/logos/flow-flow-logo.png',
        enabled: false,
        priority: 54,
        minVolume: 20000,
        marketCap: 54,
        supportedExchanges: ['binance', 'mexc', 'gateio', 'bybit']
    }
};

/**
 * Trading Pairs Configuration for Top 100 Cryptos
 */
const TOP_100_CONFIG = {
    maxPairs: 100,
    maxDisplayPairs: 50,
    autoFetchFromBinance: true,
    useFallbackOnError: true,

    // Exchange priority for trading
    exchangePriority: ['binance', 'kraken', 'bybit', 'mexc', 'gateio'],

    // Volume requirements removed - match coins only without volume filtering
    volumeRequirements: {
        disabled: true  // Volume filtering disabled
    }
};

/**
 * Get cryptocurrency configuration by trading pair
 * @param {string} pair - Trading pair (e.g., 'BTCUSDT')
 * @returns {Object|null} - Crypto configuration or null if not found
 */
function getCryptoConfig(pair) {
    return TOP_100_CRYPTOS[pair] || null;
}

/**
 * Get all enabled cryptocurrencies
 * @returns {Array} - Array of enabled crypto configurations
 */
function getEnabledCryptos() {
    return Object.entries(TOP_100_CRYPTOS)
        .filter(([_, config]) => config.enabled)
        .map(([pair, config]) => ({ ...config, pair }));
}

/**
 * Get cryptocurrencies ordered by their position in the config (indexing order)
 * @returns {Array} - Array of crypto configurations ordered by index
 */
function getCryptosByOrder() {
    return Object.entries(TOP_100_CRYPTOS)
        .filter(([_, config]) => config.enabled)
        .map(([pair, config]) => ({ ...config, pair }));
}

/**
 * Enable/disable cryptocurrency by trading pair
 * @param {string} pair - Trading pair
 * @param {boolean} enabled - Enable/disable status
 * @returns {boolean} - Success status
 */
function toggleCrypto(pair, enabled) {
    if (TOP_100_CRYPTOS[pair]) {
        TOP_100_CRYPTOS[pair].enabled = enabled;
        return true;
    }
    return false;
}

/**
 * Get trading statistics
 * @returns {Object} - Trading statistics
 */
function getTop100Statistics() {
    const allCryptos = Object.values(TOP_100_CRYPTOS);
    const enabledCryptos = allCryptos.filter(c => c.enabled);

    return {
        total: allCryptos.length,
        enabled: enabledCryptos.length,
        disabled: allCryptos.length - enabledCryptos.length
    };
}

module.exports = {
    TOP_100_CRYPTOS,
    TOP_100_CONFIG,
    getCryptoConfig,
    getEnabledCryptos,
    getCryptosByOrder,
    toggleCrypto,
    getTop100Statistics
};
