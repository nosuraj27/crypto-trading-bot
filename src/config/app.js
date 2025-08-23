/**
 * Application Configuration
 * Contains general app settings, environment variables, and constants
 */

const APP_CONFIG = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
        env: process.env.NODE_ENV || 'development'
    },

    // Update intervals
    intervals: {
        healthCheckInterval: 10000, // 10 seconds
        webSocketReconnectDelay: 3000 // 3 seconds
    },

    // Trading Configuration
    trading: {
        defaultCapital: 2000,
        minProfitThreshold: 0.001,
        maxTradingPairs: 100,
        topPairsToShow: 100,
        broadcastThrottleMs: 500 // 500 milliseconds - How often to broadcast updates
    },

    // WebSocket Configuration
    websocket: {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        maxUpdateAge: 30000, // 30 seconds - consider stale if no updates
        priceChangeThreshold: 0.01 // Update if >0.01% change or first price
    },

    // API Configuration
    api: {
        userAgent: 'Arbitrage-Bot/1.0',
        maxRetries: 3,
        baseTimeout: 5000,
        exponentialBackoffMs: 1000
    }
};

module.exports = APP_CONFIG;
