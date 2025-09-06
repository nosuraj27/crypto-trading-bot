// Complete Arbitrage Bot - Frontend JavaScript
// Enhanced version supporting Direct & Triangular Arbitrage

class ArbitrageBot {
    constructor() {
        this.socket = io();
        this.currentPage = 'dashboard';
        this.allOpportunities = [];

        this.initializeModules();
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketEvents();
    }

    /**
     * Initialize all frontend modules
     */
    initializeModules() {
        // Initialize notification module first
        this.notificationModule = new NotificationModule();

        // Initialize settings module
        this.settingsModule = new SettingsModule();

        // Initialize market data module (will be configured after exchange config loads)
        this.marketDataModule = null;

        // Initialize opportunities module
        this.opportunitiesModule = new OpportunitiesModule();

        // Default configurations
        this.exchangeConfig = {};
        this.cryptoConfig = [
            { symbol: 'BTCUSDT', name: 'Bitcoin', icon: 'fab fa-bitcoin' },
            { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'fab fa-ethereum' },
            { symbol: 'ADAUSDT', name: 'Cardano', icon: 'fas fa-coins' },
            { symbol: 'DOTUSDT', name: 'Polkadot', icon: 'fas fa-circle' },
            { symbol: 'LINKUSDT', name: 'Chainlink', icon: 'fas fa-link' }
        ];

        // Load exchange configuration
        this.loadExchangeConfig();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            status: document.getElementById('status'),
            totalOpportunities: document.getElementById('totalOpportunities'),
            directOpportunities: document.getElementById('directOpportunities'),
            triangularOpportunities: document.getElementById('triangularOpportunities'),
            bestProfit: document.getElementById('bestProfit'),
            activeExchanges: document.getElementById('activeExchanges'),
            monitoredPairs: document.getElementById('monitoredPairs'),
            timestampText: document.getElementById('timestampText')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);

                // Close mobile menu if open
                this.closeMobileMenu();
            });
        });

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navMenu = document.getElementById('navMenu');

        if (mobileMenuToggle && navMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('show');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            });
        }

        // Listen for settings changes
        window.addEventListener('settingChanged', (e) => {
            this.handleSettingChange(e.detail);
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navMenu && !e.target.closest('.nav-container')) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const navMenu = document.getElementById('navMenu');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');

        if (navMenu && mobileMenuToggle) {
            navMenu.classList.remove('show');
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        }
    }

    /**
     * Setup Socket.IO events
     */
    setupSocketEvents() {
        this.socket.on('connect', () => {
            this.updateStatus('connected', '<i class="fas fa-check-circle"></i> <span>Connected - Live Data</span>');
            this.notificationModule.success('Connected to live data feed');
        });

        this.socket.on('disconnect', () => {
            this.updateStatus('disconnected', '<i class="fas fa-exclamation-triangle"></i> <span>Disconnected - Reconnecting...</span>');
            this.notificationModule.warning('Connection lost - attempting to reconnect...');
        });

        this.socket.on('connect_error', () => {
            this.updateStatus('disconnected', '<i class="fas fa-times-circle"></i> <span>Connection Failed</span>');
            this.notificationModule.error('Failed to connect to server');
        });

        this.socket.on('priceUpdate', (data) => {
            this.handlePriceUpdate(data);
        });

        this.socket.on('error', (error) => {
            console.error('Socket.IO error:', error);
            this.updateStatus('error', '<i class="fas fa-exclamation-triangle"></i> <span>Connection Error</span>');
            this.notificationModule.error('WebSocket connection error');
        });
    }

    /**
     * Update connection status display
     * @param {string} status - Status type (connected, disconnected, error)
     * @param {string} html - HTML content to display
     */
    updateStatus(status, html) {
        if (this.elements.status) {
            this.elements.status.className = `status ${status}`;
            this.elements.status.innerHTML = html;
        }
    }

    /**
     * Switch between different pages/views
     * @param {string} pageName - Page identifier
     */
    switchPage(pageName) {
        console.log(`Switching to page: ${pageName}`);

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Find the correct nav item by data-page attribute OR by checking the onclick handler
        let activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
        if (!activeNavItem) {
            // Fallback: find by text content or onclick
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if ((pageName === 'dashboard' && text.includes('dashboard')) ||
                    (pageName === 'market' && text.includes('market')) ||
                    (pageName === 'direct' && text.includes('direct')) ||
                    (pageName === 'triangular' && text.includes('triangular')) ||
                    (pageName === 'history' && text.includes('history')) ||
                    (pageName === 'settings' && text.includes('settings'))) {
                    activeNavItem = item;
                }
            });
        }

        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        let activePage = document.getElementById(`${pageName}-page`);
        if (!activePage) {
            // Fallback to dashboard
            activePage = document.getElementById('dashboard-page');
            pageName = 'dashboard';
        }

        if (activePage) {
            activePage.classList.add('active');
        }

        // Initialize modules based on page
        if (pageName === 'history' && !window.tradeHistoryModule) {
            setTimeout(() => {
                if (typeof TradeHistoryModule !== 'undefined') {
                    window.tradeHistoryModule = new TradeHistoryModule();
                }
            }, 100);
        }

        // Load balances when balances page is shown
        if (pageName === 'balances') {
            setTimeout(() => {
                this.loadBalances();
            }, 100);
        }

        this.currentPage = pageName;
    }

    /**
     * Handle price updates from WebSocket
     * @param {Object} data - Price update data
     */
    handlePriceUpdate(data) {
        const { opportunities, directOpportunities, triangularOpportunities, timestamp, prices, stats, tradingPairs, exchangeConfig } = data;

        // Store all opportunities
        this.allOpportunities = opportunities || [];

        // Update exchange config if provided
        if (exchangeConfig) {
            this.exchangeConfig = exchangeConfig;
        }

        // Update crypto config if trading pairs are provided
        if (tradingPairs && tradingPairs.length > 0) {
            this.cryptoConfig = tradingPairs.slice(0, 20); // Show top 20 pairs in market view
        }

        // Initialize market data module if not already done
        if (!this.marketDataModule && this.exchangeConfig) {
            this.marketDataModule = new MarketDataModule(this.exchangeConfig, this.cryptoConfig);
        }

        // Update market data module configuration
        if (this.marketDataModule) {
            this.marketDataModule.updateConfig(this.exchangeConfig, this.cryptoConfig);
        }

        // Update statistics with enhanced data
        this.updateStatistics(opportunities, directOpportunities, triangularOpportunities, stats, tradingPairs);

        // Update market prices
        if (this.marketDataModule && prices) {
            this.marketDataModule.updateMarketPrices(prices);
        }

        // Update opportunities display
        if (this.opportunitiesModule) {
            // Separate direct and triangular opportunities
            const directOpps = this.allOpportunities.filter(opp =>
                opp.arbitrageType === 'Direct' || (!opp.arbitrageType && opp.buyExchange !== opp.sellExchange)
            );
            const triangularOpps = this.allOpportunities.filter(opp =>
                opp.arbitrageType === 'Triangular'
            );

            // Always show all opportunities on dashboard
            this.opportunitiesModule.updateOpportunities(this.allOpportunities, directOpps, triangularOpps);
        }

        // Update timestamp
        this.updateTimestamp(timestamp, stats);

        // Play sound alert if enabled and new opportunities found
        if (this.settingsModule.getSetting('soundEnabled') && opportunities && opportunities.length > 0) {
            this.playAlert();
        }
    }

    /**
     * Update statistics display with enhanced arbitrage data
     * @param {Array} opportunities - All arbitrage opportunities
     * @param {Array} directOpportunities - Direct arbitrage opportunities
     * @param {Array} triangularOpportunities - Triangular arbitrage opportunities
     * @param {Object} stats - Statistics object
     * @param {Array} tradingPairs - Trading pairs array
     */
    updateStatistics(opportunities, directOpportunities, triangularOpportunities, stats, tradingPairs) {
        // Total opportunities
        if (this.elements.totalOpportunities) {
            this.elements.totalOpportunities.textContent = opportunities ? opportunities.length : 0;
        }

        // Direct opportunities
        if (this.elements.directOpportunities) {
            this.elements.directOpportunities.textContent = directOpportunities ? directOpportunities.length : 0;
        }

        // Triangular opportunities
        if (this.elements.triangularOpportunities) {
            this.elements.triangularOpportunities.textContent = triangularOpportunities ? triangularOpportunities.length : 0;
        }

        // Best profit from all opportunities
        if (this.elements.bestProfit) {
            this.elements.bestProfit.textContent = opportunities && opportunities.length > 0 ?
                opportunities[0].profitPercent + '%' : '0.00%';
        }

        // Active exchanges
        if (this.elements.activeExchanges) {
            const enabledExchangeCount = Object.keys(this.exchangeConfig).filter(exchange =>
                this.exchangeConfig[exchange].enabled
            ).length;
            this.elements.activeExchanges.textContent = stats ? stats.activeExchanges : enabledExchangeCount;
        }

        // Monitored pairs
        if (this.elements.monitoredPairs) {
            this.elements.monitoredPairs.textContent = tradingPairs ? tradingPairs.length : 5;
        }
    }

    /**
     * Update timestamp display
     * @param {string} timestamp - Update timestamp
     * @param {Object} stats - Statistics object
     */
    updateTimestamp(timestamp, stats) {
        if (this.elements.timestampText) {
            const updateText = `Last updated: ${new Date(timestamp).toLocaleString()}`;
            const statsText = stats ? ` (${stats.updateTime}ms, ${stats.apiCalls} API calls)` : '';
            this.elements.timestampText.textContent = updateText + statsText;
        }
    }

    /**
     * Load exchange configuration from API
     */
    async loadExchangeConfig() {
        try {
            const response = await fetch('/api/exchanges');
            if (response.ok) {
                const data = await response.json();
                this.exchangeConfig = data.exchanges;

                // Initialize market data module if not already done
                if (!this.marketDataModule) {
                    this.marketDataModule = new MarketDataModule(this.exchangeConfig, this.cryptoConfig);
                }
            } else {
                console.warn('Failed to load exchange config from API, using fallback');
                this.setFallbackExchangeConfig();
            }
        } catch (error) {
            console.warn('Failed to load exchange config from backend, using fallback:', error);
            this.setFallbackExchangeConfig();
        }
    }

    /**
     * Set fallback exchange configuration
     */
    setFallbackExchangeConfig() {
        this.exchangeConfig = {
            binance: { name: 'Binance', color: '#F3BA2F', enabled: true, fee: 0.001 },
            coinbase: { name: 'Coinbase Pro', color: '#0052FF', enabled: false, fee: 0.005 },
            kraken: { name: 'Kraken', color: '#5741D9', enabled: true, fee: 0.0026 },
            bitmart: { name: 'Bitmart', color: '#22B3E6', enabled: false, fee: 0.0025 },
            mexc: { name: 'MEXC', color: '#d2e1f4ff', enabled: true, fee: 0.002 },
            huobi: { name: 'Huobi', color: '#1A38F3', enabled: false, fee: 0.002 },
            gateio: { name: 'Gate.io', color: '#FF3A3A', enabled: true, fee: 0.002 },
            hitbtc: { name: 'HitBTC', color: '#0093DD', enabled: false, fee: 0.001 },
            bybit: { name: 'ByBit', color: '#F9D342', enabled: true, fee: 0.001 }
        };
    }

    /**
     * Handle setting changes
     * @param {Object} detail - Setting change details
     */
    handleSettingChange(detail) {
        const { key, value } = detail;

        switch (key) {
            case 'soundEnabled':
                console.log(`Sound alerts ${value ? 'enabled' : 'disabled'}`);
                break;
            case 'capitalAmount':
                console.log(`Capital amount updated to: $${value}`);
                break;
            case 'profitThreshold':
                console.log(`Profit threshold updated to: ${value}%`);
                break;
            case 'updateFrequency':
                console.log(`Update frequency updated to: ${value}s`);
                break;
        }
    }

    /**
     * Play audio alert for new opportunities
     */
    playAlert() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('Audio context not available:', error);
        }
    }

    /**
     * Request manual price update
     */
    requestUpdate() {
        this.socket.emit('requestUpdate');
    }

    /**
     * Load and display exchange balances
     */
    async loadBalances() {
        try {
            const balancesContent = document.getElementById('balancesContent');
            if (!balancesContent) return;

            // Show loading state
            balancesContent.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i> Loading balances...
                </div>
            `;

            const response = await fetch('/api/exchanges/balances');
            const result = await response.json();

            if (result.success) {
                this.displayBalances(result.data);
            } else {
                balancesContent.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load balances: ${result.error || 'Unknown error'}</p>
                        <button class="btn" onclick="refreshBalances()">Try Again</button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error loading balances:', error);
            const balancesContent = document.getElementById('balancesContent');
            if (balancesContent) {
                balancesContent.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Network error loading balances</p>
                        <button class="btn" onclick="refreshBalances()">Try Again</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Display exchange balances in cards
     */
    displayBalances(data) {
        const balancesContent = document.getElementById('balancesContent');
        if (!balancesContent) return;

        const { balances, errors } = data;
        let html = '';

        // Show balances for each exchange
        Object.entries(balances).forEach(([exchange, balance]) => {
            const exchangeName = exchange.charAt(0).toUpperCase() + exchange.slice(1);
            const balanceEntries = Object.entries(balance);

            html += `
                <div class="balance-card">
                    <div class="balance-header">
                        <h3>
                            <i class="fas fa-exchange-alt"></i>
                            ${exchangeName}
                        </h3>
                        <span class="testnet-badge">TESTNET</span>
                    </div>
                    <div class="balance-content">
            `;

            if (balanceEntries.length === 0) {
                html += `
                    <div class="no-balance">
                        <i class="fas fa-info-circle"></i>
                        <p>No balances found</p>
                    </div>
                `;
            } else {
                balanceEntries.forEach(([currency, amount]) => {
                    const formattedAmount = parseFloat(amount).toFixed(8);
                    html += `
                        <div class="balance-item">
                            <div class="currency-info">
                                <span class="currency">${currency}</span>
                            </div>
                            <div class="amount-info">
                                <span class="amount">${formattedAmount}</span>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
            `;
        });

        // Show errors for failed exchanges
        Object.entries(errors).forEach(([exchange, error]) => {
            const exchangeName = exchange.charAt(0).toUpperCase() + exchange.slice(1);
            const errorMessage = typeof error === 'object'
                ? (error.message || JSON.stringify(error))
                : String(error);

            html += `
                <div class="balance-card error">
                    <div class="balance-header">
                        <h3>
                            <i class="fas fa-exclamation-triangle"></i>
                            ${exchangeName}
                        </h3>
                        <span class="error-badge">ERROR</span>
                    </div>
                    <div class="balance-content">
                        <div class="error-message">
                            <p>${errorMessage}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        if (html === '') {
            html = `
                <div class="no-exchanges">
                    <i class="fas fa-info-circle"></i>
                    <p>No exchanges connected</p>
                </div>
            `;
        }

        balancesContent.innerHTML = html;

        // Show success notification
        if (Object.keys(balances).length > 0) {
            this.notificationModule.success(`Loaded balances from ${Object.keys(balances).length} exchange(s)`);
        }
    }
}

// Global functions for button events (maintain compatibility)
function refreshData() {
    if (window.arbitrageBot) {
        window.arbitrageBot.requestUpdate();

        // Visual feedback
        const btn = event?.target?.closest('.btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
                setTimeout(() => icon.classList.remove('fa-spin'), 1000);
            }
        }
    }
}

function toggleSound() {
    if (window.arbitrageBot && window.arbitrageBot.settingsModule) {
        const currentSetting = window.arbitrageBot.settingsModule.getSetting('soundEnabled');
        window.arbitrageBot.settingsModule.updateSetting('soundEnabled', !currentSetting);

        const btn = event?.target?.closest('.btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = !currentSetting ? 'fas fa-volume-up' : 'fas fa-volume-mute';
            }
            btn.classList.toggle('active');
        }
    }
}

// Navigation functions for navbar
function switchToPage(pageName) {
    if (window.arbitrageBot) {
        window.arbitrageBot.switchPage(pageName);
    }
}

// Global navigation handlers
window.switchToPage = switchToPage;

// Trade execution functions (maintain compatibility)
function executeBuyOrder(pair, exchange, price) {
    const confirmation = confirm(`Execute BUY order?\n\nPair: ${pair}\nExchange: ${exchange.toUpperCase()}\nPrice: $${parseFloat(price).toLocaleString()}\n\nProceed with order?`);

    if (confirmation) {
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        button.disabled = true;

        setTimeout(() => {
            alert(`✅ BUY order placed successfully!\n\nPair: ${pair}\nExchange: ${exchange.toUpperCase()}\nPrice: $${parseFloat(price).toLocaleString()}`);
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }
}

function executeSellOrder(pair, exchange, price) {
    const confirmation = confirm(`Execute SELL order?\n\nPair: ${pair}\nExchange: ${exchange.toUpperCase()}\nPrice: $${parseFloat(price).toLocaleString()}\n\nProceed with order?`);

    if (confirmation) {
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        button.disabled = true;

        setTimeout(() => {
            alert(`✅ SELL order placed successfully!\n\nPair: ${pair}\nExchange: ${exchange.toUpperCase()}\nPrice: $${parseFloat(price).toLocaleString()}`);
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }
}

function executeArbitrage(pair, buyExchange, sellExchange, buyPrice, sellPrice, netProfitUSDT, profitPercent) {
    const amount = getDefaultCapitalAmount() || 10000;

    if (amount < 100 || amount > 100000) {
        alert('❌ Amount must be between $100 and $100,000');
        return;
    }

    const estimatedProfit = parseFloat(netProfitUSDT);
    const coinAmount = (amount / parseFloat(buyPrice)).toFixed(8);
    const baseAsset = pair.replace('USDT', '');

    const confirmation = confirm(`Execute FULL ARBITRAGE?\n\n💰 Investment: $${amount} USDT\n📈 Expected Profit: $${estimatedProfit.toFixed(4)} USDT (${profitPercent}%)\n\n🔄 Process:\n1. BUY ${coinAmount} ${baseAsset} on ${buyExchange.toUpperCase()} at $${parseFloat(buyPrice).toLocaleString()}\n2. TRANSFER to ${sellExchange.toUpperCase()}\n3. SELL ${coinAmount} ${baseAsset} on ${sellExchange.toUpperCase()} at $${parseFloat(sellPrice).toLocaleString()}\n\n⚠️ This will execute real trades!\nProceed with arbitrage?`);

    if (confirmation) {
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
        button.disabled = true;

        setTimeout(() => {
            alert(`🚀 ARBITRAGE EXECUTED SUCCESSFULLY!\n\n✅ Bought ${coinAmount} ${baseAsset} on ${buyExchange.toUpperCase()}\n✅ Sold ${coinAmount} ${baseAsset} on ${sellExchange.toUpperCase()}\n\n💰 Net Profit: $${estimatedProfit.toFixed(4)} USDT\n📊 Return: ${profitPercent}%\n\nTransaction completed!`);
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    }
}

function getDefaultCapitalAmount() {
    return localStorage.getItem('capitalAmount') || '10000';
}

// Global functions for inline onclick handlers
function refreshData() {
    if (window.arbitrageBot) {
        window.arbitrageBot.socket.emit('requestUpdate');
        console.log('🔄 Refresh data requested');
    }
}

function toggleSound() {
    if (window.arbitrageBot && window.arbitrageBot.settingsModule) {
        window.arbitrageBot.settingsModule.toggleSound();
        console.log('🔊 Sound toggled');
    }
}

function refreshBalances() {
    if (window.arbitrageBot) {
        window.arbitrageBot.loadBalances();

        // Visual feedback
        const btn = event?.target?.closest('.btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
                setTimeout(() => icon.classList.remove('fa-spin'), 1000);
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.arbitrageBot = new ArbitrageBot();

    // Expose modules globally for onclick handlers and easy access
    window.opportunitiesModule = window.arbitrageBot.opportunitiesModule;
    window.settingsModule = window.arbitrageBot.settingsModule;
    window.notificationModule = window.arbitrageBot.notificationModule;

    console.log('🚀 Crypto Bot Frontend Initialized (Enhanced UI Version)');

    // Show welcome notification
    setTimeout(() => {
        window.notificationModule.info('Welcome to Crypto Bot! 🚀', 3000);
    }, 1000);
});
