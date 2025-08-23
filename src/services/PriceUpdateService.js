/**
 * Price Update Service
 * Manages price fetching and arbitrage calculation
 */

const ExchangeFactory = require('../exchanges/ExchangeFactory');
const TradingPairsService = require('./TradingPairsService');
const ArbitrageCalculator = require('../utils/arbitrage');
const HttpUtils = require('../utils/http');

class PriceUpdateService {
    static exchangePrices = {};
    static arbitrageOpportunities = [];
    static lastUpdateTime = null;

    /**
     * Update prices from all enabled exchanges
     * @returns {Promise<Object>} - Update results
     */
    static async updatePrices() {
        const startTime = Date.now();
        console.log('🔄 Updating market prices from enabled exchanges...');

        try {
            const exchanges = ExchangeFactory.getEnabledExchanges();
            const tradingPairs = TradingPairsService.getTradingPairs();

            // Fetch prices from all enabled exchanges
            const exchangeFetchers = Array.from(exchanges.entries()).map(([key, exchange]) => ({
                name: key,
                fetcher: exchange.fetchPrices(tradingPairs)
            }));

            const results = await Promise.allSettled(exchangeFetchers.map(ef => ef.fetcher));

            // Handle results
            this.exchangePrices = {};
            const failedExchanges = [];

            results.forEach((result, index) => {
                const exchangeName = exchangeFetchers[index].name;
                if (result.status === 'fulfilled') {
                    this.exchangePrices[exchangeName] = result.value;
                } else {
                    this.exchangePrices[exchangeName] = {};
                    failedExchanges.push(exchanges.get(exchangeName).name);
                }
            });

            if (failedExchanges.length > 0) {
                console.warn(`⚠️  Failed to fetch from: ${failedExchanges.join(', ')}`);
            }

            // Calculate arbitrage opportunities
            this.arbitrageOpportunities = ArbitrageCalculator.calculateArbitrage(this.exchangePrices, tradingPairs);
            this.lastUpdateTime = new Date().toISOString();

            const opportunityCount = this.arbitrageOpportunities.length;
            const activeExchangeCount = Object.keys(this.exchangePrices).filter(ex => Object.keys(this.exchangePrices[ex]).length > 0).length;

            console.log(`✅ Update complete: ${opportunityCount} opportunities found across ${activeExchangeCount}/${exchangeFetchers.length} enabled exchanges in ${Date.now() - startTime}ms`);

            return {
                prices: this.exchangePrices,
                opportunities: this.arbitrageOpportunities,
                tradingPairs: tradingPairs,
                timestamp: this.lastUpdateTime,
                stats: {
                    updateTime: Date.now() - startTime,
                    apiCalls: HttpUtils.getApiCallCount(),
                    activeExchanges: activeExchangeCount,
                    enabledExchanges: exchangeFetchers.length
                }
            };

        } catch (error) {
            console.error('❌ Critical error during price update:', error);
            throw error;
        }
    }

    /**
     * Get current market data
     * @returns {Object} - Current market data
     */
    static getCurrentData() {
        return {
            prices: this.exchangePrices,
            opportunities: this.arbitrageOpportunities,
            tradingPairs: TradingPairsService.getTradingPairs(),
            timestamp: this.lastUpdateTime || new Date().toISOString(),
            stats: {
                apiCalls: HttpUtils.getApiCallCount(),
                activeExchanges: Object.keys(this.exchangePrices).filter(ex => Object.keys(this.exchangePrices[ex]).length > 0).length,
                monitoredPairs: TradingPairsService.getTradingPairs().length
            }
        };
    }

    /**
     * Update prices from WebSocket data
     * @param {string} exchange - Exchange identifier
     * @param {Object} priceUpdates - Price updates object
     */
    static updatePricesFromWebSocket(exchange, priceUpdates) {
        if (!this.exchangePrices[exchange]) {
            this.exchangePrices[exchange] = {};
        }

        // Update prices
        let hasSignificantChanges = false;
        for (const [symbol, price] of Object.entries(priceUpdates)) {
            const oldPrice = this.exchangePrices[exchange][symbol];
            if (!oldPrice || Math.abs((price - oldPrice) / oldPrice) >= 0.0001) { // 0.01% threshold
                this.exchangePrices[exchange][symbol] = price;
                hasSignificantChanges = true;
            }
        }

        if (hasSignificantChanges) {
            // Recalculate arbitrage opportunities
            this.arbitrageOpportunities = ArbitrageCalculator.calculateArbitrage(
                this.exchangePrices,
                TradingPairsService.getTradingPairs()
            );
            this.lastUpdateTime = new Date().toISOString();
        }

        return hasSignificantChanges;
    }
}

module.exports = PriceUpdateService;
