/**
 * Opportunities Module
 * Handles arbitrage opportunities display and updates
 */

class OpportunitiesModule {
    constructor() {
        this.lastOpportunityIds = null;
    }

    /**
     * Update opportunities display
     * @param {Array} opportunities - Array of arbitrage opportunities
     */
    updateOpportunities(opportunities) {
        const dashboardContent = document.getElementById('opportunitiesContent');
        const opportunitiesContent = document.getElementById('opportunitiesList');

        if (opportunities.length === 0) {
            const noOpportunitiesHtml = this.getNoOpportunitiesHtml();
            if (dashboardContent) dashboardContent.innerHTML = noOpportunitiesHtml;
            if (opportunitiesContent) opportunitiesContent.innerHTML = noOpportunitiesHtml;
        } else {
            // Check if opportunities have actually changed to prevent unnecessary DOM updates
            const currentOpportunityIds = opportunities.map(opp =>
                `${opp.pair}-${opp.buyExchange}-${opp.sellExchange}`
            );

            // Only update if opportunities structure has changed or this is the first load
            if (!this.lastOpportunityIds ||
                JSON.stringify(this.lastOpportunityIds) !== JSON.stringify(currentOpportunityIds)) {

                this.lastOpportunityIds = currentOpportunityIds;
                const opportunitiesHtml = this.buildOpportunitiesHtml(opportunities);

                if (dashboardContent) {
                    dashboardContent.innerHTML = `<div class="grid">${opportunitiesHtml}</div>`;
                }
                if (opportunitiesContent) {
                    opportunitiesContent.innerHTML = opportunitiesHtml;
                }
            } else {
                // Just update the profit values and prices without regenerating the entire DOM
                this.updateOpportunityPrices(opportunities);
            }
        }
    }

    /**
     * Get HTML for no opportunities state
     * @returns {string} - HTML string
     */
    getNoOpportunitiesHtml() {
        return `
      <div class="no-opportunities">
        <div class="icon"><i class="fas fa-search"></i></div>
        <h2>No profitable opportunities found</h2>
        <p>Monitoring markets for arbitrage opportunities...</p>
        <p><small>Minimum threshold: 0.01% profit after fees</small></p>
      </div>
    `;
    }

    /**
     * Build opportunities HTML
     * @param {Array} opportunities - Array of arbitrage opportunities
     * @returns {string} - HTML string
     */
    buildOpportunitiesHtml(opportunities) {
        return opportunities.map(opp => {
            const capitalAmount = this.getDefaultCapitalAmount();

            return `
        <div class="card" data-opportunity-id="${opp.pair}-${opp.buyExchange}-${opp.sellExchange}">
          <h3>
            <span class="pair-symbol">
              <img src="${opp.pairImage || this.getDefaultCoinImage(opp.baseAsset)}" 
                   alt="${opp.pairName}" 
                   style="width: 20px; height: 20px; border-radius: 50%; margin-right: 6px;"
                   onerror="this.onerror=null; this.src='${this.getFallbackImage(opp.baseAsset)}';">
              ${opp.pairName || opp.pair}
            </span>
            <span class="profit-badge">
              +${opp.profitPercent}%
            </span>
          </h3>

          <div class="compact-exchange-info">
            <div class="compact-exchange-side buy">
              <div class="compact-exchange-label">🛒 Buy</div>
              <div class="compact-exchange-name">${opp.buyExchange}</div>
              <div class="compact-price">$${this.formatPrice(opp.rawBuyPrice)}</div>
              <div class="compact-price-fee">+${opp.buyFee}% fee</div>
            </div>
            
            <div class="compact-arrow">
              <i class="fas fa-arrow-right"></i>
            </div>
            
            <div class="compact-exchange-side sell">
              <div class="compact-exchange-label">💸 Sell</div>
              <div class="compact-exchange-name">${opp.sellExchange}</div>
              <div class="compact-price">$${this.formatPrice(opp.rawSellPrice)}</div>
              <div class="compact-price-fee">-${opp.sellFee}% fee</div>
            </div>
          </div>

          <div class="compact-profit-section">
            <div class="profit-main">
              <div class="profit-item">
                <div class="profit-label">💰 Profit (USDT)</div>
                <div class="profit-value profit-usdt">$${opp.netProfitUSDT}</div>
              </div>
              <div class="profit-item">
                <div class="profit-label">📈 Profit (%)</div>
                <div class="profit-value profit-percentage">${opp.profitPercent}%</div>
              </div>
            </div>
          </div>

          <div class="compact-profit-section" style="background-color: #2a2757ff; border-radius: 8px; padding: 10px; margin: 8px 0;">
            <div class="compact-exchange-label" style="color: #ffffff; font-weight: bold; font-size: 14px;">
              Capital: $${capitalAmount}
            </div>
          </div>
          
          <div class="compact-execute-section">
            <button class="compact-execute-button" onclick="opportunitiesModule.executeTrade('${opp.pair}', {
              buyExchange: '${opp.buyExchange}',
              sellExchange: '${opp.sellExchange}',
              rawBuyPrice: ${opp.rawBuyPrice},
              rawSellPrice: ${opp.rawSellPrice},
              profitPercent: '${opp.profitPercent}',
              netProfitUSDT: '${opp.netProfitUSDT}'
            })">
              <i class="fas fa-rocket"></i> Execute Trade
            </button>
          </div>
        </div>
      `;
        }).join('');
    }

    /**
     * Update only prices without regenerating DOM - prevents UI flipping
     * @param {Array} opportunities - Array of arbitrage opportunities
     */
    updateOpportunityPrices(opportunities) {
        opportunities.forEach(opp => {
            const opportunityElement = document.querySelector(`[data-opportunity-id="${opp.pair}-${opp.buyExchange}-${opp.sellExchange}"]`);
            if (opportunityElement) {
                // Update profit badge
                const profitBadge = opportunityElement.querySelector('.profit-badge');
                if (profitBadge) profitBadge.textContent = `+${opp.profitPercent}%`;

                // Update buy price
                const buyPrice = opportunityElement.querySelector('.buy .compact-price');
                if (buyPrice) buyPrice.textContent = `$${this.formatPrice(opp.rawBuyPrice)}`;

                // Update sell price
                const sellPrice = opportunityElement.querySelector('.sell .compact-price');
                if (sellPrice) sellPrice.textContent = `$${this.formatPrice(opp.rawSellPrice)}`;

                // Update profit USDT
                const profitUsdt = opportunityElement.querySelector('.profit-usdt');
                if (profitUsdt) profitUsdt.textContent = `$${opp.netProfitUSDT}`;

                // Update profit percentage
                const profitPercentage = opportunityElement.querySelector('.profit-percentage');
                if (profitPercentage) profitPercentage.textContent = `${opp.profitPercent}%`;
            }
        });
    }

    /**
     * Format price for display
     * @param {string|number} price - Price value
     * @returns {string} - Formatted price
     */
    formatPrice(price) {
        const num = parseFloat(price);
        if (num >= 1000) {
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (num >= 1) {
            return num.toFixed(4);
        } else {
            return num.toFixed(6);
        }
    }

    /**
     * Get default coin image URL
     * @param {string} baseAsset - Base asset symbol
     * @returns {string} - Image URL
     */
    getDefaultCoinImage(baseAsset) {
        return `https://cryptoicons.org/api/white/${baseAsset ? baseAsset.toLowerCase() : 'btc'}/32`;
    }

    /**
     * Get fallback image URL
     * @param {string} baseAsset - Base asset symbol
     * @returns {string} - Fallback image URL
     */
    getFallbackImage(baseAsset) {
        const symbol = baseAsset ? baseAsset.charAt(0) : 'C';
        return `https://via.placeholder.com/20/FFD700/000000?text=${symbol}`;
    }

    /**
     * Get default capital amount from localStorage or default
     * @returns {string} - Capital amount
     */
    getDefaultCapitalAmount() {
        return localStorage.getItem('capitalAmount') || '10000';
    }

    /**
     * Execute an arbitrage trade
     * @param {string} symbol - Trading pair symbol
     * @param {Object} opportunity - Opportunity details
     */
    async executeTrade(symbol, opportunity) {
        console.log(`🚀 Executing trade for ${symbol}:`, opportunity);

        try {
            // Show loading state
            const executeButton = event?.target;
            const originalText = executeButton?.innerHTML;
            if (executeButton) {
                executeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
                executeButton.disabled = true;
            }

            // Prepare trade data
            const tradeData = {
                opportunity: {
                    symbol: symbol,
                    buyExchange: opportunity.buyExchange,
                    sellExchange: opportunity.sellExchange,
                    buyPrice: opportunity.rawBuyPrice,
                    sellPrice: opportunity.rawSellPrice,
                    profitPercentage: parseFloat(opportunity.profitPercent),
                    amount: 100 // Default $100 trade amount
                },
                options: {
                    strategy: 'smart',
                    slippageTolerance: 0.005,
                    dryRun: true // Set to false for live trading
                }
            };

            // Send execute trade request
            const response = await fetch('/api/execute-trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tradeData)
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Trade executed successfully:', result.data);
                this.showNotification(`Trade executed successfully! ${result.data.simulation ? '(Simulated)' : ''}`, 'success');

                // Update UI with trade result
                if (result.data.status === 'completed') {
                    this.showTradeResult(result.data);
                }
            } else {
                throw new Error(result.error || 'Trade execution failed');
            }

        } catch (error) {
            console.error('❌ Trade execution error:', error);
            this.showNotification(`Trade execution failed: ${error.message}`, 'error');
        } finally {
            // Restore button state
            if (executeButton) {
                executeButton.innerHTML = originalText;
                executeButton.disabled = false;
            }
        }
    }

    /**
     * Show trade execution result
     * @param {Object} tradeResult - Trade execution result
     */
    showTradeResult(tradeResult) {
        const resultHTML = `
            <div class="trade-result ${tradeResult.simulation ? 'simulation' : 'live'}">
                <h3>🎯 Trade Result ${tradeResult.simulation ? '(Simulated)' : ''}</h3>
                <div class="result-details">
                    <div class="result-item">
                        <span>Trade ID:</span>
                        <span>${tradeResult.tradeId}</span>
                    </div>
                    <div class="result-item">
                        <span>Symbol:</span>
                        <span>${tradeResult.opportunity.symbol}</span>
                    </div>
                    <div class="result-item">
                        <span>Status:</span>
                        <span class="status-${tradeResult.status}">${tradeResult.status.toUpperCase()}</span>
                    </div>
                    <div class="result-item">
                        <span>Actual Profit:</span>
                        <span class="profit-value">${tradeResult.actualProfit?.toFixed(6) || '0'} USDT</span>
                    </div>
                    <div class="result-item">
                        <span>Profit %:</span>
                        <span class="profit-percentage">${tradeResult.actualProfitPercentage?.toFixed(4) || '0'}%</span>
                    </div>
                    <div class="result-item">
                        <span>Execution Time:</span>
                        <span>${tradeResult.executionTime || 0}ms</span>
                    </div>
                    ${tradeResult.slippage ? `
                    <div class="result-item">
                        <span>Slippage:</span>
                        <span>${tradeResult.slippage.total?.toFixed(4) || '0'}%</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.showNotification(resultHTML, 'info', 10000); // Show for 10 seconds
    }

    /**
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `trade-notification notification-${type}`;
        notification.innerHTML = message;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }
}

// Export for use in main app
window.OpportunitiesModule = OpportunitiesModule;
