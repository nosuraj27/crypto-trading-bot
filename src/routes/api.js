/**
 * API Routes
 * Defines all API endpoints for the application
 */

const express = require('express');
const PriceUpdateService = require('../services/PriceUpdateService');
const TradingPairsService = require('../services/TradingPairsService');
const ExchangeFactory = require('../exchanges/ExchangeFactory');
const WebSocketService = require('../websocket/WebSocketService');
const UserSettingService = require('../services/UserSettingService');
const ConfigService = require('../services/ConfigService');
const TradeHistoryService = require('../services/TradeHistoryService');
const TradeExecutionService = require('../services/TradeExecutionService');

const router = express.Router();

/**
 * GET /api/data
 * Get current market data including prices and arbitrage opportunities
 */
router.get('/data', (req, res) => {
    try {
        const data = PriceUpdateService.getCurrentData();
        res.json(data);
    } catch (error) {
        console.error('❌ Error fetching current data:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

/**
 * GET /api/exchanges
 * Get exchange configurations
 */
router.get('/exchanges', (req, res) => {
    try {
        const exchangeConfigs = ExchangeFactory.getExchangeConfigs();
        res.json({
            exchanges: exchangeConfigs,
            count: Object.keys(exchangeConfigs).length
        });
    } catch (error) {
        console.error('❌ Error fetching exchange configs:', error);
        res.status(500).json({ error: 'Failed to fetch exchange configurations' });
    }
});

/**
 * POST /api/update
 * Trigger manual price update
 */
router.post('/update', async (req, res) => {
    try {
        console.log('🔄 Manual update requested via API');
        const data = await PriceUpdateService.updatePrices();
        res.json({
            success: true,
            message: 'Prices updated successfully',
            data
        });
    } catch (error) {
        console.error('❌ Error during manual update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update prices'
        });
    }
});

/**
 * GET /api/health
 * Get application health status
 */
router.get('/health', (req, res) => {
    try {
        const wsHealth = WebSocketService.getHealthStatus();
        const data = PriceUpdateService.getCurrentData();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            websocket: wsHealth,
            exchanges: {
                total: Object.keys(ExchangeFactory.getExchangeConfigs()).length,
                enabled: ExchangeFactory.getEnabledExchanges().size,
                active: data.stats.activeExchanges
            },
            trading: {
                monitoredPairs: data.stats.monitoredPairs,
                opportunities: data.opportunities.length
            }
        });
    } catch (error) {
        console.error('❌ Error fetching health status:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

/**
 * GET /api/stats
 * Get application statistics
 */
router.get('/stats', (req, res) => {
    try {
        const data = PriceUpdateService.getCurrentData();
        const wsHealth = WebSocketService.getHealthStatus();
        const tradingStats = TradingPairsService.getStatistics();

        res.json({
            timestamp: data.timestamp,
            stats: data.stats,
            websocket: wsHealth,
            trading: tradingStats,
            performance: {
                lastUpdateTime: data.stats.updateTime || 0,
                apiCalls: data.stats.apiCalls || 0
            }
        });
    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

/**
 * POST /api/execute-trade
 * Execute arbitrage trade
 */
router.post('/execute-trade', async (req, res) => {
    try {
        const { opportunity, options = {} } = req.body;

        if (!opportunity) {
            return res.status(400).json({
                success: false,
                error: 'Arbitrage opportunity data is required'
            });
        }

        console.log('🚀 Trade execution requested via API:', {
            symbol: opportunity.symbol,
            buyExchange: opportunity.buyExchange,
            sellExchange: opportunity.sellExchange,
            profit: opportunity.profitPercentage
        });

        // Execute the trade using the function-based service
        const result = await TradeExecutionService.executeTrade(opportunity, options);

        res.json({
            success: true,
            message: 'Trade execution completed',
            data: result
        });
    } catch (error) {
        console.error('❌ Error executing trade:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to execute trade'
        });
    }
});

/**
 * GET /api/active-trades
 * Get currently active trades (placeholder for now since we removed active trades tracking)
 */
router.get('/active-trades', (req, res) => {
    try {
        // Since we simplified the service, return empty active trades for now
        res.json({
            success: true,
            data: {
                activeTrades: [],
                count: 0
            }
        });
    } catch (error) {
        console.error('❌ Error fetching active trades:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch active trades'
        });
    }
});

/**
 * GET /api/trade-history
 * Get trade execution history
 */
router.get('/trade-history', async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        // Use TradeHistoryService directly since we simplified the execution service
        const result = await TradeHistoryService.getTradeHistory({
            userId: req.query.userId || 'default',
            page: parseInt(req.query.page) || 1,
            limit: parseInt(limit),
            status: req.query.status,
            symbol: req.query.symbol
        });

        // Get real statistics from database instead of in-memory stats
        const databaseStats = await TradeHistoryService.getTradeStatistics(req.query.userId || 'default');

        // Convert database stats to the format expected by frontend
        const statistics = {
            totalTrades: databaseStats.totalTrades || 0,
            successfulTrades: databaseStats.completedTrades || 0,
            successRate: databaseStats.successRate || 0,
            totalProfit: databaseStats.totalProfit || 0,
            mode: 'testnet' // Default to testnet mode
        };

        res.json({
            success: true,
            data: {
                tradeHistory: result.trades,
                pagination: result.pagination,
                statistics,
                count: result.trades.length
            }
        });
    } catch (error) {
        console.error('❌ Error fetching trade history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trade history'
        });
    }
});

/**
 * GET /api/trade-stats
 * Get trade execution statistics
 */
router.get('/trade-stats', async (req, res) => {
    try {
        const userId = req.query.userId || 'default';

        // Get real statistics from database instead of in-memory stats
        const databaseStats = await TradeHistoryService.getTradeStatistics(userId);

        // Convert database stats to the format expected by frontend
        const statistics = {
            totalTrades: databaseStats.totalTrades || 0,
            successfulTrades: databaseStats.completedTrades || 0,
            successRate: databaseStats.successRate || 0,
            totalProfit: databaseStats.totalProfit || 0,
            mode: 'testnet' // Default to testnet mode
        };

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('❌ Error fetching trade statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trade statistics'
        });
    }
});

/**
 * POST /api/trading-mode
 * Set trading mode (testnet or live)
 */
router.post('/trading-mode', (req, res) => {
    try {
        const { mode } = req.body;

        if (!mode || !['testnet', 'live'].includes(mode)) {
            return res.status(400).json({
                success: false,
                error: 'Mode must be either "testnet" or "live"'
            });
        }

        TradeExecutionService.setTradingMode(mode);

        res.json({
            success: true,
            message: `Trading mode set to ${mode}`,
            data: { mode }
        });
    } catch (error) {
        console.error('❌ Error setting trading mode:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set trading mode'
        });
    }
});

/**
 * GET /api/settings
 * Get user settings from database with configuration summary
 */
router.get('/settings', async (req, res) => {
    try {
        const userId = req.query.userId || 'default';
        const includeConfig = req.query.includeConfig === 'true';

        const settingsArr = await UserSettingService.getUserSettings(userId);

        // Convert array to key-value object
        const settings = {};
        settingsArr.forEach(s => {
            settings[s.key] = s.value;
        });

        // Optionally include current configuration summary
        if (includeConfig) {
            const config = ConfigService.getConfigSummary();
            res.json({
                success: true,
                settings,
                config,
                metadata: {
                    userId,
                    settingsCount: settingsArr.length,
                    lastUpdated: new Date().toISOString()
                }
            });
        } else {
            res.json(settings);
        }
    } catch (error) {
        console.error('❌ Error fetching settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settings'
        });
    }
});

/**
 * POST /api/settings
 * Save user settings to database and update live configuration
 */
router.post('/settings', async (req, res) => {
    try {
        const { userId = 'default', settings = {}, action } = req.body;

        // Handle reset action
        if (action === 'reset') {
            await ConfigService.resetToDefaults(userId);
            res.json({
                success: true,
                message: 'Settings reset to defaults successfully',
                action: 'reset'
            });
            return;
        }

        // Save individual settings
        const keys = Object.keys(settings);
        const updatedSettings = {};

        for (const key of keys) {
            await UserSettingService.saveUserSetting(userId, key, String(settings[key]));
            // Update live configuration
            await ConfigService.updateSetting(key, settings[key], userId);
            updatedSettings[key] = settings[key];
        }

        res.json({
            success: true,
            message: `${keys.length} setting(s) updated successfully`,
            updatedSettings,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save settings: ' + error.message
        });
    }
});

/**
 * GET /api/trade-history
 * Get trade execution history with pagination
 */
router.get('/trade-history', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            symbol,
            userId = 'default',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const result = await TradeHistoryService.getTradeHistory({
            userId,
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            symbol,
            sortBy,
            sortOrder
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Error fetching trade history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trade history'
        });
    }
});

/**
 * GET /api/trade-statistics
 * Get trade execution statistics
 */
router.get('/trade-statistics', async (req, res) => {
    try {
        const { userId = 'default' } = req.query;
        const stats = await TradeHistoryService.getTradeStatistics(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error fetching trade statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trade statistics'
        });
    }
});

/**
 * GET /api/trade/:tradeId
 * Get specific trade details
 */
router.get('/trade/:tradeId', async (req, res) => {
    try {
        const { tradeId } = req.params;
        const trade = await TradeHistoryService.getTradeById(tradeId);

        if (!trade) {
            return res.status(404).json({
                success: false,
                error: 'Trade not found'
            });
        }

        res.json({
            success: true,
            data: trade
        });
    } catch (error) {
        console.error('❌ Error fetching trade details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trade details'
        });
    }
});

/**
 * GET /api/exchanges/:exchangeName/balance
 * Get balance for a specific exchange
 */
router.get('/exchanges/:exchangeName/balance', async (req, res) => {
    try {
        const { exchangeName } = req.params;
        const exchange = ExchangeFactory.getExchange(exchangeName);

        if (!exchange) {
            return res.status(404).json({
                success: false,
                error: `Exchange '${exchangeName}' not found or not enabled`
            });
        }

        if (typeof exchange.getBalance !== 'function') {
            return res.status(501).json({
                success: false,
                error: `Balance checking not implemented for ${exchangeName}`
            });
        }

        const balance = await exchange.getBalance();

        res.json({
            success: true,
            exchange: exchangeName,
            data: balance,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`❌ Error fetching ${req.params.exchangeName} balance:`, error);
        res.status(500).json({
            success: false,
            error: `Failed to fetch ${req.params.exchangeName} balance: ${error.message}`
        });
    }
});

/**
 * GET /api/exchanges/balances
 * Get balances from all enabled exchanges
 */
router.get('/exchanges/balances', async (req, res) => {
    try {
        const enabledExchanges = ExchangeFactory.getEnabledExchanges();
        const balances = {};
        const errors = {};

        await Promise.allSettled(
            Array.from(enabledExchanges).map(async (exchangeName) => {
                try {
                    const exchange = ExchangeFactory.getExchange(exchangeName);
                    if (exchange && typeof exchange.getBalance === 'function') {
                        balances[exchangeName] = await exchange.getBalance();
                    } else {
                        errors[exchangeName] = 'Balance method not available';
                    }
                } catch (error) {
                    errors[exchangeName] = error.message;
                }
            })
        );

        res.json({
            success: true,
            data: {
                balances,
                errors,
                exchangeCount: enabledExchanges.size,
                successfulFetches: Object.keys(balances).length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching all exchange balances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch exchange balances'
        });
    }
});

/**
 * GET /api/exchanges/:exchangeName/account
 * Get complete account details for a specific exchange
 */
router.get('/exchanges/:exchangeName/account', async (req, res) => {
    try {
        const { exchangeName } = req.params;
        const exchange = ExchangeFactory.getExchange(exchangeName);

        if (!exchange) {
            return res.status(404).json({
                success: false,
                error: `Exchange '${exchangeName}' not found or not enabled`
            });
        }

        if (typeof exchange.getAccountDetails !== 'function') {
            return res.status(501).json({
                success: false,
                error: `Account details not implemented for ${exchangeName}`
            });
        }

        // Get raw account details from exchange API
        const rawAccountDetails = await exchange.getAccountDetails();

        res.json({
            success: true,
            exchange: exchangeName,
            rawData: rawAccountDetails, // Return the raw API response
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`❌ Error fetching ${req.params.exchangeName} account details:`, error);
        res.status(500).json({
            success: false,
            error: `Failed to fetch ${req.params.exchangeName} account details: ${error.message}`
        });
    }
});

/**
 * GET /api/exchanges/accounts
 * Get account details from all enabled exchanges
 */
router.get('/exchanges/accounts', async (req, res) => {
    try {
        const enabledExchanges = ExchangeFactory.getEnabledExchanges();
        const accounts = {};
        const errors = {};

        await Promise.allSettled(
            Array.from(enabledExchanges).map(async (exchangeName) => {
                try {
                    const exchange = ExchangeFactory.getExchange(exchangeName);
                    if (exchange && typeof exchange.getAccountDetails === 'function') {
                        accounts[exchangeName] = await exchange.getAccountDetails();
                    } else {
                        errors[exchangeName] = 'Account details method not available';
                    }
                } catch (error) {
                    errors[exchangeName] = error.message;
                }
            })
        );

        res.json({
            success: true,
            data: {
                accounts,
                errors,
                exchangeCount: enabledExchanges.size,
                successfulFetches: Object.keys(accounts).length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching all exchange account details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch exchange account details'
        });
    }
});

module.exports = router;