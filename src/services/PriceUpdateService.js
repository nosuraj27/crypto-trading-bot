/**
 * Enhanced Price Update Service
 * Manages price fetching and both direct & triangular arbitrage calculation
 */

const ExchangeFactory = require('../exchanges/ExchangeFactory');
const TradingPairsService = require('./TradingPairsService');
const ArbitrageCalculator = require('../utils/arbitrage');
const TriangularArbitrageService = require('./TriangularArbitrageService');
const HttpUtils = require('../utils/http');

// Initialize triangular arbitrage service
const triangularService = new TriangularArbitrageService();

class PriceUpdateService {
    static exchangePrices = {};
    static arbitrageOpportunities = [];
    static triangularOpportunities = [];
    static allOpportunities = [];
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

            // Calculate both direct and triangular arbitrage opportunities
            this.arbitrageOpportunities = ArbitrageCalculator.calculateDirectArbitrage(this.exchangePrices, tradingPairs);

            // Calculate triangular arbitrage opportunities for each exchange
            this.triangularOpportunities = [];
            for (const exchange in this.exchangePrices) {
                const triangularOps = triangularService.analyzeTriangularOpportunities(this.exchangePrices, exchange);
                this.triangularOpportunities.push(...triangularOps);
            }

            // Combine all opportunities and sort by profit
            this.allOpportunities = [...this.arbitrageOpportunities, ...this.triangularOpportunities]
                .sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));

            this.lastUpdateTime = new Date().toISOString();

            const directOpportunityCount = this.arbitrageOpportunities.length;
            const triangularOpportunityCount = this.triangularOpportunities.length;
            const totalOpportunityCount = this.allOpportunities.length;
            const activeExchangeCount = Object.keys(this.exchangePrices).filter(ex => Object.keys(this.exchangePrices[ex]).length > 0).length;

            console.log(`✅ Update complete: ${totalOpportunityCount} total opportunities (${directOpportunityCount} direct, ${triangularOpportunityCount} triangular) across ${activeExchangeCount}/${exchangeFetchers.length} enabled exchanges in ${Date.now() - startTime}ms`);

            return {
                prices: this.exchangePrices,
                opportunities: this.allOpportunities, // Return combined opportunities
                directOpportunities: this.arbitrageOpportunities,
                triangularOpportunities: this.triangularOpportunities,
                tradingPairs: tradingPairs,
                timestamp: this.lastUpdateTime,
                stats: {
                    updateTime: Date.now() - startTime,
                    apiCalls: HttpUtils.getApiCallCount(),
                    activeExchanges: activeExchangeCount,
                    enabledExchanges: exchangeFetchers.length,
                    directOpportunities: directOpportunityCount,
                    triangularOpportunities: triangularOpportunityCount,
                    totalOpportunities: totalOpportunityCount
                }
            };

        } catch (error) {
            console.error('❌ Critical error during price update:', error);
            throw error;
        }
    }

    /**
     * Get current market data with both direct and triangular opportunities
     * @returns {Object} - Current market data
     */
    static getCurrentData() {
        return {
            prices: this.exchangePrices,
            opportunities: this.allOpportunities, // Return combined opportunities
            directOpportunities: this.arbitrageOpportunities,
            triangularOpportunities: this.triangularOpportunities,
            tradingPairs: TradingPairsService.getTradingPairs(),
            timestamp: this.lastUpdateTime || new Date().toISOString(),
            stats: {
                apiCalls: HttpUtils.getApiCallCount(),
                activeExchanges: Object.keys(this.exchangePrices).filter(ex => Object.keys(this.exchangePrices[ex]).length > 0).length,
                monitoredPairs: TradingPairsService.getTradingPairs().length,
                directOpportunities: this.arbitrageOpportunities.length,
                triangularOpportunities: this.triangularOpportunities.length,
                totalOpportunities: this.allOpportunities.length
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
            // Recalculate both direct and triangular arbitrage opportunities
            this.arbitrageOpportunities = ArbitrageCalculator.calculateDirectArbitrage(
                this.exchangePrices,
                TradingPairsService.getTradingPairs()
            );

            // Recalculate triangular opportunities
            this.triangularOpportunities = [];
            for (const exchangeName in this.exchangePrices) {
                const triangularOps = triangularService.analyzeTriangularOpportunities(this.exchangePrices, exchangeName);
                this.triangularOpportunities.push(...triangularOps);
            }

            // Combine all opportunities
            this.allOpportunities = [...this.arbitrageOpportunities, ...this.triangularOpportunities]
                .sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));

            this.lastUpdateTime = new Date().toISOString();
        }

        return hasSignificantChanges;
    }
}

module.exports = PriceUpdateService;
