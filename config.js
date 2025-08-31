require('dotenv').config();

const config = {
    // ==================== TELEGRAM CONFIGURATION ====================
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    ADMIN_USER_ID: process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID) : null,
    
    // ==================== WHATSAPP SUPPORT EMAILS ====================
    WHATSAPP_SUPPORT_EMAIL: process.env.WHATSAPP_SUPPORT_EMAIL || 'support@support.whatsapp.com',
    WHATSAPP_ABUSE_EMAIL: process.env.WHATSAPP_ABUSE_EMAIL || 'abuse@whatsapp.com',
    WHATSAPP_ANDROID_SUPPORT: process.env.WHATSAPP_ANDROID_SUPPORT || 'android@support.whatsapp.com',
    WHATSAPP_IOS_SUPPORT: process.env.WHATSAPP_IOS_SUPPORT || 'ios@support.whatsapp.com',
    
    // ==================== MASS REPORTING LIMITS ====================
    MIN_REPORTS_PER_SESSION: parseInt(process.env.MIN_REPORTS_PER_SESSION) || 10,
    MAX_REPORTS_PER_SESSION: parseInt(process.env.MAX_REPORTS_PER_SESSION) || 50,
    MAX_REPORTS_PER_HOUR: parseInt(process.env.MAX_REPORTS_PER_HOUR) || 100,
    MAX_REPORTS_PER_DAY: parseInt(process.env.MAX_REPORTS_PER_DAY) || 500,
    REPORT_COOLDOWN: parseInt(process.env.REPORT_COOLDOWN) || 3600000, // 1 hour in milliseconds
    
    // ==================== EMAIL SENDING CONFIGURATION ====================
    EMAIL_SEND_DELAY: parseInt(process.env.EMAIL_SEND_DELAY) || 3000, // 3 seconds between emails
    MAX_EMAIL_ATTEMPTS: parseInt(process.env.MAX_EMAIL_ATTEMPTS) || 3, // Retry failed emails up to 3 times
    EMAIL_RETRY_DELAY: parseInt(process.env.EMAIL_RETRY_DELAY) || 10000, // 10 seconds between retries
    EMAIL_BATCH_SIZE: parseInt(process.env.EMAIL_BATCH_SIZE) || 5, // Process emails in batches of 5
    
    // ==================== SMTP CONFIGURATION (REQUIRED) ====================
    SMTP_ENABLED: process.env.SMTP_ENABLED !== 'false', // Default true
    SMTP_SERVICE: process.env.SMTP_SERVICE || 'gmail',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true', // Default false
    SMTP_EMAIL: process.env.SMTP_EMAIL || '',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
    
    // ==================== EMAIL HEADERS & CONTENT ====================
    EMAIL_PRIORITY: process.env.EMAIL_PRIORITY || 'high',
    EMAIL_IMPORTANCE: process.env.EMAIL_IMPORTANCE || 'high',
    EMAIL_X_MAILER: process.env.EMAIL_X_MAILER || 'WhatsApp Mass Reporter Bot v2.0',
    
    // ==================== RATE LIMITING & SAFETY ====================
    USER_COOLDOWN_PERIOD: parseInt(process.env.USER_COOLDOWN_PERIOD) || 300000, // 5 minutes between user sessions
    MAX_CONCURRENT_SESSIONS: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 3,
    IP_RATE_LIMIT: parseInt(process.env.IP_RATE_LIMIT) || 30, // Max requests per IP per hour
    
    // ==================== MONITORING & LOGGING ====================
    LOG_LEVEL: process.env.LOG_LEVEL || 'info', // error, warn, info, debug
    SAVE_REPORTS_LOCALLY: process.env.SAVE_REPORTS_LOCALLY === 'true', // Default false
    REPORT_BACKUP_DIR: process.env.REPORT_BACKUP_DIR || './reports_backup',
    
    // ==================== WHATSAPP REPORT CATEGORIES ====================
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
    
    // ==================== CATEGORY SEVERITY LEVELS ====================
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
    
    // ==================== VALIDATION RULES ====================
    VALIDATION: {
        PHONE_NUMBER_MIN_LENGTH: 8,
        PHONE_NUMBER_MAX_LENGTH: 15,
        DESCRIPTION_MIN_LENGTH: 20,
        DESCRIPTION_MAX_LENGTH: 1000,
        CONTACT_MAX_LENGTH: 100
    },
    
    // ==================== SYSTEM SETTINGS ====================
    SYSTEM: {
        CLEANUP_INTERVAL: 3600000, // 1 hour
        BACKUP_INTERVAL: 86400000, // 24 hours
        STATS_UPDATE_INTERVAL: 60000, // 1 minute
        RETRY_QUEUE_CHECK: 30000 // 30 seconds
    },
    
    // ==================== FEATURE FLAGS ====================
    FEATURES: {
        ENABLE_RETRY_SYSTEM: process.env.ENABLE_RETRY_SYSTEM !== 'false', // Default true
        ENABLE_EMAIL_VERIFICATION: process.env.ENABLE_EMAIL_VERIFICATION === 'true', // Default false
        ENABLE_CAPTCHA: process.env.ENABLE_CAPTCHA === 'true', // Default false
        ENABLE_IP_BLOCKING: process.env.ENABLE_IP_BLOCKING !== 'false', // Default true
        ENABLE_USER_BLOCKING: process.env.ENABLE_USER_BLOCKING !== 'false' // Default true
    },
    
    // ==================== SECURITY SETTINGS ====================
    SECURITY: {
        MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        BLOCK_DURATION: parseInt(process.env.BLOCK_DURATION) || 3600000, // 1 hour
        ALLOWED_COUNTRIES: process.env.ALLOWED_COUNTRIES ? 
            process.env.ALLOWED_COUNTRIES.split(',').map(c => c.trim().toUpperCase()) : [],
        BLOCKED_IPS: process.env.BLOCKED_IPS ? 
            process.env.BLOCKED_IPS.split(',').map(ip => ip.trim()) : []
    }
};

// ==================== VALIDATION FUNCTIONS ====================
config.validateConfig = function() {
    const errors = [];
    
    // Required fields validation
    if (!this.TELEGRAM_BOT_TOKEN) {
        errors.push('TELEGRAM_BOT_TOKEN is required');
    }
    
    if (this.SMTP_ENABLED) {
        if (!this.SMTP_EMAIL) {
            errors.push('SMTP_EMAIL is required when SMTP is enabled');
        }
        if (!this.SMTP_PASSWORD) {
            errors.push('SMTP_PASSWORD is required when SMTP is enabled');
        }
    }
    
    // Limits validation
    if (this.MIN_REPORTS_PER_SESSION > this.MAX_REPORTS_PER_SESSION) {
        errors.push('MIN_REPORTS_PER_SESSION cannot be greater than MAX_REPORTS_PER_SESSION');
    }
    
    if (this.MAX_REPORTS_PER_SESSION > this.MAX_REPORTS_PER_HOUR) {
        errors.push('MAX_REPORTS_PER_SESSION cannot be greater than MAX_REPORTS_PER_HOUR');
    }
    
    if (this.MAX_REPORTS_PER_HOUR > this.MAX_REPORTS_PER_DAY) {
        errors.push('MAX_REPORTS_PER_HOUR cannot be greater than MAX_REPORTS_PER_DAY');
    }
    
    // SMTP validation
    if (this.SMTP_ENABLED) {
        const validPorts = [25, 465, 587, 2525];
        if (!validPorts.includes(this.SMTP_PORT)) {
            errors.push(`SMTP_PORT must be one of: ${validPorts.join(', ')}`);
        }
    }
    
    return errors;
};

// ==================== HELPER FUNCTIONS ====================
config.getCategorySeverity = function(category) {
    return this.CATEGORY_SEVERITY[category] || 'medium';
};

config.getWhatsAppEmailBySeverity = function(severity) {
    switch (severity) {
        case 'critical':
            return this.WHATSAPP_ABUSE_EMAIL;
        case 'high':
            return this.WHATSAPP_SUPPORT_EMAIL;
        default:
            return this.WHATSAPP_SUPPORT_EMAIL;
    }
};

config.isCountryAllowed = function(countryCode) {
    if (this.SECURITY.ALLOWED_COUNTRIES.length === 0) return true;
    return this.SECURITY.ALLOWED_COUNTRIES.includes(countryCode.toUpperCase());
};

config.isIpBlocked = function(ip) {
    return this.SECURITY.BLOCKED_IPS.includes(ip);
};

config.getSmtpConfig = function() {
    return {
        service: this.SMTP_SERVICE,
        host: this.SMTP_HOST,
        port: this.SMTP_PORT,
        secure: this.SMTP_SECURE,
        auth: {
            user: this.SMTP_EMAIL,
            pass: this.SMTP_PASSWORD
        }
    };
};

// ==================== LOGGING CONFIGURATION ====================
config.getLoggerConfig = function() {
    return {
        level: this.LOG_LEVEL,
        saveReports: this.SAVE_REPORTS_LOCALLY,
        backupDir: this.REPORT_BACKUP_DIR
    };
};

// ==================== RATE LIMIT CONFIGURATION ====================
config.getRateLimitConfig = function() {
    return {
        userCooldown: this.USER_COOLDOWN_PERIOD,
        maxSessions: this.MAX_CONCURRENT_SESSIONS,
        ipLimit: this.IP_RATE_LIMIT
    };
};

// ==================== VALIDATE ON LOAD ====================
const validationErrors = config.validateConfig();
if (validationErrors.length > 0) {
    console.error('❌ Configuration errors:');
    validationErrors.forEach(error => console.error('   -', error));
    
    if (!config.TELEGRAM_BOT_TOKEN) {
        console.error('\n💡 Get TELEGRAM_BOT_TOKEN from @BotFather on Telegram');
    }
    
    if (config.SMTP_ENABLED && (!config.SMTP_EMAIL || !config.SMTP_PASSWORD)) {
        console.error('\n💡 Configure SMTP_EMAIL and SMTP_PASSWORD in your .env file');
        console.error('   For Gmail, use App Password (not your regular password)');
    }
}

// ==================== EXPORT CONFIG ====================
module.exports = config;
