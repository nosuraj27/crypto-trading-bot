const axios = require("axios");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

class KrakenService {
    constructor(testnet = false) {
        this.testnet = testnet;
        // Use the correct endpoints for each environment
        if (testnet) {
            this.baseURL = "https://demo-futures.kraken.com";
            this.isFutures = true;
        } else {
            this.baseURL = "https://api.kraken.com";
            this.isFutures = false;
        }

        this.apiKey = process.env.KRAKEN_API_KEY;
        this.apiSecret = process.env.KRAKEN_API_SECRET;

        if (!this.apiKey || !this.apiSecret) {
            console.warn('⚠️ Kraken API credentials not found in environment variables');
        }

        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 10000
        });

        console.log(`🔧 KrakenService initialized: ${testnet ? 'FUTURES DEMO' : 'SPOT LIVE'} mode`);
        console.log(`🌐 Using endpoint: ${this.baseURL}`);
    }

    // Generate authentication signature for Kraken (Futures vs Spot)
    generateSignature(path, params) {
        if (!this.apiSecret) {
            throw new Error('API Secret is required for signed requests');
        }

        const nonce = Date.now().toString();
        params.nonce = nonce;

        if (this.isFutures) {
            // Futures API uses JSON body
            const bodyString = JSON.stringify(params);
            const message = path + crypto.createHash("sha256").update(nonce + bodyString).digest("binary");
            const signature = crypto.createHmac("sha512", Buffer.from(this.apiSecret, "base64"))
                .update(message, "binary")
                .digest("base64");
            return { signature, bodyString, nonce };
        } else {
            // Spot API uses URL-encoded body
            const bodyString = this.mapToURLValues(params).toString();
            const message = path + crypto.createHash("sha256").update(nonce + bodyString).digest("binary");
            const signature = crypto.createHmac("sha512", Buffer.from(this.apiSecret, "base64"))
                .update(message, "binary")
                .digest("base64");
            return { signature, bodyString, nonce };
        }
    }

    // Helper function to convert object to URL values
    mapToURLValues(object) {
        return new URLSearchParams(Object.entries(object).map(([k, v]) => {
            if (typeof v == 'object') {
                v = JSON.stringify(v);
            }
            return [k, v];
        }));
    }    // Helper function for handling API responses
    async apiHandler(requestFn, errorMessage) {
        try {
            const response = await requestFn();

            if (this.isFutures) {
                // Futures API error format: { result: 'error', error: 'errorMessage' }
                if (response.data.result === 'error') {
                    throw new Error(response.data.error);
                }
            } else {
                // Spot API error format: { error: ['error1', 'error2'] }
                if (response.data.error && response.data.error.length > 0) {
                    throw new Error(response.data.error.join(', '));
                }
            }

            return response.data;
        } catch (error) {
            let errorMsg;

            if (this.isFutures && error.response?.data?.error) {
                errorMsg = error.response.data.error;
            } else if (error.response?.data?.error?.join) {
                errorMsg = error.response.data.error.join(', ');
            } else {
                errorMsg = error.message || errorMessage;
            }

            console.error(`❌ Kraken API Error: ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }

    // Signed API request (signature required)
    signedRequest(endpoint, params = {}, method = "POST") {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('API credentials are required for signed requests');
        }

        if (this.isFutures) {
            // Futures API uses different authentication headers
            const nonce = Date.now().toString();
            const postData = Object.keys(params).length > 0 ? JSON.stringify(params) : '';

            // Futures API signature: nonce + method + endpoint + postData
            const message = nonce + method.toUpperCase() + endpoint + postData;
            const signature = crypto.createHmac('sha512', this.apiSecret)
                .update(message)
                .digest('hex');

            return this.apiHandler(
                () => this.axiosInstance.request({
                    method,
                    url: endpoint,
                    data: postData || undefined,
                    headers: {
                        'APIKey': this.apiKey,
                        'Nonce': nonce,
                        'Authent': signature,
                        'Content-Type': postData ? 'application/json' : undefined
                    }
                }),
                "Invalid request"
            );
        } else {
            // Spot API uses the original method
            const { signature, bodyString } = this.generateSignature(endpoint, params);
            return this.apiHandler(
                () => this.axiosInstance.request({
                    method,
                    url: endpoint,
                    data: bodyString,
                    headers: {
                        'API-Key': this.apiKey,
                        'API-Sign': signature,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }),
                "Invalid request"
            );
        }
    }

    // Public API request (no signature required)
    publicRequest(endpoint, params = {}) {
        return this.apiHandler(
            () => this.axiosInstance.get(endpoint, { params }),
            "Data not found"
        );
    }

    async getAccountDetails() {
        if (this.isFutures) {
            return this.signedRequest("/derivatives/api/v3/accounts", {}, "GET");
        } else {
            return this.signedRequest("/0/private/Balance");
        }
    }

    // Test connectivity
    async testConnectivity() {
        try {
            if (this.isFutures) {
                // For futures, test with a simple GET to public endpoint
                await this.axiosInstance.get("/derivatives/api/v3/instruments");
            } else {
                await this.publicRequest("/0/public/Time");
            }
            console.log(`✅ Kraken ${this.testnet ? 'Futures Demo' : 'Spot Live'} connectivity OK`);
            return true;
        } catch (error) {
            console.error(`❌ Kraken ${this.testnet ? 'Futures Demo' : 'Spot Live'} connectivity failed:`, error.message);
            return false;
        }
    }

    // Test authentication
    async testAuthentication() {
        try {
            const result = await this.getAccountDetails();
            console.log(`✅ Kraken ${this.testnet ? 'Futures Demo' : 'Spot Live'} authentication OK`);

            if (this.isFutures) {
                // Futures API response structure
                if (result && result.result) {
                    console.log('💰 Futures account data:', result.result);
                } else {
                    console.log('📊 Futures account connected successfully');
                }
            } else {
                // Spot API response structure
                if (result && result.result) {
                    console.log('💰 Spot account balances:', result.result);
                }
            }
            return true;
        } catch (error) {
            console.error(`❌ Kraken ${this.testnet ? 'Futures Demo' : 'Spot Live'} authentication failed:`, error.message);

            if (error.message.includes('Invalid key')) {
                if (this.isFutures) {
                    console.log('💡 Kraken Futures Authentication:');
                    console.log('   ✅ Using futures demo credentials');
                    console.log('   ❌ Authentication still failing - check API key permissions');
                    console.log('   🔧 Make sure API key has required permissions on demo-futures.kraken.com');
                } else {
                    console.log('💡 Kraken Spot Authentication:');
                    console.log('   ❌ Need real Kraken account credentials for spot trading');
                    console.log('   � Create account at: https://www.kraken.com');
                    console.log('   🔑 Generate Spot API keys with "Query Funds" permission');
                }
            }

            return false;
        }
    }
}

module.exports = KrakenService;
