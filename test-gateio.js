const GateioService = require('./src/services/GateioService');

// Create a testnet instance
const service = new GateioService(true);

async function testGateioOrder() {
    try {
        // 1. First test authentication
        console.log('1. Testing authentication...');
        await service.testAuthentication();

        // 2. Check available balance
        console.log('\n2. Checking balance...');
        const balance = await service.getBalance();
        console.log('Balance:', balance);

        // 3. Create a market order with minimal fields
        console.log('\n3. Creating market order...');
        const orderData = {
            currency_pair: 'BTC_USDT',
            type: 'market',
            side: 'buy',
            amount: '0.0001' // Increased to meet minimum requirements
        };

        console.log('Order payload:', JSON.stringify(orderData, null, 2));

        // Use placeOrder method which has the correct logic for market orders
        const response = await service.placeOrder({
            currency_pair: 'BTC_USDT',
            side: 'buy',
            type: 'market',
            amount: '0.00001'
            // Explicitly NOT including time_in_force or price
        });

        console.log('\n4. Order response:', JSON.stringify(response, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('API Error Details:', error.response.data);
        }
    }
}

// Run the test
testGateioOrder();
