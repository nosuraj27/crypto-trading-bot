const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

class GateioService {
    constructor(testnet = false) {
        this.testnet = testnet;
        // Gate.io URLs - testnet uses different endpoint
        this.baseURL = testnet ? "https://api-testnet.gateapi.io" : "https://api.gateio.ws";
        this.apiKey = process.env.GATEIO_API_KEY;
        this.apiSecret = process.env.GATEIO_API_SECRET;

        if (!this.apiKey || !this.apiSecret) {
            console.warn('Gate.io API credentials not found in environment variables');
        }

        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 10000
        });

        console.log(`🔧 GateioService initialized: ${testnet ? 'TESTNET' : 'MAINNET'} mode`);
    }

    // Generate Gate.io signature
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

    // Helper function for handling API responses
    async apiHandler(requestFn, errorMessage) {
        try {
            const response = await requestFn();
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.label || error.message || errorMessage;
            console.error(`❌ Gate.io API Error: ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }

    // Public API request (no signature required)
    publicRequest(endpoint, params = {}) {
        return this.apiHandler(
            () => this.axiosInstance.get(endpoint, { params }),
            "Data not found"
        );
    }

    // Signed API request (signature required)
    signedRequest(endpoint, params = {}, method = "GET", body = null) {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('API credentials are required for signed requests');
        }

        const query = new URLSearchParams(params).toString();
        const { signature, timestamp } = this.generateSignature(method.toUpperCase(), endpoint, query, body);

        const config = {
            method,
            url: `${endpoint}${query ? '?' + query : ''}`,
            headers: {
                'KEY': this.apiKey,
                'Timestamp': timestamp.toString(),
                'SIGN': signature,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            config.data = body;
        }

        return this.apiHandler(
            () => this.axiosInstance.request(config),
            "Invalid request"
        );
    }

    // === PUBLIC API METHODS ===

    async getTickerPrice(symbol) {
        const endpoint = symbol ? `/api/v4/spot/tickers/${symbol}` : "/api/v4/spot/tickers";
        return this.publicRequest(endpoint);
    }

    async getOrderBook(symbol, limit = 100) {
        return this.publicRequest(`/api/v4/spot/order_book`, { currency_pair: symbol, limit });
    }

    async get24HrTicker(symbol = "") {
        const endpoint = symbol ? `/api/v4/spot/tickers/${symbol}` : "/api/v4/spot/tickers";
        return this.publicRequest(endpoint);
    }

    async getKlines(symbol, interval, from = null, to = null, limit = 500) {
        const params = { currency_pair: symbol, interval, limit };
        if (from) params.from = from;
        if (to) params.to = to;
        return this.publicRequest("/api/v4/spot/candlesticks", params);
    }

    async getRecentTrades(symbol, limit = 500) {
        return this.publicRequest("/api/v4/spot/trades", { currency_pair: symbol, limit });
    }

    // === TRADING API METHODS ===

    async placeOrder(data) {
        const orderData = {
            currency_pair: data.currency_pair || data.symbol,
            side: data.side.toLowerCase(),
            type: data.type.toLowerCase(),
            amount: data.amount || data.quantity,
            ...(data.price && { price: data.price }),
            ...(data.time_in_force && { time_in_force: data.time_in_force }),
            ...(data.text && { text: data.text })
        };

        const body = JSON.stringify(orderData);
        return this.signedRequest("/api/v4/spot/orders", {}, "POST", body);
    }

    async getOrderStatus(orderId, currencyPair) {
        return this.signedRequest(`/api/v4/spot/orders/${orderId}`, { currency_pair: currencyPair });
    }

    async getAccountDetails() {
        return this.signedRequest("/api/v4/spot/accounts");
    }

    async getOpenOrders(currencyPair = "") {
        const params = currencyPair ? { currency_pair: currencyPair } : {};
        return this.signedRequest("/api/v4/spot/orders", { ...params, status: 'open' });
    }

    async cancelOrder(orderId, currencyPair) {
        return this.signedRequest(`/api/v4/spot/orders/${orderId}`, { currency_pair: currencyPair }, "DELETE");
    }

    async getBalance(asset = null) {
        const accountData = await this.getAccountDetails();

        if (asset) {
            const assetBalance = accountData.find(b => b.currency === asset.toUpperCase());
            return assetBalance || {
                currency: asset.toUpperCase(),
                available: "0",
                locked: "0"
            };
        }

        return accountData;
    }

    // === UNIFIED TRADING METHODS ===

    async createMarketBuyOrder(symbol, amount) {
        return this.placeOrder({
            currency_pair: symbol.replace('USDT', '_USDT'),
            side: 'buy',
            type: 'market',
            amount: amount.toString()
        });
    }

    async createMarketSellOrder(symbol, amount) {
        return this.placeOrder({
            currency_pair: symbol.replace('USDT', '_USDT'),
            side: 'sell',
            type: 'market',
            amount: amount.toString()
        });
    }

    async createLimitBuyOrder(symbol, amount, price) {
        return this.placeOrder({
            currency_pair: symbol.replace('USDT', '_USDT'),
            side: 'buy',
            type: 'limit',
            amount: amount.toString(),
            price: price.toString()
        });
    }

    async createLimitSellOrder(symbol, amount, price) {
        return this.placeOrder({
            currency_pair: symbol.replace('USDT', '_USDT'),
            side: 'sell',
            type: 'limit',
            amount: amount.toString(),
            price: price.toString()
        });
    }

    // === UTILITY METHODS ===

    convertToGateioSymbol(symbol) {
        // Gate.io uses format like BTC_USDT
        return symbol.replace('USDT', '_USDT');
    }

    convertFromGateioSymbol(gateioSymbol) {
        // Convert BTC_USDT back to BTCUSDT
        return gateioSymbol.replace('_', '');
    }

    // Test connectivity
    async testConnectivity() {
        try {
            // Gate.io uses different time endpoints for testnet vs live
            const timeEndpoint = this.testnet ? "/api/v4/spot/time" : "/api/v4/spot/time";
            await this.publicRequest(timeEndpoint);
            console.log(`✅ Gate.io ${this.testnet ? 'Testnet' : 'Mainnet'} connectivity OK`);
            return true;
        } catch (error) {
            console.error(`❌ Gate.io ${this.testnet ? 'Testnet' : 'Mainnet'} connectivity failed:`, error.message);
            return false;
        }
    }

    // Test authentication
    async testAuthentication() {
        try {
            await this.getAccountDetails();
            console.log(`✅ Gate.io ${this.testnet ? 'Testnet' : 'Mainnet'} authentication OK`);
            return true;
        } catch (error) {
            console.error(`❌ Gate.io ${this.testnet ? 'Testnet' : 'Mainnet'} authentication failed:`, error.message);
            return false;
        }
    }
}

module.exports = GateioService;
