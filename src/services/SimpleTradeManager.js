/**
 * Simple Trade Manager
 * Easy-to-understand trading system that focuses on BUY and SELL operations
 */

class SimpleTradeManager {
    constructor() {
        this.exchanges = new Map(); // Store exchange instances
        this.isInitialized = false;
    }

    /**
     * Initialize the trade manager with exchanges
     * @param {Object} exchanges - Object containing exchange instances
     */
    initialize(exchanges) {
        // Store exchanges for easy access
        this.exchanges.set('binance', exchanges.binance);
        this.exchanges.set('bybit', exchanges.bybit);
        this.exchanges.set('kraken', exchanges.kraken);
        this.exchanges.set('mexc', exchanges.mexc);
        this.exchanges.set('gateio', exchanges.gateio);
        
        this.isInitialized = true;
        console.log('✅ Simple Trade Manager initialized');
    }

    /**
     * BUY crypto on a specific exchange
     * @param {string} exchangeName - Name of exchange ('binance', 'bybit', etc.)
     * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
     * @param {number} amount - How much to buy (in USDT)
     * @param {string} type - 'market' or 'limit'
     * @param {number} price - Price for limit orders
     */
    async buyCrypto(exchangeName, symbol, amount, type = 'market', price = null) {
        try {
            console.log(`🛒 BUYING: ${amount} USDT worth of ${symbol} on ${exchangeName}`);
            
            // Get the exchange
            const exchange = this.exchanges.get(exchangeName.toLowerCase());
            if (!exchange) {
                throw new Error(`Exchange ${exchangeName} not found`);
            }

            // Check if exchange supports trading
            if (!exchange.isTradingEnabled()) {
                throw new Error(`Trading not enabled on ${exchangeName}. Please add API keys.`);
            }

            // Calculate quantity based on current price
            let quantity;
            if (type === 'market') {
                // For market orders, we need current price to calculate quantity
                const prices = await exchange.fetchPrices([{ symbol }]);
                const currentPrice = prices[symbol];
                if (!currentPrice) {
                    throw new Error(`Could not get current price for ${symbol}`);
                }
                quantity = amount / currentPrice; // Convert USDT amount to crypto quantity
            } else {
                // For limit orders, use provided price
                if (!price) {
                    throw new Error('Price is required for limit orders');
                }
                quantity = amount / price;
            }

            // Place the buy order
            const result = await exchange.placeBuyOrder(symbol, quantity, price, type);
            
            if (result.success) {
                console.log(`✅ BUY ORDER SUCCESSFUL:`);
                console.log(`   Exchange: ${exchangeName}`);
                console.log(`   Symbol: ${symbol}`);
                console.log(`   Quantity: ${quantity}`);
                console.log(`   Type: ${type}`);
                console.log(`   Order ID: ${result.orderId}`);
                
                return {
                    success: true,
                    exchange: exchangeName,
                    symbol,
                    side: 'BUY',
                    quantity,
                    price: result.price,
                    orderId: result.orderId,
                    timestamp: new Date()
                };
            } else {
                throw new Error('Buy order failed');
            }

        } catch (error) {
            console.error(`❌ BUY FAILED: ${error.message}`);
            return {
                success: false,
                error: error.message,
                exchange: exchangeName,
                symbol,
                side: 'BUY'
            };
        }
    }

    /**
     * SELL crypto on a specific exchange
     * @param {string} exchangeName - Name of exchange ('binance', 'bybit', etc.)
     * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
     * @param {number} quantity - How much crypto to sell
     * @param {string} type - 'market' or 'limit'
     * @param {number} price - Price for limit orders
     */
    async sellCrypto(exchangeName, symbol, quantity, type = 'market', price = null) {
        try {
            console.log(`💰 SELLING: ${quantity} ${symbol} on ${exchangeName}`);
            
            // Get the exchange
            const exchange = this.exchanges.get(exchangeName.toLowerCase());
            if (!exchange) {
                throw new Error(`Exchange ${exchangeName} not found`);
            }

            // Check if exchange supports trading
            if (!exchange.isTradingEnabled()) {
                throw new Error(`Trading not enabled on ${exchangeName}. Please add API keys.`);
            }

            // Place the sell order
            const result = await exchange.placeSellOrder(symbol, quantity, price, type);
            
            if (result.success) {
                console.log(`✅ SELL ORDER SUCCESSFUL:`);
                console.log(`   Exchange: ${exchangeName}`);
                console.log(`   Symbol: ${symbol}`);
                console.log(`   Quantity: ${quantity}`);
                console.log(`   Type: ${type}`);
                console.log(`   Order ID: ${result.orderId}`);
                
                return {
                    success: true,
                    exchange: exchangeName,
                    symbol,
                    side: 'SELL',
                    quantity,
                    price: result.price,
                    orderId: result.orderId,
                    timestamp: new Date()
                };
            } else {
                throw new Error('Sell order failed');
            }

        } catch (error) {
            console.error(`❌ SELL FAILED: ${error.message}`);
            return {
                success: false,
                error: error.message,
                exchange: exchangeName,
                symbol,
                side: 'SELL'
            };
        }
    }

    /**
     * Get available exchanges and their status
     */
    getExchangeStatus() {
        const status = {};
        
        for (const [name, exchange] of this.exchanges) {
            status[name] = {
                name: exchange.name,
                enabled: exchange.isEnabled(),
                tradingEnabled: exchange.isTradingEnabled(),
                testnet: exchange.testnet,
                fee: exchange.fee
            };
        }
        
        return status;
    }

    /**
     * Check balance on a specific exchange
     * @param {string} exchangeName - Name of exchange
     */
    async checkBalance(exchangeName) {
        try {
            const exchange = this.exchanges.get(exchangeName.toLowerCase());
            if (!exchange) {
                throw new Error(`Exchange ${exchangeName} not found`);
            }

            if (!exchange.isTradingEnabled()) {
                throw new Error(`Trading not enabled on ${exchangeName}. Please add API keys.`);
            }

            const balanceResult = await exchange.getBalance();
            
            if (balanceResult.success) {
                console.log(`💼 BALANCE on ${exchangeName}:`);
                for (const [asset, balance] of Object.entries(balanceResult.balances)) {
                    console.log(`   ${asset}: ${balance.total} (Free: ${balance.free}, Locked: ${balance.locked})`);
                }
                return balanceResult;
            } else {
                throw new Error('Failed to get balance');
            }

        } catch (error) {
            console.error(`❌ BALANCE CHECK FAILED: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Simple arbitrage: Buy on one exchange, sell on another
     * @param {string} buyExchange - Exchange to buy from
     * @param {string} sellExchange - Exchange to sell to
     * @param {string} symbol - Trading pair
     * @param {number} amount - Amount in USDT to trade
     */
    async simpleArbitrage(buyExchange, sellExchange, symbol, amount) {
        try {
            console.log(`🔄 ARBITRAGE: Buy ${symbol} on ${buyExchange}, Sell on ${sellExchange}`);
            
            // Step 1: Buy on first exchange
            const buyResult = await this.buyCrypto(buyExchange, symbol, amount, 'market');
            
            if (!buyResult.success) {
                throw new Error(`Buy failed: ${buyResult.error}`);
            }

            // Step 2: Sell on second exchange
            const sellResult = await this.sellCrypto(sellExchange, symbol, buyResult.quantity, 'market');
            
            if (!sellResult.success) {
                console.warn(`⚠️ Sell failed, you may have crypto stuck on ${buyExchange}`);
                throw new Error(`Sell failed: ${sellResult.error}`);
            }

            // Calculate profit
            const buyValue = amount; // USDT spent
            const sellValue = sellResult.quantity * sellResult.price; // USDT received
            const profit = sellValue - buyValue;
            const profitPercent = (profit / buyValue) * 100;

            console.log(`✅ ARBITRAGE COMPLETED:`);
            console.log(`   Profit: ${profit.toFixed(4)} USDT (${profitPercent.toFixed(2)}%)`);

            return {
                success: true,
                buyResult,
                sellResult,
                profit,
                profitPercent
            };

        } catch (error) {
            console.error(`❌ ARBITRAGE FAILED: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = SimpleTradeManager;
