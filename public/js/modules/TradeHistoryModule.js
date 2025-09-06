/**
 * Trade History Module
 * Handles trade history display, pagination, and statistics
 */

class TradeHistoryModule {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.filters = {
            status: '',
            symbol: ''
        };
        this.isLoading = false;

        this.initializeElements();
        this.setupEventListeners();
        this.loadTradeHistory(); // This will also load statistics
        // Remove separate loadTradeStatistics call since it's now included in loadTradeHistory
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            // Statistics
            totalTrades: document.getElementById('totalTrades'),
            successfulTrades: document.getElementById('successfulTrades'),
            successRate: document.getElementById('successRate'),
            totalProfit: document.getElementById('totalProfit'),

            // Filters
            statusFilter: document.getElementById('statusFilter'),
            symbolFilter: document.getElementById('symbolFilter'),
            refreshButton: document.getElementById('refreshHistory'),

            // Table
            tableBody: document.getElementById('historyTableBody'),

            // Pagination
            paginationInfo: document.getElementById('paginationInfo'),
            paginationControls: document.getElementById('paginationControls'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            pageNumbers: document.getElementById('pageNumbers')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter changes
        this.elements.statusFilter?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadTradeHistory();
        });

        this.elements.symbolFilter?.addEventListener('change', (e) => {
            this.filters.symbol = e.target.value;
            this.currentPage = 1;
            this.loadTradeHistory();
        });

        // Refresh button
        this.elements.refreshButton?.addEventListener('click', () => {
            this.loadTradeHistory(); // This will also refresh statistics
        });

        // Pagination
        this.elements.prevPage?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadTradeHistory();
            }
        });

        this.elements.nextPage?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadTradeHistory();
            }
        });
    }

    /**
     * Load trade history from API
     */
    async loadTradeHistory() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.showLoadingState();

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                userId: 'default'
            });

            if (this.filters.status) params.append('status', this.filters.status);
            if (this.filters.symbol) params.append('symbol', this.filters.symbol);

            const response = await fetch(`/api/trade-history?${params}`);
            const result = await response.json();

            if (result.success) {
                // The API returns data.tradeHistory, not data.trades
                const trades = result.data.tradeHistory || [];
                this.displayTradeHistory(trades);
                this.updatePagination(result.data.pagination);
                this.populateSymbolFilter(trades);

                // Also update statistics if available in the response
                if (result.data.statistics) {
                    this.displayStatistics(result.data.statistics);
                } else {
                    // Calculate statistics from trade data if not provided
                    this.calculateAndDisplayStatistics(trades);
                }
            } else {
                throw new Error(result.error || 'Failed to load trade history');
            }

        } catch (error) {
            console.error('❌ Error loading trade history:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load trade statistics
     */
    async loadTradeStatistics() {
        try {
            // Use trade-stats endpoint for statistics
            const response = await fetch('/api/trade-stats');
            const result = await response.json();

            if (result.success) {
                this.displayStatistics(result.data);
            } else {
                console.error('Failed to load trade statistics:', result.error);
            }

        } catch (error) {
            console.error('❌ Error loading trade statistics:', error);
        }
    }

    /**
     * Calculate statistics from trade data
     */
    calculateAndDisplayStatistics(trades) {
        const totalTrades = trades.length;
        const successfulTrades = trades.filter(trade => trade.status === 'completed').length;
        const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

        // Calculate total profit from completed trades
        const totalProfit = trades
            .filter(trade => trade.status === 'completed' && trade.actualProfit !== null)
            .reduce((sum, trade) => sum + (trade.actualProfit || 0), 0);

        const stats = {
            totalTrades,
            successfulTrades,
            successRate,
            totalProfit
        };

        this.displayStatistics(stats);
    }

    /**
     * Display trade statistics
     */
    displayStatistics(stats) {
        if (this.elements.totalTrades) {
            this.elements.totalTrades.textContent = stats.totalTrades || 0;
        }
        if (this.elements.successfulTrades) {
            this.elements.successfulTrades.textContent = stats.successfulTrades || 0;
        }
        if (this.elements.successRate) {
            this.elements.successRate.textContent = `${(stats.successRate || 0).toFixed(1)}%`;
        }
        if (this.elements.totalProfit) {
            const profit = stats.totalProfit || 0;
            const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
            this.elements.totalProfit.textContent = `$${profit.toFixed(2)}`;
            this.elements.totalProfit.className = `stat-value ${profitClass}`;
        }
    }

    /**
     * Display trade history in table
     */
    displayTradeHistory(trades) {
        if (!this.elements.tableBody) return;

        if (!trades || trades.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-row">
                        <i class="fas fa-inbox"></i>
                        <p>No trade history found</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.elements.tableBody.innerHTML = trades.map(trade => {
            return this.createTradeRow(trade);
        }).join('');
    }

    /**
     * Create a table row for a trade
     */
    createTradeRow(trade) {
        const date = new Date(trade.createdAt).toLocaleDateString();
        const time = new Date(trade.createdAt).toLocaleTimeString();
        const statusClass = this.getStatusClass(trade.status);
        const actualProfit = trade.actualProfit || 0;
        const profitClass = actualProfit >= 0 ? 'profit-positive' : 'profit-negative';

        return `
            <tr class="trade-row" data-trade-id="${trade.tradeId}">
                <td class="date-cell">
                    <div class="date">${date}</div>
                    <div class="time">${time}</div>
                </td>
                <td class="trade-id-cell">
                    <span class="trade-id" title="${trade.tradeId}">${trade.tradeId.substr(0, 8)}...</span>
                    <span class="trading-mode-badge ${trade.tradingMode || 'testnet'}">${(trade.tradingMode || 'testnet').toUpperCase()}</span>
                </td>
                <td class="symbol-cell">${trade.symbol || 'N/A'}</td>
                <td class="exchange-cell">
                    <span class="exchange-badge buy">${trade.buyExchange || 'N/A'}</span>
                </td>
                <td class="exchange-cell">
                    <span class="exchange-badge sell">${trade.sellExchange || 'N/A'}</span>
                </td>
                <td class="capital-cell">$${(trade.capitalAmount || 0).toFixed(2)}</td>
                <td class="profit-cell">
                    <div class="profit-amount ${profitClass}">
                        $${((trade.actualProfit !== null && trade.actualProfit !== undefined) ? trade.actualProfit : (trade.expectedProfit || 0)).toFixed(4)}
                    </div>
                    <div class="profit-percent ${profitClass}">
                        ${((trade.actualProfitPercent !== null && trade.actualProfitPercent !== undefined) ? trade.actualProfitPercent : (trade.expectedProfitPercent || 0)).toFixed(2)}%
                    </div>
                </td>
                <td class="status-cell">
                    <span class="status-badge ${statusClass}">${(trade.status || 'unknown').toUpperCase()}</span>
                </td>
                <td class="actions-cell">
                    <button class="btn btn-small" onclick="tradeHistoryModule.viewTradeDetails('${trade.tradeId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Get CSS class for trade status
     */
    getStatusClass(status) {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'failed': return 'status-failed';
            case 'pending': return 'status-pending';
            case 'executing': return 'status-executing';
            default: return 'status-unknown';
        }
    }

    /**
     * Update pagination controls
     */
    updatePagination(pagination) {
        const { currentPage, totalPages, totalCount, limit } = pagination;
        this.totalPages = totalPages;

        // Update pagination info
        const start = ((currentPage - 1) * limit) + 1;
        const end = Math.min(currentPage * limit, totalCount);

        if (this.elements.paginationInfo) {
            this.elements.paginationInfo.textContent = `Showing ${start} - ${end} of ${totalCount} trades`;
        }

        // Update pagination controls
        if (this.elements.prevPage) {
            this.elements.prevPage.disabled = currentPage <= 1;
        }

        if (this.elements.nextPage) {
            this.elements.nextPage.disabled = currentPage >= totalPages;
        }

        // Update page numbers
        this.updatePageNumbers(currentPage, totalPages);
    }

    /**
     * Update page number buttons
     */
    updatePageNumbers(currentPage, totalPages) {
        if (!this.elements.pageNumbers) return;

        let pageButtons = '';
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage ? 'active' : '';
            pageButtons += `
                <button class="page-btn ${isActive}" onclick="tradeHistoryModule.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        this.elements.pageNumbers.innerHTML = pageButtons;
    }

    /**
     * Go to specific page
     */
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.loadTradeHistory();
        }
    }

    /**
     * Populate symbol filter dropdown
     */
    populateSymbolFilter(trades) {
        if (!this.elements.symbolFilter) return;

        const symbols = [...new Set(trades.map(trade => trade.symbol))].sort();
        const currentValue = this.elements.symbolFilter.value;

        this.elements.symbolFilter.innerHTML = '<option value="">All Symbols</option>';
        symbols.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = symbol;
            if (symbol === currentValue) option.selected = true;
            this.elements.symbolFilter.appendChild(option);
        });
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.elements.tableBody) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-row">
                        <i class="fas fa-spinner fa-spin"></i> Loading trade history...
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Show error state
     */
    showErrorState(message) {
        if (this.elements.tableBody) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="error-row">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading trade history: ${message}</p>
                        <button class="btn btn-secondary" onclick="tradeHistoryModule.loadTradeHistory()">
                            <i class="fas fa-retry"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * View trade details
     */
    async viewTradeDetails(tradeId) {
        try {
            const response = await fetch(`/api/trade/${tradeId}`);
            const result = await response.json();

            if (result.success) {
                this.showTradeDetailsModal(result.data);
            } else {
                alert('Failed to load trade details: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error loading trade details:', error);
            alert('Error loading trade details: ' + error.message);
        }
    }

    /**
     * Show trade details modal
     */
    showTradeDetailsModal(trade) {
        const modalHTML = `
            <div class="trade-details-modal" id="tradeDetailsModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Trade Details</h3>
                        <button class="modal-close" onclick="tradeHistoryModule.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="trade-info-grid">
                            <div class="info-group">
                                <label>Trade ID:</label>
                                <span>${trade.tradeId}</span>
                            </div>
                            <div class="info-group">
                                <label>Symbol:</label>
                                <span>${trade.symbol}</span>
                            </div>
                            <div class="info-group">
                                <label>Status:</label>
                                <span class="status-badge ${this.getStatusClass(trade.status)}">${trade.status.toUpperCase()}</span>
                            </div>
                            <div class="info-group">
                                <label>Created:</label>
                                <span>${new Date(trade.createdAt).toLocaleString()}</span>
                            </div>
                            <div class="info-group">
                                <label>Buy Exchange:</label>
                                <span>${trade.buyExchange}</span>
                            </div>
                            <div class="info-group">
                                <label>Sell Exchange:</label>
                                <span>${trade.sellExchange}</span>
                            </div>
                            <div class="info-group">
                                <label>Buy Price:</label>
                                <span>$${(trade.buyPrice || 0).toFixed(6)}</span>
                            </div>
                            <div class="info-group">
                                <label>Sell Price:</label>
                                <span>$${(trade.sellPrice || 0).toFixed(6)}</span>
                            </div>
                            <div class="info-group">
                                <label>Quantity:</label>
                                <span>${(trade.quantity || 0).toFixed(8)}</span>
                            </div>
                            <div class="info-group">
                                <label>Capital:</label>
                                <span>$${(trade.capitalAmount || 0).toFixed(2)}</span>
                            </div>
                            <div class="info-group">
                                <label>Expected Profit:</label>
                                <span>$${(trade.expectedProfit || 0).toFixed(4)} (${(trade.expectedProfitPercent || 0).toFixed(2)}%)</span>
                            </div>
                            ${trade.actualProfit !== null && trade.actualProfit !== undefined ? `
                            <div class="info-group">
                                <label>Actual Profit:</label>
                                <span class="${(trade.actualProfit || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">
                                    $${(trade.actualProfit || 0).toFixed(4)} (${(trade.actualProfitPercent || 0).toFixed(2)}%)
                                </span>
                            </div>
                            ` : ''}
                            ${trade.executionTime ? `
                            <div class="info-group">
                                <label>Execution Time:</label>
                                <span>${trade.executionTime}ms</span>
                            </div>
                            ` : ''}
                            ${trade.errorMessage ? `
                            <div class="info-group">
                                <label>Error:</label>
                                <span class="error-message">${trade.errorMessage}</span>
                            </div>
                            ` : ''}
                            ${trade.buyOrderResponse ? `
                            <div class="info-group">
                                <label>Buy Order Response:</label>
                                <details>
                                    <summary>View JSON Data</summary>
                                    <pre class="json-data">${JSON.stringify(JSON.parse(trade.buyOrderResponse), null, 2)}</pre>
                                </details>
                            </div>
                            ` : ''}
                            ${trade.sellOrderResponse ? `
                            <div class="info-group">
                                <label>Sell Order Response:</label>
                                <details>
                                    <summary>View JSON Data</summary>
                                    <pre class="json-data">${JSON.stringify(JSON.parse(trade.sellOrderResponse), null, 2)}</pre>
                                </details>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('tradeDetailsModal');
        if (modal) {
            modal.remove();
        }
    }
}

// Export for use in main app
window.TradeHistoryModule = TradeHistoryModule;
