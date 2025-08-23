/**
 * Market Data Module
 * Handles market price display and updates
 */

class MarketDataModule {
    constructor(exchangeConfig, cryptoConfig) {
        this.exchangeConfig = exchangeConfig;
        this.cryptoConfig = cryptoConfig;
        this.previousPrices = {};
        this.lastMarketIds = null;
    }

    /**
     * Update market prices display
     * @param {Object} prices - Prices from all exchanges
     */
    updateMarketPrices(prices) {
        const currentMarketIds = this.cryptoConfig.map(crypto => crypto.symbol);

        // Only rebuild if crypto config has changed or this is the first load
        if (!this.lastMarketIds ||
            JSON.stringify(this.lastMarketIds) !== JSON.stringify(currentMarketIds)) {

            this.lastMarketIds = currentMarketIds;
            this.buildMarketCards(prices);
        } else {
            // Just update prices without rebuilding DOM
            this.updateMarketPriceValues(prices);
        }

        // Store current prices for next comparison
        this.previousPrices = JSON.parse(JSON.stringify(prices));
    }

    /**
     * Build market cards structure (only when needed)
     * @param {Object} prices - Prices from all exchanges
     */
    buildMarketCards(prices) {
        let marketHtml = '';

        this.cryptoConfig.forEach(crypto => {
            const { symbol, name, icon, image } = crypto;

            // Only show enabled exchanges for cleaner display
            const enabledExchanges = Object.keys(this.exchangeConfig).filter(exchange =>
                this.exchangeConfig[exchange].enabled
            );

            // Get prices from enabled exchanges only
            const exchangePricesHtml = enabledExchanges.map(exchange => {
                const exchangeData = this.exchangeConfig[exchange];
                const price = prices[exchange] && prices[exchange][symbol];
                const previousPrice = this.previousPrices[exchange] && this.previousPrices[exchange][symbol];

                let priceDisplay, trendClass = '', trendIcon = '';

                if (price) {
                    priceDisplay = `$${price.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6
                    })}`;

                    // Calculate trend
                    if (previousPrice) {
                        if (price > previousPrice) {
                            trendClass = 'trend-up';
                            trendIcon = '<i class="fas fa-arrow-up"></i>';
                        } else if (price < previousPrice) {
                            trendClass = 'trend-down';
                            trendIcon = '<i class="fas fa-arrow-down"></i>';
                        } else {
                            trendClass = 'trend-neutral';
                            trendIcon = '<i class="fas fa-minus"></i>';
                        }
                    }
                } else {
                    priceDisplay = '<span class="exchange-unavailable">Unavailable</span>';
                }

                return `
          <div class="exchange-price-row" data-exchange="${exchange}" data-symbol="${symbol}">
            <span class="exchange-name-label" style="color: ${exchangeData.color};">
              ${exchangeData.name}
            </span>
            <div style="display: flex; align-items: center; gap: 2px;">
              <span class="exchange-price-value">${priceDisplay}</span>
              <span class="trend-indicator ${trendClass}">${trendIcon}</span>
            </div>
          </div>
        `;
            }).join('');

            // Find highest and lowest prices for spread analysis
            const validPrices = Object.values(prices)
                .map(exchangePrices => exchangePrices[symbol])
                .filter(Boolean);
            const highestPrice = validPrices.length ? Math.max(...validPrices) : 0;
            const lowestPrice = validPrices.length ? Math.min(...validPrices) : 0;
            const spread = highestPrice - lowestPrice;
            const spreadPercent = lowestPrice ? ((spread / lowestPrice) * 100).toFixed(3) : 0;

            const coinImage = image || `https://cryptoicons.org/api/white/${symbol.replace('USDT', '').toLowerCase()}/32`;

            marketHtml += `
        <div class="market-coin-card" data-market-symbol="${symbol}">
          <div class="coin-header">
            <img src="${coinImage}" 
                 alt="${name}" 
                 class="coin-icon-img"
                 style="width: 25px; height: 25px; border-radius: 50%; margin-right: 2px;"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/32/FFD700/000000?text=${symbol.replace('USDT', '').charAt(0)}';">
            <div>
              <div class="coin-name">${name}</div>
              <div class="coin-symbol">${symbol}</div>
            </div>
          </div>
          
          <div class="exchange-prices-list">
            ${exchangePricesHtml}
          </div>
          
          <div class="price-trend" data-spread-info="${symbol}">
            ${validPrices.length >= 2 ? `
              <span class="trend-icon"><i class="fas fa-chart-line"></i></span>
              <span class="spread-text" style="font-size: 0.9em;">
                Spread: $${spread.toFixed(4)} (${spreadPercent}%)
              </span>
            ` : ''}
          </div>
        </div>
      `;
        });

        const marketElement = document.getElementById('marketPrices');
        if (marketElement) {
            marketElement.innerHTML = marketHtml;
        }
    }

    /**
     * Update only price values without rebuilding DOM - prevents flipping
     * @param {Object} prices - Prices from all exchanges
     */
    updateMarketPriceValues(prices) {
        this.cryptoConfig.forEach(crypto => {
            const { symbol } = crypto;

            // Only show enabled exchanges
            const enabledExchanges = Object.keys(this.exchangeConfig).filter(exchange =>
                this.exchangeConfig[exchange].enabled
            );

            enabledExchanges.forEach(exchange => {
                const exchangeRow = document.querySelector(`[data-exchange="${exchange}"][data-symbol="${symbol}"]`);
                if (exchangeRow) {
                    const price = prices[exchange] && prices[exchange][symbol];
                    const previousPrice = this.previousPrices[exchange] && this.previousPrices[exchange][symbol];

                    const priceValueElement = exchangeRow.querySelector('.exchange-price-value');
                    const trendElement = exchangeRow.querySelector('.trend-indicator');

                    if (price && priceValueElement) {
                        // Update price display
                        const priceDisplay = `$${price.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6
                        })}`;
                        priceValueElement.textContent = priceDisplay;

                        // Update trend indicator
                        if (trendElement && previousPrice) {
                            let trendClass = '', trendIcon = '';
                            if (price > previousPrice) {
                                trendClass = 'trend-up';
                                trendIcon = '<i class="fas fa-arrow-up"></i>';
                            } else if (price < previousPrice) {
                                trendClass = 'trend-down';
                                trendIcon = '<i class="fas fa-arrow-down"></i>';
                            } else {
                                trendClass = 'trend-neutral';
                                trendIcon = '<i class="fas fa-minus"></i>';
                            }

                            trendElement.className = `trend-indicator ${trendClass}`;
                            trendElement.innerHTML = trendIcon;
                        }
                    }
                }
            });

            // Update spread information
            const spreadElement = document.querySelector(`[data-spread-info="${symbol}"] .spread-text`);
            if (spreadElement) {
                const validPrices = Object.values(prices)
                    .map(exchangePrices => exchangePrices[symbol])
                    .filter(Boolean);

                if (validPrices.length >= 2) {
                    const highestPrice = Math.max(...validPrices);
                    const lowestPrice = Math.min(...validPrices);
                    const spread = highestPrice - lowestPrice;
                    const spreadPercent = lowestPrice ? ((spread / lowestPrice) * 100).toFixed(3) : 0;

                    spreadElement.textContent = `Spread: $${spread.toFixed(4)} (${spreadPercent}%)`;
                }
            }
        });
    }

    /**
     * Update configuration
     * @param {Object} exchangeConfig - Exchange configuration
     * @param {Array} cryptoConfig - Crypto configuration
     */
    updateConfig(exchangeConfig, cryptoConfig) {
        this.exchangeConfig = exchangeConfig;
        this.cryptoConfig = cryptoConfig;
    }
}

// Export for use in main app
window.MarketDataModule = MarketDataModule;
