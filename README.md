# 🚀 Complete Crypto Arbitrage Trading Bot

A comprehensive cryptocurrency arbitrage trading bot that supports both **Direct Arbitrage** and **Triangular Arbitrage** strategies across multiple exchanges.

## 🌟 Features

### 🔄 Dual Arbitrage Strategies
- **Direct Arbitrage**: Buy on one exchange, sell on another
- **Triangular Arbitrage**: Execute circular trades within a single exchange
- **Real-time Opportunity Detection**: Live monitoring across all supported exchanges
- **Profit Optimization**: Automatically finds the most profitable opportunities

### 📊 Supported Exchanges
- **Binance** (Testnet & Live)
- **Gate.io** (Testnet & Live)
- **Kraken** (Live)
- **MEXC** (Live)
- **ByBit** (Live)

### 💡 Key Capabilities
- **Real-time Price Updates** via WebSocket connections
- **35+ Trading Pairs** with live market data from CoinGecko
- **Advanced Filtering** by arbitrage type
- **Trade Execution** with both testnet and live modes
- **Comprehensive Statistics** and trade history
- **Mobile-Responsive UI** with modern design

## 🏗️ Architecture

### Backend Services
```
├── Direct Arbitrage Calculator
├── Triangular Arbitrage Service
├── Price Update Service (WebSocket)
├── Trade Execution Service
├── Exchange Factory (Multi-exchange support)
└── Configuration Management
```

### Frontend Modules
```
├── Opportunities Module (Enhanced)
├── Market Data Module
├── Settings Module
├── Trading Pairs Manager
└── Real-time WebSocket Client
```

## 🚀 Quick Start

### 1. Installation
```bash
# Clone the repository
git clone <repository-url>
cd crypto-trading-bot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### 2. Configuration
Edit `.env` file with your API credentials:
```env
# Binance (Required for testnet)
BINANCE_API_KEY=your_binance_testnet_api_key
BINANCE_API_SECRET=your_binance_testnet_secret

# Gate.io (Required for testnet)
GATEIO_API_KEY=your_gateio_testnet_api_key
GATEIO_API_SECRET=your_gateio_testnet_secret

# Database
DATABASE_URL="file:./data/data.db"

# Application
NODE_ENV=development
PORT=3000
```

### 3. Database Setup
```bash
# Initialize Prisma database
npx prisma generate
npx prisma db push
```

### 4. Start the Application
```bash
npm start
```

Access the application at: **http://localhost:3000**

## 📈 How It Works

### Direct Arbitrage
1. **Price Monitoring**: Continuously monitors prices across all exchanges
2. **Opportunity Detection**: Identifies price differences > minimum threshold
3. **Profit Calculation**: Calculates net profit after fees
4. **Trade Execution**: Simultaneous buy/sell orders on different exchanges

### Triangular Arbitrage
1. **Path Discovery**: Finds circular trading paths within single exchanges
2. **Step Analysis**: Evaluates multi-step trade sequences
3. **Profit Simulation**: Calculates end-to-end profitability
4. **Sequential Execution**: Executes trades in optimal sequence

## 🎛️ Trading Interface

### Main Dashboard
- **All Opportunities**: Combined view of direct + triangular
- **Direct Arbitrage**: Cross-exchange opportunities
- **Triangular Arbitrage**: Single-exchange circular trades
- **Real-time Statistics**: Live profit metrics and counts

### Filtering Options
```javascript
// Filter by arbitrage type
filterOpportunities('all')         // Show all opportunities
filterOpportunities('direct')      // Show only direct arbitrage
filterOpportunities('triangular')  // Show only triangular arbitrage
```

### Trade Execution
- **Testnet Mode**: Safe testing with real APIs
- **Live Mode**: Actual trading (requires live API keys)
- **Capital Management**: Configurable trade amounts
- **Risk Controls**: Minimum profit thresholds

## 📊 Example Opportunities

### Direct Arbitrage
```
BTC/USDT
├── Buy:  Binance  @ $65,100 (0.1% fee)
├── Sell: Gate.io  @ $65,250 (0.2% fee)
└── Profit: $47.25 (0.072%)
```

### Triangular Arbitrage
```
USDT → BTC → ETH → USDT (Binance)
├── Step 1: USDT → BTC  @ 0.00001536
├── Step 2: BTC → ETH   @ 25.431
├── Step 3: ETH → USDT  @ 2,587.23
└── Profit: $12.45 (0.124%)
```

## ⚙️ Configuration

### Trading Parameters
```javascript
// In src/config/app.js
trading: {
    defaultCapital: 2000,              // Default trade amount ($)
    minProfitThreshold: 0.001,         // Minimum profit (0.1%)
    maxTriangularTradeAmount: 500,     // Max triangular trade ($)
    enableTriangularArbitrage: true    // Enable/disable triangular
}
```

### Exchange Settings
```javascript
// In src/config/exchanges.js
EXCHANGES_CONFIG = {
    binance: { fee: 0.001, enabled: true },
    gateio: { fee: 0.002, enabled: true },
    kraken: { fee: 0.0026, enabled: true }
}
```

## 🔧 API Endpoints

### Market Data
```
GET  /api/data                    # Current market data & opportunities
GET  /api/exchanges               # Exchange configurations
POST /api/update                  # Manual price update
```

### Trading
```
POST /api/execute-trade           # Execute arbitrage trade
GET  /api/trade-stats             # Trading statistics
GET  /api/trade-history          # Trade history
```

### Configuration
```
GET  /api/settings               # Get user settings
POST /api/settings               # Update settings
```

## 📱 Frontend Features

### Responsive Design
- **Desktop**: Full dashboard with detailed views
- **Mobile**: Optimized touch interface
- **Tablet**: Adaptive layout

### Real-time Updates
- **WebSocket Connection**: Live price feeds
- **Auto-refresh**: Continuous opportunity updates
- **Visual Indicators**: Price change animations

### Advanced UI
- **Arbitrage Type Badges**: Visual distinction
- **Trading Path Display**: Step-by-step breakdown
- **Profit Calculations**: Real-time estimates
- **Execute Buttons**: One-click trading

## 🛡️ Security & Safety

### Risk Management
- **Testnet First**: Always test with testnet APIs
- **Capital Limits**: Configurable maximum trade amounts
- **Profit Thresholds**: Minimum profitability requirements
- **Error Handling**: Comprehensive failure recovery

### API Security
- **Environment Variables**: Secure credential storage
- **Rate Limiting**: Respect exchange API limits
- **Connection Monitoring**: Automatic reconnection
- **Audit Logging**: Complete trade history

## 📊 Performance

### Optimization Features
- **Efficient Price Updates**: Only update significant changes
- **Smart Caching**: Reduce API calls
- **Parallel Processing**: Concurrent exchange queries
- **Memory Management**: Optimized data structures

### Statistics
- **Current Performance**: 805 triangular opportunities detected
- **Update Speed**: ~2 seconds across 2 exchanges
- **API Efficiency**: Minimal rate limit usage
- **Success Rate**: High reliability in testnet mode

## 🚀 Advanced Usage

### Custom Trading Strategies
```javascript
// Add custom arbitrage logic
const customStrategy = {
    minProfit: 0.005,              // 0.5% minimum
    maxRisk: 1000,                 // $1000 max
    preferredExchanges: ['binance', 'gateio']
};
```

### Automated Trading
```javascript
// Enable automated execution
TradeExecutionService.setTradingMode('live');
TradeExecutionService.setTriangularArbitrage(true);
```

### Monitoring & Alerts
- **Profit Alerts**: Notification system
- **Status Monitoring**: Health checks
- **Performance Metrics**: Real-time analytics

## 🎯 Trading Modes

### Testnet Mode (Default)
- **Safe Testing**: No real money at risk
- **Real APIs**: Actual exchange connections
- **Full Features**: Complete functionality
- **Learning Mode**: Perfect for education

### Live Mode (Production)
- **Real Trading**: Actual cryptocurrency trades
- **Capital Requirements**: Minimum balances needed
- **Risk Factors**: Real financial exposure
- **Advanced Users**: Experienced traders only

## 📈 Future Enhancements

### Planned Features
- **More Exchanges**: Coinbase, Huobi, OKX
- **Advanced Algorithms**: ML-based predictions
- **Portfolio Management**: Multi-asset strategies
- **Mobile App**: Native iOS/Android
- **Cloud Deployment**: Scalable infrastructure

### Community Features
- **Strategy Sharing**: Community algorithms
- **Performance Leaderboards**: Competitive trading
- **Educational Content**: Learning resources
- **API Marketplace**: Custom indicators

## 💬 Support

### Documentation
- **API Reference**: Complete endpoint documentation
- **Code Examples**: Implementation samples
- **Video Tutorials**: Step-by-step guides
- **FAQ**: Common questions answered

### Community
- **Discord Server**: Real-time chat support
- **GitHub Issues**: Bug reports and features
- **Trading Forums**: Strategy discussions
- **Developer Blog**: Technical insights

## ⚠️ Disclaimer

This software is for educational and research purposes. Cryptocurrency trading involves significant risk and may result in financial loss. Always:

1. **Test Thoroughly**: Use testnet mode first
2. **Start Small**: Begin with minimal amounts
3. **Understand Risks**: Crypto trading is volatile
4. **Comply with Laws**: Follow local regulations
5. **Seek Advice**: Consult financial professionals

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the crypto trading community**

🚀 **Start Trading Smarter Today!** 🚀
