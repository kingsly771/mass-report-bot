require('dotenv').config();
const TelegramService = require('./services/telegram-service');

console.log('🚀 Starting WhatsApp Mass Reporter Bot...');

// Initialize services
const telegramService = new TelegramService();

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('SIGINT', () => {
    console.log('🛑 Shutting down bot...');
    process.exit(0);
});

console.log('✅ Bot started successfully');
