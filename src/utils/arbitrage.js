/**
 * Arbitrage Calculation Utilities
 * Contains all arbitrage calculation logic
 */

const APP_CONFIG = require('../config/app');
const { EXCHANGES_CONFIG } = require('../config/exchanges');

class ArbitrageCalculator {
    /**
     * Calculate Simple Direct Arbitrage Opportunities
     * @param {Object} exchangePrices - Prices from all exchanges
     * @param {Array} tradingPairs - Array of trading pair objects
     * @returns {Array} - Array of arbitrage opportunities
     */
    static calculateArbitrage(exchangePrices, tradingPairs) {
        const opportunities = [];

        for (let pairObj of tradingPairs) {
            const pair = pairObj.symbol;
            const prices = [];

            // Collect prices from all exchanges for simple direct arbitrage
            for (let exchange in exchangePrices) {
                if (exchangePrices[exchange][pair]) {
                    prices.push({
                        exchange: exchange,
                        price: exchangePrices[exchange][pair],
                        fee: EXCHANGES_CONFIG[exchange].fee
                    });
                }
            }

            if (prices.length >= 2) {
                // Calculate effective prices with fees for each exchange
                const effectivePrices = prices.map(p => ({
                    ...p,
                    buyPriceWithFee: p.price * (1 + p.fee),  // Price you pay when buying
                    sellPriceWithFee: p.price * (1 - p.fee)  // Price you receive when selling
                }));

                // Find the best buy exchange (lowest buy price with fees)
                let bestBuyExchange = effectivePrices[0];
                for (let price of effectivePrices) {
                    if (price.buyPriceWithFee < bestBuyExchange.buyPriceWithFee) {
                        bestBuyExchange = price;
                    }
                }

                // Find the best sell exchange (highest sell price with fees)
                let bestSellExchange = effectivePrices[0];
                for (let price of effectivePrices) {
                    if (price.sellPriceWithFee > bestSellExchange.sellPriceWithFee) {
                        bestSellExchange = price;
                    }
                }

                // Only calculate if buy and sell are different exchanges
                if (bestBuyExchange.exchange !== bestSellExchange.exchange) {
                    const defaultCapital = APP_CONFIG.trading.defaultCapital;

                    // Use the already calculated prices with fees
                    const buyPriceWithFee = bestBuyExchange.buyPriceWithFee;
                    const sellPriceWithFee = bestSellExchange.sellPriceWithFee;

                    // Calculate coin amounts
                    const coinAmount = defaultCapital / buyPriceWithFee;
                    const sellValue = coinAmount * sellPriceWithFee;
                    const netProfitUSDT = sellValue - defaultCapital;
                    const profitPercent = (netProfitUSDT / defaultCapital) * 100;

                    // Raw price difference
                    const priceDifference = bestSellExchange.price - bestBuyExchange.price;
                    const priceDifferencePercent = (priceDifference / bestBuyExchange.price) * 100;

                    // Only show profitable arbitrage opportunities
                    if (profitPercent > APP_CONFIG.trading.minProfitThreshold) {
                        opportunities.push({
                            pair: pair,
                            pairName: pairObj.name,
                            pairIcon: pairObj.icon,
                            pairImage: pairObj.image,
                            baseAsset: pairObj.baseAsset,
                            buyExchange: bestBuyExchange.exchange,
                            sellExchange: bestSellExchange.exchange,
                            buyPrice: buyPriceWithFee.toFixed(6),
                            sellPrice: sellPriceWithFee.toFixed(6),
                            rawBuyPrice: bestBuyExchange.price.toFixed(6),
                            rawSellPrice: bestSellExchange.price.toFixed(6),
                            coinAmount: coinAmount.toFixed(8),
                            capitalAmount: defaultCapital,
                            netProfitUSDT: netProfitUSDT.toFixed(4),
                            profitPercent: profitPercent.toFixed(3),
                            priceDifference: priceDifference.toFixed(6),
                            priceDifferencePercent: priceDifferencePercent.toFixed(3),
                            buyFee: (bestBuyExchange.fee * 100).toFixed(3),
                            sellFee: (bestSellExchange.fee * 100).toFixed(3),
                            arbitrageType: 'Direct',
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
        }

        return opportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
    }

    /**
     * Get exchange color for UI display
     * @param {string} exchange - Exchange identifier
     * @returns {string} - Hex color code
     */
    static getExchangeColor(exchange) {
        return EXCHANGES_CONFIG[exchange]?.color || '#666666';
    }
}

module.exports = ArbitrageCalculator;
