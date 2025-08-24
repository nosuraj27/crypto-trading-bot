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

        // 3. Create a market order
        console.log('\n3. Creating market order...');

        // Use createMarketBuyOrder method instead of placeOrder directly
        const amount = 0.0001;
        const symbol = 'BTC_USDT';

        console.log(`Creating market buy order for ${amount} ${symbol}...`);
        const response = await service.createMarketBuyOrder(symbol, amount);
        console.log('\nOrder response:', JSON.stringify(response, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('API Error Details:', error.response.data);
        }
    }
}

// Run the test
testGateioOrder();
