const GateioService = require('./src/services/GateioService');
const service = new GateioService(true);

async function testMarketOrder() {
    try {
        console.log('1. Testing authentication...');
        await service.testAuthentication();

        console.log('\n2. Getting balances...');
        const balance = await service.getBalance();
        console.log('Balances:', balance);

        console.log('\n3. Creating market buy order...');
        const orderData = {
            currency_pair: 'BTC_USDT',  // Correct format for Gate.io
            type: 'market',
            side: 'buy',
            amount: '20'                // Amount in USDT to spend
        };

        console.log('Order payload:', JSON.stringify(orderData, null, 2));
        const order = await service.placeOrder(orderData);
        console.log('\nOrder result:', JSON.stringify(order, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the test
testMarketOrder();
