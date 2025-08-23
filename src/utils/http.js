/**
 * HTTP Utility Functions
 * Handles API requests with retry logic and error handling
 */

const axios = require('axios');
const APP_CONFIG = require('../config/app');

class HttpUtils {
    static apiCallCount = 0;

    /**
     * Production-ready fetch with error handling and retries
     * @param {string} url - The URL to fetch
     * @param {Object|number} optionsOrRetries - Request options object or number of retries (for backward compatibility)
     * @param {number} retries - Number of retry attempts (used when first param is options)
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {Promise<Object>} - Axios response object
     */
    static async fetchWithRetry(url, optionsOrRetries = {}, retries = APP_CONFIG.api.maxRetries, timeout = APP_CONFIG.api.baseTimeout) {
        let options = {};

        // Handle backward compatibility: if second parameter is a number, it's retries
        if (typeof optionsOrRetries === 'number') {
            retries = optionsOrRetries;
            options = {};
        } else {
            options = optionsOrRetries || {};
        }

        // If third parameter is passed and second is options, use it as retries
        if (typeof optionsOrRetries === 'object' && typeof retries === 'number') {
            // retries is already set correctly
        } else if (typeof optionsOrRetries === 'object' && !retries) {
            retries = APP_CONFIG.api.maxRetries;
        }

        for (let i = 0; i < retries; i++) {
            try {
                this.apiCallCount++;

                const config = {
                    url,
                    method: options.method || 'GET',
                    timeout: options.timeout || timeout,
                    headers: {
                        'User-Agent': APP_CONFIG.api.userAgent,
                        ...options.headers
                    },
                    ...options
                };

                // Remove url from spread to avoid duplication
                delete config.url;
                const response = await axios(url, config);
                return response;
            } catch (error) {
                console.warn(`API call failed (attempt ${i + 1}/${retries}):`, error.message);
                if (i === retries - 1) throw error;
                await this.sleep(APP_CONFIG.api.exponentialBackoffMs * (i + 1)); // Exponential backoff
            }
        }
    }

    /**
     * Sleep utility function
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current API call count
     * @returns {number} - Number of API calls made
     */
    static getApiCallCount() {
        return this.apiCallCount;
    }

    /**
     * Reset API call counter
     */
    static resetApiCallCount() {
        this.apiCallCount = 0;
    }
}

module.exports = HttpUtils;
