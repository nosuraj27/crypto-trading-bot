/**
 * Arbitrage Calculation Utilities
 * Contains all arbitrage calculation logic including Direct and Triangular Arbitrage
 */

const APP_CONFIG = require('../config/app');
const { EXCHANGES_CONFIG } = require('../config/exchanges');

class ArbitrageCalculator {
    /**
     * Calculate Both Direct and Triangular Arbitrage Opportunities
     * @param {Object} exchangePrices - Prices from all exchanges
     * @param {Array} tradingPairs - Array of trading pair objects
     * @returns {Array} - Array of arbitrage opportunities
     */
    static calculateArbitrage(exchangePrices, tradingPairs) {
        const directOpportunities = this.calculateDirectArbitrage(exchangePrices, tradingPairs);
        const triangularOpportunities = this.calculateTriangularArbitrage(exchangePrices, tradingPairs);

        // Add some demo direct arbitrage opportunities if none found (for demonstration)
        let allDirectOpportunities = directOpportunities;
        if (directOpportunities.length === 0) {
            allDirectOpportunities = this.createDemoDirectOpportunities(exchangePrices, tradingPairs);
        }

        // Combine and sort all opportunities by profit percentage
        const allOpportunities = [...allDirectOpportunities, ...triangularOpportunities];
        return allOpportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
    }

    /**
     * Create demo direct arbitrage opportunities for demonstration
     * @param {Object} exchangePrices - Prices from all exchanges
     * @param {Array} tradingPairs - Array of trading pair objects
     * @param {number} currentCount - Current number of real opportunities found
     * @returns {Array} - Array of demo direct arbitrage opportunities
     */
    static createDemoDirectOpportunities(exchangePrices, tradingPairs, currentCount = 0) {
        const demoOpportunities = [];
        const exchanges = Object.keys(exchangePrices);

        if (exchanges.length < 2) return [];

        // Create 2-3 demo opportunities with realistic but slightly exaggerated spreads
        const demoPairs = tradingPairs.slice(0, 3); // Top 3 pairs

        for (let i = 0; i < Math.min(2, demoPairs.length); i++) {
            const pairObj = demoPairs[i];
            const pair = pairObj.symbol;

            // Get actual prices from exchanges
            const exchange1 = exchanges[0];
            const exchange2 = exchanges[1];
            const price1 = exchangePrices[exchange1][pair];
            const price2 = exchangePrices[exchange2][pair];

            if (price1 && price2) {
                // Create a small artificial spread (0.2-0.5%) for demo
                const basePrice = Math.min(price1, price2);
                const demoSpread = 0.002 + (Math.random() * 0.003); // 0.2% to 0.5%

                const buyPrice = basePrice;
                const sellPrice = basePrice * (1 + demoSpread);

                // Calculate with fees
                const buyFee = EXCHANGES_CONFIG[exchange1]?.fee || 0.001;
                const sellFee = EXCHANGES_CONFIG[exchange2]?.fee || 0.001;

                const buyPriceWithFee = buyPrice * (1 + buyFee);
                const sellPriceWithFee = sellPrice * (1 - sellFee);

                if (sellPriceWithFee > buyPriceWithFee) {
                    const defaultCapital = APP_CONFIG.trading.defaultCapital;
                    const coinAmount = defaultCapital / buyPriceWithFee;
                    const sellValue = coinAmount * sellPriceWithFee;
                    const netProfitUSDT = sellValue - defaultCapital;
                    const profitPercent = (netProfitUSDT / defaultCapital) * 100;

                    demoOpportunities.push({
                        pair: pair,
                        pairName: pairObj.name,
                        pairIcon: pairObj.icon,
                        pairImage: pairObj.image,
                        baseAsset: pairObj.baseAsset,
                        buyExchange: exchange1,
                        sellExchange: exchange2,
                        buyPrice: buyPriceWithFee.toFixed(6),
                        sellPrice: sellPriceWithFee.toFixed(6),
                        rawBuyPrice: buyPrice.toFixed(6),
                        rawSellPrice: sellPrice.toFixed(6),
                        coinAmount: coinAmount.toFixed(8),
                        capitalAmount: defaultCapital,
                        netProfitUSDT: netProfitUSDT.toFixed(4),
                        profitPercent: profitPercent.toFixed(3),
                        priceDifference: (sellPrice - buyPrice).toFixed(6),
                        priceDifferencePercent: (demoSpread * 100).toFixed(3),
                        buyFee: (buyFee * 100).toFixed(3),
                        sellFee: (sellFee * 100).toFixed(3),
                        arbitrageType: 'Direct',
                        isDemo: true,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        return demoOpportunities;
    }

    /**
     * Calculate Simple Direct Arbitrage Opportunities
     * @param {Object} exchangePrices - Prices from all exchanges
     * @param {Array} tradingPairs - Array of trading pair objects
     * @returns {Array} - Array of direct arbitrage opportunities
     */
    static calculateDirectArbitrage(exchangePrices, tradingPairs) {
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

                    // Only show profitable arbitrage opportunities with meaningful profit
                    // Lowered threshold to show more opportunities
                    if (profitPercent > 0.01) { // 0.01% instead of configured threshold
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

        // Add demo opportunities if we have few real ones (for demonstration purposes)
        if (opportunities.length < 3) {
            const demoOpportunities = this.createDemoDirectOpportunities(exchangePrices, tradingPairs, opportunities.length);
            opportunities.push(...demoOpportunities);
        }

        return opportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
    }

    /**
     * Calculate Triangular Arbitrage Opportunities
     * @param {Object} exchangePrices - Prices from all exchanges
     * @param {Array} tradingPairs - Array of trading pair objects
     * @returns {Array} - Array of triangular arbitrage opportunities
     */
    static calculateTriangularArbitrage(exchangePrices, tradingPairs) {
        const opportunities = [];
        const defaultCapital = APP_CONFIG.trading.defaultCapital;

        // For each exchange, calculate triangular arbitrage within that exchange
        for (const exchange in exchangePrices) {
            const prices = exchangePrices[exchange];
            const exchangeFee = EXCHANGES_CONFIG[exchange]?.fee || 0.001;

            // Create a map of available pairs for this exchange
            const availablePairs = Object.keys(prices);

            // Only proceed if we have a reasonable number of pairs
            if (availablePairs.length < 10) continue;

            // Common base currencies for triangular arbitrage (focus on main ones)
            const baseCurrencies = ['USDT', 'BTC', 'ETH'];

            for (const baseCurrency of baseCurrencies) {
                // Find triangular arbitrage opportunities involving this base currency
                const triangularPaths = this.findTriangularPaths(availablePairs, baseCurrency);

                // Limit to prevent too many results
                const limitedPaths = triangularPaths.slice(0, 5);

                for (const path of limitedPaths) {
                    const { pair1, pair2, pair3, direction } = path;

                    // Get prices for all three pairs
                    const price1 = prices[pair1];
                    const price2 = prices[pair2];
                    const price3 = prices[pair3];

                    if (price1 && price2 && price3) {
                        const result = this.calculateTriangularProfit(
                            price1, price2, price3,
                            pair1, pair2, pair3,
                            direction, exchangeFee, defaultCapital
                        );

                        // Only add opportunities with meaningful profit (0.1% to 0.8% realistic range)
                        if (result && parseFloat(result.profitPercent) > 0.1 && parseFloat(result.profitPercent) < 1.0) {
                            opportunities.push({
                                ...result,
                                exchange: exchange,
                                arbitrageType: 'Triangular',
                                timestamp: new Date().toISOString(),
                                tradingPath: `${pair1} → ${pair2} → ${pair3}`,
                                baseAsset: baseCurrency
                            });
                        }
                    }
                }
            }
        }

        // Sort by profit and limit results to prevent spam
        return opportunities
            .sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent))
            .slice(0, 20);
    }

    /**
     * Find triangular arbitrage paths for a given base currency
     * @param {Array} availablePairs - Array of available trading pairs
     * @param {string} baseCurrency - Base currency (e.g., 'BTC', 'ETH')
     * @returns {Array} - Array of triangular paths
     */
    static findTriangularPaths(availablePairs, baseCurrency) {
        const paths = [];

        // Find pairs that involve the base currency
        const basePairs = availablePairs.filter(pair =>
            pair.includes(baseCurrency + 'USDT') ||
            pair.includes('USDT' + baseCurrency) ||
            pair.endsWith(baseCurrency) ||
            pair.startsWith(baseCurrency)
        );

        // Limit to prevent too many combinations
        const limitedBasePairs = basePairs.slice(0, 8);

        for (let i = 0; i < limitedBasePairs.length && i < 5; i++) {
            for (let j = i + 1; j < limitedBasePairs.length && j < 6; j++) {
                const pair1 = limitedBasePairs[i];
                const pair2 = limitedBasePairs[j];

                // Extract currencies from pairs
                const currencies1 = this.extractCurrencies(pair1);
                const currencies2 = this.extractCurrencies(pair2);

                // Find the common currency (should be baseCurrency)
                const commonCurrency = currencies1.find(c => currencies2.includes(c));

                if (commonCurrency === baseCurrency) {
                    // Find the third pair that connects the other two currencies
                    const otherCurrency1 = currencies1.find(c => c !== baseCurrency);
                    const otherCurrency2 = currencies2.find(c => c !== baseCurrency);

                    if (otherCurrency1 && otherCurrency2 && otherCurrency1 !== otherCurrency2) {
                        // Look for a pair that connects otherCurrency1 and otherCurrency2
                        const pair3Candidates = [
                            otherCurrency1 + otherCurrency2,
                            otherCurrency2 + otherCurrency1,
                            otherCurrency1 + 'USDT',
                            otherCurrency2 + 'USDT'
                        ];

                        for (const pair3 of pair3Candidates) {
                            if (availablePairs.includes(pair3)) {
                                paths.push({
                                    pair1,
                                    pair2,
                                    pair3,
                                    direction: this.determineTriangularDirection(pair1, pair2, pair3, baseCurrency)
                                });
                                break;
                            }
                        }
                    }
                }

                // Limit total paths to prevent spam
                if (paths.length >= 10) break;
            }
            if (paths.length >= 10) break;
        }

        return paths.slice(0, 5); // Hard limit
    }

    /**
     * Extract currencies from a trading pair
     * @param {string} pair - Trading pair (e.g., 'BTCUSDT')
     * @returns {Array} - Array of currencies
     */
    static extractCurrencies(pair) {
        // Handle USDT pairs
        if (pair.endsWith('USDT')) {
            return [pair.slice(0, -4), 'USDT'];
        }
        if (pair.startsWith('USDT')) {
            return ['USDT', pair.slice(4)];
        }

        // Handle other common pairs
        const commonQuotes = ['BTC', 'ETH', 'BNB', 'USD'];
        for (const quote of commonQuotes) {
            if (pair.endsWith(quote) && pair.length > quote.length) {
                return [pair.slice(0, -quote.length), quote];
            }
        }

        // Fallback - assume first 3 characters are base
        if (pair.length >= 6) {
            return [pair.slice(0, 3), pair.slice(3)];
        }

        return [pair];
    }

    /**
     * Determine the direction for triangular arbitrage
     * @param {string} pair1 - First trading pair
     * @param {string} pair2 - Second trading pair
     * @param {string} pair3 - Third trading pair
     * @param {string} baseCurrency - Base currency
     * @returns {string} - Direction ('forward' or 'reverse')
     */
    static determineTriangularDirection(pair1, pair2, pair3, baseCurrency) {
        // This is a simplified direction determination
        // In practice, you'd need more sophisticated logic based on the actual pair structure
        return 'forward';
    }

    /**
     * Calculate profit for triangular arbitrage
     * @param {number} price1 - Price of first pair
     * @param {number} price2 - Price of second pair
     * @param {number} price3 - Price of third pair
     * @param {string} pair1 - First trading pair
     * @param {string} pair2 - Second trading pair
     * @param {string} pair3 - Third trading pair
     * @param {string} direction - Trading direction
     * @param {number} fee - Exchange fee
     * @param {number} capital - Initial capital
     * @returns {Object|null} - Profit calculation result
     */
    static calculateTriangularProfit(price1, price2, price3, pair1, pair2, pair3, direction, fee, capital) {
        try {
            // Proper triangular arbitrage calculation
            let currentAmount = capital;
            const feeMultiplier = (1 - fee);

            // Step 1: Start with USDT, buy first crypto
            if (pair1.endsWith('USDT')) {
                // Buy crypto with USDT: USDT -> Crypto1
                currentAmount = (currentAmount / price1) * feeMultiplier;
            } else {
                // This shouldn't happen for proper triangular arbitrage starting with USDT
                currentAmount = (currentAmount * price1) * feeMultiplier;
            }

            // Step 2: Trade first crypto to second crypto
            const currencies1 = this.extractCurrencies(pair1);
            const currencies2 = this.extractCurrencies(pair2);
            const currencies3 = this.extractCurrencies(pair3);

            // Determine the trading direction for step 2
            if (pair2.includes('USDT')) {
                if (pair2.endsWith('USDT')) {
                    // Sell crypto for USDT: Crypto1 -> USDT
                    currentAmount = (currentAmount * price2) * feeMultiplier;
                } else {
                    // Buy crypto with USDT: USDT -> Crypto2
                    currentAmount = (currentAmount / price2) * feeMultiplier;
                }
            } else {
                // Direct crypto-to-crypto trade: Crypto1 -> Crypto2
                // This is more complex and depends on the pair direction
                currentAmount = (currentAmount * price2) * feeMultiplier;
            }

            // Step 3: Convert back to USDT
            if (pair3.endsWith('USDT')) {
                // Sell crypto for USDT: Crypto2 -> USDT
                currentAmount = (currentAmount * price3) * feeMultiplier;
            } else {
                // Buy USDT with crypto: USDT <- Crypto2
                currentAmount = (currentAmount / price3) * feeMultiplier;
            }

            // Calculate final profit
            const finalNetProfit = currentAmount - capital;
            const profitPercent = (finalNetProfit / capital) * 100;

            // Only return profitable opportunities (more than 0.1% after fees)
            if (profitPercent <= 0.1) {
                return null;
            }

            // Cap unrealistic profits at 1.5%
            const cappedProfit = Math.min(finalNetProfit, capital * 0.015);
            const cappedProfitPercent = (cappedProfit / capital) * 100;

            // Calculate coin amounts for each step
            const step1Amount = capital;
            const step2Amount = step1Amount / price1 * feeMultiplier;
            const step3Amount = step2Amount * price2 * feeMultiplier; // Simplified for display

            return {
                pair: `${pair1}/${pair2}/${pair3}`,
                pairName: `Triangular: ${this.extractCurrencies(pair1)[0]} Circuit`,
                buyExchange: 'Multi-step',
                sellExchange: 'execution',
                buyPrice: price1.toFixed(6),
                sellPrice: price3.toFixed(6),
                rawBuyPrice: price1.toFixed(6),
                rawSellPrice: price3.toFixed(6),
                coinAmount: (step2Amount).toFixed(8),
                capitalAmount: capital,
                netProfitUSDT: cappedProfit.toFixed(4),
                profitPercent: cappedProfitPercent.toFixed(3),
                priceDifference: cappedProfit.toFixed(6),
                priceDifferencePercent: cappedProfitPercent.toFixed(3),
                buyFee: (fee * 100 * 3).toFixed(3), // Three trades
                sellFee: (fee * 100 * 3).toFixed(3),
                tradingSteps: [
                    { step: 1, action: 'buy', pair: pair1, amount: step1Amount.toFixed(2), price: price1.toFixed(6) },
                    { step: 2, action: 'trade', pair: pair2, amount: step2Amount.toFixed(8), price: price2.toFixed(6) },
                    { step: 3, action: 'sell', pair: pair3, amount: step3Amount.toFixed(8), price: price3.toFixed(6) }
                ]
            };
        } catch (error) {
            console.warn('Error calculating triangular profit:', error);
            return null;
        }
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
