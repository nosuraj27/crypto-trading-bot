/**
 * Notification Module
 * Simple notification system for user feedback
 */

class NotificationModule {
    constructor() {
        this.container = this.createContainer();
        this.notifications = new Map();
        this.idCounter = 0;
    }

    /**
     * Create notification container
     * @returns {HTMLElement} Container element
     */
    createContainer() {
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     * @param {number} duration - Duration in milliseconds (0 for persistent)
     * @returns {string} Notification ID
     */
    show(message, type = 'info', duration = 5000) {
        const id = `notification-${++this.idCounter}`;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = id;

        const icon = this.getIcon(type);

        notification.innerHTML = `
            <div class="notification-content">
                <i class="notification-icon ${icon}"></i>
                <div class="notification-text">${message}</div>
                <button class="notification-close" onclick="window.notificationModule.close('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.close(id);
            }, duration);
        }

        return id;
    }

    /**
     * Get icon for notification type
     * @param {string} type - Notification type
     * @returns {string} Icon class
     */
    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Close a notification
     * @param {string} id - Notification ID
     */
    close(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.classList.add('removing');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    /**
     * Show success notification
     * @param {string} message - Message
     * @param {number} duration - Duration
     * @returns {string} Notification ID
     */
    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error notification
     * @param {string} message - Message
     * @param {number} duration - Duration
     * @returns {string} Notification ID
     */
    error(message, duration = 8000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show info notification
     * @param {string} message - Message
     * @param {number} duration - Duration
     * @returns {string} Notification ID
     */
    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Show warning notification
     * @param {string} message - Message
     * @param {number} duration - Duration
     * @returns {string} Notification ID
     */
    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.close(id);
        });
    }
}

// Export for use in main app
window.NotificationModule = NotificationModule;
