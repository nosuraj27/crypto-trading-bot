const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import configuration
const APP_CONFIG = require('./src/config/app');
const ConfigService = require('./src/services/ConfigService');

// Import services
const TradingPairsService = require('./src/services/TradingPairsService');
const PriceUpdateService = require('./src/services/PriceUpdateService');
const TradeExecutionService = require('./src/services/TradeExecutionService');

// Import utilities and factories
const ExchangeFactory = require('./src/exchanges/ExchangeFactory');
const WebSocketService = require('./src/websocket/WebSocketService');

// Import routes
const apiRoutes = require('./src/routes/api');

class ArbitrageBotApplication {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: APP_CONFIG.websocket.cors
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());
  }

  /**
   * Setup Express routes
   */
  setupRoutes() {
    // Main application route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // API routes
    this.app.use('/api', apiRoutes);

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      console.error('❌ Express error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Setup Socket.IO for real-time communication
   */
  setupSocketIO() {
    this.io.on('connection', (socket) => {
      console.log(`👤 Client connected: ${socket.id}`);

      // Send current data immediately
      try {
        const data = PriceUpdateService.getCurrentData();
        const exchangeConfigs = ExchangeFactory.getExchangeConfigs();

        socket.emit('priceUpdate', {
          ...data,
          exchangeConfig: exchangeConfigs
        });
      } catch (error) {
        console.error('❌ Error sending initial data to client:', error);
      }

      // Handle client requests
      socket.on('requestUpdate', async () => {
        console.log(`🔄 Manual update requested by ${socket.id}`);
        try {
          const data = await PriceUpdateService.updatePrices();
          const exchangeConfigs = ExchangeFactory.getExchangeConfigs();

          this.io.emit('priceUpdate', {
            ...data,
            exchangeConfig: exchangeConfigs
          });
        } catch (error) {
          console.error('❌ Error processing manual update request:', error);
          socket.emit('error', { message: 'Failed to update prices' });
        }
      });

      socket.on('disconnect', () => {
        console.log(`👤 Client disconnected: ${socket.id}`);
      });

      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Setup configuration change listeners
   */
  setupConfigListeners() {
    // Listen for broadcast throttle changes
    ConfigService.addListener('broadcastThrottleMs', (value) => {
      console.log(`🔧 Broadcast throttle updated to: ${value}ms`);
      // Update WebSocket service throttle if needed
      if (WebSocketService.updateThrottle) {
        WebSocketService.updateThrottle(parseInt(value));
      }
    });

    // Listen for other configuration changes
    ConfigService.addListener('minProfitThreshold', (value) => {
      console.log(`🔧 Profit threshold updated to: ${value}%`);
    });

    ConfigService.addListener('defaultCapital', (value) => {
      console.log(`🔧 Default capital updated to: $${value}`);
    });
  }

  /**
   * Initialize all services and start the application
   */
  async initialize() {
    try {

      await ConfigService.initialize();

      // Initialize trading pairs from external APIs
      await TradingPairsService.initializeTradingPairs();

      // Initialize exchange instances
      ExchangeFactory.initializeExchanges();

      // Initialize trade execution service
      TradeExecutionService.setup(ExchangeFactory, console, { dryRun: true });

      // Store services in app for API access
      this.app.set('tradingPairsService', TradingPairsService);
      this.app.set('tradeExecutionService', TradeExecutionService);
      this.app.set('configService', ConfigService);

      // Initialize WebSocket service for real-time updates
      WebSocketService.initialize(this.io);

      // Set up configuration listeners for live updates
      this.setupConfigListeners();

      // Perform initial price update
      console.log('💰 Performing initial price update...');
      await PriceUpdateService.updatePrices();

      console.log('✅ Application initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();

      const { host, port } = APP_CONFIG.server;

      this.server.listen(port, host, () => {
        console.log(`🌐 Server running on http://${host}:${port}`);
        console.log(`📊 Environment: ${APP_CONFIG.server.env}`);
        console.log(`🔗 WebSocket real-time updates: ACTIVE`);
      });

    } catch (error) {
      console.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

}

// Create and start the application
const app = new ArbitrageBotApplication();
app.start().catch((error) => {
  console.error('💥 Fatal error starting application:', error);
  process.exit(1);
});
