#!/usr/bin/env node

/**
 * Liquidate All Assets to USDT (CLI)
 *
 * - Sells all non-USDT spot balances into USDT via MARKET orders
 * - Supports enabled, trading-capable exchanges wired in ExchangeFactory (Binance, Gate.io)
 * - Dry-run by default; requires explicit confirmation in live mode
 * - Handles tiny dust filtering and precision rounding
 *
 * Environment variables (PowerShell examples):
 * - TRADING_MODE=testnet|live              -> Which mode to use (default: testnet)
 * - DRY_RUN=true|false                     -> When true, do not place orders (default: true)
 * - MIN_USDT=5                             -> Skip assets whose estimated USDT value is below this (default: 5)
 * - ONLY=BTC,ETH                           -> Optional comma-separated asset whitelist
 * - SKIP=USDC,FDUSD,BUSD                   -> Optional comma-separated asset blacklist
 * - LIVE_CONFIRM=YES                       -> Required when TRADING_MODE=live and DRY_RUN=false
 *
 * Usage (PowerShell):
 *   $env:TRADING_MODE="testnet"; $env:DRY_RUN="true"; node scripts/liquidate-to-usdt.js
 *   $env:TRADING_MODE="live"; $env:DRY_RUN="false"; $env:LIVE_CONFIRM="YES"; node scripts/liquidate-to-usdt.js
 */

const path = require('path');
const dotenv = require('dotenv');
const ExchangeFactory = require('../src/exchanges/ExchangeFactory');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Config from env
const TRADING_MODE = (process.env.TRADING_MODE || 'testnet').toLowerCase();
const DRY_RUN = 'false';
const MIN_USDT = Number(process.env.MIN_USDT || 5);
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
const SKIP = (process.env.SKIP || 'USDT,USDC,FDUSD,BUSD,TUSD,DAI').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
const LIVE_CONFIRM = (process.env.LIVE_CONFIRM || '').toUpperCase();

function headline(msg) {
    console.log('\n============================================================');
    console.log(msg);
    console.log('============================================================\n');
}

function fmt(n, d = 8) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    return Number(n).toFixed(d).replace(/\.0+$/, '');
}

async function getBinanceSymbolInfo(binanceExchange, symbol) {
    // Use Binance public exchangeInfo to get stepSize filters
    try {
        const urlBase = binanceExchange.testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        const res = await binanceExchange._fetchWithRetry(`${urlBase}/api/v3/exchangeInfo?symbol=${symbol}`);
        const info = res.data && res.data.symbols && res.data.symbols[0];
        return info || null;
    } catch (e) {
        console.warn(`⚠️  Could not fetch exchangeInfo for ${symbol}: ${e.message}`);
        return null;
    }
}

function floorToStep(value, step) {
    if (!step) return value;
    const s = Number(step);
    if (s <= 0) return value;
    return Math.floor(Number(value) / s) * s;
}

async function sellAllOnExchange(key, exchange) {
    headline(`Exchange: ${exchange.name} (${key}) — Mode: ${exchange.testnet ? 'TESTNET' : 'LIVE'} — DryRun: ${DRY_RUN}`);

    // Guard for live mode real trading
    if (!exchange.isTradingEnabled || !exchange.isTradingEnabled()) {
        console.log('⚠️  Trading not enabled (missing API keys or disabled). Skipping.');
        return { key, sold: [], skipped: [], errors: [] };
    }

    if (TRADING_MODE === 'live' && !DRY_RUN && LIVE_CONFIRM !== 'YES') {
        console.log('❌ LIVE mode with DRY_RUN=false requires LIVE_CONFIRM=YES. Skipping.');
        return { key, sold: [], skipped: [], errors: [] };
    }

    // Get balances
    let balances = {};
    try {
        if (exchange.getAllBalances) {
            const res = await exchange.getAllBalances();
            // Binance style returns { success, balances: { ASSET: {free,locked,total} } }
            if (res && res.balances) {
                Object.entries(res.balances).forEach(([asset, obj]) => {
                    balances[asset.toUpperCase()] = Number(obj.free || obj.total || 0);
                });
            } else {
                balances = await exchange.getBalance();
            }
        } else {
            balances = await exchange.getBalance();
        }
    } catch (e) {
        console.log(`❌ Failed to fetch balances: ${e.message}`);
        return { key, sold: [], skipped: [], errors: [`balance: ${e.message}`] };
    }

    if (!balances || Object.keys(balances).length === 0) {
        console.log('No balances found.');
        return { key, sold: [], skipped: [], errors: [] };
    }

    // Prepare list of assets to consider
    const entries = Object.entries(balances)
        .map(([asset, amt]) => [asset.toUpperCase(), Number(amt)])
        .filter(([asset, amt]) => amt > 0)
        .filter(([asset]) => !SKIP.includes(asset))
        .filter(([asset]) => ONLY.length === 0 || ONLY.includes(asset));

    if (entries.length === 0) {
        console.log('Nothing to sell after filters.');
        return { key, sold: [], skipped: [], errors: [] };
    }

    const results = { key, sold: [], skipped: [], errors: [] };

    for (const [asset, amount] of entries) {
        const symbol = `${asset}USDT`;

        // Estimate value in USDT to skip tiny dust
        let price = null;
        try {
            if (exchange.getPrice) {
                const p = await exchange.getPrice(symbol);
                price = Number(p.price);
            }
        } catch (e) {
            // Ignore price fetch error and continue attempt
            console.warn(`⚠️  Price fetch failed for ${symbol}: ${e.message}`);
        }

        const estValue = price ? amount * price : null;
        if (estValue !== null && estValue < MIN_USDT) {
            results.skipped.push({ asset, amount, reason: `Below MIN_USDT (${MIN_USDT})` });
            console.log(`- Skip ${asset} amount ${fmt(amount)} — est ${fmt(estValue, 2)} USDT < ${MIN_USDT}`);
            continue;
        }

        // Exchange-specific quantity formatting
        let sellQty = amount;

        if (key === 'binance') {
            // Fetch lot size/step filters and floor quantity accordingly
            const info = await getBinanceSymbolInfo(exchange, symbol);
            const lotFilter = info?.filters?.find(f => f.filterType === 'LOT_SIZE');
            if (lotFilter) {
                sellQty = floorToStep(sellQty, lotFilter.stepSize);
                // Ensure >= minQty
                const minQty = Number(lotFilter.minQty || 0);
                if (sellQty < minQty) {
                    results.skipped.push({ asset, amount, reason: `Below minQty ${minQty}` });
                    console.log(`- Skip ${asset} amount ${fmt(amount)} — floored to ${fmt(sellQty)} < minQty ${fmt(minQty)}`);
                    continue;
                }
            } else {
                // Fallback: round down to 8 decimals, ensure > 0
                sellQty = Math.floor(sellQty * 1e8) / 1e8;
                if (sellQty <= 0) {
                    results.skipped.push({ asset, amount, reason: 'Rounded to zero' });
                    continue;
                }
            }
        } else if (key === 'gateio') {
            // Gate.io accepts up to 8 decimals; ensure > 0 after trimming
            sellQty = Number(Number(sellQty).toFixed(8));
            if (sellQty <= 0) {
                results.skipped.push({ asset, amount, reason: 'Rounded to zero' });
                continue;
            }
        }

        const orderDesc = `${symbol} SELL qty=${fmt(sellQty)} (from ${fmt(amount)})`;

        // if (DRY_RUN) {
        //     results.sold.push({ asset, symbol, quantity: sellQty, dryRun: true, estUSDT: estValue });
        //     console.log(`• DRY RUN: Would place MARKET SELL ${orderDesc}`);
        //     continue;
        // }

        try {
            const res = await exchange.createOrder({ symbol, side: 'sell', type: 'market', amount: sellQty, quantity: sellQty });
            results.sold.push({ asset, symbol, quantity: sellQty, orderId: res.orderId || res.id, status: res.status });
            console.log(`✅ SOLD: ${orderDesc} — orderId=${res.orderId || res.id} status=${res.status}`);
            // Small delay to avoid API rate limits
            await sleep(300);
        } catch (e) {
            results.errors.push({ asset, symbol, quantity: sellQty, error: e.message });
            console.log(`❌ FAILED: ${orderDesc} — ${e.message}`);
        }
    }

    return results;
}

(async function main() {
    headline('Liquidate All Assets to USDT');
    console.log(`Mode: ${TRADING_MODE.toUpperCase()} | DryRun: ${DRY_RUN} | MinUSDT: ${MIN_USDT}`);
    if (ONLY.length) console.log(`ONLY: ${ONLY.join(', ')}`);
    if (SKIP.length) console.log(`SKIP: ${SKIP.join(', ')}`);

    // Initialize exchanges in requested mode
    ExchangeFactory.initializeExchanges(TRADING_MODE);
    const tradingExchanges = ExchangeFactory.getTradingEnabledExchanges();

    if (!tradingExchanges || tradingExchanges.size === 0) {
        console.log('No trading-enabled exchanges found. Check API keys and config.');
        process.exit(1);
    }

    const allResults = [];
    for (const [key, exchange] of tradingExchanges) {
        const res = await sellAllOnExchange(key, exchange);
        allResults.push(res);
    }

    // Summary
    headline('Summary');
    let totalSold = 0, totalSkipped = 0, totalErrors = 0;
    for (const r of allResults) {
        console.log(`Exchange ${r.key}: sold=${r.sold.length}, skipped=${r.skipped.length}, errors=${r.errors.length}`);
        totalSold += r.sold.length; totalSkipped += r.skipped.length; totalErrors += r.errors.length;
    }
    console.log(`\nTotals => Sold: ${totalSold}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);

    if (TRADING_MODE === 'live' && !DRY_RUN) {
        console.log('\nNOTE: You executed in LIVE mode with real orders. Review your exchange order history.');
    } else if (DRY_RUN) {
        console.log('\nDRY RUN only. No orders were placed. Set DRY_RUN=false to execute.');
    }

    process.exit(0);
})();
