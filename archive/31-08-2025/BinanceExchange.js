/**
 * Binance Exchange Implementation
 * Supports both market data and real trading operations
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const BaseExchange = require('./BaseExchange');
const BinanceService = require('../services/BinanceService');

class BinanceExchange extends BaseExchange {
    constructor(config) {
        super(config);

        // Set API credentials
        this.apiKey = config.apiKey || process.env.BINANCE_API_KEY;
        this.apiSecret = config.apiSecret || process.env.BINANCE_API_SECRET;
        this.testnet = config.testnet || process.env.BINANCE_TESTNET === 'true';

        // Initialize BinanceService
        this.binanceService = new BinanceService(this.testnet);

        // Binance-specific URLs
        this.tradingApiUrl = this.testnet ? 'https://testnet.binance.vision/api/v3' : 'https://api.binance.com/api/v3';
        this.testnetApiUrl = 'https://testnet.binance.vision/api/v3';
        this.testnetWsUrl = 'wss://testnet.binance.vision/ws-api/v3';

        this._log('info', `Initialized with ${this.testnet ? 'TESTNET' : 'MAINNET'} configuration`);
        this._log('info', `API credentials: ${this.apiKey ? 'SET' : 'NOT SET'}`);

        // Test connectivity on initialization
        this.testConnection();
    }

    /**
     * Fetch a single symbol's current price
     * @param {string} symbol - Trading pair symbol
     * @returns {Promise<number>} - Current price
     */
    async fetchPrice(symbol) {
        try {
            // Use ticker price endpoint
            const url = `${this.tradingApiUrl}/ticker/price?symbol=${symbol}`;
            const response = await this._fetchWithRetry(url);

            if (response.data && response.data.price) {
                const price = parseFloat(response.data.price);
                this._log('info', `Fetched price for ${symbol}: ${price}`);
                return price;
            }
            throw new Error('Price not found in response');
        } catch (error) {
            this._log('error', `Failed to fetch price for ${symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetch prices from Binance API
     * @param {Array} tradingPairs - Array of trading pair objects
     * @returns {Promise<Object>} - Object with symbol-price mappings
     */
    async fetchPrices(tradingPairs) {
        try {
            const response = await this._fetchWithRetry(this.apiUrl);
            const prices = {};

            response.data.forEach(ticker => {
                const pair = tradingPairs.find(p => p.symbol === ticker.symbol);
                if (pair) {
                    prices[ticker.symbol] = parseFloat(ticker.price);
                }
            });

            this._log('info', `Fetched ${Object.keys(prices).length} prices`);
            return prices;
        } catch (error) {
            this._log('error', `Failed to fetch prices: ${error.message}`);
            return {};
        }
    }

    /**
     * Initialize Binance WebSocket connection
     * @param {Array} tradingPairs - Array of trading pair objects
     * @param {Function} onPriceUpdate - Callback for price updates
     * @returns {WebSocket} - WebSocket connection
     */
    initializeWebSocket(tradingPairs, onPriceUpdate) {
        try {
            const ws = new WebSocket(this.wsUrl);

            ws.on('open', () => {
                this._log('info', 'WebSocket connected - REAL-TIME MODE ACTIVE');
            });

            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && Array.isArray(parsed)) {
                        const priceUpdates = {};
                        let hasUpdates = false;

                        parsed.forEach(ticker => {
                            const pair = tradingPairs.find(p => p.symbol === ticker.s);
                            if (pair && ticker.c) {
                                const newPrice = parseFloat(ticker.c);
                                priceUpdates[ticker.s] = newPrice;
                                hasUpdates = true;
                            }
                        });

                        if (hasUpdates && onPriceUpdate) {
                            onPriceUpdate('binance', priceUpdates);
                        }
                    }
                } catch (error) {
                    this._log('warn', `WebSocket parse error: ${error.message}`);
                }
            });

            ws.on('error', (error) => {
                this._log('error', `WebSocket error: ${error.message}`);
            });

            ws.on('close', () => {
                this._log('warn', 'WebSocket closed - attempting reconnection...');
            });

            return ws;
        } catch (error) {
            this._log('error', `Failed to initialize WebSocket: ${error.message}`);
            return null;
        }
    }

    // ================ TRADING METHODS ================

    /**
     * Test connection and authentication
     */
    async testConnection() {
        try {
            await this.binanceService.testConnectivity();
            if (this.apiKey && this.apiSecret) {
                await this.binanceService.testAuthentication();
            }
        } catch (error) {
            this._log('warn', `Connection test failed: ${error.message}`);
        }
    }

    /**
     * Validate order parameters
     * @param {string} symbol - Trading pair symbol
     * @param {number} quantity - Order quantity
     * @param {number} price - Order price (for limit orders)
     * @param {string} type - Order type
     */
    _validateOrderParams(symbol, quantity, price, type) {
        if (!symbol || typeof symbol !== 'string') {
            throw new Error('Invalid symbol');
        }
        if (!quantity || quantity <= 0) {
            throw new Error('Invalid quantity');
        }
        if (type === 'limit' && (!price || price <= 0)) {
            throw new Error('Price required for limit orders');
        }
    }

    /**
     * Get the appropriate API URL based on testnet setting
     * @returns {string} - API URL
     */
    getApiUrl() {
        return this.testnet ? this.testnetApiUrl : this.tradingApiUrl;
    }

    /**
     * Place a buy order on Binance
     * @param {string} symbol - Trading pair symbol
     * @param {number} quantity - Amount to buy
     * @param {number} price - Price per unit (for limit orders)
     * @param {string} type - Order type ('market' or 'limit')
     * @returns {Promise<Object>} - Order result
     */
    async placeBuyOrder(symbol, quantity, price = null, type = 'market') {
        this._validateOrderParams(symbol, quantity, price, type);

        // Format quantity to match symbol's requirements
        const formattedQuantity = this._formatQuantity(quantity, symbol);

        try {
            let result;

            if (type.toLowerCase() === 'market') {
                result = await this.binanceService.createMarketBuyOrder(symbol, formattedQuantity);
            } else {
                result = await this.binanceService.createLimitBuyOrder(symbol, formattedQuantity, price);
            }

            this._log('info', `✅ Buy order placed: ${formattedQuantity} ${symbol} at ${price || 'market'}`);

            return {
                success: true,
                orderId: result.orderId,
                clientOrderId: result.clientOrderId,
                symbol: result.symbol,
                side: result.side,
                type: result.type,
                quantity: parseFloat(result.origQty || result.executedQty),
                price: parseFloat(result.price || price || 0),
                status: result.status,
                timestamp: result.transactTime || Date.now(),
                fills: result.fills || []
            };
        } catch (error) {
            this._log('error', `❌ Buy order failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Place a sell order on Binance
     * @param {string} symbol - Trading pair symbol
     * @param {number} quantity - Amount to sell
     * @param {number} price - Price per unit (for limit orders)
     * @param {string} type - Order type ('market' or 'limit')
     * @returns {Promise<Object>} - Order result
     */
    async placeSellOrder(symbol, quantity, price = null, type = 'market') {
        this._validateOrderParams(symbol, quantity, price, type);

        // Format quantity to match symbol's requirements
        const formattedQuantity = this._formatQuantity(quantity, symbol);

        try {
            let result;

            if (type.toLowerCase() === 'market') {
                result = await this.binanceService.createMarketSellOrder(symbol, formattedQuantity);
            } else {
                result = await this.binanceService.createLimitSellOrder(symbol, formattedQuantity, price);
            }

            this._log('info', `✅ Sell order placed: ${formattedQuantity} ${symbol} at ${price || 'market'}`);

            return {
                success: true,
                orderId: result.orderId,
                clientOrderId: result.clientOrderId,
                symbol: result.symbol,
                side: result.side,
                type: result.type,
                quantity: parseFloat(result.origQty || result.executedQty),
                price: parseFloat(result.price || price || 0),
                status: result.status,
                timestamp: result.transactTime || Date.now(),
                fills: result.fills || []
            };
        } catch (error) {
            this._log('error', `❌ Sell order failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get order status from Binance
     * @param {string} symbol - Trading pair symbol
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Order status
     */
    async getOrderStatus(symbol, orderId) {
        try {
            const result = await this.binanceService.getOrderStatus({
                symbol: symbol.toUpperCase(),
                orderId: orderId
            });

            return {
                success: true,
                orderId: result.orderId,
                symbol: result.symbol,
                status: result.status,
                side: result.side,
                type: result.type,
                quantity: parseFloat(result.origQty),
                executedQty: parseFloat(result.executedQty),
                price: parseFloat(result.price || 0),
                stopPrice: parseFloat(result.stopPrice || 0),
                time: result.time,
                updateTime: result.updateTime
            };
        } catch (error) {
            this._log('error', `❌ Get order status failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cancel an order on Binance
     * @param {string} symbol - Trading pair symbol
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Cancellation result
     */
    async cancelOrder(symbol, orderId) {
        try {
            const result = await this.binanceService.cancelOrder({
                symbol: symbol.toUpperCase(),
                orderId: orderId
            });

            this._log('info', `✅ Order cancelled: ${orderId}`);

            return {
                success: true,
                orderId: result.orderId,
                symbol: result.symbol,
                status: result.status,
                clientOrderId: result.clientOrderId
            };
        } catch (error) {
            this._log('error', `❌ Cancel order failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get account details from Binance /api/v3/account
     * @returns {Promise<Object>} - Raw Binance API response
     */
    async getAccountDetails() {
        try {
            this._log('info', `Fetching account details from ${this.testnet ? 'TESTNET' : 'MAINNET'}`);

            // Get the raw response directly from Binance API
            const result = await this.binanceService.getAccountDetails();

            this._log('info', `✅ Raw account data retrieved from Binance API`);

            // Return the raw Binance API response without any modification
            return result;

        } catch (error) {
            this._log('error', `❌ Failed to get account details: ${error.message}`);
            throw new Error(`Binance account details failed: ${error.message}`);
        }
    }

    /**
     * Get balance for a specific asset or all balances
     * @param {string} asset - Optional asset symbol (e.g., 'USDT', 'BTC')
     * @returns {Promise<Object>} - Raw Binance API response or specific balance
     */
    async getBalance(asset) {
        try {
            if (asset) {
                // Return specific asset balance using BinanceService
                const balance = await this.binanceService.getBalance(asset);
                return balance;
            }

            // Return all balances as object for compatibility
            const accountData = await this.binanceService.getAccountDetails();
            const balances = {};
            accountData.balances.forEach(balance => {
                const free = parseFloat(balance.free);
                if (free > 0) {
                    balances[balance.asset] = balance.free;
                }
            });

            return balances;
        } catch (error) {
            this._log('error', `❌ Failed to get balance: ${error.message}`);
            if (asset) {
                return { free: "0.00000000", locked: "0.00000000", asset: asset.toUpperCase() };
            }
            return {};
        }
    }

    /**
     * Create an order with unified interface
     * @param {Object} orderParams - Order parameters
     * @returns {Promise<Object>} - Order result
     */
    async createOrder(orderParams) {
        const { symbol, type, side, amount, price } = orderParams;

        try {
            let result;
            if (side.toLowerCase() === 'buy') {
                result = await this.placeBuyOrder(symbol, amount, price, type);
            } else if (side.toLowerCase() === 'sell') {
                result = await this.placeSellOrder(symbol, amount, price, type);
            } else {
                throw new Error(`Invalid order side: ${side}`);
            }

            // Transform to unified format
            return {
                id: result.orderId,
                orderId: result.orderId,
                clientOrderId: result.clientOrderId,
                symbol: result.symbol,
                side: result.side,
                type: result.type,
                amount: amount,
                quantity: result.quantity,
                price: result.price,
                filledQuantity: result.quantity,
                executedQty: result.quantity,
                averagePrice: result.price,
                status: result.status,
                timestamp: result.timestamp,
                fee: 0, // Will be updated when order is filled
                fills: result.fills || []
            };
        } catch (error) {
            this._log('error', `❌ Create order failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all balances with proper structure
     */
    async getAllBalances() {
        try {
            const accountData = await this.binanceService.getAccountDetails();

            const balances = {};
            accountData.balances.forEach(balance => {
                const free = parseFloat(balance.free);
                const locked = parseFloat(balance.locked);
                const total = free + locked;

                if (total > 0) {
                    balances[balance.asset] = {
                        free,
                        locked,
                        total
                    };
                }
            });

            this._log('info', `✅ Retrieved balances for ${Object.keys(balances).length} assets`);
            return { success: true, balances };
        } catch (error) {
            this._log('error', `❌ Get balance failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get trading fees for a symbol from Binance
     * @param {string} symbol - Trading pair symbol
     * @returns {Promise<Object>} - Fee information
     */
    async getTradingFees(symbol) {
        try {
            // Use a direct request for trading fees since BinanceService doesn't have this method
            const params = {
                symbol: symbol.toUpperCase(),
                timestamp: Date.now()
            };

            const response = await this._makeAuthenticatedRequest('GET', '/api/v3/tradeFee', params);

            const feeData = response.tradeFee?.[0] || response[0];
            return {
                success: true,
                symbol: feeData.symbol,
                makerCommission: parseFloat(feeData.makerCommission),
                takerCommission: parseFloat(feeData.takerCommission)
            };
        } catch (error) {
            this._log('error', `❌ Get trading fees failed: ${error.message}`);
            // Return default fee if API call fails
            return {
                success: false,
                symbol: symbol,
                makerCommission: this.fee,
                takerCommission: this.fee
            };
        }
    }

    /**
     * Generate authentication headers for Binance API
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Request parameters
     * @returns {Object} - Authentication headers
     */
    getAuthHeaders(method, endpoint, params = {}) {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('API key and secret are required for authenticated requests');
        }

        // Create query string for signature
        const queryString = Object.keys(params)
            .sort()
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        // Generate signature
        const signature = crypto
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');

        return {
            'X-MBX-APIKEY': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Override to handle Binance-specific authenticated requests
     */
    async _makeAuthenticatedRequest(method, endpoint, params = {}) {
        if (!this.isTradingEnabled()) {
            throw new Error(`Trading not enabled for ${this.name} - API keys required`);
        }

        // Add timestamp if not present
        if (!params.timestamp) {
            params.timestamp = Date.now();
        }

        // Create query string for signature
        const queryString = Object.keys(params)
            .sort()
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        // Generate signature
        const signature = crypto
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');

        // Add signature to params
        const finalQueryString = `${queryString}&signature=${signature}`;

        // Use the correct API URL for testnet
        const baseUrl = this.testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        const url = `${baseUrl}${endpoint}?${finalQueryString}`;

        const headers = {
            'X-MBX-APIKEY': this.apiKey,
            'Content-Type': 'application/json'
        };

        this._log('info', `Making authenticated request to: ${this.testnet ? 'TESTNET' : 'MAINNET'}`);

        try {
            const response = await this._fetchWithRetry(url, {
                method,
                headers
            });

            return response.data; // Return just the data portion
        } catch (error) {
            this._log('error', `Authenticated request failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Format quantity to appropriate precision for Binance
     * Most crypto pairs support up to 8 decimal places
     * For LINKUSDT, step size is typically 0.1
     * @param {number} quantity - The quantity to format
     * @returns {number} - Formatted quantity
     */
    _formatQuantity(quantity, symbol = '') {
        // Convert to number if it's a string
        const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

        // Set precision and lot size based on the symbol
        const symbolSettings = {
            'BTCUSDT': { precision: 5, minQty: 0.00001, stepSize: 0.00001 },
            'ETHUSDT': { precision: 5, minQty: 0.00001, stepSize: 0.00001 },
            'LINKUSDT': { precision: 2, minQty: 0.1, stepSize: 0.1 },
            'default': { precision: 8, minQty: 0.00001, stepSize: 0.00001 }
        };

        const settings = symbolSettings[symbol] || symbolSettings.default;
        const { precision, minQty, stepSize } = settings;

        // Calculate steps
        const steps = Math.floor(num / stepSize);
        const quantityInSteps = steps * stepSize;

        // Round to precision
        const multiplier = Math.pow(10, precision);
        const rounded = Math.floor(quantityInSteps * multiplier) / multiplier;

        // Enforce minimum quantity
        const finalQuantity = Math.max(rounded, minQty);

        // Log the quantity formatting for debugging
        this._log('debug', `Formatting quantity: ${num} -> ${finalQuantity} (${symbol}, precision: ${precision}, stepSize: ${stepSize})`);

        return finalQuantity;
    }

    /**
     * Withdraw cryptocurrency from Binance
     * @param {string} coin - The cryptocurrency to withdraw (e.g., 'BTC', 'ETH')
     * @param {string} address - The destination address
     * @param {string} network - The network to use (e.g., 'BSC', 'ETH', 'BTC')
     * @param {number} amount - The amount to withdraw
     * @param {string} [memo] - Optional memo/tag for some coins
     * @returns {Promise<Object>} - Withdrawal result
     */
    async withdraw(coin, address, network, amount, memo) {
        try {
            if (!this.apiKey || !this.apiSecret) {
                throw new Error('API credentials required for withdrawals');
            }

            this._log('info', `🔄 Initiating withdrawal: ${amount} ${coin} to ${address} via ${network}`);

            // Format parameters
            const params = {
                coin: coin.toUpperCase(),
                address,
                network: network.toUpperCase(),
                amount: amount.toString(),
                ...(memo && { memo })
            };

            // Call the service method
            const result = await this.binanceService.withdraw(params);

            this._log('info', `✅ Withdrawal initiated successfully`);

            return {
                success: true,
                id: result.id,
                coin: coin.toUpperCase(),
                amount,
                address,
                network,
                ...(memo && { memo }),
                timestamp: Date.now()
            };
        } catch (error) {
            this._log('error', `❌ Withdrawal failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get deposit address for a cryptocurrency
     * @param {string} coin - The cryptocurrency (e.g., 'BTC', 'ETH')
     * @param {string} network - The network (e.g., 'BSC', 'ETH', 'BTC')
     * @returns {Promise<Object>} - Deposit address information
     */
    async getDepositAddress(coin, network) {
        try {
            if (!this.apiKey || !this.apiSecret) {
                throw new Error('API credentials required for getting deposit address');
            }

            this._log('info', `🔄 Getting deposit address for ${coin} on ${network}`);

            const result = await this.binanceService.getDepositAddress(coin, network);

            this._log('info', `✅ Retrieved deposit address successfully`);

            return {
                success: true,
                coin: coin.toUpperCase(),
                address: result.address,
                tag: result.tag,
                network: result.network,
                url: result.url
            };
        } catch (error) {
            this._log('error', `❌ Failed to get deposit address: ${error.message}`);
            throw error;
        }
    }
}

module.exports = BinanceExchange;
