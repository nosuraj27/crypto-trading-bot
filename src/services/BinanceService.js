const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

class BinanceService {
    constructor(testnet = false) {
        this.testnet = testnet;
        this.baseURL = testnet ? "https://testnet.binance.vision" : "https://api.binance.com";
        this.apiKey = process.env.BINANCE_API_KEY;
        this.apiSecret = process.env.BINANCE_API_SECRET;

        if (!this.apiKey || !this.apiSecret) {
            console.warn('Binance API credentials not found in environment variables');
        }

        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            headers: { "X-MBX-APIKEY": this.apiKey },
            timeout: 10000
        });

        console.log(`🔧 BinanceService initialized: ${testnet ? 'TESTNET' : 'MAINNET'} mode`);
    }

    // Generate HMAC SHA256 signature
    generateSignature(params) {
        if (!this.apiSecret) {
            throw new Error('API Secret is required for signed requests');
        }
        const query = new URLSearchParams(params).toString();
        return crypto.createHmac("sha256", this.apiSecret).update(query).digest("hex");
    }

    // Helper function for handling API responses
    async apiHandler(requestFn, errorMessage) {
        try {
            const response = await requestFn();
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message || errorMessage;
            console.error(`❌ Binance API Error: ${errorMsg}`);
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
        const query = { ...params, timestamp };
        const signature = this.generateSignature(query);
        query.signature = signature;

        return this.apiHandler(
            () =>
                this.axiosInstance.request({
                    method,
                    url: endpoint,
                    params: query,
                }),
            "Invalid request"
        );
    }

    // === PUBLIC API METHODS ===

    async getTickerPrice(symbol) {
        return this.publicRequest("/api/v3/ticker/price", symbol ? { symbol } : {});
    }

    async getOrderBook(symbol, limit = 100) {
        return this.publicRequest("/api/v3/depth", { symbol, limit });
    }

    async get24HrTicker(symbol = "") {
        return this.publicRequest("/api/v3/ticker/24hr", symbol ? { symbol } : {});
    }

    async getKlines(symbol, interval, startTime = null, endTime = null, limit = 500) {
        const params = { symbol, interval, limit };
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;
        return this.publicRequest("/api/v3/klines", params);
    }

    async getRecentTrades(symbol, limit = 500) {
        return this.publicRequest("/api/v3/trades", { symbol, limit });
    }

    // === TRADING API METHODS ===

    async placeOrder(data) {
        const orderData = {
            symbol: data.symbol,
            side: data.side,
            type: data.type,
            quantity: data.quantity,
            ...(data.price && { price: data.price }),
            ...(data.timeInForce && { timeInForce: data.timeInForce }),
            ...(data.newClientOrderId && { newClientOrderId: data.newClientOrderId })
        };

        return this.signedRequest("/api/v3/order", orderData, "POST");
    }

    async getOrderStatus(params) {
        return this.signedRequest("/api/v3/order", params);
    }

    async getAccountDetails() {
        return this.signedRequest("/api/v3/account");
    }

    async getOpenOrders(symbol = "") {
        const params = symbol ? { symbol } : {};
        return this.signedRequest("/api/v3/openOrders", params);
    }

    async cancelOrder(params) {
        return this.signedRequest("/api/v3/order", params, "DELETE");
    }

    async getBalance(asset = null) {
        const accountData = await this.getAccountDetails();

        if (asset) {
            const assetBalance = accountData.balances.find(b => b.asset === asset.toUpperCase());
            return assetBalance || { asset: asset.toUpperCase(), free: "0.00000000", locked: "0.00000000" };
        }

        return accountData.balances;
    }

    // === UNIFIED TRADING METHODS ===

    async createMarketBuyOrder(symbol, quantity) {
        return this.placeOrder({
            symbol: symbol.toUpperCase(),
            side: 'BUY',
            type: 'MARKET',
            quantity: quantity.toString()
        });
    }

    async createMarketSellOrder(symbol, quantity) {
        return this.placeOrder({
            symbol: symbol.toUpperCase(),
            side: 'SELL',
            type: 'MARKET',
            quantity: quantity.toString()
        });
    }

    async createLimitBuyOrder(symbol, quantity, price) {
        return this.placeOrder({
            symbol: symbol.toUpperCase(),
            side: 'BUY',
            type: 'LIMIT',
            quantity: quantity.toString(),
            price: price.toString(),
            timeInForce: 'GTC'
        });
    }

    async createLimitSellOrder(symbol, quantity, price) {
        return this.placeOrder({
            symbol: symbol.toUpperCase(),
            side: 'SELL',
            type: 'LIMIT',
            quantity: quantity.toString(),
            price: price.toString(),
            timeInForce: 'GTC'
        });
    }

    // Test connectivity
    async testConnectivity() {
        try {
            await this.publicRequest("/api/v3/ping");
            console.log(`✅ Binance ${this.testnet ? 'Testnet' : 'Mainnet'} connectivity OK`);
            return true;
        } catch (error) {
            console.error(`❌ Binance ${this.testnet ? 'Testnet' : 'Mainnet'} connectivity failed:`, error.message);
            return false;
        }
    }

    // Test authentication
    async testAuthentication() {
        try {
            await this.getAccountDetails();
            console.log(`✅ Binance ${this.testnet ? 'Testnet' : 'Mainnet'} authentication OK`);
            return true;
        } catch (error) {
            console.error(`❌ Binance ${this.testnet ? 'Testnet' : 'Mainnet'} authentication failed:`, error.message);
            return false;
        }
    }
}

module.exports = BinanceService;
