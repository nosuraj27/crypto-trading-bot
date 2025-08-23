/**
 * WebSocket Management Service
 * Handles real-time WebSocket connections and price updates
 */

const ExchangeFactory = require('../exchanges/ExchangeFactory');
const TradingPairsService = require('../services/TradingPairsService');
const PriceUpdateService = require('../services/PriceUpdateService');
const APP_CONFIG = require('../config/app');

class WebSocketService {
    static connections = new Map();
    static isHealthy = true;
    static lastUpdateTime = Date.now();
    static lastBroadcastTime = 0;
    static socketIo = null;
    static configService = null;

    /**
     * Initialize WebSocket service
     * @param {Object} io - Socket.IO instance
     */
    static initialize(io) {
        this.socketIo = io;
        // Get config service reference (will be set after initialization)
        try {
            this.configService = require('../services/ConfigService');
        } catch (error) {
            console.warn('⚠️ ConfigService not available, using static config');
        }
        this.initializeWebSockets();
        this.startHealthMonitoring();
    }

    /**
     * Initialize WebSocket connections for all enabled exchanges
     */
    static initializeWebSockets() {
        console.log('🔗 Initializing REAL-TIME WebSocket connections...');

        const exchanges = ExchangeFactory.getEnabledExchanges();
        const tradingPairs = TradingPairsService.getTradingPairs();

        // Close existing connections
        this.closeAllConnections();

        // Initialize new connections
        for (const [exchangeKey, exchange] of exchanges) {
            try {
                const ws = exchange.initializeWebSocket(tradingPairs, this.handlePriceUpdate.bind(this));
                if (ws) {
                    this.connections.set(exchangeKey, ws);

                    // Add auto-reconnection logic
                    ws.on('close', () => {
                        console.log(`🔄 Auto-reconnecting ${exchangeKey} WebSocket...`);
                        setTimeout(() => {
                            this.reconnectExchange(exchangeKey);
                        }, APP_CONFIG.intervals.webSocketReconnectDelay);
                    });

                    ws.on('error', (error) => {
                        console.error(`❌ ${exchangeKey} WebSocket error:`, error.message);
                        this.isHealthy = false;
                        setTimeout(() => {
                            this.reconnectExchange(exchangeKey);
                        }, 5000);
                    });
                }
            } catch (error) {
                console.error(`❌ Failed to initialize ${exchangeKey} WebSocket:`, error.message);
            }
        }

        this.isHealthy = true;
        this.lastUpdateTime = Date.now();
    }

    /**
     * Handle price updates from WebSocket
     * @param {string} exchange - Exchange identifier
     * @param {Object} priceUpdates - Price updates object
     */
    static handlePriceUpdate(exchange, priceUpdates) {
        const now = Date.now();

        // Get broadcast throttle from ConfigService or fallback to APP_CONFIG
        const throttleMs = this.configService ?
            this.configService.get('trading.broadcastThrottleMs') || APP_CONFIG.trading.broadcastThrottleMs :
            APP_CONFIG.trading.broadcastThrottleMs;

        // Throttle broadcasts to prevent UI flipping
        if (now - this.lastBroadcastTime < throttleMs) {
            return; // Skip this broadcast
        }

        // Update prices and check for significant changes
        const hasSignificantChanges = PriceUpdateService.updatePricesFromWebSocket(exchange, priceUpdates);

        if (hasSignificantChanges) {
            this.lastUpdateTime = now;
            this.lastBroadcastTime = now;
            this.broadcastUpdate(exchange);
        }
    }

    /**
     * Update broadcast throttle (called from config listener)
     * @param {number} throttleMs - New throttle value in milliseconds
     */
    static updateThrottle(throttleMs) {
        console.log(`🔧 WebSocket broadcast throttle updated to: ${throttleMs}ms`);
        // No need to store locally since we get it dynamically from ConfigService
    }

    /**
     * Broadcast price update to all connected clients
     * @param {string} source - Source exchange of the update
     */
    static broadcastUpdate(source) {
        if (!this.socketIo) return;

        const data = PriceUpdateService.getCurrentData();
        const exchangeConfigs = ExchangeFactory.getExchangeConfigs();

        this.socketIo.emit('priceUpdate', {
            ...data,
            exchangeConfig: exchangeConfigs,
            realTime: true,
            source: source
        });
    }

    /**
     * Reconnect a specific exchange WebSocket
     * @param {string} exchangeKey - Exchange identifier
     */
    static reconnectExchange(exchangeKey) {
        const exchange = ExchangeFactory.getExchange(exchangeKey);
        if (!exchange || !exchange.isEnabled()) return;

        try {
            // Close existing connection
            const existingWs = this.connections.get(exchangeKey);
            if (existingWs) {
                existingWs.close();
                this.connections.delete(exchangeKey);
            }

            // Create new connection
            const tradingPairs = TradingPairsService.getTradingPairs();
            const ws = exchange.initializeWebSocket(tradingPairs, this.handlePriceUpdate.bind(this));

            if (ws) {
                this.connections.set(exchangeKey, ws);
                console.log(`✅ ${exchangeKey} WebSocket reconnected`);
            }
        } catch (error) {
            console.error(`❌ Failed to reconnect ${exchangeKey} WebSocket:`, error.message);
        }
    }

    /**
     * Start health monitoring for WebSocket connections
     */
    static startHealthMonitoring() {
        setInterval(() => {
            const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;

            if (timeSinceLastUpdate > APP_CONFIG.websocket.maxUpdateAge) {
                console.log('⚠️ WebSocket may be stale, triggering reconnection...');
                this.isHealthy = false;
                this.initializeWebSockets(); // Reconnect all
            }
        }, APP_CONFIG.intervals.healthCheckInterval);
    }

    /**
     * Close all WebSocket connections
     */
    static closeAllConnections() {
        for (const [exchangeKey, ws] of this.connections) {
            try {
                ws.close();
                console.log(`📴 Closed ${exchangeKey} WebSocket connection`);
            } catch (error) {
                console.warn(`⚠️ Error closing ${exchangeKey} WebSocket:`, error.message);
            }
        }
        this.connections.clear();
    }

    /**
     * Get WebSocket health status
     * @returns {Object} - Health status object
     */
    static getHealthStatus() {
        const activeConnections = Array.from(this.connections.entries())
            .filter(([key, ws]) => ws.readyState === 1) // WebSocket.OPEN
            .length;

        return {
            isHealthy: this.isHealthy,
            activeConnections,
            totalConnections: this.connections.size,
            lastUpdateTime: this.lastUpdateTime
        };
    }
}

module.exports = WebSocketService;
