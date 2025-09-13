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
            'ATOM/USDT': 'ATOM_USDT',
            'AAVE/USDT': 'AAVE_USDT',
            'ALGO/USDT': 'ALGO_USDT',
            'TRX/USDT': 'TRX_USDT',

            // Handle format without slash/underscore (like ALGOUSDT)
            'BTCUSDT': 'BTC_USDT',
            'ETHUSDT': 'ETH_USDT',
            'BNBUSDT': 'BNB_USDT',
            'SOLUSDT': 'SOL_USDT',
            'XRPUSDT': 'XRP_USDT',
            'ADAUSDT': 'ADA_USDT',
            'DOGEUSDT': 'DOGE_USDT',
            'MATICUSDT': 'MATIC_USDT',
            'DOTUSDT': 'DOT_USDT',
            'AVAXUSDT': 'AVAX_USDT',
            'LINKUSDT': 'LINK_USDT',
            'UNIUSDT': 'UNI_USDT',
            'LTCUSDT': 'LTC_USDT',
            'BCHUSDT': 'BCH_USDT',
            'ATOMUSDT': 'ATOM_USDT',
            'AAVEUSDT': 'AAVE_USDT',
            'ALGOUSDT': 'ALGO_USDT',
            'TRXUSDT': 'TRX_USDT',

            // Additional popular coins
            'APTUSDT': 'APT_USDT',
            'ARBUSDT': 'ARB_USDT',
            'ATOMUSDT': 'ATOM_USDT',
            'BCHUSDT': 'BCH_USDT',
            'CAKEUSDT': 'CAKE_USDT',
            'CHZUSDT': 'CHZ_USDT',
            'COMPUSDT': 'COMP_USDT',
            'CRVUSDT': 'CRV_USDT',
            'DASHUSDT': 'DASH_USDT',
            'EGLDUSDT': 'EGLD_USDT',
            'ENSUSDT': 'ENS_USDT',
            'EOSUSDT': 'EOS_USDT',
            'ETCUSDT': 'ETC_USDT',
            'FETUSDT': 'FET_USDT',
            'FILUSDT': 'FIL_USDT',
            'FLOWUSDT': 'FLOW_USDT',
            'FTMUSDT': 'FTM_USDT',
            'GALAUSDT': 'GALA_USDT',
            'GMTUSDT': 'GMT_USDT',
            'GRTUSDT': 'GRT_USDT',
            'HBARUSDT': 'HBAR_USDT',
            'ICPUSDT': 'ICP_USDT',
            'IMXUSDT': 'IMX_USDT',
            'IOTAUSDT': 'IOTA_USDT',
            'JASMYUSDT': 'JASMY_USDT',
            'KAVAUSDT': 'KAVA_USDT',
            'KLAYUSDT': 'KLAY_USDT',
            'KSMUSDT': 'KSM_USDT',
            'LDOUSDT': 'LDO_USDT',
            'LRCUSDT': 'LRC_USDT',
            'LUNAUSDT': 'LUNA_USDT',
            'MANAUSDT': 'MANA_USDT',
            'MASKUSDT': 'MASK_USDT',
            'MINAUSDT': 'MINA_USDT',
            'MKRUSDT': 'MKR_USDT',
            'NEARUSDT': 'NEAR_USDT',
            'NEOUSDT': 'NEO_USDT',
            'ONEUSDT': 'ONE_USDT',
            'OPUSDT': 'OP_USDT',
            'QNTUSDT': 'QNT_USDT',
            'ROSECUTT': 'ROSE_USDT',
            'RUNEUSDT': 'RUNE_USDT',
            'SANDUSDT': 'SAND_USDT',
            'SHIBUSDT': 'SHIB_USDT',
            'SNXUSDT': 'SNX_USDT',
            'STXUSDT': 'STX_USDT',
            'SUSHIUSDT': 'SUSHI_USDT',
            'THETAUSDT': 'THETA_USDT',
            'VETUSDT': 'VET_USDT',
            'WAVESUSDT': 'WAVES_USDT',
            'XLMUSDT': 'XLM_USDT',
            'XMRUSDT': 'XMR_USDT',
            'XTZUSDT': 'XTZ_USDT',
            'YFIUSDT': 'YFI_USDT',
            'ZECUSDT': 'ZEC_USDT',
            'ZILUSDT': 'ZIL_USDT'
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
            const response = await this._fetchWithRetry(this.apiUrl);
            const prices = {};

            if (response.data && Array.isArray(response.data)) {
                response.data.forEach(ticker => {
                    const symbol = ticker.currency_pair.replace('_', '');
                    const pair = tradingPairs.find(p => p.symbol === symbol);
                    if (pair && ticker.last) {
                        prices[symbol] = parseFloat(ticker.last);
                    }
                });
            }

            this._log('info', `Fetched ${Object.keys(prices).length} prices`);
            return prices;

        } catch (error) {
            this._log('error', `Failed to fetch prices: ${error.message}`);
            return {};
        }
    }

    /**
     * Get current price for a symbol
     * @param {string} symbol - Trading pair symbol (e.g., 'BTC_USDT')
     * @returns {Promise<number>} - Current price
     */
    async getPrice(symbol) {
        try {
            const gateioSymbol = this.formatSymbol(symbol);
            const ticker = await this.gateioService.getTickerPrice(gateioSymbol);

            if (ticker && ticker.last) {
                return parseFloat(ticker.last);
            }

            throw new Error(`No price data for ${gateioSymbol}`);
        } catch (error) {
            this._log('error', `Failed to get price for ${symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get ticker data for a symbol
     * @param {string} symbol - Trading pair symbol
     * @returns {Promise<Object>} - Ticker data
     */
    async getTicker(symbol) {
        try {
            const gateioSymbol = this.formatSymbol(symbol);
            return await this.gateioService.getTickerPrice(gateioSymbol);
        } catch (error) {
            this._log('error', `Failed to get ticker for ${symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all available trading pairs
     * @returns {Promise<Array>} - Array of trading pair objects
     */
    async getAvailablePairs() {
        try {
            const response = await axios.get(`${this.baseUrl}/spot/currency_pairs`, {
                timeout: 10000
            });

            if (response.data && Array.isArray(response.data)) {
                return response.data.map(pair => ({
                    symbol: pair.id,
                    baseAsset: pair.base,
                    quoteAsset: pair.quote,
                    status: pair.trade_status,
                    minAmount: pair.min_base_amount,
                    minNotional: pair.min_quote_amount
                }));
            }

            return [];
        } catch (error) {
            this._log('error', `Failed to get available pairs: ${error.message}`);
            return [];
        }
    }

    /**
     * Check if a trading pair is available
     * @param {string} symbol - Trading pair symbol
     * @returns {Promise<boolean>} - True if available
     */
    async isPairAvailable(symbol) {
        try {
            const gateioSymbol = this.formatSymbol(symbol);
            const availablePairs = await this.getAvailablePairs();
            return availablePairs.some(pair => pair.symbol === gateioSymbol);
        } catch (error) {
            this._log('warn', `Could not check pair availability for ${symbol}: ${error.message}`);
            return false;
        }
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
     * Execute buy order
     */
    async executeBuyOrder(symbol, amount, price = null) {
        // For now, return simulation
        return {
            success: false,
            message: 'Gate.io trading API not implemented - simulation mode only',
            orderId: `gateio_sim_${Date.now()}`,
            symbol,
            side: 'BUY',
            amount,
            price,
            timestamp: Date.now()
        };
    }

    /**
     * Execute sell order
     */
    async executeSellOrder(symbol, amount, price = null) {
        // For now, return simulation
        return {
            success: false,
            message: 'Gate.io trading API not implemented - simulation mode only',
            orderId: `gateio_sim_${Date.now()}`,
            symbol,
            side: 'SELL',
            amount,
            price,
            timestamp: Date.now()
        };
    }

    /**
     * Check if a trading pair is actively trading (has non-zero price)
     * @param {string} symbol - Trading pair symbol
     * @returns {Promise<boolean>} - True if actively trading
     */
    async isActivelyTrading(symbol) {
        try {
            const price = await this.getPrice(symbol);
            return price && price > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get list of actively trading USDT pairs
     * @returns {Promise<Array>} - Array of active trading pairs
     */
    async getActiveTradingPairs() {
        try {
            // Known active pairs on Gate.io testnet based on testing
            const knownActivePairs = [
                'TRX_USDT',
                'SOL_USDT',
                'BTC_USDT',
                'XRP_USDT',
                'BRISE_USDT'
            ];

            const activePairs = [];

            for (const pair of knownActivePairs) {
                try {
                    const price = await this.getPrice(pair);
                    if (price && price > 0) {
                        activePairs.push({
                            symbol: pair,
                            price: price,
                            baseAsset: pair.split('_')[0],
                            quoteAsset: pair.split('_')[1]
                        });
                    }
                } catch (error) {
                    // Skip inactive pairs
                }
            }

            return activePairs;
        } catch (error) {
            this._log('error', `Failed to get active trading pairs: ${error.message}`);
            return [];
        }
    }

    /**
     * Enhanced create order with better error handling for inactive pairs
     */
    async createOrder(orderParams) {
        const { symbol, side, type, amount, quantity, price } = orderParams;

        // First check if the pair is actively trading
        const gateioSymbol = this.formatSymbol(symbol);

        try {
            const isActive = await this.isActivelyTrading(gateioSymbol);
            if (!isActive) {
                const activePairs = await this.getActiveTradingPairs();
                const activeSymbols = activePairs.map(p => p.symbol).join(', ');

                throw new Error(
                    `Trading pair ${gateioSymbol} is not actively trading on Gate.io testnet. ` +
                    `Active pairs: ${activeSymbols}. ` +
                    `Consider using mainnet for full market coverage.`
                );
            }
        } catch (error) {
            if (error.message.includes('not actively trading')) {
                throw error;
            }
            // Continue with order creation if price check fails for other reasons
        }

        const orderQuantity = amount || quantity;
        const formattedQuantity = this._formatQuantity(orderQuantity)

        const params = {
            currency_pair: gateioSymbol,
            side: side.toLowerCase(),
            type: type.toLowerCase(),
            amount: formattedQuantity
        };

        // Only add price for limit orders
        if (type.toLowerCase() === 'limit' && price) {
            params.price = price.toString();
            params.time_in_force = 'gtc'; // Only for limit orders
        }

        // For market orders, ensure price and time_in_force are NEVER sent
        if (type.toLowerCase() === 'market') {
            if ('price' in params) {
                delete params.price;
            }
            if ('time_in_force' in params) {
                delete params.time_in_force;
            }
        }

        try {
            this._log('info', `Creating ${side} order for ${formattedQuantity} ${gateioSymbol} at ${price || 'market'}`);

            // Use GateioService placeOrder method
            const response = await this.gateioService.placeOrder(params);

            this._log('info', `Order created successfully: ${response.id}`);

            return {
                success: true,
                orderId: response.id,
                clientOrderId: response.text,
                symbol: gateioSymbol,
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
