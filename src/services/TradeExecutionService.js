/**
 * Enhanced Trade Execution Service
 * Supports both Direct and Triangular Arbitrage
 */

const TradeHistoryService = require('./TradeHistoryService');
const TriangularArbitrageService = require('./TriangularArbitrageService');

// Initialize triangular arbitrage service
const triangularService = new TriangularArbitrageService(null);

// Simple global variables
let exchangeManager = null;
let logger = console;
let stats = {
    totalTrades: 0,
    successfulTrades: 0,
    totalProfit: 0,
    directTrades: 0,
    triangularTrades: 0,
    directProfit: 0,
    triangularProfit: 0
};
let config = {
    minProfitThreshold: 0.001,
    tradingMode: 'testnet', // 'testnet' or 'live'
    enableTriangularArbitrage: true,
    maxTriangularTradeAmount: 500
};

const TRADE_STATUS = {
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// Setup function - call this first
function setup(exchangeMgr, loggerInstance, settings = {}) {
    exchangeManager = exchangeMgr;
    logger = loggerInstance || console;
    config = { ...config, ...settings };

    // Pass the exchange manager to the triangular arbitrage service
    triangularService.setExchangeManager(exchangeManager);

    logger.log('Trade service setup complete');
}

// Main function - execute a trade (supports both direct and triangular arbitrage)
async function executeTrade(opportunity, options = {}) {
    const tradeId = 'trade_' + Date.now();
    const startTime = Date.now();

    try {
        // Determine arbitrage type
        const isTriangular = opportunity.arbitrageType === 'Triangular' ||
            opportunity.type === 'triangular' ||
            opportunity.tradingPath?.includes('→');

        if (isTriangular && config.enableTriangularArbitrage) {
            return await executeTriangularArbitrage(opportunity, options, tradeId, startTime);
        } else {
            return await executeDirectArbitrage(opportunity, options, tradeId, startTime);
        }

    } catch (error) {
        logger.error(`❌ Trade execution failed: ${error.message}`);
        return {
            tradeId,
            status: TRADE_STATUS.FAILED,
            error: error.message,
            executionTime: Date.now() - startTime,
            arbitrageType: opportunity.arbitrageType || 'Direct'
        };
    }
}

// Direct arbitrage execution (original function)
async function executeDirectArbitrage(opportunity, options = {}, tradeId, startTime) {
    try {
        // Simple validation
        if (!opportunity.symbol || !opportunity.buyPrice || !opportunity.sellPrice) {
            throw new Error('Missing required trade data');
        }

        if (opportunity.profitPercentage < config.minProfitThreshold) {
            throw new Error('Profit too low');
        }

        logger.log(`🚀 Direct Trading ${opportunity.symbol}`);
        logger.log(`   Buy: ${opportunity.buyPrice} | Sell: ${opportunity.sellPrice}`);
        logger.log(`   Expected profit: ${opportunity.profitPercentage.toFixed(2)}%`);

        // Calculate trade details
        const tradeAmount = opportunity.amount || 100;
        const quantity = tradeAmount / opportunity.buyPrice;

        // Save to database
        await TradeHistoryService.saveTradeRecord({
            tradeId,
            userId: options.userId || 'default',
            symbol: opportunity.symbol,
            buyExchange: opportunity.buyExchange,
            sellExchange: opportunity.sellExchange,
            buyPrice: opportunity.buyPrice,
            sellPrice: opportunity.sellPrice,
            quantity,
            capitalAmount: tradeAmount,
            expectedProfit: (opportunity.sellPrice - opportunity.buyPrice) * quantity,
            expectedProfitPercent: opportunity.profitPercentage,
            status: 'pending',
            tradingMode: config.tradingMode,
            arbitrageType: 'Direct'
        });

        // Execute the trade - both testnet and live use real API calls
        let result;

        logger.log(`🎯 ${config.tradingMode.toUpperCase()} MODE - REAL EXCHANGE EXECUTION`);
        logger.log(`💰 Executing ${quantity.toFixed(8)} ${opportunity.symbol}`);

        // Get actual exchange instances
        const exchanges = exchangeManager.getEnabledExchanges();
        const buyExchange = exchanges.get(opportunity.buyExchange);
        const sellExchange = exchanges.get(opportunity.sellExchange);

        if (!buyExchange || !sellExchange) {
            throw new Error(`Required exchanges not available: ${opportunity.buyExchange}, ${opportunity.sellExchange}`);
        }

        // Verify exchanges support trading
        if (!buyExchange.isTradingEnabled || !buyExchange.isTradingEnabled()) {
            throw new Error(`Trading not enabled for ${opportunity.buyExchange} - API credentials required`);
        }

        if (!sellExchange.isTradingEnabled || !sellExchange.isTradingEnabled()) {
            throw new Error(`Trading not enabled for ${opportunity.sellExchange} - API credentials required`);
        }

        // Check balances first
        logger.log('🔍 Checking balances...');
        const baseCurrency = opportunity.symbol.replace('USDT', '');

        // For testnet, we'll use smaller amounts if balance is insufficient
        let actualQuantity = quantity;
        let actualTradeAmount = tradeAmount;

        try {
            const buyBalance = await buyExchange.getBalance();
            const sellBalance = await sellExchange.getBalance();

            const usdtBalance = parseFloat(buyBalance['USDT'] || buyBalance['usdt'] || '0');
            const cryptoBalance = parseFloat(sellBalance[baseCurrency] || sellBalance[baseCurrency.toLowerCase()] || '0');

            logger.log(`💰 ${opportunity.buyExchange} USDT balance: ${usdtBalance}`);
            logger.log(`💰 ${opportunity.sellExchange} ${baseCurrency} balance: ${cryptoBalance}`);

            const requiredUSDT = opportunity.buyPrice * quantity;
            const requiredCrypto = quantity;

            if (config.tradingMode === 'testnet') {
                // In testnet mode, adjust trade size to available balance
                if (usdtBalance < requiredUSDT || usdtBalance === 0) {
                    if (usdtBalance >= 10) { // Minimum $10 trade
                        actualTradeAmount = Math.min(usdtBalance * 0.9, 50); // Use 90% of balance, max $50
                        actualQuantity = actualTradeAmount / opportunity.buyPrice;
                        logger.log(`📊 Adjusted testnet trade: $${actualTradeAmount} (${actualQuantity.toFixed(8)} ${baseCurrency})`);
                    } else {
                        throw new Error(`Insufficient USDT balance on ${opportunity.buyExchange}: ${usdtBalance} (need at least $10 for testnet)`);
                    }
                }

                if (cryptoBalance < actualQuantity) {
                    throw new Error(`Insufficient ${baseCurrency} balance on ${opportunity.sellExchange}: ${cryptoBalance} < ${actualQuantity}`);
                }
            } else {
                // Live mode - strict balance checking
                if (usdtBalance < requiredUSDT) {
                    throw new Error(`Insufficient USDT balance on ${opportunity.buyExchange}: ${usdtBalance} < ${requiredUSDT}`);
                }
                if (cryptoBalance < requiredCrypto) {
                    throw new Error(`Insufficient ${baseCurrency} balance on ${opportunity.sellExchange}: ${cryptoBalance} < ${requiredCrypto}`);
                }
            }
        } catch (balanceError) {
            logger.error(`⚠️ Balance check error: ${balanceError.message}`);
            if (config.tradingMode === 'live') {
                throw balanceError; // Strict for live mode
            }
            // For testnet, try with minimal amount
            actualTradeAmount = 10; // $10 minimum test
            actualQuantity = actualTradeAmount / opportunity.buyPrice;
            logger.log(`🔄 Using minimal testnet amount: $${actualTradeAmount}`);
        }

        logger.log('✅ Proceeding with trade execution...');

        // Execute simultaneous buy and sell orders
        const [buyOrderResult, sellOrderResult] = await Promise.allSettled([
            buyExchange.createOrder({
                symbol: opportunity.symbol,
                type: 'market',
                side: 'buy',
                amount: actualQuantity,
                price: opportunity.buyPrice
            }),
            sellExchange.createOrder({
                symbol: opportunity.symbol,
                type: 'market',
                side: 'sell',
                amount: actualQuantity,
                price: opportunity.sellPrice
            })
        ]);

        // Check if both orders succeeded
        if (buyOrderResult.status === 'rejected') {
            throw new Error(`Buy order failed: ${buyOrderResult.reason}`);
        }
        if (sellOrderResult.status === 'rejected') {
            throw new Error(`Sell order failed: ${sellOrderResult.reason}`);
        }

        const buyOrder = buyOrderResult.value;
        const sellOrder = sellOrderResult.value;

        // Calculate actual results
        const actualBuyPrice = buyOrder.averagePrice || buyOrder.price || opportunity.buyPrice;
        const actualSellPrice = sellOrder.averagePrice || sellOrder.price || opportunity.sellPrice;
        const buyTotal = actualBuyPrice * (buyOrder.filledQuantity || buyOrder.executedQty || actualQuantity);
        const sellTotal = actualSellPrice * (sellOrder.filledQuantity || sellOrder.executedQty || actualQuantity);
        const profit = sellTotal - buyTotal;

        result = {
            tradeId,
            status: TRADE_STATUS.COMPLETED,
            actualProfit: profit,
            actualProfitPercentage: (profit / buyTotal) * 100,
            executionTime: Date.now() - startTime,
            tradingMode: config.tradingMode,
            arbitrageType: 'Direct',
            buyOrder: {
                exchange: opportunity.buyExchange,
                orderId: buyOrder.orderId || buyOrder.id || buyOrder.clientOrderId,
                price: actualBuyPrice,
                quantity: buyOrder.filledQuantity || buyOrder.executedQty || actualQuantity,
                total: buyTotal
            },
            sellOrder: {
                exchange: opportunity.sellExchange,
                orderId: sellOrder.orderId || sellOrder.id || sellOrder.clientOrderId,
                price: actualSellPrice,
                quantity: sellOrder.filledQuantity || sellOrder.executedQty || actualQuantity,
                total: sellTotal
            },
            fees: (buyOrder.fee || 0) + (sellOrder.fee || 0),
            buyOrderResponse: JSON.stringify(buyOrder), // Store full buy order response as JSON
            sellOrderResponse: JSON.stringify(sellOrder) // Store full sell order response as JSON
        };

        // Update stats and database
        stats.totalTrades++;
        stats.successfulTrades++;
        stats.directTrades++;
        stats.totalProfit += result.actualProfit;
        stats.directProfit += result.actualProfit;

        await TradeHistoryService.updateTradeRecord(tradeId, {
            status: result.status,
            actualProfit: result.actualProfit,
            actualProfitPercent: result.actualProfitPercentage,
            executionTime: result.executionTime,
            buyOrderResponse: result.buyOrderResponse || null,
            sellOrderResponse: result.sellOrderResponse || null
        });

        logger.log(`✅ Direct trade completed: ${result.actualProfit.toFixed(4)} profit`);
        return result;

    } catch (error) {
        logger.error(`❌ Direct trade failed: ${error.message}`);

        stats.totalTrades++;

        // Save failure to database
        await TradeHistoryService.updateTradeRecord(tradeId, {
            status: TRADE_STATUS.FAILED,
            errorMessage: error.message,
            executionTime: Date.now() - startTime,
            arbitrageType: 'Direct'
        }).catch(() => { });

        return {
            tradeId,
            status: TRADE_STATUS.FAILED,
            error: error.message,
            executionTime: Date.now() - startTime,
            arbitrageType: 'Direct'
        };
    }
}

// Triangular arbitrage execution
async function executeTriangularArbitrage(opportunity, options = {}, tradeId, startTime) {
    try {
        logger.log(`🔺 Triangular Arbitrage Execution: ${opportunity.tradingPath}`);

        // Validate triangular opportunity
        if (!opportunity.steps || opportunity.steps.length !== 3) {
            throw new Error('Invalid triangular arbitrage opportunity - missing steps');
        }

        // Use smaller amount for triangular arbitrage due to complexity
        const tradeAmount = Math.min(
            opportunity.capitalAmount || config.maxTriangularTradeAmount,
            config.maxTriangularTradeAmount
        );

        // Save to database
        await TradeHistoryService.saveTradeRecord({
            tradeId,
            userId: options.userId || 'default',
            symbol: opportunity.tradingPath,
            buyExchange: opportunity.exchange,
            sellExchange: opportunity.exchange,
            buyPrice: opportunity.steps[0].price,
            sellPrice: opportunity.steps[2].price,
            quantity: tradeAmount / opportunity.steps[0].price,
            capitalAmount: tradeAmount,
            expectedProfit: parseFloat(opportunity.netProfitUSDT),
            expectedProfitPercent: parseFloat(opportunity.profitPercent),
            status: 'pending',
            tradingMode: config.tradingMode,
            arbitrageType: 'Triangular'
        });

        // Execute triangular arbitrage using the service
        const result = await triangularService.executeTriangularArbitrage({
            ...opportunity,
            capitalAmount: tradeAmount
        });

        if (result.success) {
            // Update stats
            stats.totalTrades++;
            stats.successfulTrades++;
            stats.triangularTrades++;
            stats.totalProfit += result.profit;
            stats.triangularProfit += result.profit;

            // Update database
            await TradeHistoryService.updateTradeRecord(tradeId, {
                status: TRADE_STATUS.COMPLETED,
                actualProfit: result.profit,
                actualProfitPercent: result.profitPercent,
                executionTime: Date.now() - startTime,
                buyOrderResponse: JSON.stringify(result.steps),
                sellOrderResponse: JSON.stringify(result)
            });

            logger.log(`✅ Triangular arbitrage completed: ${result.profit.toFixed(4)} profit`);

            return {
                tradeId,
                status: TRADE_STATUS.COMPLETED,
                actualProfit: result.profit,
                actualProfitPercentage: result.profitPercent,
                executionTime: Date.now() - startTime,
                tradingMode: config.tradingMode,
                arbitrageType: 'Triangular',
                steps: result.steps,
                tradingPath: opportunity.tradingPath
            };
        } else {
            throw new Error(result.error || 'Triangular arbitrage execution failed');
        }

    } catch (error) {
        logger.error(`❌ Triangular arbitrage failed: ${error.message}`);

        stats.totalTrades++;

        // Save failure to database
        await TradeHistoryService.updateTradeRecord(tradeId, {
            status: TRADE_STATUS.FAILED,
            errorMessage: error.message,
            executionTime: Date.now() - startTime,
            arbitrageType: 'Triangular'
        }).catch(() => { });

        return {
            tradeId,
            status: TRADE_STATUS.FAILED,
            error: error.message,
            executionTime: Date.now() - startTime,
            arbitrageType: 'Triangular'
        };
    }
}

// Get enhanced stats function
function getStats() {
    return {
        totalTrades: stats.totalTrades,
        successfulTrades: stats.successfulTrades,
        successRate: stats.totalTrades > 0 ? (stats.successfulTrades / stats.totalTrades * 100) : 0,
        totalProfit: stats.totalProfit,
        directTrades: stats.directTrades,
        triangularTrades: stats.triangularTrades,
        directProfit: stats.directProfit,
        triangularProfit: stats.triangularProfit,
        mode: config.tradingMode,
        triangularEnabled: config.enableTriangularArbitrage
    };
}

// Update configuration
function updateConfig(newConfig) {
    config = { ...config, ...newConfig };
    logger.log('Trade service configuration updated:', newConfig);
}

// Toggle between testnet and live trading
function setTradingMode(mode) {
    if (!['testnet', 'live'].includes(mode)) {
        throw new Error('Trading mode must be either "testnet" or "live"');
    }
    config.tradingMode = mode;
    logger.log(`🔧 Trading mode changed to: ${mode.toUpperCase()}`);
}

// Enable/disable triangular arbitrage
function setTriangularArbitrage(enabled) {
    config.enableTriangularArbitrage = enabled;
    logger.log(`🔺 Triangular arbitrage ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

// Set maximum triangular trade amount
function setMaxTriangularTradeAmount(amount) {
    if (amount < 10 || amount > 10000) {
        throw new Error('Triangular trade amount must be between $10 and $10,000');
    }
    config.maxTriangularTradeAmount = amount;
    logger.log(`🔺 Max triangular trade amount set to: $${amount}`);
}

// Get triangular arbitrage service instance
function getTriangularService() {
    return triangularService;
}

module.exports = {
    setup,
    executeTrade,
    executeDirectArbitrage,
    executeTriangularArbitrage,
    getStats,
    updateConfig,
    setTradingMode,
    setTriangularArbitrage,
    setMaxTriangularTradeAmount,
    getTriangularService,
    TRADE_STATUS
};
