/**
 * Ultra Simple Trade Execution Service
 * Only 2 main functions for easy understanding
 */

const TradeHistoryService = require('./TradeHistoryService');

// Simple global variables
let exchangeManager = null;
let logger = console;
let stats = { totalTrades: 0, successfulTrades: 0, totalProfit: 0 };
let config = {
    minProfitThreshold: 0.001,
    tradingMode: 'testnet' // 'testnet' or 'live'
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
    logger.log('Trade service setup complete');
}

// Main function - execute a trade
async function executeTrade(opportunity, options = {}) {
    const tradeId = 'trade_' + Date.now();
    const startTime = Date.now();

    try {
        // Simple validation
        if (!opportunity.symbol || !opportunity.buyPrice || !opportunity.sellPrice) {
            throw new Error('Missing required trade data');
        }

        if (opportunity.profitPercentage < config.minProfitThreshold) {
            throw new Error('Profit too low');
        }

        logger.log(`🚀 Trading ${opportunity.symbol}`);
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
            tradingMode: config.tradingMode
        });

        // Execute the trade - both testnet and live use real API calls
        let result;

        logger.log(`🎯 ${config.tradingMode.toUpperCase()} MODE - REAL API EXECUTION`);
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
        stats.totalProfit += result.actualProfit;

        await TradeHistoryService.updateTradeRecord(tradeId, {
            status: result.status,
            actualProfit: result.actualProfit,
            actualProfitPercent: result.actualProfitPercentage,
            executionTime: result.executionTime,
            buyOrderResponse: result.buyOrderResponse || null,
            sellOrderResponse: result.sellOrderResponse || null
        });

        logger.log(`✅ Trade completed: ${result.actualProfit.toFixed(4)} profit`);
        return result;

    } catch (error) {
        logger.error(`❌ Trade failed: ${error.message}`);

        stats.totalTrades++;

        // Save failure to database
        await TradeHistoryService.updateTradeRecord(tradeId, {
            status: TRADE_STATUS.FAILED,
            errorMessage: error.message,
            executionTime: Date.now() - startTime
        }).catch(() => { });

        return {
            tradeId,
            status: TRADE_STATUS.FAILED,
            error: error.message,
            executionTime: Date.now() - startTime
        };
    }
}

// Get stats function
function getStats() {
    return {
        totalTrades: stats.totalTrades,
        successfulTrades: stats.successfulTrades,
        successRate: stats.totalTrades > 0 ? (stats.successfulTrades / stats.totalTrades * 100) : 0,
        totalProfit: stats.totalProfit,
        mode: config.tradingMode
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

module.exports = {
    setup,
    executeTrade,
    getStats,
    updateConfig,
    setTradingMode,
    TRADE_STATUS
};
