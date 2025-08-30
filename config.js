require('dotenv').config();

module.exports = {
    // Telegram
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    ADMIN_USER_ID: process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID) : null,
    
    // WhatsApp
    WHATSAPP_SUPPORT_EMAIL: process.env.WHATSAPP_SUPPORT_EMAIL || 'support@support.whatsapp.com',
    
    // Reporting limits
    MIN_REPORTS_PER_SESSION: 10,
    MAX_REPORTS_PER_SESSION: 100,
    MAX_REPORTS_PER_HOUR: 200,
    REPORT_COOLDOWN: 3600000,
    
    // Email settings
    EMAIL_SEND_DELAY: 2000,
    MAX_EMAIL_ATTEMPTS: 3,
    
    // Report categories
    REPORT_CATEGORIES: [
        'Spam',
        'Harassment', 
        'Fake Account',
        'Impersonation',
        'Illegal Activities',
        'Other'
    ]
};
