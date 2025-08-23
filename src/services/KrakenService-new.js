const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

class KrakenService {
    constructor(testnet = false) {
        this.testnet = testnet;
        this.baseURL = "https://api.kraken.com";
        this.apiKey = process.env.KRAKEN_API_KEY;
        this.apiSecret = process.env.KRAKEN_API_SECRET;

        if (!this.apiKey || !this.apiSecret) {
            console.warn('⚠️ Kraken API credentials not found in environment variables');
        }

        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 10000
        });

        console.log(`🔧 KrakenService initialized: ${testnet ? 'DEMO' : 'LIVE'} mode`);
    }

    // Generate authentication signature for Kraken
    generateSignature(path, params) {
        if (!this.apiSecret) {
            throw new Error('API Secret is required for signed requests');
        }

        const nonce = Date.now() * 1000;
        params.nonce = nonce.toString();

        const postData = new URLSearchParams(params).toString();

        // According to Kraken docs: HMAC-SHA512 of (URI path + SHA256(nonce + POST data)) and base64 decoded secret API key
        const sha256Hash = crypto.createHash('sha256').update(nonce.toString() + postData).digest();
        const message = Buffer.concat([Buffer.from(path, 'utf8'), sha256Hash]);

        const signature = crypto.createHmac('sha512', Buffer.from(this.apiSecret, 'base64'))
            .update(message)
            .digest('base64');

        return { signature, postData, nonce };
    }

    // Helper function for handling API responses
    async apiHandler(requestFn, errorMessage) {
        try {
            const response = await requestFn();
            if (response.data.error && response.data.error.length > 0) {
                throw new Error(response.data.error.join(', '));
            }
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.error?.join(', ') || error.message || errorMessage;
            console.error(`❌ Kraken API Error: ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }

    // Signed API request (signature required)
    signedRequest(endpoint, params = {}, method = "POST") {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('API credentials are required for signed requests');
        }

        const { signature, postData } = this.generateSignature(endpoint, params);

        return this.apiHandler(
            () => this.axiosInstance.request({
                method,
                url: endpoint,
                data: postData,
                headers: {
                    'API-Key': this.apiKey,
                    'API-Sign': signature,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }),
            "Invalid request"
        );
    }

    // Public API request (no signature required)
    publicRequest(endpoint, params = {}) {
        return this.apiHandler(
            () => this.axiosInstance.get(endpoint, { params }),
            "Data not found"
        );
    }

    async getAccountDetails() {
        return this.signedRequest("/0/private/Balance");
    }

    // Test connectivity
    async testConnectivity() {
        try {
            await this.publicRequest("/0/public/Time");
            console.log(`✅ Kraken ${this.testnet ? 'Demo' : 'Live'} connectivity OK`);
            return true;
        } catch (error) {
            console.error(`❌ Kraken ${this.testnet ? 'Demo' : 'Live'} connectivity failed:`, error.message);
            return false;
        }
    }

    // Test authentication
    async testAuthentication() {
        try {
            const result = await this.getAccountDetails();
            console.log(`✅ Kraken ${this.testnet ? 'Demo' : 'Live'} authentication OK`);
            if (result && result.result) {
                console.log('💰 Account balances:', result.result);
            }
            return true;
        } catch (error) {
            console.error(`❌ Kraken ${this.testnet ? 'Demo' : 'Live'} authentication failed:`, error.message);

            if (error.message.includes('Invalid key')) {
                console.log('💡 Please update your .env file with the correct Kraken demo API credentials');
                console.log('   • Copy the API Key and Secret from your demo account');
                console.log('   • Make sure the API key has "Query Funds" permission');
            }

            return false;
        }
    }
}

module.exports = KrakenService;
