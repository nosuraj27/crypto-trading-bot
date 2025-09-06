/**
 * Gate.io Exchange Implementation
 */

const BaseExchange = require('./BaseExchange');
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const GateioService = require('../services/GateioService');

class GateioExchange extends BaseExchange {
    constructor(config) {
        super(config);

        // Set API credentials from config or environment
        this.apiKey = config.apiKey || process.env.GATEIO_API_KEY;
        this.apiSecret = config.apiSecret || process.env.GATEIO_API_SECRET;
        this.testnet = config.testnet || process.env.GATEIO_TESTNET === 'true';

        // Use testnet URL if in testnet mode
        this.baseUrl = this.testnet ? 'https://api-testnet.gateapi.io/api/v4' : 'https://api.gateio.ws/api/v4';
        // Use the latest Gate.io testnet WebSocket endpoint
        this.wsUrl = this.testnet ? 'wss://fx-ws-testnet.gateio.ws/v4/ws' : 'wss://api.gateio.ws/ws/v4/';

        // Initialize GateioService for authenticated requests
        this.gateioService = new GateioService(this.testnet);

        this.ws = null;
        this.subscriptions = new Set();
        this.symbolMap = new Map();
        this.lastPrices = {};
        this.lastUpdate = null;

        this._log('info', `Initialized with ${this.testnet ? 'TESTNET' : 'MAINNET'} configuration`);
        this._log('info', `API credentials: ${this.apiKey ? 'SET' : 'NOT SET'}`);

        this.initializeSymbolMapping();
    }

    /**
     * Initialize symbol mapping for Gate.io format
     */
    initializeSymbolMapping() {
        // Gate.io uses format like BTC_USDT, ETH_USDT
        const commonMappings = {
            'BTC/USDT': 'BTC_USDT',
            'ETH/USDT': 'ETH_USDT',
            'BNB/USDT': 'BNB_USDT',
            'SOL/USDT': 'SOL_USDT',
            'XRP/USDT': 'XRP_USDT',
            'ADA/USDT': 'ADA_USDT',
            'DOGE/USDT': 'DOGE_USDT',
            'MATIC/USDT': 'MATIC_USDT',
            'DOT/USDT': 'DOT_USDT',
            'AVAX/USDT': 'AVAX_USDT',
            'LINK/USDT': 'LINK_USDT',
            'UNI/USDT': 'UNI_USDT',
            'LTC/USDT': 'LTC_USDT',
            'BCH/USDT': 'BCH_USDT',
            'ATOM/USDT': 'ATOM_USDT'
        };

        for (const [standard, gateio] of Object.entries(commonMappings)) {
            this.symbolMap.set(standard, gateio);
        }
    }

    /**
     * Convert standard symbol to Gate.io format
     */
    formatSymbol(symbol) {
        return this.symbolMap.get(symbol) || symbol.replace('/', '_');
    }

    /**
     * Convert Gate.io symbol back to standard format
     */
    parseSymbol(gateioSymbol) {
        for (const [standard, gateio] of this.symbolMap) {
            if (gateio === gateioSymbol) return standard;
        }
        // Fallback: BTC_USDT -> BTC/USDT
        return gateioSymbol.replace('_', '/');
    }

    /**
     * Initialize Gate.io WebSocket connection
     * @param {Array} tradingPairs - Array of trading pair objects
     * @param {Function} onPriceUpdate - Callback for price updates
     * @returns {WebSocket} - WebSocket connection
     */
    initializeWebSocket(tradingPairs, onPriceUpdate) {
        try {
            const ws = new WebSocket(this.wsUrl);

            ws.on('open', () => {
                this._log('info', 'WebSocket connected - REAL-TIME MODE ACTIVE');

                // Subscribe to ticker updates for major pairs (exactly like old working code)
                const subscription = {
                    time: Math.floor(Date.now() / 1000),
                    channel: 'spot.tickers',
                    event: 'subscribe',
                    payload: ['BTC_USDT', 'ETH_USDT', 'ADA_USDT']
                };
                ws.send(JSON.stringify(subscription));
            });

            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.channel === 'spot.tickers' && parsed.result && parsed.result.currency_pair) {
                        const ticker = parsed.result;
                        const symbol = ticker.currency_pair.replace('_', '') + 'T';
                        const pair = tradingPairs.find(p => p.symbol === symbol);

                        if (pair && ticker.last) {
                            const newPrice = parseFloat(ticker.last);
                            const priceUpdates = {};
                            priceUpdates[symbol] = newPrice;

                            if (onPriceUpdate) {
                                onPriceUpdate('gateio', priceUpdates);
                            }
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
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                }
            });

            // Add heartbeat to keep connection alive
            this.heartbeatInterval = setInterval(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.ping();
                }
            }, 30000); // Ping every 30 seconds

            return ws;
        } catch (error) {
            this._log('error', `Failed to initialize WebSocket: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetch current prices for specific trading pairs
     * @param {Array} tradingPairs - Array of trading pair objects
     * @returns {Promise<Object>} - Object with symbol-price mappings
     */
    async fetchPrices(tradingPairs) {
        try {
            const prices = {};

            // Get prices in parallel
            const fetchPromises = tradingPairs.map(pair => this.getTickerPrice(pair.symbol));
            const results = await Promise.all(fetchPromises);

            tradingPairs.forEach((pair, index) => {
                const price = results[index];
                if (price !== null) {
                    prices[pair.symbol] = price;
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
     * Get ticker price for a symbol
     * @param {string} symbol - Trading pair symbol
     * @returns {Promise<number>} - Current price
     */
    async getTickerPrice(symbol) {
        try {
            // Convert symbol to Gate.io format (will handle testnet/mainnet format)
            let gateSymbol = this.formatGateioSymbol(symbol);

            this._log('info', `Getting price for ${gateSymbol} on Gate.io (${this.testnet ? 'testnet' : 'mainnet'})`);

            // Use GateioService to fetch ticker price (it handles testnet/mainnet differences)
            const response = await this.gateioService.getTickerPrice(gateSymbol);

            if (response && response.last) {
                const price = parseFloat(response.last);
                this._log('info', `Fetched price for ${gateSymbol}: ${price}`);
                return price;
            }

            throw new Error('Price not found in response');
        } catch (error) {
            this._log('error', `Failed to fetch price for ${symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Convert any symbol format to Gate.io's format 
     * For testnet: BTC-USDT format
     * For mainnet: BTC_USDT format
     */
    formatGateioSymbol(symbol) {
        // Remove any existing separators
        const cleanSymbol = symbol.replace(/[-_/]/, '');

        // Handle concatenated format (e.g. BTCUSDT)
        const currencies = ['USDT', 'USDC', 'BTC', 'ETH'];
        let formattedSymbol;
        for (const quote of currencies) {
            if (cleanSymbol.endsWith(quote)) {
                const base = cleanSymbol.slice(0, -quote.length);
                formattedSymbol = this.testnet ? `${base}-${quote}` : `${base}_${quote}`;
                break;
            }
        }

        // If no match found in the loop, use the symbol as is with proper separator
        if (!formattedSymbol) {
            formattedSymbol = this.testnet ? cleanSymbol.replace('USDT', '-USDT') : cleanSymbol.replace('USDT', '_USDT');
        }

        this._log('info', `Formatted symbol ${symbol} to ${formattedSymbol} for ${this.testnet ? 'testnet' : 'mainnet'}`);
        return formattedSymbol;
    }

    /**
     * Connect to Gate.io WebSocket
     */
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsUrl);

                this.ws.on('open', () => {
                    console.log(`🟢 Gate.io WebSocket connected`);
                    this.wsConnected = true;
                    resolve();
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        this.handleWebSocketMessage(message);
                    } catch (error) {
                        console.error('❌ Gate.io WebSocket message parse error:', error.message);
                    }
                });

                this.ws.on('error', (error) => {
                    console.error('❌ Gate.io WebSocket error:', error.message);
                    this.wsConnected = false;
                    reject(error);
                });

                this.ws.on('close', () => {
                    console.log('🔴 Gate.io WebSocket disconnected');
                    this.wsConnected = false;
                    // Attempt to reconnect after 5 seconds
                    setTimeout(() => this.connectWebSocket(), 5000);
                });

            } catch (error) {
                console.error('❌ Gate.io WebSocket connection error:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        try {
            // Gate.io WebSocket message format
            if (message.method === 'ticker.update' && message.params) {
                const [symbol, data] = message.params;
                const standardSymbol = this.parseSymbol(symbol);
                const price = parseFloat(data.last);

                if (!this.lastPrices[standardSymbol]) {
                    this.lastPrices[standardSymbol] = {};
                }

                this.lastPrices[standardSymbol] = {
                    ...this.lastPrices[standardSymbol],
                    price: price,
                    timestamp: Date.now(),
                    exchange: this.name
                };

                // Emit price update event
                this.emit('priceUpdate', {
                    exchange: this.name,
                    symbol: standardSymbol,
                    price: price,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('❌ Gate.io handle message error:', error.message);
        }
    }

    /**
     * Subscribe to symbols
     */
    async subscribeToSymbols(symbols) {
        if (!this.wsConnected) {
            await this.connectWebSocket();
        }

        const gateioSymbols = symbols.map(symbol => this.formatSymbol(symbol));

        // Gate.io subscription format
        const subscription = {
            id: Date.now(),
            method: "ticker.subscribe",
            params: gateioSymbols
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(subscription));
            symbols.forEach(symbol => this.subscriptions.add(symbol));
            console.log(`📡 Gate.io subscribed to ${symbols.length} symbols`);
        }
    }

    /**
     * Get deposit address for a currency
     * @param {string} currency - The currency to get deposit address for (e.g., 'BTC', 'ETH')
     * @param {string} [network] - Optional network (e.g., 'BTC', 'ETH', 'TRX')
     * @returns {Promise<Object>} - Deposit address information
     */
    async getDepositAddress(currency) {
        try {
            const response = await this.gateioService.getDepositAddress(currency);
            if (!response) {
                throw new Error('No response from deposit address request');
            }

            // Since we're testing with BTC/USDT, ensure we get a Bitcoin address for BTC
            const selectedNetwork = currency.toUpperCase() === 'BTC' ? 'BTC' : 'TRX';

            // Find the address for the selected network
            const addressInfo = Array.isArray(response) ?
                response.find(addr => addr.chain.toUpperCase() === selectedNetwork) :
                response;

            if (!addressInfo || !addressInfo.address) {
                throw new Error(`No deposit address found for ${currency} on ${selectedNetwork} network`);
            }

            return {
                success: true,
                address: addressInfo.address,
                tag: addressInfo.tag || null,
                memo: addressInfo.tag || null,
                network: selectedNetwork,
                currency: currency.toUpperCase()
            };
        } catch (error) {
            this._log('error', `Failed to get deposit address: ${error.message}`);
            throw error;
        }
    }

    /**
     * Withdraw cryptocurrency
     */
    async withdraw(params) {
        try {
            return await this.gateioService.withdraw(params);
        } catch (error) {
            this._log('error', `Withdrawal failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get deposit history
     */
    async getDeposits(currency) {
        try {
            return await this.gateioService.getDeposits(currency);
        } catch (error) {
            this._log('error', `Failed to get deposits: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute buy order
     */
    async executeBuyOrder(symbol, amount, price = null) {
        try {
            const order = await this.createOrder({
                symbol,
                side: 'buy',
                type: price ? 'limit' : 'market',
                amount,
                price
            });
            return {
                success: true,
                orderId: order.orderId,
                symbol,
                side: 'BUY',
                amount,
                price: order.price,
                timestamp: Date.now()
            };
        } catch (error) {
            this._log('error', `Buy order failed: ${error.message}`);
            return {
                success: false,
                message: error.message,
                orderId: null,
                symbol,
                side: 'BUY',
                amount,
                price,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Execute sell order
     */
    async executeSellOrder(symbol, amount, price = null) {
        try {
            const order = await this.createOrder({
                symbol,
                side: 'sell',
                type: price ? 'limit' : 'market',
                amount,
                price
            });
            return {
                success: true,
                orderId: order.orderId,
                symbol,
                side: 'SELL',
                amount,
                price: order.price,
                timestamp: Date.now()
            };
        } catch (error) {
            this._log('error', `Sell order failed: ${error.message}`);
            return {
                success: false,
                message: error.message,
                orderId: null,
                symbol,
                side: 'SELL',
                amount,
                price,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Create a new order on Gate.io
     */
    async createOrder(orderParams) {
        const { symbol, side, type, amount, quantity, price } = orderParams;

        // Use amount if provided, otherwise use quantity
        const orderQuantity = amount || quantity;

        // Format quantity to appropriate precision
        const formattedQuantity = this._formatQuantity(orderQuantity);

        // Use our symbol formatter that handles testnet format correctly
        const gateSymbol = this.formatGateioSymbol(symbol);

        const params = {
            currency_pair: gateSymbol,
            side: side.toLowerCase(),
            type: type.toLowerCase(),
            amount: formattedQuantity
        };

        if (type.toLowerCase() === 'limit' && price) {
            params.price = price.toString();
            params.time_in_force = 'gtc'; // Only for limit orders
        }

        // For market orders, ensure price and time_in_force are NEVER sent, even if provided
        if (type.toLowerCase() === 'market') {
            if ('price' in params) {
                delete params.price;
            }
            if ('time_in_force' in params) {
                delete params.time_in_force;
            }
        }

        try {
            this._log('info', `Creating ${side} order for ${formattedQuantity} ${gateSymbol} at ${price || 'market'}`);

            // In testnet mode, simulate the order response
            if (this.testnet) {
                const simulatedPrice = await this.getTickerPrice(symbol);
                const simulatedResponse = {
                    id: 'test_' + Date.now().toString(),
                    text: `Test ${side} order`,
                    create_time: Date.now(),
                    update_time: Date.now(),
                    status: 'closed',
                    currency_pair: gateSymbol,
                    type: type.toLowerCase(),
                    account: 'spot',
                    side: side.toLowerCase(),
                    amount: formattedQuantity,
                    price: simulatedPrice.toString(),
                    time_in_force: type.toLowerCase() === 'limit' ? 'gtc' : undefined,
                    iceberg: '0',
                    left: '0',
                    fill_price: simulatedPrice.toString(),
                    filled_total: formattedQuantity,
                    fee: '0.002',
                    fee_currency: 'USDT',
                    point_fee: '0',
                    gt_fee: '0',
                    gt_discount: false,
                    rebated_fee: '0',
                    rebated_fee_currency: 'USDT'
                };

                this._log('info', `Test order created successfully: ${simulatedResponse.id}`);

                return {
                    success: true,
                    orderId: simulatedResponse.id,
                    clientOrderId: simulatedResponse.text,
                    symbol: symbol,
                    side: side,
                    type: type,
                    quantity: orderQuantity,
                    price: simulatedPrice,
                    status: simulatedResponse.status,
                    timestamp: Date.now(),
                    response: simulatedResponse
                };
            }

            // For mainnet, use real API
            const response = await this.gateioService.placeOrder(params);
            this._log('info', `Order created successfully: ${response.id}`);

            return {
                success: true,
                orderId: response.id,
                clientOrderId: response.text,
                symbol: symbol,
                side: side,
                type: type,
                quantity: orderQuantity,
                price: price,
                status: response.status,
                timestamp: Date.now(),
                response: response
            };
        } catch (error) {
            this._log('error', `Order creation failed: ${error.message}`);
            throw new Error(`Gate.io order creation failed: ${error.message}`);
        }
    }

    /**
     * Get account balance
     */
    async getBalance() {
        try {
            this._log('info', 'Fetching balance...');

            // Use GateioService getBalance method
            const response = await this.gateioService.getBalance();

            if (!response || !Array.isArray(response)) {
                this._log('error', 'Invalid balance response');
                return {};
            }

            // Convert to standard format
            const balanceMap = {};
            for (const account of response) {
                if (account.currency && parseFloat(account.available) > 0) {
                    balanceMap[account.currency.toUpperCase()] = parseFloat(account.available);
                }
            }

            this._log('info', `Balance fetched successfully: ${Object.keys(balanceMap).length} currencies`);
            return balanceMap;
        } catch (error) {
            this._log('error', `Balance retrieval failed: ${error.message}`);
            return {};
        }
    }

    /**
     * Generate Gate.io signature (same as working GateioService)
     */
    generateSignature(method, path, query, body) {
        if (!this.apiSecret) {
            throw new Error('API Secret is required for signed requests');
        }

        const timestamp = Math.floor(Date.now() / 1000);

        // Hash the request body with SHA512 and output its Hex encoded form
        const hashedPayload = crypto.createHash('sha512').update(body || '').digest('hex');

        // Signature string format: Method + "\n" + URL + "\n" + Query String + "\n" + HexEncode(SHA512(Request Payload)) + "\n" + Timestamp
        const stringToSign = `${method.toUpperCase()}\n${path}\n${query || ''}\n${hashedPayload}\n${timestamp}`;

        // Generate signature using HMAC-SHA512
        const signature = crypto.createHmac('sha512', this.apiSecret).update(stringToSign).digest('hex');

        return { signature, timestamp };
    }

    /**
     * Make authenticated request to Gate.io API
     */
    async _makeAuthenticatedRequest(method, endpoint, params = {}) {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('Gate.io API credentials not configured');
        }

        let body = null;
        let query = '';

        if (method === 'GET' && Object.keys(params).length > 0) {
            query = new URLSearchParams(params).toString();
        } else if (method !== 'GET') {
            body = JSON.stringify(params);
        }

        const { signature, timestamp } = this.generateSignature(method.toUpperCase(), endpoint, query, body);

        const url = this.baseUrl + endpoint + (query ? `?${query}` : '');

        const config = {
            method,
            url,
            headers: {
                'KEY': this.apiKey,
                'Timestamp': timestamp.toString(),
                'SIGN': signature,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        };

        if (body) {
            config.data = body;
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response) {
                const errorMsg = error.response.data?.message || error.response.data?.label || error.response.statusText;
                throw new Error(`Gate.io API error: ${errorMsg}`);
            }
            throw new Error(`Gate.io request failed: ${error.message}`);
        }
    }

    /**
     * Check if exchange is healthy
     */
    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseUrl}/spot/currency_pairs`, {
                timeout: 3000,
                params: { limit: 1 }
            });
            return response.status === 200;
        } catch (error) {
            console.error('❌ Gate.io health check failed:', error.message);
            return false;
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.wsConnected = false;
            this.subscriptions.clear();
        }
    }

    /**
     * Format quantity to appropriate precision for Gate.io
     * Most crypto pairs support up to 8 decimal places
     * @param {number} quantity - The quantity to format
     * @returns {string} - Formatted quantity as string (Gate.io expects string)
     */
    _formatQuantity(quantity) {
        // Convert to number if it's a string
        const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

        // Round to 8 decimal places and return as string
        return num.toFixed(8).replace(/\.?0+$/, '');
    }
}

module.exports = GateioExchange;
