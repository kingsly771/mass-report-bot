require('dotenv').config();
const TelegramService = require('./services/telegram-service');

console.log('🚀 Starting WhatsApp Mass Reporter Bot...');

// Validate environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'SMTP_EMAIL', 'SMTP_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('💡 Please check your .env file');
    process.exit(1);
}

// Initialize services with error handling
let telegramService;

try {
    telegramService = new TelegramService();
    console.log('✅ Bot services initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize bot services:', error.message);
    process.exit(1);
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('🔴 Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('🔴 Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot gracefully...');
    
    // Close SMTP connections if available
    if (telegramService && telegramService.emailService && telegramService.emailService.tempMail) {
        telegramService.emailService.tempMail.close();
    }
    
    console.log('✅ Bot shutdown complete');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    
    if (telegramService && telegramService.emailService && telegramService.emailService.tempMail) {
        telegramService.emailService.tempMail.close();
    }
    
    process.exit(0);
});

console.log('✅ Bot started successfully. Press Ctrl+C to stop.');
