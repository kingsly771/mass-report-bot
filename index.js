require('dotenv').config();
const TelegramService = require('./services/telegram-service');

console.log('🚀 Starting WhatsApp Mass Reporter Bot...');
console.log('='.repeat(50));

// Display startup banner
console.log(`
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓                                                                                ▓
▓                  WhatsApp Mass Reporter Bot                                   ▓
▓                  ---------------------------                                  ▓
▓                                                                                ▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
`);

// Validate environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'SMTP_EMAIL', 'SMTP_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    
    console.log('\n💡 Please check your .env file:');
    console.log('   1. TELEGRAM_BOT_TOKEN - Get from @BotFather on Telegram');
    console.log('   2. SMTP_EMAIL - Your email address (e.g., your_email@gmail.com)');
    console.log('   3. SMTP_PASSWORD - Your email password or app password');
    
    if (missingVars.includes('TELEGRAM_BOT_TOKEN')) {
        console.log('\n📋 How to get TELEGRAM_BOT_TOKEN:');
        console.log('   1. Message @BotFather on Telegram');
        console.log('   2. Send /newbot');
        console.log('   3. Follow the instructions');
        console.log('   4. Copy the bot token');
    }
    
    if (missingVars.includes('SMTP_EMAIL') || missingVars.includes('SMTP_PASSWORD')) {
        console.log('\n📋 How to configure SMTP:');
        console.log('   1. For Gmail: Enable 2-factor authentication');
        console.log('   2. Generate App Password: https://myaccount.google.com/apppasswords');
        console.log('   3. Select "Mail" and device "Other"');
        console.log('   4. Name it "WhatsApp Bot"');
        console.log('   5. Use the 16-digit app password (not your regular password)');
    }
    
    process.exit(1);
}

// Display configuration summary
console.log('📋 Configuration Summary:');
console.log(`   Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`   SMTP Email: ${process.env.SMTP_EMAIL ? '✅ Set' : '❌ Missing'}`);
console.log(`   SMTP Password: ${process.env.SMTP_PASSWORD ? '✅ Set' : '❌ Missing'}`);
console.log(`   WhatsApp Support: ${process.env.WHATSAPP_SUPPORT_EMAIL || 'support@support.whatsapp.com'}`);
console.log(`   Max Reports/Session: ${process.env.MAX_REPORTS_PER_SESSION || 50}`);
console.log(`   Max Reports/Hour: ${process.env.MAX_REPORTS_PER_HOUR || 100}`);

let telegramService;

// Initialize services with error handling
try {
    console.log('\n🔧 Initializing Telegram service...');
    telegramService = new TelegramService();
    console.log('✅ Telegram service initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Telegram service:', error.message);
    
    if (error.message.includes('ETELEGRAM')) {
        console.log('\n💡 Telegram bot token might be invalid');
        console.log('   1. Check your TELEGRAM_BOT_TOKEN in .env');
        console.log('   2. Get a new token from @BotFather if needed');
    }
    
    process.exit(1);
}

// Global error handlers
process.on('unhandledRejection', (error) => {
    console.error('🔴 Unhandled Promise Rejection:', error);
    console.error('Stack:', error.stack);
});

process.on('uncaughtException', (error) => {
    console.error('🔴 Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    
    // Graceful shutdown
    shutdown(1);
});

// Signal handlers for graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT (Ctrl+C)');
    shutdown(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM');
    shutdown(0);
});

// Graceful shutdown function
function shutdown(exitCode = 0) {
    console.log('\n🔚 Shutting down bot gracefully...');
    
    try {
        // Close Telegram service if initialized
        if (telegramService) {
            console.log('   Closing Telegram service...');
            telegramService.close();
        }
        
        // Close email service if available
        if (telegramService && telegramService.emailService) {
            console.log('   Closing email service...');
            telegramService.emailService.close();
        }
        
        console.log('✅ Cleanup completed');
        console.log('👋 Bot shutdown successfully');
        
    } catch (shutdownError) {
        console.error('❌ Error during shutdown:', shutdownError);
    } finally {
        process.exit(exitCode);
    }
}

// Health check and monitoring
let isRunning = true;
let startTime = Date.now();

// Periodic status logging
setInterval(() => {
    if (isRunning) {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        
        console.log(`📊 Bot Status: ONLINE | Uptime: ${hours}h ${minutes}m ${seconds}s`);
        
        // Log email stats if available
        if (telegramService && telegramService.emailService) {
            const stats = telegramService.emailService.getStats();
            if (stats.total > 0) {
                console.log(`   📧 Emails: ${stats.successful}/${stats.total} successful (${stats.successRate})`);
            }
        }
    }
}, 30000); // Log every 30 seconds

// Startup complete message
console.log('\n🎉 Bot started successfully!');
console.log('='.repeat(50));
console.log('📋 Available Commands:');
console.log('   /start    - Show welcome message');
console.log('   /report   - Start mass reporting');
console.log('   /mystats  - Check your statistics');
console.log('   /emailstats - View email performance');
console.log('   /help     - Get help information');
console.log('');
console.log('⚡ Bot is now listening for messages...');
console.log('💡 Message your bot on Telegram to get started');
console.log('⏹️  Press Ctrl+C to stop the bot');
console.log('='.repeat(50));

// Export for testing purposes
module.exports = {
    telegramService,
    shutdown,
    isRunning: () => isRunning
};

// Handle process exit
process.on('exit', (code) => {
    isRunning = false;
    console.log(`\n🔚 Process exiting with code: ${code}`);
});
