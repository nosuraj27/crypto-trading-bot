/**
 * ByBit Exchange Implementation
 */

const BaseExchange = require('./BaseExchange');
const axios = require('axios');
const WebSocket = require('ws');

class BybitExchange extends BaseExchange {
    constructor(config) {
        super(config);
        this.baseUrl = 'https://api.bybit.com/v5';
        this.wsUrl = 'wss://stream.bybit.com/v5/public/spot';
        this.ws = null;
        this.subscriptions = new Set();
        this.symbolMap = new Map();
        this.lastPrices = {};
        this.lastUpdate = null;

        this.initializeSymbolMapping();
    }

    /**
     * Initialize symbol mapping for ByBit format
     */
    initializeSymbolMapping() {
        // ByBit uses format like BTCUSDT, ETHUSDT
        const commonMappings = {
            'BTC/USDT': 'BTCUSDT',
            'ETH/USDT': 'ETHUSDT',
            'BNB/USDT': 'BNBUSDT',
            'SOL/USDT': 'SOLUSDT',
            'XRP/USDT': 'XRPUSDT',
            'ADA/USDT': 'ADAUSDT',
            'DOGE/USDT': 'DOGEUSDT',
            'MATIC/USDT': 'MATICUSDT',
            'DOT/USDT': 'DOTUSDT',
            'AVAX/USDT': 'AVAXUSDT',
            'LINK/USDT': 'LINKUSDT',
            'UNI/USDT': 'UNIUSDT',
            'LTC/USDT': 'LTCUSDT',
            'BCH/USDT': 'BCHUSDT',
            'ATOM/USDT': 'ATOMUSDT'
        };

        for (const [standard, bybit] of Object.entries(commonMappings)) {
            this.symbolMap.set(standard, bybit);
        }
    }

    /**
     * Convert standard symbol to ByBit format
     */
    formatSymbol(symbol) {
        return this.symbolMap.get(symbol) || symbol.replace('/', '');
    }

    /**
     * Convert ByBit symbol back to standard format
     */
    parseSymbol(bybitSymbol) {
        for (const [standard, bybit] of this.symbolMap) {
            if (bybit === bybitSymbol) return standard;
        }
        // Fallback: BTCUSDT -> BTC/USDT
        if (bybitSymbol.endsWith('USDT')) {
            const base = bybitSymbol.slice(0, -4);
            return `${base}/USDT`;
        }
        return bybitSymbol;
    }

    /**
     * Initialize ByBit WebSocket connection
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
                    op: 'subscribe',
                    args: ['tickers.BTCUSDT', 'tickers.ETHUSDT', 'tickers.ADAUSDT']
                };
                ws.send(JSON.stringify(subscription));
            });

            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.topic && parsed.topic.startsWith('tickers.') && parsed.data) {
                        const symbol = parsed.topic.split('.')[1];
                        const pair = tradingPairs.find(p => p.symbol === symbol);
                        if (pair && parsed.data.lastPrice) {
                            const newPrice = parseFloat(parsed.data.lastPrice);
                            const priceUpdates = {};
                            priceUpdates[symbol] = newPrice;

                            if (onPriceUpdate) {
                                onPriceUpdate('bybit', priceUpdates);
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
            });

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

            if (response.data && response.data.result && response.data.result.list) {
                response.data.result.list.forEach(ticker => {
                    const pair = tradingPairs.find(p => p.symbol === ticker.symbol);
                    if (pair && ticker.lastPrice) {
                        prices[ticker.symbol] = parseFloat(ticker.lastPrice);
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
     * Connect to ByBit WebSocket
     */
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsUrl);

                this.ws.on('open', () => {
                    console.log(`🟢 ByBit WebSocket connected`);
                    this.wsConnected = true;
                    resolve();
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        this.handleWebSocketMessage(message);
                    } catch (error) {
                        console.error('❌ ByBit WebSocket message parse error:', error.message);
                    }
                });

                this.ws.on('error', (error) => {
                    console.error('❌ ByBit WebSocket error:', error.message);
                    this.wsConnected = false;
                    reject(error);
                });

                this.ws.on('close', () => {
                    console.log('🔴 ByBit WebSocket disconnected');
                    this.wsConnected = false;
                    // Attempt to reconnect after 5 seconds
                    setTimeout(() => this.connectWebSocket(), 5000);
                });

            } catch (error) {
                console.error('❌ ByBit WebSocket connection error:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        try {
            // ByBit WebSocket message format
            if (message.topic && message.topic.startsWith('tickers.') && message.data) {
                const symbol = message.topic.replace('tickers.', '');
                const standardSymbol = this.parseSymbol(symbol);
                const price = parseFloat(message.data.lastPrice);

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
            console.error('❌ ByBit handle message error:', error.message);
        }
    }

    /**
     * Subscribe to symbols
     */
    async subscribeToSymbols(symbols) {
        if (!this.wsConnected) {
            await this.connectWebSocket();
        }

        const bybitSymbols = symbols.map(symbol => this.formatSymbol(symbol));

        // ByBit subscription format
        const subscription = {
            op: "subscribe",
            args: bybitSymbols.map(symbol => `tickers.${symbol}`)
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(subscription));
            symbols.forEach(symbol => this.subscriptions.add(symbol));
            console.log(`📡 ByBit subscribed to ${symbols.length} symbols`);
        }
    }

    /**
     * Execute buy order
     */
    async executeBuyOrder(symbol, amount, price = null) {
        // For now, return simulation
        return {
            success: false,
            message: 'ByBit trading API not implemented - simulation mode only',
            orderId: `bybit_sim_${Date.now()}`,
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
            message: 'ByBit trading API not implemented - simulation mode only',
            orderId: `bybit_sim_${Date.now()}`,
            symbol,
            side: 'SELL',
            amount,
            price,
            timestamp: Date.now()
        };
    }

    /**
     * Create a new order on ByBit
     */
    async createOrder(orderParams) {
        const { symbol, side, type, amount, quantity, price } = orderParams;

        // Use amount if provided, otherwise use quantity
        const orderQuantity = amount || quantity;

        const params = {
            category: 'spot',
            symbol: symbol.replace('/', ''),
            side: side.charAt(0).toUpperCase() + side.slice(1).toLowerCase(),
            orderType: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
            qty: orderQuantity.toString()
        };

        if (type.toLowerCase() === 'limit' && price) {
            params.price = price.toString();
        }

        try {
            this._log('info', `Creating ${side} order for ${orderQuantity} ${symbol} at ${price || 'market'}`);

            const response = await this._makeAuthenticatedRequest('POST', '/v5/order/create', params);

            this._log('info', `Order created successfully: ${response.result.orderId}`);

            return {
                success: true,
                orderId: response.result.orderId,
                clientOrderId: response.result.orderLinkId,
                symbol: symbol,
                side: side,
                type: type,
                quantity: orderQuantity,
                price: price,
                status: 'NEW',
                timestamp: Date.now(),
                response: response.result
            };
        } catch (error) {
            this._log('error', `Order creation failed: ${error.message}`);
            throw new Error(`ByBit order creation failed: ${error.message}`);
        }
    }

    /**
     * Get account balance
     */
    async getBalance() {
        try {
            const response = await this._makeAuthenticatedRequest('GET', '/v5/account/wallet-balance', {
                accountType: 'SPOT'
            });

            const balances = [];
            if (response.result && response.result.list && response.result.list[0]) {
                const coins = response.result.list[0].coin || [];
                coins.forEach(coin => {
                    const free = parseFloat(coin.walletBalance) - parseFloat(coin.locked || 0);
                    balances.push({
                        asset: coin.coin,
                        free: free,
                        locked: parseFloat(coin.locked || 0)
                    });
                });
            }

            this._log('info', `Retrieved ${balances.length} asset balances`);
            return balances;
        } catch (error) {
            this._log('error', `Balance retrieval failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Make authenticated request to ByBit API
     */
    async _makeAuthenticatedRequest(method, endpoint, params = {}) {
        const crypto = require('crypto');

        if (!this.config.apiKey || !this.config.apiSecret) {
            throw new Error('ByBit API credentials not configured');
        }

        const timestamp = Date.now().toString();
        const recvWindow = '5000';

        let queryString = '';
        let body = '';

        if (method === 'GET') {
            queryString = Object.keys(params)
                .sort()
                .map(key => `${key}=${encodeURIComponent(params[key])}`)
                .join('&');
        } else {
            body = JSON.stringify(params);
        }

        // Create signature string
        const signatureString = timestamp + this.config.apiKey + recvWindow + (queryString || body);

        // Create signature
        const signature = crypto
            .createHmac('sha256', this.config.apiSecret)
            .update(signatureString)
            .digest('hex');

        const url = this.baseUrl + endpoint + (queryString ? `?${queryString}` : '');

        const config = {
            method,
            url,
            headers: {
                'X-BAPI-API-KEY': this.config.apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        };

        if (method !== 'GET') {
            config.data = body;
        }

        try {
            const response = await axios(config);
            if (response.data.retCode !== 0) {
                throw new Error(`ByBit API error: ${response.data.retMsg}`);
            }
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`ByBit API error: ${error.response.data.retMsg || error.response.statusText}`);
            }
            throw new Error(`ByBit request failed: ${error.message}`);
        }
    }

    /**
     * Check if exchange is healthy
     */
    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseUrl}/market/time`, {
                timeout: 3000
            });
            return response.status === 200;
        } catch (error) {
            console.error('❌ ByBit health check failed:', error.message);
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
}

module.exports = BybitExchange;
