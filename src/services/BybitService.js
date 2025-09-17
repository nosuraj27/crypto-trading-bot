const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

// Import configuration
const { EXCHANGES_CONFIG } = require('../config/exchanges');

class BybitService {
    constructor(testnet = null) {
        // Use environment configuration if testnet is not explicitly set
        if (testnet === null) {
            testnet = EXCHANGES_CONFIG.bybit.testnet;
        }

        this.testnet = testnet;
        this.config = EXCHANGES_CONFIG.bybit;
        this.baseURL = this.config.baseURL;
        this.apiKey = this.config.apiKey;
        this.apiSecret = this.config.apiSecret;

        if (!this.apiKey || !this.apiSecret) {
            console.warn('Bybit API credentials not found in environment variables');
        }

        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            headers: { "X-BAPI-API-KEY": this.apiKey },
            timeout: this.config.timeout
        });

        console.log(`🔧 BybitService initialized: ${testnet ? 'TESTNET' : 'MAINNET'} mode`);
        console.log(`🔗 Using endpoint: ${this.baseURL}`);
    }

    // Generate HMAC SHA256 signature for Bybit V5 API
    generateSignature(timestamp, params, method = "GET") {
        if (!this.apiSecret) {
            throw new Error('API Secret is required for signed requests');
        }

        let paramString = "";
        if (method === "GET") {
            // For GET requests, use query parameters
            paramString = new URLSearchParams(params).toString();
        } else {
            // For POST requests, use JSON body
            paramString = JSON.stringify(params);
        }

        // Bybit V5 signature: timestamp + apiKey + recv_window + paramString
        const recv_window = "5000";
        const signaturePayload = timestamp + this.apiKey + recv_window + paramString;

        return crypto.createHmac("sha256", this.apiSecret).update(signaturePayload).digest("hex");
    }

    // Helper function for handling API responses
    async apiHandler(requestFn, errorMessage) {
        try {
            const response = await requestFn();
            if (response.data.retCode !== 0) {
                throw new Error(response.data.retMsg || 'API request failed');
            }
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.retMsg || error.message || errorMessage;
            console.error(`❌ Bybit API Error: ${errorMsg}`);
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
    signedRequest(endpoint, params = {}, method = "GET") {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('API credentials are required for signed requests');
        }

        const timestamp = Date.now();
        const recv_window = "5000";

        // Generate signature with the correct method
        const signature = this.generateSignature(timestamp, params, method);

        const headers = {
            'X-BAPI-API-KEY': this.apiKey,
            'X-BAPI-TIMESTAMP': timestamp.toString(),
            'X-BAPI-SIGN': signature,
            'X-BAPI-RECV-WINDOW': recv_window,
            'Content-Type': 'application/json'
        };

        const config = {
            method,
            url: endpoint,
            headers
        };

        if (method === 'GET') {
            config.params = params;
        } else {
            config.data = params;
        }

        return this.apiHandler(() => this.axiosInstance.request(config), "Invalid request");
    }

    // === PUBLIC API METHODS ===

    async getTickerPrice(symbol) {
        return this.publicRequest("/v5/market/tickers", {
            category: "spot",
            ...(symbol && { symbol })
        });
    }

    async getOrderBook(symbol, limit = 25) {
        return this.publicRequest("/v5/market/orderbook", {
            category: "spot",
            symbol,
            limit
        });
    }

    async get24HrTicker(symbol = "") {
        return this.publicRequest("/v5/market/tickers", {
            category: "spot",
            ...(symbol && { symbol })
        });
    }

    async getKlines(symbol, interval, start = null, end = null, limit = 200) {
        const params = { category: "spot", symbol, interval, limit };
        if (start) params.start = start;
        if (end) params.end = end;
        return this.publicRequest("/v5/market/kline", params);
    }

    async getRecentTrades(symbol, limit = 60) {
        return this.publicRequest("/v5/market/recent-trade", {
            category: "spot",
            symbol,
            limit
        });
    }

    // === TRADING API METHODS ===

    async placeOrder(data) {
        const orderData = {
            category: "spot",
            symbol: data.symbol,
            side: data.side,
            orderType: data.orderType || data.type,
            qty: data.qty || data.quantity,
            ...(data.price && { price: data.price }),
            ...(data.timeInForce && { timeInForce: data.timeInForce }),
            ...(data.orderLinkId && { orderLinkId: data.orderLinkId })
        };

        return this.signedRequest("/v5/order/create", orderData, "POST");
    }

    async getOrderStatus(params) {
        return this.signedRequest("/v5/order/realtime", {
            category: "spot",
            ...params
        });
    }

    async getAccountDetails() {
        return this.signedRequest("/v5/account/wallet-balance", { accountType: "SPOT" });
    }

    async getOpenOrders(symbol = "") {
        const params = { category: "spot" };
        if (symbol) params.symbol = symbol;
        return this.signedRequest("/v5/order/realtime", params);
    }

    async cancelOrder(params) {
        return this.signedRequest("/v5/order/cancel", {
            category: "spot",
            ...params
        }, "POST");
    }

    async getBalance(asset = null) {
        const accountData = await this.getAccountDetails();

        if (asset) {
            const coins = accountData.result?.list?.[0]?.coin || [];
            const assetBalance = coins.find(c => c.coin === asset.toUpperCase());
            return assetBalance || {
                coin: asset.toUpperCase(),
                walletBalance: "0",
                availableBalance: "0"
            };
        }

        return accountData.result?.list?.[0]?.coin || [];
    }

    // === UNIFIED TRADING METHODS ===

    async createMarketBuyOrder(symbol, qty) {
        return this.placeOrder({
            symbol: symbol,
            side: 'Buy',
            orderType: 'Market',
            qty: qty.toString()
        });
    }

    async createMarketSellOrder(symbol, qty) {
        return this.placeOrder({
            symbol: symbol,
            side: 'Sell',
            orderType: 'Market',
            qty: qty.toString()
        });
    }

    async createLimitBuyOrder(symbol, qty, price) {
        return this.placeOrder({
            symbol: symbol,
            side: 'Buy',
            orderType: 'Limit',
            qty: qty.toString(),
            price: price.toString(),
            timeInForce: 'GTC'
        });
    }

    async createLimitSellOrder(symbol, qty, price) {
        return this.placeOrder({
            symbol: symbol,
            side: 'Sell',
            orderType: 'Limit',
            qty: qty.toString(),
            price: price.toString(),
            timeInForce: 'GTC'
        });
    }

    // Test connectivity
    async testConnectivity() {
        try {
            await this.publicRequest("/v5/market/time");
            console.log(`✅ Bybit ${this.testnet ? 'Testnet' : 'Mainnet'} connectivity OK`);
            return true;
        } catch (error) {
            console.error(`❌ Bybit ${this.testnet ? 'Testnet' : 'Mainnet'} connectivity failed:`, error.message);
            return false;
        }
    }

    // Test authentication
    async testAuthentication() {
        try {
            await this.getAccountDetails();
            console.log(`✅ Bybit ${this.testnet ? 'Testnet' : 'Mainnet'} authentication OK`);
            return true;
        } catch (error) {
            console.error(`❌ Bybit ${this.testnet ? 'Testnet' : 'Mainnet'} authentication failed:`, error.message);
            return false;
        }
    }
}

module.exports = BybitService;
