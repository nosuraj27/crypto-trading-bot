const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const config = {
    testnet: true,
    apiKey: process.env.GATEIO_API_KEY,
    apiSecret: process.env.GATEIO_API_SECRET,
    baseUrl: 'https://api-testnet.gateapi.io/api/v4'
};

// Generate Gate.io signature
function generateSignature(method, path, query, body) {
    // Get the current timestamp
    const timestamp = Math.floor(Date.now() / 1000);

    // Create the hashed payload
    const hashedPayload = body ? crypto.createHash('sha512').update(body).digest('hex') : '';

    // Create the string to sign
    const stringToSign = [
        method.toUpperCase(),
        path,
        query,
        hashedPayload,
        timestamp
    ].join('\n');

    // Debug what we're signing
    console.log('String to sign:', stringToSign);
    console.log('API Secret (first 10 chars):', config.apiSecret.substring(0, 10) + '...');

    // Generate the signature using the API secret
    const signature = crypto.createHmac('sha512', config.apiSecret)
        .update(stringToSign)
        .digest('hex');

    return { signature, timestamp };
}

// Place a market order
async function placeMarketOrder() {
    try {
        const orderData = {
            currency_pair: 'BTC_USDT',
            type: 'market',
            side: 'buy',
            amount: '0.0001'
        };

        const endpoint = '/spot/orders';
        const body = JSON.stringify(orderData);
        const { signature, timestamp } = generateSignature('POST', endpoint, '', body);

        console.log('Sending order:', orderData);

        const response = await axios({
            method: 'POST',
            url: `${config.baseUrl}${endpoint}`,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'KEY': config.apiKey,
                'Timestamp': timestamp.toString(),
                'SIGN': signature
            },
            data: body
        });

        console.log('Order placed successfully:', JSON.stringify(response.data, null, 2));
        return response.data;

    } catch (error) {
        console.error('Error placing order:', error.response?.data || error.message);
        throw error;
    }
}

// Run the test
placeMarketOrder().catch(console.error);
