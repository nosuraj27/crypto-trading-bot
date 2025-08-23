/**
 * Kraken Exchange Implementation
 */

const WebSocket = require('ws');
const BaseExchange = require('./BaseExchange');
const KrakenService = require('../services/KrakenService');
const { EXCHANGE_PAIR_MAPPINGS } = require('../config/exchanges');

class KrakenExchange extends BaseExchange {
    constructor(config) {
        super(config);

        // Set API credentials
        this.apiKey = config.apiKey || process.env.KRAKEN_API_KEY;
        this.apiSecret = config.apiSecret || process.env.KRAKEN_API_SECRET;
        this.testnet = config.testnet || process.env.KRAKEN_TESTNET === 'true';

        // Initialize KrakenService
        this.krakenService = new KrakenService(this.testnet);

        this._log('info', `Initialized with ${this.testnet ? 'DEMO' : 'LIVE'} configuration`);
        this._log('info', `API credentials: ${this.apiKey ? 'SET' : 'NOT SET'}`);

        // Test connectivity on initialization
        this.testConnection();
    }

    /**
     * Test connection and authentication
     */
    async testConnection() {
        try {
            await this.krakenService.testConnectivity();
            if (this.apiKey && this.apiSecret) {
                await this.krakenService.testAuthentication();
            }
        } catch (error) {
            this._log('warn', `Connection test failed: ${error.message}`);
        }
    }
    /**
     * Fetch prices from Kraken API
     * @param {Array} tradingPairs - Array of trading pair objects
     * @returns {Promise<Object>} - Object with symbol-price mappings
     */
    async fetchPrices(tradingPairs) {
        try {
            const response = await this._fetchWithRetry(this.apiUrl);
            const prices = {};
            const krakenPairs = EXCHANGE_PAIR_MAPPINGS.kraken;

            for (let pair of tradingPairs) {
                const krakenSymbol = krakenPairs[pair.symbol];
                if (krakenSymbol && response.data.result[krakenSymbol]) {
                    const ticker = response.data.result[krakenSymbol];
                    prices[pair.symbol] = parseFloat(ticker.c[0]);
                }
            }

            this._log('info', `Fetched ${Object.keys(prices).length} prices`);
            return prices;
        } catch (error) {
            this._log('error', `Failed to fetch prices: ${error.message}`);
            return {};
        }
    }

    /**
     * Initialize Kraken WebSocket connection
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
                    event: 'subscribe',
                    pair: ['XBT/USD', 'ETH/USD', 'ADA/USD'],
                    subscription: { name: 'ticker' }
                };
                ws.send(JSON.stringify(subscription));
            });

            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed[1] && parsed[2] === 'ticker') {
                        const pairName = parsed[3];

                        // Map Kraken pairs to our format
                        const krakenPairMap = {
                            'XBT/USD': 'BTCUSDT',
                            'ETH/USD': 'ETHUSDT',
                            'ADA/USD': 'ADAUSDT'
                        };

                        const symbol = krakenPairMap[pairName];
                        if (symbol && parsed[1].c && parsed[1].c[0]) {
                            const newPrice = parseFloat(parsed[1].c[0]);
                            const priceUpdates = { [symbol]: newPrice };

                            if (onPriceUpdate) {
                                onPriceUpdate('kraken', priceUpdates);
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
                this._log('warn', 'WebSocket closed');
            });

            return ws;
        } catch (error) {
            this._log('error', `Failed to initialize WebSocket: ${error.message}`);
            return null;
        }
    }

    /**
     * Create a new order on Kraken
     */
    async createOrder(orderParams) {
        const { symbol, side, type, amount, quantity, price } = orderParams;

        // Use amount if provided, otherwise use quantity
        const orderQuantity = amount || quantity;

        try {
            let result;

            if (type.toLowerCase() === 'market') {
                if (side.toLowerCase() === 'buy') {
                    result = await this.krakenService.createMarketBuyOrder(symbol, orderQuantity);
                } else {
                    result = await this.krakenService.createMarketSellOrder(symbol, orderQuantity);
                }
            } else {
                if (side.toLowerCase() === 'buy') {
                    result = await this.krakenService.createLimitBuyOrder(symbol, orderQuantity, price);
                } else {
                    result = await this.krakenService.createLimitSellOrder(symbol, orderQuantity, price);
                }
            }

            this._log('info', `✅ ${side} order placed: ${orderQuantity} ${symbol} at ${price || 'market'}`);

            return {
                success: true,
                orderId: result.result?.txid?.[0] || 'unknown',
                clientOrderId: null,
                symbol: symbol,
                side: side,
                type: type,
                quantity: orderQuantity,
                price: price || 0,
                status: 'pending',
                timestamp: Date.now(),
                fills: []
            };
        } catch (error) {
            this._log('error', `❌ ${side} order failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get account balance
     */
    async getBalance(asset) {
        try {
            if (asset) {
                // Return specific asset balance using KrakenService
                const balance = await this.krakenService.getBalance(asset);
                return balance;
            }

            // Return all balances as object for compatibility
            const accountData = await this.krakenService.getAccountDetails();
            const balances = {};

            if (accountData.result) {
                Object.entries(accountData.result).forEach(([krakenAsset, balance]) => {
                    const cleanAsset = this.krakenService.convertFromKrakenAsset(krakenAsset);
                    const balanceValue = parseFloat(balance);
                    if (balanceValue > 0) {
                        balances[cleanAsset] = balance;
                    }
                });
            }

            return balances;
        } catch (error) {
            this._log('error', `❌ Failed to get balance: ${error.message}`);
            if (asset) {
                return { asset: asset.toUpperCase(), free: "0", locked: "0" };
            }
            return {};
        }
    }

    /**
     * Convert symbol to Kraken format
     */
    _convertToKrakenSymbol(symbol) {
        const mappings = {
            'BTCUSDT': 'XBTUSD',
            'ETHUSDT': 'ETHUSD',
            'ADAUSDT': 'ADAUSD',
            'XRPUSDT': 'XRPUSD',
            'DOGEUSDT': 'DOGEUSD',
            'SOLUSDT': 'SOLUSD'
        };
        return mappings[symbol] || symbol;
    }

    /**
     * Clean Kraken asset names (remove X prefix, etc.)
     */
    _cleanKrakenAsset(asset) {
        const mappings = {
            'XXBT': 'BTC',
            'XETH': 'ETH',
            'XREP': 'REP',
            'XZEC': 'ZEC',
            'ZUSD': 'USD',
            'ZEUR': 'EUR'
        };
        return mappings[asset] || asset;
    }

    /**
     * Make authenticated request to Kraken API
     */
    async _makeAuthenticatedRequest(method, endpoint, params = {}) {
        const crypto = require('crypto');
        const qs = require('querystring');

        if (!this.config.apiKey || !this.config.apiSecret) {
            throw new Error('Kraken API credentials not configured');
        }

        const nonce = Date.now() * 1000;
        params.nonce = nonce;

        const postData = qs.stringify(params);
        const message = endpoint + crypto.createHash('sha256').update(nonce + postData).digest();
        const signature = crypto.createHmac('sha512', Buffer.from(this.config.apiSecret, 'base64')).update(message, 'latin1').digest('base64');

        const config = {
            method: 'POST',
            url: 'https://api.kraken.com/0' + endpoint,
            headers: {
                'API-Key': this.config.apiKey,
                'API-Sign': signature,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: postData,
            timeout: 10000
        };

        try {
            const axios = require('axios');
            const response = await axios(config);

            if (response.data.error && response.data.error.length > 0) {
                throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
            }

            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`Kraken API error: ${error.response.data.error || error.response.statusText}`);
            }
            throw new Error(`Kraken request failed: ${error.message}`);
        }
    }
}

module.exports = KrakenExchange;
