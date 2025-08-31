const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const ReportService = require('./report-service');
const EmailService = require('./email-service');

class TelegramService {
    constructor() {
        if (!config.TELEGRAM_BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN is required in environment variables');
        }

        this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { 
            polling: true,
            request: {
                timeout: 60000
            }
        });
        this.reportService = new ReportService();
        this.emailService = new EmailService();
        this.userSessions = new Map();
        
        this.initializeHandlers();
        console.log('✅ Telegram service initialized successfully');
    }

    initializeHandlers() {
        // Use arrow functions to preserve 'this' context
        this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
        this.bot.onText(/\/report/, (msg) => this.handleReport(msg));
        this.bot.onText(/\/mystats/, (msg) => this.handleStats(msg));
        this.bot.onText(/\/emailstats/, (msg) => this.handleEmailStats(msg));
        this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
        this.bot.on('message', (msg) => this.handleMessage(msg));

        // Error handlers
        this.bot.on('polling_error', (error) => {
            console.error('🔴 Telegram polling error:', error.message);
        });

        this.bot.on('webhook_error', (error) => {
            console.error('🔴 Telegram webhook error:', error.message);
        });

        console.log('✅ Telegram bot handlers initialized');
    }

    handleStart(msg) {
        const chatId = msg.chat.id;
        const message = `🚨 *WhatsApp Mass Reporter Bot* 🚨

Send ${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION} reports automatically to WhatsApp support.

*✨ Features:*
- Send ${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION} reports per session
- Real email delivery to WhatsApp support
- Real-time progress updates
- Automatic retry system

*📊 Limits:*
- ${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION} reports per session
- ${config.MAX_REPORTS_PER_HOUR} reports per hour
- ${config.MAX_REPORTS_PER_DAY} reports per day

*📍 Commands:*
/report - Start mass reporting
/mystats - Check your statistics  
/emailstats - View email performance
/help - Get help information

Use /report to start mass reporting!`;

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending start message:', error));
    }

    handleReport(msg) {
        const chatId = msg.chat.id;
        const stats = this.reportService.getUserReportStats(chatId);
        
        if (!stats.canReport) {
            this.bot.sendMessage(chatId, 
                `❌ *Rate Limit Exceeded*\n\nYou've sent ${stats.reportsToday}/${config.MAX_REPORTS_PER_HOUR} reports this hour.\n\nPlease try again in about an hour.`,
                { parse_mode: 'Markdown' }
            ).catch(error => console.error('Error sending rate limit message:', error));
            return;
        }

        this.userSessions.set(chatId, { 
            step: 'awaiting_number',
            lastActivity: Date.now()
        });
        
        this.bot.sendMessage(chatId, 
            '📱 *Step 1/5:* Enter the WhatsApp number you want to report\n\nPlease include country code:\n\n*Example:* +1234567890',
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for number:', error));
    }

    handleStats(msg) {
        const chatId = msg.chat.id;
        const stats = this.reportService.getUserReportStats(chatId);
        
        const statsMessage = `📊 *Your Reporting Statistics*

- Reports sent this hour: ${stats.reportsToday}/${config.MAX_REPORTS_PER_HOUR}
- Reports remaining this hour: ${stats.remaining}
- Can submit new reports: ${stats.canReport ? '✅ Yes' : '❌ No'}
- Last report: ${stats.lastReport ? stats.lastReport.toLocaleString() : 'Never'}

*Note:* Hourly limits reset automatically.`;

        this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending stats:', error));
    }

    handleEmailStats(msg) {
        const chatId = msg.chat.id;
        const stats = this.emailService.getStats();
        
        const statsMessage = `📧 *Email Service Statistics*

*📊 Performance:*
- Total emails sent: ${stats.total}
- ✅ Successful deliveries: ${stats.successful}
- ❌ Failed attempts: ${stats.failed}
- 🔄 Pending retry: ${stats.pendingRetry}
- 📈 Success rate: ${stats.successRate}

*⚡ System Status:*
Email system is ${stats.total > 0 ? 'active' : 'ready'}`;

        this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending email stats:', error));
    }

    handleHelp(msg) {
        const chatId = msg.chat.id;
        const helpMessage = `🆘 *Mass Report Help Guide*

*📋 How It Works:*
1. Use /report to start
2. Enter WhatsApp number with country code
3. Select violation category
4. Describe the incident in detail
5. Choose how many reports to send
6. Bot sends emails to WhatsApp support
7. Receive delivery confirmation

*📊 Report Categories:*
${config.REPORT_CATEGORIES.map((cat, index) => `${index + 1}. ${cat}`).join('\n')}

*⏰ Time Estimates:*
- 10 reports: ~30 seconds
- 50 reports: ~2-3 minutes

*❓ Need Help?*
Ensure your SMTP settings are configured in the .env file.`;

        this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending help:', error));
    }

    handleMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        // Ignore commands and non-text messages
        if (!text || text.startsWith('/')) return;

        const session = this.userSessions.get(chatId);
        if (!session) return;

        console.log(`📩 User ${chatId} at step ${session.step}: ${text.substring(0, 50)}...`);

        // Update last activity
        session.lastActivity = Date.now();
        this.userSessions.set(chatId, session);

        switch (session.step) {
            case 'awaiting_number':
                this.handlePhoneNumber(chatId, text, session);
                break;
            case 'awaiting_category':
                this.handleCategory(chatId, text, session);
                break;
            case 'awaiting_description':
                this.handleDescription(chatId, text, session);
                break;
            case 'awaiting_contact':
                this.handleContactInfo(chatId, text, session);
                break;
            case 'awaiting_quantity':
                this.handleReportQuantity(chatId, text, session);
                break;
        }
    }

    handlePhoneNumber(chatId, text, session) {
        if (!this.reportService.isValidPhoneNumber(text)) {
            this.bot.sendMessage(chatId, '❌ Invalid phone number format. Please enter a valid WhatsApp number with country code:\n\n*Example:* +1234567890', { parse_mode: 'Markdown' })
                .catch(error => console.error('Error validating number:', error));
            return;
        }

        session.phoneNumber = text;
        session.step = 'awaiting_category';
        session.lastActivity = Date.now();
        this.userSessions.set(chatId, session);

        const categories = config.REPORT_CATEGORIES.map((cat, index) => `${index + 1}. ${cat}`).join('\n');
        
        this.bot.sendMessage(chatId, 
            `📋 *Step 2/5:* Select violation category:\n\n${categories}\n\nReply with the number (1-${config.REPORT_CATEGORIES.length})`,
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for category:', error));
    }

    handleCategory(chatId, text, session) {
        const categoryIndex = parseInt(text) - 1;
        
        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= config.REPORT_CATEGORIES.length) {
            this.bot.sendMessage(chatId, `❌ Invalid selection. Please choose a number between 1 and ${config.REPORT_CATEGORIES.length}:`)
                .catch(error => console.error('Error validating category:', error));
            return;
        }

        session.category = config.REPORT_CATEGORIES[categoryIndex];
        session.step = 'awaiting_description';
        session.lastActivity = Date.now();
        this.userSessions.set(chatId, session);

        this.bot.sendMessage(chatId, 
            '📝 *Step 3/5:* Describe the incident in detail:\n\n• What happened?\n• When did it occur?\n• Any specific messages or behavior?\n• Include any relevant details\n\n*Minimum 20 characters required*',
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for description:', error));
    }

    handleDescription(chatId, text, session) {
        if (text.length < config.VALIDATION.DESCRIPTION_MIN_LENGTH) {
            this.bot.sendMessage(chatId, `❌ Description too short. Minimum ${config.VALIDATION.DESCRIPTION_MIN_LENGTH} characters required. Please provide more details:`)
                .catch(error => console.error('Error validating description:', error));
            return;
        }

        if (text.length > config.VALIDATION.DESCRIPTION_MAX_LENGTH) {
            this.bot.sendMessage(chatId, `❌ Description too long. Maximum ${config.VALIDATION.DESCRIPTION_MAX_LENGTH} characters allowed. Please shorten your description:`)
                .catch(error => console.error('Error validating description length:', error));
            return;
        }

        session.description = text;
        session.step = 'awaiting_contact';
        session.lastActivity = Date.now();
        this.userSessions.set(chatId, session);

        this.bot.sendMessage(chatId, 
            '📞 *Step 4/5* (Optional): Provide your contact information for follow-up or type "skip" to remain anonymous:',
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for contact:', error));
    }

    handleContactInfo(chatId, text, session) {
        session.reporterContact = text.toLowerCase() === 'skip' ? 'Anonymous' : text;
        session.step = 'awaiting_quantity';
        session.lastActivity = Date.now();
        this.userSessions.set(chatId, session);

        const stats = this.reportService.getUserReportStats(chatId);
        const maxAllowed = Math.min(config.MAX_REPORTS_PER_SESSION, stats.remaining);

        this.bot.sendMessage(chatId, 
            `📊 *Step 5/5:* How many reports do you want to send?\n\n*Available:* ${maxAllowed} reports\n*Minimum:* ${config.MIN_REPORTS_PER_SESSION} reports\n*Maximum:* ${config.MAX_REPORTS_PER_SESSION} reports\n\nPlease enter a number between ${config.MIN_REPORTS_PER_SESSION} and ${maxAllowed}:`,
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for quantity:', error));
    }

    handleReportQuantity(chatId, text, session) {
        const quantity = parseInt(text);
        const stats = this.reportService.getUserReportStats(chatId);
        const maxAllowed = Math.min(config.MAX_REPORTS_PER_SESSION, stats.remaining);

        if (isNaN(quantity) || quantity < config.MIN_REPORTS_PER_SESSION || quantity > maxAllowed) {
            this.bot.sendMessage(chatId, `❌ Invalid quantity. Please enter a number between ${config.MIN_REPORTS_PER_SESSION} and ${maxAllowed}:`)
                .catch(error => console.error('Error validating quantity:', error));
            return;
        }

        if (quantity > stats.remaining) {
            this.bot.sendMessage(chatId, `❌ Not enough reports remaining. You have ${stats.remaining} reports left this hour, but requested ${quantity}.`)
                .catch(error => console.error('Error validating quota:', error));
            return;
        }

        session.quantity = quantity;
        session.lastActivity = Date.now();
        this.userSessions.set(chatId, session);
        
        this.handleMassReporting(chatId, session);
    }

    async handleMassReporting(chatId, session) {
        try {
            const reportTemplate = this.reportService.generateReportTemplate(session);
            const estimatedTime = Math.ceil((session.quantity * config.EMAIL_SEND_DELAY) / 1000);
            
            const progressMsg = await this.bot.sendMessage(chatId,
                `⏳ *Starting ${session.quantity} Reports*\n\n📧 Preparing to send ${session.quantity} emails to WhatsApp support...\n⏰ Estimated time: ${estimatedTime} seconds\n\n*Please wait, this may take a while...*`,
                { parse_mode: 'Markdown' }
            );

            // Send multiple reports
            const results = await this.sendMultipleReports(chatId, reportTemplate, session.quantity, progressMsg);
            
            // Send final summary
            await this.sendDetailedSummary(chatId, results, session, progressMsg);
            
            // Update user report count
            this.reportService.updateUserReportCount(chatId, session.quantity);

        } catch (error) {
            console.error('Mass reporting error:', error);
            this.bot.sendMessage(chatId, `❌ Error: ${error.message}\n\nPlease try with fewer reports or check your SMTP configuration.`)
                .catch(err => console.error('Error sending error message:', err));
        }
        
        // Clear session
        this.userSessions.delete(chatId);
    }

    async sendMultipleReports(chatId, reportTemplate, quantity, progressMsg) {
        const results = { successful: 0, failed: 0, emails: [] };
        const startTime = Date.now();
        
        for (let i = 0; i < quantity; i++) {
            // Update progress every 5 reports or every 10 seconds
            const currentTime = Date.now();
            if (i % 5 === 0 || i === quantity - 1 || currentTime - startTime > 10000) {
                await this.updateProgress(chatId, progressMsg, i, quantity, results, startTime);
            }

            try {
                const emailResult = await this.emailService.sendWhatsAppReport(reportTemplate);
                if (emailResult.sendResult && emailResult.sendResult.success) {
                    results.successful++;
                } else {
                    results.failed++;
                }
                results.emails.push(emailResult);
                
                // Delay between emails
                await new Promise(resolve => setTimeout(resolve, config.EMAIL_SEND_DELAY));
            } catch (error) {
                console.error('Error sending report:', error);
                results.failed++;
                // Short delay even on error
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }

    async updateProgress(chatId, progressMsg, current, total, results, startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const estimatedTotal = Math.ceil((total * config.EMAIL_SEND_DELAY) / 1000);
        const remaining = Math.max(0, estimatedTotal - elapsed);
        
        const progressText = `📧 *Progress: ${current + 1}/${total}*\n\n✅ Successful: ${results.successful}\n❌ Failed: ${results.failed}\n⏰ Elapsed: ${elapsed}s\n🕐 Remaining: ~${remaining}s\n\n🔄 Processing...`;

        try {
            await this.bot.editMessageText(progressText, {
                chat_id: chatId,
                message_id: progressMsg.message_id,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    }

    async sendDetailedSummary(chatId, results, session, progressMsg) {
        const successRate = results.successful > 0 ? 
            Math.round((results.successful / session.quantity) * 100) : 0;
        
        const stats = this.emailService.getStats();
        
        const summaryMessage = `✅ *Mass Report Operation Complete!*

*📊 Results:*
- Total attempted: ${session.quantity}
- ✅ Successful: ${results.successful}
- ❌ Failed: ${results.failed}
- 📈 Success rate: ${successRate}%

*📋 Report Details:*
- Number: ${session.phoneNumber}
- Category: ${session.category}
- Quantity: ${session.quantity}
- Timestamp: ${new Date().toLocaleString()}

*🎯 Impact:*
Your ${results.successful} reports have been sent to WhatsApp support. Each report increases visibility and priority.

*Note:* WhatsApp support reviews all reports. Thank you for helping maintain community safety!`;

        try {
            await this.bot.editMessageText(summaryMessage, {
                chat_id: chatId,
                message_id: progressMsg.message_id,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            // Fallback: send as new message
            this.bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' })
                .catch(err => console.error('Error sending fallback summary:', err));
        }
    }

    // Clean up old sessions
    cleanupSessions() {
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        let cleanedCount = 0;
        
        for (const [chatId, session] of this.userSessions.entries()) {
            if (session.lastActivity && session.lastActivity < oneHourAgo) {
                this.userSessions.delete(chatId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} stale sessions`);
        }
    }

    // Close resources
    close() {
        if (this.emailService) {
            this.emailService.close();
        }
        console.log('Telegram service closed');
    }
}

// Export the class
module.exports = TelegramService;
