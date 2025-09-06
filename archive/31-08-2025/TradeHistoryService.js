/**
 * Trade History Service
 * Handles database operations for trade history storage and retrieval
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TradeHistoryService {
    /**
     * Save a trade record to the database
     * @param {Object} tradeData - Trade data to save
     * @returns {Promise<Object>} - Saved trade record
     */
    static async saveTradeRecord(tradeData) {
        try {
            // Convert numeric string values to floats
            const numericFields = {
                buyPrice: tradeData.buyPrice,
                sellPrice: tradeData.sellPrice,
                quantity: tradeData.quantity,
                capitalAmount: tradeData.capitalAmount,
                expectedProfit: tradeData.expectedProfit,
                expectedProfitPercent: tradeData.expectedProfitPercent,
                actualProfit: tradeData.actualProfit,
                actualProfitPercent: tradeData.actualProfitPercent,
                buySlippage: tradeData.buySlippage,
                sellSlippage: tradeData.sellSlippage,
                totalSlippage: tradeData.totalSlippage,
                fees: tradeData.fees
            };

            // Convert all numeric fields to float
            const processedNumericFields = Object.entries(numericFields).reduce((acc, [key, value]) => {
                // Convert string numbers to float, handle null/undefined
                acc[key] = value !== null && value !== undefined ? parseFloat(value) : null;
                return acc;
            }, {});

            const trade = await prisma.tradeHistory.create({
                data: {
                    tradeId: tradeData.tradeId,
                    userId: tradeData.userId || 'default',
                    symbol: tradeData.symbol,
                    buyExchange: tradeData.buyExchange,
                    sellExchange: tradeData.sellExchange,
                    ...processedNumericFields,
                    status: tradeData.status,
                    buyOrderId: tradeData.buyOrderId || null,
                    sellOrderId: tradeData.sellOrderId || null,
                    executionTime: tradeData.executionTime || null,
                    errorMessage: tradeData.errorMessage || null,
                    buyOrderResponse: tradeData.buyOrderResponse || null,
                    sellOrderResponse: tradeData.sellOrderResponse || null,
                    simulation: tradeData.simulation || true,
                    completedAt: tradeData.status === 'completed' ? new Date() : null
                }
            });

            console.log(`📊 Trade record saved: ${trade.tradeId}`);
            return trade;
        } catch (error) {
            console.error('❌ Error saving trade record:', error);
            throw error;
        }
    }

    /**
     * Update a trade record
     * @param {string} tradeId - Trade ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} - Updated trade record
     */
    static async updateTradeRecord(tradeId, updateData) {
        try {
            // Define numeric fields that need conversion
            const numericFields = [
                'buyPrice', 'sellPrice', 'quantity', 'capitalAmount',
                'expectedProfit', 'expectedProfitPercent', 'actualProfit',
                'actualProfitPercent', 'buySlippage', 'sellSlippage',
                'totalSlippage', 'fees'
            ];

            // Process updateData to convert numeric strings to floats
            const processedData = { ...updateData };
            for (const field of numericFields) {
                if (field in updateData && updateData[field] !== null) {
                    processedData[field] = parseFloat(updateData[field]);
                }
            }

            const trade = await prisma.tradeHistory.update({
                where: { tradeId },
                data: {
                    ...processedData,
                    updatedAt: new Date(),
                    completedAt: updateData.status === 'completed' ? new Date() : undefined
                }
            });

            console.log(`📝 Trade record updated: ${trade.tradeId} - Status: ${trade.status}`);
            return trade;
        } catch (error) {
            console.error('❌ Error updating trade record:', error);
            throw error;
        }
    }

    /**
     * Get trade history with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated trade history
     */
    static async getTradeHistory(options = {}) {
        const {
            userId = 'default',
            page = 1,
            limit = 10,
            status,
            symbol,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        try {
            const offset = (page - 1) * limit;

            // Build where clause
            const where = { userId };
            if (status) where.status = status;
            if (symbol) where.symbol = symbol;

            // Get total count
            const totalCount = await prisma.tradeHistory.count({ where });

            // Get paginated records
            const trades = await prisma.tradeHistory.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: offset,
                take: limit
            });

            // Calculate pagination info
            const totalPages = Math.ceil(totalCount / limit);
            const hasNext = page < totalPages;
            const hasPrev = page > 1;

            return {
                trades,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNext,
                    hasPrev
                }
            };
        } catch (error) {
            console.error('❌ Error fetching trade history:', error);
            throw error;
        }
    }

    /**
     * Get trade statistics
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Trade statistics
     */
    static async getTradeStatistics(userId = 'default') {
        try {
            const stats = await prisma.tradeHistory.groupBy({
                by: ['status'],
                where: { userId },
                _count: { status: true },
                _sum: {
                    actualProfit: true,
                    expectedProfit: true,
                    capitalAmount: true,
                    fees: true
                },
                _avg: {
                    actualProfitPercent: true,
                    executionTime: true
                }
            });

            // Get recent trades
            const recentTrades = await prisma.tradeHistory.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5
            });

            // Calculate summary statistics
            const totalTrades = stats.reduce((sum, stat) => sum + stat._count.status, 0);
            const completedTrades = stats.find(s => s.status === 'completed')?._count.status || 0;
            const failedTrades = stats.find(s => s.status === 'failed')?._count.status || 0;
            const totalProfit = stats.reduce((sum, stat) => sum + (stat._sum.actualProfit || 0), 0);
            const totalCapital = stats.reduce((sum, stat) => sum + (stat._sum.capitalAmount || 0), 0);
            const avgProfitPercent = stats.reduce((sum, stat) => {
                return sum + (stat._avg.actualProfitPercent || 0);
            }, 0) / stats.length || 0;

            return {
                totalTrades,
                completedTrades,
                failedTrades,
                successRate: totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0,
                totalProfit,
                totalCapital,
                avgProfitPercent,
                avgExecutionTime: stats.reduce((sum, stat) => {
                    return sum + (stat._avg.executionTime || 0);
                }, 0) / stats.length || 0,
                recentTrades,
                statusBreakdown: stats
            };
        } catch (error) {
            console.error('❌ Error fetching trade statistics:', error);
            throw error;
        }
    }

    /**
     * Get a specific trade by ID
     * @param {string} tradeId - Trade ID
     * @returns {Promise<Object>} - Trade record
     */
    static async getTradeById(tradeId) {
        try {
            const trade = await prisma.tradeHistory.findUnique({
                where: { tradeId }
            });

            return trade;
        } catch (error) {
            console.error('❌ Error fetching trade by ID:', error);
            throw error;
        }
    }

    /**
     * Delete old trade records (cleanup)
     * @param {number} daysOld - Delete records older than this many days
     * @returns {Promise<number>} - Number of deleted records
     */
    static async cleanupOldTrades(daysOld = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await prisma.tradeHistory.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });

            console.log(`🧹 Cleaned up ${result.count} old trade records`);
            return result.count;
        } catch (error) {
            console.error('❌ Error cleaning up old trades:', error);
            throw error;
        }
    }
}

module.exports = TradeHistoryService;
