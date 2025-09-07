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
   * @param {Array} directOpportunities - Array of direct opportunities
   * @param {Array} triangularOpportunities - Array of triangular opportunities
   */
  updateOpportunities(opportunities, directOpportunities = [], triangularOpportunities = []) {
    const dashboardContent = document.getElementById('opportunitiesContent');
    const opportunitiesContent = document.getElementById('opportunitiesList');

    // Update separate pages
    const directContent = document.getElementById('directOpportunitiesList');
    const triangularContent = document.getElementById('triangularOpportunitiesList');

    if (opportunities.length === 0) {
      const noOpportunitiesHtml = this.getNoOpportunitiesHtml();
      if (dashboardContent) dashboardContent.innerHTML = noOpportunitiesHtml;
      if (opportunitiesContent) opportunitiesContent.innerHTML = noOpportunitiesHtml;
    } else {
      // Check if opportunities have actually changed to prevent unnecessary DOM updates
      const currentOpportunityIds = opportunities.map(opp =>
        `${opp.pair}-${opp.buyExchange || opp.exchange}-${opp.sellExchange || 'triangular'}`
      );

      // Only update if opportunities structure has changed or this is the first load
      if (!this.lastOpportunityIds ||
        JSON.stringify(this.lastOpportunityIds) !== JSON.stringify(currentOpportunityIds)) {

        this.lastOpportunityIds = currentOpportunityIds;
        const opportunitiesHtml = this.buildOpportunitiesHtml(opportunities);

        if (dashboardContent) {
          dashboardContent.innerHTML = opportunitiesHtml;
        }
        if (opportunitiesContent) {
          opportunitiesContent.innerHTML = opportunitiesHtml;
        }
      } else {
        // Just update the profit values and prices without regenerating the entire DOM
        this.updateOpportunityPrices(opportunities);
      }
    }

    // Update direct opportunities page
    if (directContent) {
      if (directOpportunities.length === 0) {
        directContent.innerHTML = this.getNoDirectOpportunitiesHtml();
      } else {
        directContent.innerHTML = this.buildOpportunitiesHtml(directOpportunities);
      }
    }

    // Update triangular opportunities page
    if (triangularContent) {
      if (triangularOpportunities.length === 0) {
        triangularContent.innerHTML = this.getNoTriangularOpportunitiesHtml();
      } else {
        triangularContent.innerHTML = this.buildOpportunitiesHtml(triangularOpportunities);
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
   * Get HTML for no direct opportunities state
   * @returns {string} - HTML string
   */
  getNoDirectOpportunitiesHtml() {
    return `
      <div class="no-opportunities">
        <div class="icon"><i class="fas fa-search-dollar"></i></div>
        <h2>No direct arbitrage opportunities found</h2>
        <p>Looking for profitable price differences between exchanges...</p>
        <p><small>Direct arbitrage: Buy on one exchange, sell on another</small></p>
      </div>
    `;
  }

  /**
   * Get HTML for no triangular opportunities state
   * @returns {string} - HTML string
   */
  getNoTriangularOpportunitiesHtml() {
    return `
      <div class="no-opportunities">
        <div class="icon"><i class="fas fa-project-diagram"></i></div>
        <h2>No triangular arbitrage opportunities found</h2>
        <p>Searching for profitable multi-step trading paths...</p>
        <p><small>Triangular arbitrage: Multi-step trades within one exchange</small></p>
      </div>
    `;
  }

  /**
   * Build opportunities HTML with support for both direct and triangular arbitrage
   * @param {Array} opportunities - Array of arbitrage opportunities
   * @returns {string} - HTML string
   */
  buildOpportunitiesHtml(opportunities) {
    return opportunities.map(opp => {
      const capitalAmount = this.getDefaultCapitalAmount();
      const isTriangular = opp.arbitrageType === 'Triangular';
      const arbitrageClass = isTriangular ? 'triangular' : 'direct';

      if (isTriangular) {
        return this.buildTriangularOpportunityHtml(opp, capitalAmount);
      } else {
        return this.buildDirectOpportunityHtml(opp, capitalAmount);
      }
    }).join('');
  }

  /**
   * Build HTML for direct arbitrage opportunity
   * @param {Object} opp - Opportunity object
   * @param {number} capitalAmount - Capital amount
   * @returns {string} - HTML string
   */
  buildDirectOpportunityHtml(opp, capitalAmount) {
    const fallbackImageUrl = `https://via.placeholder.com/32/F7931A/FFFFFF?text=${(opp.baseAsset || 'BTC').charAt(0)}`;
    const opportunityId = `${opp.pair}-${opp.buyExchange}-${opp.sellExchange}`;

    return `
        <div class="card opportunity-card direct" data-opportunity-id="${opportunityId}">
          <div class="opportunity-header">
            <div class="crypto-info">
              <img src="${opp.pairImage || this.getDefaultCoinImage(opp.baseAsset)}" 
                   alt="${opp.pairName}" 
                   class="crypto-icon"
                   onerror="this.src='${fallbackImageUrl}'">
              <div class="crypto-details">
                <h3 class="crypto-name">${opp.pairName || opp.pair}</h3>
              </div>
            </div>
          </div>

          <div class="exchange-flow">
            <div class="exchange-step buy-step">
              <div class="step-header">
                <i class="fas fa-shopping-cart"></i>
                <span>Buy</span>
              </div>
              <div class="exchange-name">${opp.buyExchange}</div>
              <div class="price">$${this.formatPrice(opp.rawBuyPrice)}</div>
              <div class="fee">Fee: ${opp.buyFee}%</div>
            </div>
            
            <div class="flow-arrow">
              <i class="fas fa-arrow-right"></i>
            </div>
            
            <div class="exchange-step sell-step">
              <div class="step-header">
                <i class="fas fa-hand-holding-usd"></i>
                <span>Sell</span>
              </div>
              <div class="exchange-name">${opp.sellExchange}</div>
              <div class="price">$${this.formatPrice(opp.rawSellPrice)}</div>
              <div class="fee">Fee: ${opp.sellFee}%</div>
            </div>
          </div>

          <div class="investment-return-section">
            <div class="investment-display">
              <div class="investment-info">
                <span class="investment-label">Investment</span>
                <span class="investment-amount">$${capitalAmount}</span>
              </div>
              <div class="profit-info">
                <span class="profit-label">Profit</span>
                <div class="profit-values">
                  <span class="profit-amount">$${opp.netProfitUSDT}</span>
                  <span class="profit-percent">(+${opp.profitPercent}%)</span>
                </div>
              </div>
              <div class="return-info">
                <span class="return-label">Total Return</span>
                <span class="return-amount">$${(parseFloat(capitalAmount) + parseFloat(opp.netProfitUSDT)).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <button class="execute-btn" onclick="opportunitiesModule.executeTrade('${opp.pair}', {
            arbitrageType: 'Direct',
            buyExchange: '${opp.buyExchange}',
            sellExchange: '${opp.sellExchange}',
            rawBuyPrice: ${opp.rawBuyPrice},
            rawSellPrice: ${opp.rawSellPrice},
            profitPercent: '${opp.profitPercent}',
            netProfitUSDT: '${opp.netProfitUSDT}',
            isDemo: ${opp.isDemo || false}
          })">
            <i class="fas fa-bolt"></i>
            Execute Trade
          </button>
        </div>
      `;
  }

  /**
   * Build HTML for triangular arbitrage opportunity
   * @param {Object} opp - Opportunity object
   * @param {number} capitalAmount - Capital amount
   * @returns {string} - HTML string
   */
  buildTriangularOpportunityHtml(opp, capitalAmount) {
    const fallbackImageUrl = `https://via.placeholder.com/32/4B0082/FFFFFF?text=${(opp.baseAsset || 'TRI').charAt(0)}`;
    const opportunityId = `${opp.pair}-${opp.exchange || opp.buyExchange || 'unknown'}-triangular`;

    return `
        <div class="card opportunity-card triangular" data-opportunity-id="${opportunityId}">
          <div class="opportunity-header">
            <div class="crypto-info">
              ${opp.tradingPath ? `${opp.tradingPath}` : ''}
            </div>
          </div>

          <div class="exchange-flow">
            <div class="exchange-step">
              <div class="step-header">
                <i class="fas fa-project-diagram"></i>
                <span>Multi-Step Trade</span>
              </div>
              <div class="exchange-name">${opp.exchange || opp.buyExchange}</div>
              <div class="price">Complex Path</div>
              <div class="fee">Total Fees: ${opp.buyFee}%</div>
            </div>
          </div>

          ${opp.steps ? this.buildTriangularStepsHtml(opp.steps) : ''}

          <div class="investment-return-section">
            <div class="investment-display">
              <div class="investment-info">
                <span class="investment-label">Investment</span>
                <span class="investment-amount">$${capitalAmount}</span>
              </div>
              <div class="profit-info">
                <span class="profit-label">Profit</span>
                <div class="profit-values">
                  <span class="profit-amount">$${opp.netProfitUSDT}</span>
                  <span class="profit-percent">(+${opp.profitPercent}%)</span>
                </div>
              </div>
              <div class="return-info">
                <span class="return-label">Total Return</span>
                <span class="return-amount">$${(parseFloat(capitalAmount) + parseFloat(opp.netProfitUSDT)).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <button class="execute-btn" onclick="opportunitiesModule.executeTrade('${opp.pair}', {
            arbitrageType: 'Triangular',
            exchange: '${opp.exchange || opp.buyExchange}',
            tradingPath: '${opp.tradingPath}',
            steps: ${JSON.stringify(opp.steps || []).replace(/"/g, '&quot;')},
            profitPercent: '${opp.profitPercent}',
            netProfitUSDT: '${opp.netProfitUSDT}'
          })">
            <i class="fas fa-project-diagram"></i>
            Execute Triangular Trade
          </button>
        </div>
      `;
  }

  /**
   * Build HTML for triangular arbitrage steps
   * @param {Array} steps - Trading steps
   * @returns {string} - HTML string
   */
  buildTriangularStepsHtml(steps) {
    if (!steps || steps.length === 0) return '';

    const stepsHtml = steps.map((step, index) => `
            <div class="triangular-step">
                <span class="step-number">${index + 1}</span>
                <span class="step-action">${step.action}</span>
                <span class="step-pair">${step.pair}</span>
                <span class="step-price">$${this.formatPrice(step.price)}</span>
            </div>
        `).join('');

    return `
            <div class="triangular-steps">
                <div class="steps-header">Trading Steps:</div>
                ${stepsHtml}
            </div>
        `;
  }

  /**
   * Update only prices without regenerating DOM - prevents UI flipping
   * @param {Array} opportunities - Array of arbitrage opportunities
   */
  updateOpportunityPrices(opportunities) {
    opportunities.forEach(opp => {
      const opportunityId = `${opp.pair}-${opp.buyExchange || opp.exchange || 'unknown'}-${opp.sellExchange || 'triangular'}`;
      const opportunityElement = document.querySelector(`[data-opportunity-id="${opportunityId}"]`);
      if (opportunityElement) {
        // Update profit percent in investment section
        const profitPercent = opportunityElement.querySelector('.profit-percent');
        if (profitPercent) profitPercent.textContent = `(+${opp.profitPercent}%)`;

        // Update profit amount in investment section
        const profitAmount = opportunityElement.querySelector('.profit-amount');
        if (profitAmount) profitAmount.textContent = `$${opp.netProfitUSDT}`;

        // Update return amount
        const returnAmount = opportunityElement.querySelector('.return-amount');
        if (returnAmount) {
          const capitalAmount = parseFloat(returnAmount.dataset.capital || 100);
          returnAmount.textContent = `$${(capitalAmount + parseFloat(opp.netProfitUSDT)).toFixed(2)}`;
        }

        // Update buy price (only for direct arbitrage)
        if (opp.arbitrageType !== 'Triangular') {
          const buyPrice = opportunityElement.querySelector('.buy-step .price');
          if (buyPrice) buyPrice.textContent = `$${this.formatPrice(opp.rawBuyPrice)}`;

          // Update sell price
          const sellPrice = opportunityElement.querySelector('.sell-step .price');
          if (sellPrice) sellPrice.textContent = `$${this.formatPrice(opp.rawSellPrice)}`;
        }

        // Legacy selectors for backward compatibility
        const profitUsdt = opportunityElement.querySelector('.profit-usdt');
        if (profitUsdt) profitUsdt.textContent = `$${opp.netProfitUSDT}`;

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
    if (!baseAsset) return this.getFallbackImage('BTC');

    // Try multiple image sources for better reliability
    const symbol = baseAsset.toUpperCase();

    // Primary: CoinGecko API (most reliable)
    return `https://assets.coingecko.com/coins/images/1/small/${symbol.toLowerCase()}.png`;
  }

  /**
   * Get fallback image URL
   * @param {string} baseAsset - Base asset symbol
   * @returns {string} - Fallback image URL
   */
  getFallbackImage(baseAsset) {
    if (!baseAsset) baseAsset = 'BTC';

    const symbol = baseAsset.toUpperCase();

    // Try CryptoIcons.org as fallback
    const cryptoIconsUrl = `https://cryptoicons.org/api/color/${symbol.toLowerCase()}/32`;

    // Final fallback: generate a colored circle with the first letter
    const colors = ['#F7931A', '#627EEA', '#F3BA2F', '#26A17B', '#FF6900'];
    const color = colors[symbol.charCodeAt(0) % colors.length];
    const firstLetter = symbol.charAt(0);

    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${color}"/><text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${firstLetter}</text></svg>`;
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

      // Get capital amount for calculation
      const capitalAmount = parseFloat(this.getDefaultCapitalAmount());

      // Prepare trade data with proper USDT profit calculation
      let tradeData;
      if (opportunity.arbitrageType === 'Triangular') {
        tradeData = {
          opportunity: {
            symbol: symbol,
            exchange: opportunity.exchange,
            tradingPath: opportunity.tradingPath,
            steps: opportunity.steps,
            profitPercentage: parseFloat(opportunity.profitPercent),
            capitalAmount: capitalAmount,
            expectedProfitUSDT: parseFloat(opportunity.netProfitUSDT),
            arbitrageType: 'Triangular'
          },
          options: {
            strategy: 'triangular',
            slippageTolerance: 0.005,
            dryRun: true // Set to false for live trading
          }
        };
      } else {
        // Direct arbitrage
        const coinAmount = capitalAmount / parseFloat(opportunity.rawBuyPrice);
        const sellValue = coinAmount * parseFloat(opportunity.rawSellPrice);
        const expectedProfitUSDT = sellValue - capitalAmount;

        tradeData = {
          opportunity: {
            symbol: symbol,
            buyExchange: opportunity.buyExchange,
            sellExchange: opportunity.sellExchange,
            buyPrice: parseFloat(opportunity.rawBuyPrice),
            sellPrice: parseFloat(opportunity.rawSellPrice),
            profitPercentage: parseFloat(opportunity.profitPercent),
            amount: capitalAmount,
            coinAmount: coinAmount,
            expectedProfitUSDT: expectedProfitUSDT,
            arbitrageType: 'Direct'
          },
          options: {
            strategy: 'smart',
            slippageTolerance: 0.005,
            dryRun: true // Set to false for live trading
          }
        };
      }

      console.log('📊 Trade Data:', tradeData);

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

        // Handle different response formats for triangular vs direct arbitrage
        let notificationMessage;
        if (opportunity.arbitrageType === 'Triangular') {
          const initialAmount = result.data.initialAmount || capitalAmount;
          const finalAmount = result.data.finalAmount || (initialAmount + (result.data.actualProfit || 0));
          const actualProfitUSDT = result.data.actualProfit || 0;
          const actualProfitPercent = result.data.actualProfitPercentage || 0;

          notificationMessage = `✅ Triangular Arbitrage Completed!
           Initial: ${initialAmount.toFixed(2)} USDT
           Final: ${finalAmount.toFixed(2)} USDT  
           Profit: ${actualProfitUSDT.toFixed(4)} USDT (${actualProfitPercent.toFixed(3)}%)
           Mode: ${(result.data.tradingMode || 'testnet').toUpperCase()}`;
        } else {
          // Direct arbitrage
          const actualProfitUSDT = result.data.actualProfit || tradeData.opportunity.expectedProfitUSDT;
          const actualProfitPercent = result.data.actualProfitPercentage || tradeData.opportunity.profitPercentage;

          notificationMessage = `✅ Direct Arbitrage Completed! 
           Profit: ${actualProfitUSDT.toFixed(4)} USDT (${actualProfitPercent.toFixed(3)}%)
           Mode: ${(result.data.tradingMode || 'testnet').toUpperCase()}`;
        }

        this.showNotification(notificationMessage, 'success');

      } else {
        throw new Error(result.error || 'Trade execution failed');
      }

    } catch (error) {
      console.error('❌ Trade execution error:', error);
      this.showNotification(`❌ Trade execution failed: ${error.message}`, 'error');
    } finally {
      // Restore button state
      if (executeButton) {
        executeButton.innerHTML = originalText;
        executeButton.disabled = false;
      }
    }
  }


  /**
   * Show notification message
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   * @param {number} duration - Duration in milliseconds
   */
  showNotification(message, type = 'info', duration = 5000) {
    // Use the global notification module if available
    if (window.notificationModule) {
      return window.notificationModule.show(message, type, duration);
    }

    // Fallback to old notification system
    const notification = document.createElement('div');
    notification.className = `trade-notification notification-${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, duration);
  }
}

// Export for use in main app
window.OpportunitiesModule = OpportunitiesModule;
