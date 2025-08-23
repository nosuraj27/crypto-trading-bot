/**
 * Trading Pairs Service
 * Handles initialization and management of trading pairs
 */

const axios = require('axios');
const APP_CONFIG = require('../config/app');
const { TradingPairsConfig, CRYPTO_COINS, TRADING_PAIRS_CONFIG } = require('../config/tradingPairs');

class TradingPairsService {
    static tradingPairs = [];

    /**
     * Initialize trading pairs from configuration and external APIs
     * @returns {Promise<Array>} - Array of trading pair objects
     */
    static async initializeTradingPairs() {
        try {
            console.log('🔍 Initializing trading pairs from configuration...');

            // First, get enabled pairs from configuration
            const enabledCryptos = TradingPairsConfig.getEnabledCryptos();
            console.log(`📋 Found ${enabledCryptos.length} enabled cryptocurrencies in configuration`);

            // If auto-fetch is enabled, enhance with Binance data
            if (TRADING_PAIRS_CONFIG.autoFetchFromBinance) {
                this.tradingPairs = await this.enhanceWithBinanceData(enabledCryptos);
            } else {
                // Use static configuration only
                this.tradingPairs = this.createPairsFromConfig(enabledCryptos);
            }

            // Filter pairs that have multi-exchange support for arbitrage
            this.tradingPairs = this.tradingPairs.filter(pair => {
                const supportingExchanges = TradingPairsConfig.getExchangesSupportingPair(pair.symbol);
                return supportingExchanges.length >= 2; // Need at least 2 exchanges for arbitrage
            });

            // Limit pairs based on configuration
            this.tradingPairs = this.tradingPairs.slice(0, TRADING_PAIRS_CONFIG.maxPairs);

            console.log(`✅ Initialized ${this.tradingPairs.length} trading pairs for arbitrage monitoring`);
            this.logPairsSummary();

            return this.tradingPairs;

        } catch (error) {
            console.error('❌ Failed to initialize trading pairs:', error.message);

            if (TRADING_PAIRS_CONFIG.useFallbackOnError) {
                console.log('🔄 Using fallback configuration...');
                this.tradingPairs = this.getFallbackPairs();
                return this.tradingPairs;
            } else {
                throw error;
            }
        }
    }

    /**
     * Enhance configuration with live Binance data
     * @param {Array} enabledCryptos - Enabled crypto configurations
     * @returns {Promise<Array>} - Enhanced trading pairs
     */
    static async enhanceWithBinanceData(enabledCryptos) {
        console.log('📡 Fetching live data from Binance...');

        try {
            // Fetch 24hr ticker data from Binance
            const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            const binanceData = new Map();

            response.data.forEach(ticker => {
                if (ticker.symbol.endsWith('USDT')) {
                    binanceData.set(ticker.symbol, {
                        volume24h: parseFloat(ticker.quoteVolume),
                        priceChange24h: parseFloat(ticker.priceChangePercent),
                        price: parseFloat(ticker.lastPrice)
                    });
                }
            });

            // Try to get coin metadata from CoinGecko
            let coinGeckoData = new Map();
            try {
                const coinGeckoResponse = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1');
                coinGeckoResponse.data.forEach(coin => {
                    coinGeckoData.set(coin.symbol.toUpperCase(), {
                        name: coin.name,
                        image: coin.image,
                        marketCap: coin.market_cap
                    });
                });
                console.log(`📊 Enhanced with CoinGecko data for ${coinGeckoData.size} coins`);
            } catch (geckoError) {
                console.warn('⚠️ CoinGecko data unavailable, using static configuration');
            }

            // Create enhanced trading pairs
            const enhancedPairs = enabledCryptos
                .map(crypto => {
                    // Use the full trading pair from crypto.pair (e.g., 'BTCUSDT')
                    const binanceTicker = binanceData.get(crypto.pair);
                    const geckoData = coinGeckoData.get(crypto.baseAsset);

                    return {
                        symbol: crypto.pair, // Use the full trading pair symbol
                        name: geckoData?.name || crypto.name,
                        icon: crypto.icon,
                        image: geckoData?.image || crypto.image,
                        baseAsset: crypto.baseAsset,
                        enabled: crypto.enabled,
                        volume24h: binanceTicker?.volume24h || 0,
                        priceChange24h: binanceTicker?.priceChange24h || 0,
                        currentPrice: binanceTicker?.price || 0
                    };
                })
                // .filter(pair => {
                //     // Use only the global volume requirement from TRADING_PAIRS_CONFIG
                //     return pair.volume24h >= TRADING_PAIRS_CONFIG.minVolume24h;
                // })
                .sort((a, b) => {
                    // Sort only by volume (higher volume first)
                    return b.volume24h - a.volume24h;
                });

            console.log(`📈 Enhanced ${enhancedPairs.length} pairs with live market data`);
            return enhancedPairs;

        } catch (error) {
            console.warn('⚠️ Failed to fetch Binance data, using static configuration:', error.message);
            return this.createPairsFromConfig(enabledCryptos);
        }
    }

    /**
     * Create trading pairs from static configuration only
     * @param {Array} enabledCryptos - Enabled crypto configurations
     * @returns {Array} - Trading pairs from configuration
     */
    static createPairsFromConfig(enabledCryptos) {
        console.log('📋 Using static configuration for trading pairs');

        return enabledCryptos.map(crypto => ({
            symbol: crypto.symbol,
            name: crypto.name,
            icon: crypto.icon,
            image: crypto.image,
            baseAsset: crypto.baseAsset,
            enabled: crypto.enabled,
            volume24h: 0,
            priceChange24h: 0,
            currentPrice: 0
        }));
    }

    /**
     * Log summary of initialized pairs
     */
    static logPairsSummary() {
        const enabledExchanges = Object.entries(TradingPairsConfig.getExchangePairSupport())
            .filter(([exchange, config]) => config.enabled)
            .map(([exchange]) => exchange);

        console.log(`📊 Trading Pairs Summary:`);
        console.log(`   • Total pairs: ${this.tradingPairs.length}`);
        console.log(`   • Enabled exchanges: ${enabledExchanges.join(', ')}`);
        console.log(`   • Top 5 pairs by order: ${this.tradingPairs.slice(0, 5).map(p => p.baseAsset).join(', ')}`);

        if (this.tradingPairs.length > 0 && this.tradingPairs[0].volume24h > 0) {
            const totalVolume = this.tradingPairs.reduce((sum, pair) => sum + pair.volume24h, 0);
            console.log(`   • Total 24h volume: $${(totalVolume / 1000000).toFixed(1)}M`);
        }
    }

    /**
     * Get supported pairs across exchanges from configuration
     * @returns {Set} - Set of supported pair symbols
     */
    static getSupportedPairs() {
        return new Set(TradingPairsConfig.getEnabledTradingPairs());
    }

    /**
     * Get fallback trading pairs from configuration
     * @returns {Array} - Array of fallback trading pairs
     */
    static getFallbackPairs() {
        console.log('📋 Using fallback pairs from configuration');
        return TradingPairsConfig.getEnabledCryptos().slice(0, 35); // All enabled cryptos for fallback
    }

    /**
     * Get pairs supported by a specific exchange
     * @param {string} exchange - Exchange identifier
     * @returns {Array} - Array of trading pairs supported by the exchange
     */
    static getPairsForExchange(exchange) {
        const supportedPairs = TradingPairsConfig.getSupportedPairsForExchange(exchange);
        return this.tradingPairs.filter(pair => supportedPairs.includes(pair.symbol));
    }

    /**
     * Get mapped pair symbol for an exchange
     * @param {string} exchange - Exchange identifier
     * @param {string} pair - Trading pair symbol
     * @returns {string} - Mapped pair symbol
     */
    static getMappedPairForExchange(exchange, pair) {
        return TradingPairsConfig.getMappedPair(exchange, pair);
    }

    /**
     * Update crypto configuration
     * @param {string} baseAsset - Base asset symbol
     * @param {boolean} enabled - Enable or disable
     */
    static updateCryptoStatus(baseAsset, enabled) {
        TradingPairsConfig.setCryptoEnabled(baseAsset, enabled);
        console.log(`${enabled ? '✅' : '❌'} ${baseAsset} ${enabled ? 'enabled' : 'disabled'} for trading`);
    }

    /**
     * Add a new cryptocurrency to monitoring
     * @param {string} baseAsset - Base asset symbol
     * @param {Object} config - Crypto configuration
     */
    static addNewCrypto(baseAsset, config) {
        TradingPairsConfig.addCrypto(baseAsset, config);
        console.log(`➕ Added ${baseAsset} to cryptocurrency list`);
    }

    /**
     * Get trading pairs statistics
     * @returns {Object} - Statistics about trading pairs
     */
    static getStatistics() {
        const enabledExchanges = Object.entries(TradingPairsConfig.getExchangePairSupport())
            .filter(([exchange, config]) => config.enabled);

        const pairsSupportedByMultipleExchanges = this.tradingPairs.filter(pair => {
            const supportingExchanges = TradingPairsConfig.getExchangesSupportingPair(pair.symbol);
            return supportingExchanges.length >= 2;
        });

        return {
            totalPairs: this.tradingPairs.length,
            enabledExchanges: enabledExchanges.length,
            arbitragePairs: pairsSupportedByMultipleExchanges.length,
            averageVolume: this.tradingPairs.reduce((sum, pair) => sum + (pair.volume24h || 0), 0) / this.tradingPairs.length,
            topPairByVolume: this.tradingPairs.reduce((top, pair) =>
                (pair.volume24h || 0) > (top.volume24h || 0) ? pair : top, this.tradingPairs[0] || {})
        };
    }

    /**
     * Get current trading pairs
     * @returns {Array} - Array of trading pair objects
     */
    static getTradingPairs() {
        return this.tradingPairs;
    }

    /**
     * Update trading pairs
     * @param {Array} newPairs - New trading pairs array
     */
    static setTradingPairs(newPairs) {
        this.tradingPairs = newPairs;
    }
}

module.exports = TradingPairsService;
