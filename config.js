require('dotenv').config();

module.exports = {
    // Telegram Bot Configuration
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    ADMIN_USER_ID: process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID) : null,
    
    // WhatsApp Support Configuration
    WHATSAPP_SUPPORT_EMAIL: process.env.WHATSAPP_SUPPORT_EMAIL || 'support@support.whatsapp.com',
    WHATSAPP_ABUSE_EMAIL: process.env.WHATSAPP_ABUSE_EMAIL || 'abuse@whatsapp.com',
    WHATSAPP_ANDROID_SUPPORT: process.env.WHATSAPP_ANDROID_SUPPORT || 'android@support.whatsapp.com',
    WHATSAPP_IOS_SUPPORT: process.env.WHATSAPP_IOS_SUPPORT || 'ios@support.whatsapp.com',
    
    // Mass Reporting Limits
    MIN_REPORTS_PER_SESSION: parseInt(process.env.MIN_REPORTS_PER_SESSION) || 10,
    MAX_REPORTS_PER_SESSION: parseInt(process.env.MAX_REPORTS_PER_SESSION) || 100,
    MAX_REPORTS_PER_HOUR: parseInt(process.env.MAX_REPORTS_PER_HOUR) || 200,
    MAX_REPORTS_PER_DAY: parseInt(process.env.MAX_REPORTS_PER_DAY) || 1000,
    REPORT_COOLDOWN: parseInt(process.env.REPORT_COOLDOWN) || 3600000, // 1 hour in milliseconds
    
    // Email Sending Configuration
    EMAIL_SEND_DELAY: parseInt(process.env.EMAIL_SEND_DELAY) || 2000, // 2 seconds between emails
    MAX_EMAIL_ATTEMPTS: parseInt(process.env.MAX_EMAIL_ATTEMPTS) || 3, // Retry failed emails up to 3 times
    EMAIL_RETRY_DELAY: parseInt(process.env.EMAIL_RETRY_DELAY) || 5000, // 5 seconds between retries
    EMAIL_BATCH_SIZE: parseInt(process.env.EMAIL_BATCH_SIZE) || 10, // Process emails in batches
    
    // SMTP Configuration (for actual email sending)
    SMTP_ENABLED: process.env.SMTP_ENABLED === 'true' || false,
    SMTP_SERVICE: process.env.SMTP_SERVICE || 'gmail',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true' || false,
    SMTP_EMAIL: process.env.SMTP_EMAIL || '',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
    
    // Email Content Configuration
    EMAIL_PRIORITY: process.env.EMAIL_PRIORITY || 'high', // high, normal, low
    EMAIL_IMPORTANCE: process.env.EMAIL_IMPORTANCE || 'high', // high, normal, low
    EMAIL_X_MAILER: process.env.EMAIL_X_MAILER || 'WhatsApp Mass Reporter Bot v2.0',
    
    // Rate Limiting and Safety
    USER_COOLDOWN_PERIOD: parseInt(process.env.USER_COOLDOWN_PERIOD) || 300000, // 5 minutes between user sessions
    MAX_CONCURRENT_SESSIONS: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5,
    IP_RATE_LIMIT: parseInt(process.env.IP_RATE_LIMIT) || 50, // Max requests per IP per hour
    
    // Monitoring and Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info', // error, warn, info, debug
    SAVE_REPORTS_LOCALLY: process.env.SAVE_REPORTS_LOCALLY === 'true' || false,
    REPORT_BACKUP_DIR: process.env.REPORT_BACKUP_DIR || './reports_backup',
    
    // WhatsApp Report Categories
    REPORT_CATEGORIES: [
        'Spam',
        'Harassment',
        'Fake Account',
        'Impersonation',
        'Illegal Activities',
        'Privacy Violation',
        'Threats',
        'Scam',
        'Abusive Content',
        'Other'
    ],
    
    // Category Severity Levels
    CATEGORY_SEVERITY: {
        'Spam': 'medium',
        'Harassment': 'high',
        'Fake Account': 'medium',
        'Impersonation': 'high',
        'Illegal Activities': 'critical',
        'Privacy Violation': 'high',
        'Threats': 'critical',
        'Scam': 'high',
        'Abusive Content': 'medium',
        'Other': 'low'
    },
    
    // Response Templates
    RESPONSE_TEMPLATES: {
        WELCOME: `🚨 *WhatsApp Mass Reporter Bot* 🚨`,
        HELP: `🆘 *Mass Report Help Guide*`,
        RATE_LIMIT: `❌ *Rate Limit Exceeded*`,
        SUCCESS: `✅ *Report Sent Successfully*`
    },
    
    // Validation Rules
    VALIDATION: {
        PHONE_NUMBER_MIN_LENGTH: 8,
        PHONE_NUMBER_MAX_LENGTH: 15,
        DESCRIPTION_MIN_LENGTH: 20,
        DESCRIPTION_MAX_LENGTH: 1000,
        CONTACT_MAX_LENGTH: 100
    },
    
    // System Settings
    SYSTEM: {
        CLEANUP_INTERVAL: 3600000, // 1 hour
        BACKUP_INTERVAL: 86400000, // 24 hours
        STATS_UPDATE_INTERVAL: 60000, // 1 minute
        RETRY_QUEUE_CHECK: 30000 // 30 seconds
    },
    
    // Feature Flags
    FEATURES: {
        ENABLE_RETRY_SYSTEM: true,
        ENABLE_EMAIL_VERIFICATION: false,
        ENABLE_CAPTCHA: false,
        ENABLE_IP_BLOCKING: true,
        ENABLE_USER_BLOCKING: true
    },
    
    // Security Settings
    SECURITY: {
        MAX_LOGIN_ATTEMPTS: 5,
        BLOCK_DURATION: 3600000, // 1 hour
        ALLOWED_COUNTRIES: ['US', 'UK', 'CA', 'AU', 'DE', 'FR'], // Empty array for all countries
        BLOCKED_IPS: [] // Add IPs to block manually
    }
};

// Environment validation
if (!module.exports.TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN is not set in environment variables');
}

if (module.exports.SMTP_ENABLED && (!module.exports.SMTP_EMAIL || !module.exports.SMTP_PASSWORD)) {
    console.warn('⚠️  SMTP is enabled but credentials are not fully configured');
}

// Export validation function
module.exports.validateConfig = function() {
    const errors = [];
    
    if (!this.TELEGRAM_BOT_TOKEN) {
        errors.push('TELEGRAM_BOT_TOKEN is required');
    }
    
    if (this.SMTP_ENABLED) {
        if (!this.SMTP_EMAIL) errors.push('SMTP_EMAIL is required when SMTP_ENABLED is true');
        if (!this.SMTP_PASSWORD) errors.push('SMTP_PASSWORD is required when SMTP_ENABLED is true');
    }
    
    if (this.MIN_REPORTS_PER_SESSION > this.MAX_REPORTS_PER_SESSION) {
        errors.push('MIN_REPORTS_PER_SESSION cannot be greater than MAX_REPORTS_PER_SESSION');
    }
    
    if (this.MAX_REPORTS_PER_SESSION > this.MAX_REPORTS_PER_HOUR) {
        errors.push('MAX_REPORTS_PER_SESSION cannot be greater than MAX_REPORTS_PER_HOUR');
    }
    
    return errors;
};

// Helper function to get category severity
module.exports.getCategorySeverity = function(category) {
    return this.CATEGORY_SEVERITY[category] || 'medium';
};

// Helper function to check if country is allowed
module.exports.isCountryAllowed = function(countryCode) {
    if (this.SECURITY.ALLOWED_COUNTRIES.length === 0) return true;
    return this.SECURITY.ALLOWED_COUNTRIES.includes(countryCode.toUpperCase());
};

// Helper function to get WhatsApp email based on category severity
module.exports.getWhatsAppEmailBySeverity = function(severity) {
    switch (severity) {
        case 'critical':
            return this.WHATSAPP_ABUSE_EMAIL;
        case 'high':
            return this.WHATSAPP_SUPPORT_EMAIL;
        default:
            return this.WHATSAPP_SUPPORT_EMAIL;
    }
};
