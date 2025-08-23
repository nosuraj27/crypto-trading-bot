/**
 * MEXC Exchange Implementation
 */

const BaseExchange = require('./BaseExchange');
const axios = require('axios');
const WebSocket = require('ws');

class MexcExchange extends BaseExchange {
    constructor(config) {
        super(config);
        this.baseUrl = 'https://api.mexc.com/api/v3';
        this.wsUrl = 'wss://wbs.mexc.com/ws';
        this.ws = null;
        this.subscriptions = new Set();
        this.symbolMap = new Map(); // Maps our symbols to MEXC format
        this.lastPrices = {};
        this.lastUpdate = null;

        this.initializeSymbolMapping();
    }

    /**
     * Initialize symbol mapping for MEXC format
     */
    initializeSymbolMapping() {
        // MEXC uses format like BTCUSDT, ETHUSDT
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

        for (const [standard, mexc] of Object.entries(commonMappings)) {
            this.symbolMap.set(standard, mexc);
        }
    }

    /**
     * Convert standard symbol to MEXC format
     */
    formatSymbol(symbol) {
        return this.symbolMap.get(symbol) || symbol.replace('/', '');
    }

    /**
     * Convert MEXC symbol back to standard format
     */
    parseSymbol(mexcSymbol) {
        for (const [standard, mexc] of this.symbolMap) {
            if (mexc === mexcSymbol) return standard;
        }
        // Fallback: try to parse BTCUSDT -> BTC/USDT
        if (mexcSymbol.endsWith('USDT')) {
            const base = mexcSymbol.slice(0, -4);
            return `${base}/USDT`;
        }
        return mexcSymbol;
    }

    /**
     * Initialize MEXC WebSocket connection
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
                    method: 'SUBSCRIPTION',
                    params: ['spot@public.miniTicker.v3.api@BTCUSDT@ETHUSDT@ADAUSDT']
                };
                ws.send(JSON.stringify(subscription));
            });

            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.d && parsed.d.s && parsed.d.c) {
                        const symbol = parsed.d.s;
                        const pair = tradingPairs.find(p => p.symbol === symbol);

                        if (pair) {
                            const newPrice = parseFloat(parsed.d.c);
                            const priceUpdates = {};
                            priceUpdates[symbol] = newPrice;

                            if (onPriceUpdate) {
                                onPriceUpdate('mexc', priceUpdates);
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
     * Connect to MEXC WebSocket
     */
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsUrl);

                this.ws.on('open', () => {
                    console.log(`🟢 MEXC WebSocket connected`);
                    this.wsConnected = true;
                    resolve();
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        this.handleWebSocketMessage(message);
                    } catch (error) {
                        console.error('❌ MEXC WebSocket message parse error:', error.message);
                    }
                });

                this.ws.on('error', (error) => {
                    console.error('❌ MEXC WebSocket error:', error.message);
                    this.wsConnected = false;
                    reject(error);
                });

                this.ws.on('close', () => {
                    console.log('🔴 MEXC WebSocket disconnected');
                    this.wsConnected = false;
                    // Attempt to reconnect after 5 seconds
                    setTimeout(() => this.connectWebSocket(), 5000);
                });

            } catch (error) {
                console.error('❌ MEXC WebSocket connection error:', error.message);
                reject(error);
            }
        });
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        try {
            // MEXC WebSocket message format varies
            if (message.d && message.d.s && message.d.p) {
                const symbol = this.parseSymbol(message.d.s);
                const price = parseFloat(message.d.p);

                if (!this.lastPrices[symbol]) {
                    this.lastPrices[symbol] = {};
                }

                this.lastPrices[symbol] = {
                    ...this.lastPrices[symbol],
                    price: price,
                    timestamp: Date.now(),
                    exchange: this.name
                };

                // Emit price update event
                this.emit('priceUpdate', {
                    exchange: this.name,
                    symbol: symbol,
                    price: price,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('❌ MEXC handle message error:', error.message);
        }
    }

    /**
     * Subscribe to symbols
     */
    async subscribeToSymbols(symbols) {
        if (!this.wsConnected) {
            await this.connectWebSocket();
        }

        const mexcSymbols = symbols.map(symbol => this.formatSymbol(symbol));

        // MEXC subscription format
        const subscription = {
            method: "SUBSCRIPTION",
            params: mexcSymbols.map(symbol => `spot@public.deals.v3.api@${symbol}`)
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(subscription));
            symbols.forEach(symbol => this.subscriptions.add(symbol));
            console.log(`📡 MEXC subscribed to ${symbols.length} symbols`);
        }
    }

    /**
     * Execute buy order
     */
    async executeBuyOrder(symbol, amount, price = null) {
        // For now, return simulation
        return {
            success: false,
            message: 'MEXC trading API not implemented - simulation mode only',
            orderId: `mexc_sim_${Date.now()}`,
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
            message: 'MEXC trading API not implemented - simulation mode only',
            orderId: `mexc_sim_${Date.now()}`,
            symbol,
            side: 'SELL',
            amount,
            price,
            timestamp: Date.now()
        };
    }

    /**
     * Create a new order on MEXC
     */
    async createOrder(orderParams) {
        const { symbol, side, type, amount, quantity, price } = orderParams;

        // Use amount if provided, otherwise use quantity
        const orderQuantity = amount || quantity;

        const params = {
            symbol: symbol.replace('/', ''),
            side: side.toUpperCase(),
            type: type.toUpperCase(),
            quantity: orderQuantity.toString(),
            timestamp: Date.now()
        };

        if (type.toLowerCase() === 'limit' && price) {
            params.price = price.toString();
            params.timeInForce = 'GTC';
        }

        try {
            this._log('info', `Creating ${side} order for ${orderQuantity} ${symbol} at ${price || 'market'}`);

            const response = await this._makeAuthenticatedRequest('POST', '/api/v3/order', params);

            this._log('info', `Order created successfully: ${response.orderId}`);

            return {
                success: true,
                orderId: response.orderId,
                clientOrderId: response.clientOrderId,
                symbol: response.symbol,
                side: response.side,
                type: response.type,
                quantity: response.origQty,
                price: response.price,
                status: response.status,
                timestamp: response.transactTime,
                fills: response.fills || [],
                executedQty: response.executedQty,
                response: response
            };
        } catch (error) {
            this._log('error', `Order creation failed: ${error.message}`);
            throw new Error(`MEXC order creation failed: ${error.message}`);
        }
    }

    /**
     * Get account balance
     */
    async getBalance() {
        try {
            const response = await this._makeAuthenticatedRequest('GET', '/api/v3/account');

            const balances = response.balances.map(balance => ({
                asset: balance.asset,
                free: parseFloat(balance.free),
                locked: parseFloat(balance.locked)
            }));

            this._log('info', `Retrieved ${balances.length} asset balances`);
            return balances;
        } catch (error) {
            this._log('error', `Balance retrieval failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Make authenticated request to MEXC API
     */
    async _makeAuthenticatedRequest(method, endpoint, params = {}) {
        const crypto = require('crypto');

        if (!this.config.apiKey || !this.config.apiSecret) {
            throw new Error('MEXC API credentials not configured');
        }

        // Add timestamp
        params.timestamp = Date.now();

        // Create query string
        const queryString = Object.keys(params)
            .sort()
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');

        // Create signature
        const signature = crypto
            .createHmac('sha256', this.config.apiSecret)
            .update(queryString)
            .digest('hex');

        const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

        const config = {
            method,
            url,
            headers: {
                'X-MEXC-APIKEY': this.config.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        };

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`MEXC API error: ${error.response.data.msg || error.response.statusText}`);
            }
            throw new Error(`MEXC request failed: ${error.message}`);
        }
    }

    /**
     * Check if exchange is healthy
     */
    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseUrl}/ping`, {
                timeout: 3000
            });
            return response.status === 200;
        } catch (error) {
            console.error('❌ MEXC health check failed:', error.message);
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

module.exports = MexcExchange;
