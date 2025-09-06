/**
 * Ultra Simple Trade Execution Service for Testing
 */

const TradeHistoryService = require('./TradeHistoryService');
const GateioService = require('./GateioService');

// Global variables
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
        if (!opportunity.symbol || !opportunity.buyExchange || !opportunity.sellExchange) {
            throw new Error('Missing required trade data');
        }

        if (opportunity.profitPercentage < config.minProfitThreshold) {
            throw new Error('Profit too low');
        }

        // Add transfer fee validation
        const transferFeePercent = 0.1; // 0.1% transfer fee (adjust based on actual network fees)

        logger.log(`🚀 Trading ${opportunity.symbol}`);
        logger.log(`   Expected profit: ${opportunity.profitPercentage.toFixed(2)}%`);

        // Initialize basic trade details
        const tradeAmount = opportunity.amount || 100;

        // Get current market prices
        let buyMarketPrice, sellMarketPrice;
        try {
            if (!exchangeManager) {
                throw new Error('ExchangeManager not initialized. Call setup() first.');
            }

            const exchanges = exchangeManager.getEnabledExchanges();
            const buyExchange = exchanges.get(opportunity.buyExchange);
            const sellExchange = exchanges.get(opportunity.sellExchange);

            if (!buyExchange || !sellExchange) {
                throw new Error(`Required exchanges not available: ${opportunity.buyExchange}, ${opportunity.sellExchange}`);
            }

            // Get market prices
            if (opportunity.buyExchange === 'gateio' && opportunity.sellExchange === 'gateio') {
                const gateService = new GateioService(true); // true for testnet
                const tickerData = await gateService.getTickerPrice(opportunity.symbol);
                const price = parseFloat(tickerData.last);

                if (!price) {
                    throw new Error('Could not get market price');
                }

                // Use same price for buy and sell in testnet
                buyMarketPrice = price;
                sellMarketPrice = price;
            } else {
                const buyExchange = exchanges.get(opportunity.buyExchange);
                const sellExchange = exchanges.get(opportunity.sellExchange);

                if (!buyExchange || !sellExchange) {
                    throw new Error(`Required exchanges not available: ${opportunity.buyExchange}, ${opportunity.sellExchange}`);
                }

                // Get market prices from each exchange
                [buyMarketPrice, sellMarketPrice] = await Promise.all([
                    buyExchange.getTickerPrice(opportunity.symbol),
                    sellExchange.getTickerPrice(opportunity.symbol)
                ]);

                if (!buyMarketPrice || !sellMarketPrice) {
                    throw new Error('Could not get market prices');
                }
            }

            // Calculate trade quantity with proper decimal precision
            const quantity = Math.floor((tradeAmount / buyMarketPrice) * 100000000) / 100000000; // Round to 8 decimal places

            // Calculate expected profit
            const expectedProfit = (sellMarketPrice - buyMarketPrice) * quantity;
            const expectedProfitPercent = (expectedProfit / tradeAmount) * 100;

            // Ensure database record exists
            try {
                await TradeHistoryService.saveTradeRecord({
                    tradeId,
                    userId: options.userId || 'default',
                    symbol: opportunity.symbol,
                    buyExchange: opportunity.buyExchange,
                    sellExchange: opportunity.sellExchange,
                    buyPrice: buyMarketPrice,
                    sellPrice: sellMarketPrice,
                    quantity: quantity,
                    capitalAmount: tradeAmount,
                    expectedProfit: expectedProfit,
                    expectedProfitPercent: expectedProfitPercent,
                    status: 'pending',
                    tradingMode: config.tradingMode,
                    simulation: config.tradingMode === 'testnet'
                });
            } catch (dbError) {
                logger.error(`Failed to create trade record: ${dbError.message}`);
                // Continue with trade execution even if DB fails
            }

            // Update opportunity with current prices
            opportunity = {
                ...opportunity,
                buyPrice: buyMarketPrice,
                sellPrice: sellMarketPrice,
                quantity: quantity
            };
        } catch (error) {
            throw new Error(`Error fetching market prices: ${error.message}`);
        }

        // Normalize symbol format for each exchange
        const buySymbol = opportunity.buyExchange === 'gateio' ? opportunity.symbol : opportunity.symbol.replace('_', '');
        const sellSymbol = opportunity.sellExchange === 'gateio' ? opportunity.symbol : opportunity.symbol.replace('_', '');

        // Check if trading pair is available (especially important for testnet)
        if (config.tradingMode === 'testnet') {
            // For Gate.io testnet, verify trading pair availability
            if (opportunity.buyExchange === 'gateio') {
                const isAvailable = await buyExchange.checkTradingPairAvailable(buySymbol);
                if (!isAvailable) {
                    throw new Error(`Trading pair ${buySymbol} not available on Gate.io testnet`);
                }
            }
            if (opportunity.sellExchange === 'gateio') {
                const isAvailable = await sellExchange.checkTradingPairAvailable(sellSymbol);
                if (!isAvailable) {
                    throw new Error(`Trading pair ${sellSymbol} not available on Gate.io testnet`);
                }
            }
        }

        // Get current market prices
        try {
            const buyMarketPrice = await buyExchange.fetchPrice(buySymbol);
            const sellMarketPrice = await sellExchange.fetchPrice(sellSymbol);

            if (!buyMarketPrice || !sellMarketPrice) {
                throw new Error('Could not get market prices');
            }

            // Update opportunity with current prices
            opportunity = {
                ...opportunity,
                buyPrice: buyMarketPrice,
                sellPrice: sellMarketPrice
            };

            logger.log(`📊 Market prices - Buy: ${buyMarketPrice}, Sell: ${sellMarketPrice}`);
        } catch (error) {
            throw new Error(`Error fetching market prices: ${error.message}`);
        }

        // Calculate trade quantity with proper decimal precision
        const quantity = Math.floor((tradeAmount / opportunity.buyPrice) * 100000000) / 100000000; // Round to 8 decimal places

        // Save to database with market prices
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
            simulation: config.tradingMode === 'testnet'
        });

        // Execute the trade - both testnet and live use real API calls
        let result;

        logger.log(`🎯 ${config.tradingMode.toUpperCase()} MODE - REAL API EXECUTION`);
        logger.log(`💰 Executing ${quantity.toFixed(8)} ${opportunity.symbol}`);

        // Verify exchanges support trading
        if (!buyExchange.isTradingEnabled || !buyExchange.isTradingEnabled()) {
            throw new Error(`Trading not enabled for ${opportunity.buyExchange} - API credentials required`);
        }

        if (!sellExchange.isTradingEnabled || !sellExchange.isTradingEnabled()) {
            throw new Error(`Trading not enabled for ${opportunity.sellExchange} - API credentials required`);
        }

        // Check balances first
        logger.log('🔍 Checking balances...');
        const baseCurrency = opportunity.symbol.replace('USDT', '').replace('_', '');

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

            // Adjust amount for testnet to ensure it meets minimum requirements
            if (config.tradingMode === 'testnet') {
                // Calculate a safe testnet trade amount (0.1% of available balance)
                const maxTradeAmount = usdtBalance * 0.001;
                actualTradeAmount = Math.min(maxTradeAmount, tradeAmount);

                // Ensure minimum trade amount
                if (actualTradeAmount < 10) {
                    actualTradeAmount = 10; // $10 minimum for testnet
                }

                // Calculate quantity based on current market price, rounded to 8 decimal places
                actualQuantity = Math.floor((actualTradeAmount / opportunity.buyPrice) * 100000000) / 100000000;

                logger.log(`📊 Adjusted testnet trade: $${actualTradeAmount.toFixed(4)} (${actualQuantity.toFixed(8)} ${baseCurrency})`);

                // Double check if the adjusted amount is feasible
                if (usdtBalance < actualTradeAmount) {
                    throw new Error(`Insufficient USDT balance on ${opportunity.buyExchange}: ${usdtBalance} < ${actualTradeAmount}`);
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
            throw balanceError; // Always throw balance errors
        } logger.log('✅ Proceeding with trade execution...');

        // Execute buy order first
        logger.log(`🔄 Executing buy order on ${opportunity.buyExchange}...`);
        const buyOrderResult = await buyExchange.createOrder({
            symbol: buySymbol,
            type: 'market',
            side: 'buy',
            amount: actualQuantity,
            price: opportunity.buyPrice
        });

        if (!buyOrderResult || buyOrderResult.status === 'rejected') {
            throw new Error(`Buy order failed: ${buyOrderResult?.reason || 'Unknown error'}`);
        }

        const buyOrder = buyOrderResult;
        logger.log(`✅ Buy order completed: ${buyOrder.orderId || buyOrder.id}`);

        // Wait for order to settle and get deposit address
        logger.log(`🔄 Getting deposit address from ${opportunity.sellExchange}...`);
        const depositAddress = await sellExchange.getDepositAddress(baseCurrency);
        if (!depositAddress) {
            throw new Error(`Failed to get deposit address from ${opportunity.sellExchange}`);
        }

        // Initiate transfer
        logger.log(`🔄 Initiating transfer to ${opportunity.sellExchange}...`);
        const withdrawResult = await buyExchange.withdraw(
            baseCurrency,           // coin
            depositAddress.address, // address
            'TRX',                 // network (using TRX network)
            actualQuantity,        // amount
            depositAddress.tag     // memo/tag if provided
        );

        if (!withdrawResult || (!withdrawResult.success && !['completed', 'success'].includes(withdrawResult.status))) {
            throw new Error(`Withdrawal failed: ${withdrawResult?.reason || withdrawResult?.error || withdrawResult?.message || 'Unknown error'}`);
        }

        logger.log('✅ Withdrawal initiated:', withdrawResult);

        // Wait for transfer to complete
        logger.log(`⏳ Waiting for transfer to complete...`);
        let transferComplete = false;
        const maxWaitTime = config.tradingMode === 'testnet' ? 5000 : 300000; // 5 seconds for testnet, 5 minutes for live
        const startWait = Date.now();

        while (!transferComplete && Date.now() - startWait < maxWaitTime) {
            const deposits = await sellExchange.getDeposits(baseCurrency);
            const matchingDeposit = deposits.find(d =>
                d.txId === withdrawResult.txId ||
                (d.amount === actualQuantity && Date.now() - d.timestamp < maxWaitTime) // Match amount for recent deposits
            );

            if (matchingDeposit && matchingDeposit.status === 'completed') {
                transferComplete = true;
                logger.log(`✅ Transfer completed!`);
            } else {
                await new Promise(resolve => setTimeout(resolve, config.tradingMode === 'testnet' ? 100 : 10000)); // Wait 0.1s in testnet, 10s in live
            }
        }

        if (!transferComplete) {
            if (config.tradingMode === 'testnet') {
                // In testnet, proceed anyway for testing
                logger.log('⚠️ Warning: Transfer not confirmed yet, but proceeding in testnet mode');
                transferComplete = true;
            } else {
                throw new Error('Transfer did not complete in time');
            }
        }

        // Execute sell order
        logger.log(`🔄 Executing sell order on ${opportunity.sellExchange}...`);
        const sellOrderResult = await sellExchange.createOrder({
            symbol: sellSymbol,
            type: 'market',
            side: 'sell',
            amount: actualQuantity,
            price: opportunity.sellPrice
        });

        if (!sellOrderResult || sellOrderResult.status === 'rejected') {
            throw new Error(`Sell order failed: ${sellOrderResult?.reason || 'Unknown error'}`);
        }

        const sellOrder = sellOrderResult;

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
