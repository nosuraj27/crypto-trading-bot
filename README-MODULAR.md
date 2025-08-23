# Simple Arbitrage Bot - Modular Architecture

This is a refactored version of the Simple Arbitrage Bot with a clean, modular architecture that makes it easy to add new features and maintain the codebase.

## 📁 New File Structure

```
simple-arbitrage/
├── src/                          # Backend source code
│   ├── config/                   # Configuration files
│   │   ├── app.js               # Application settings
│   │   └── exchanges.js         # Exchange configurations
│   ├── exchanges/               # Exchange implementations
│   │   ├── BaseExchange.js      # Abstract base class
│   │   ├── BinanceExchange.js   # Binance implementation
│   │   ├── KrakenExchange.js    # Kraken implementation
│   │   └── ExchangeFactory.js   # Exchange factory
│   ├── services/                # Business logic services
│   │   ├── TradingPairsService.js
│   │   └── PriceUpdateService.js
│   ├── websocket/               # WebSocket management
│   │   └── WebSocketService.js
│   ├── utils/                   # Utility functions
│   │   ├── http.js              # HTTP utilities
│   │   └── arbitrage.js         # Arbitrage calculations
│   └── routes/                  # API routes
│       └── api.js               # REST API endpoints
├── public/                      # Frontend files
│   ├── js/
│   │   ├── modules/             # Frontend modules
│   │   │   ├── MarketDataModule.js
│   │   │   ├── OpportunitiesModule.js
│   │   │   └── SettingsModule.js
│   │   ├── app.js               # Original monolithic frontend
│   │   └── app-new.js           # New modular frontend
│   ├── css/
│   │   └── style.css
│   └── index.html
├── app.js                       # Original monolithic backend
├── app-new.js                   # New modular backend
└── package.json
```

## 🚀 Getting Started

### Run the New Modular Version
```bash
npm start          # Uses the new modular backend (app-new.js)
npm run dev        # Development mode with new architecture
```

### Run the Original Version (for comparison)
```bash
npm run start:old  # Uses the original monolithic backend (app.js)
npm run dev:old    # Development mode with original architecture
```

## 🏗️ Architecture Benefits

### 1. **Separation of Concerns**
- **Configuration**: All settings centralized in `src/config/`
- **Exchange Logic**: Each exchange has its own class implementing a common interface
- **Services**: Business logic separated into dedicated services
- **Utilities**: Helper functions organized by purpose
- **Routes**: API endpoints cleanly separated

### 2. **Easy to Extend**
- **Add New Exchanges**: Create a new class extending `BaseExchange`
- **Add Features**: Create new services or modules
- **Modify Behavior**: Update specific modules without affecting others

### 3. **Maintainable Code**
- **Clear Dependencies**: Each module has defined inputs/outputs
- **Testable**: Modules can be unit tested independently
- **Readable**: Code is organized logically and documented

### 4. **Frontend Modularity**
- **Market Data**: Handles price display and updates
- **Opportunities**: Manages arbitrage opportunity display
- **Settings**: Handles user preferences and configuration

## 📚 Adding New Features

### Adding a New Exchange

1. **Create Exchange Class**:
```javascript
// src/exchanges/NewExchange.js
const BaseExchange = require('./BaseExchange');

class NewExchange extends BaseExchange {
  async fetchPrices(tradingPairs) {
    // Implement price fetching logic
  }
  
  initializeWebSocket(tradingPairs, onPriceUpdate) {
    // Implement WebSocket logic
  }
}

module.exports = NewExchange;
```

2. **Add to Factory**:
```javascript
// src/exchanges/ExchangeFactory.js
case 'newexchange':
  return new NewExchange(config);
```

3. **Add Configuration**:
```javascript
// src/config/exchanges.js
newexchange: {
  name: 'New Exchange',
  api: 'https://api.newexchange.com/ticker',
  wsUrl: 'wss://ws.newexchange.com',
  fee: 0.001,
  enabled: true,
  color: '#FF5733'
}
```

### Adding a New Service

1. **Create Service Class**:
```javascript
// src/services/NewService.js
class NewService {
  static async performAction() {
    // Implement service logic
  }
}

module.exports = NewService;
```

2. **Import and Use**:
```javascript
// app-new.js
const NewService = require('./src/services/NewService');
```

### Adding Frontend Features

1. **Create Module**:
```javascript
// public/js/modules/NewModule.js
class NewModule {
  constructor() {
    this.initialize();
  }
  
  initialize() {
    // Module logic
  }
}

window.NewModule = NewModule;
```

2. **Add to HTML**:
```html
<script src="/js/modules/NewModule.js"></script>
```

3. **Initialize in Main App**:
```javascript
// public/js/app-new.js
this.newModule = new NewModule();
```

## 🔧 Configuration

### Application Settings
Edit `src/config/app.js` to modify:
- Server settings (port, host)
- Update intervals
- Trading parameters
- WebSocket configuration

### Exchange Settings
Edit `src/config/exchanges.js` to:
- Enable/disable exchanges
- Modify fees and timeouts
- Add new exchange configurations

## 📊 API Endpoints

The new architecture provides clean API endpoints:

- `GET /api/data` - Current market data
- `GET /api/exchanges` - Exchange configurations
- `POST /api/update` - Trigger manual update
- `GET /api/health` - Application health status
- `GET /api/stats` - Application statistics

## 🔄 Migration Guide

### For Developers
1. **Backend**: Use `app-new.js` instead of `app.js`
2. **Frontend**: Use `app-new.js` instead of `app.js`
3. **Configuration**: Move settings to `src/config/` files
4. **Exchange Logic**: Implement new exchanges using the `BaseExchange` class

### For Users
No changes needed - the application functionality remains the same. You can switch between old and new versions using the npm scripts.

## 🧪 Testing

Each module can be tested independently:

```javascript
// Example test
const ArbitrageCalculator = require('./src/utils/arbitrage');

// Test arbitrage calculation
const opportunities = ArbitrageCalculator.calculateArbitrage(mockPrices, mockPairs);
console.assert(opportunities.length > 0, 'Should find opportunities');
```

## 📈 Performance

The modular architecture provides:
- **Better Error Isolation**: Failures in one module don't crash the entire app
- **Efficient Updates**: Only affected modules update when data changes
- **Memory Management**: Better garbage collection with modular design
- **Scalability**: Easy to add more exchanges or features

## 🤝 Contributing

1. **Follow the Module Pattern**: Each new feature should be a separate module
2. **Extend Base Classes**: Use `BaseExchange` for new exchanges
3. **Document Changes**: Update this README when adding new features
4. **Test Thoroughly**: Ensure new modules don't break existing functionality

---

## 📝 Notes

- Both old and new versions can run simultaneously for comparison
- The HTML file includes both frontend versions (switch by commenting/uncommenting)
- Configuration is centralized and easy to modify
- WebSocket connections are managed separately for better reliability
- Error handling is improved with proper logging and graceful degradation
