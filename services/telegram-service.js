const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const ReportService = require('./report-service');
const EmailService = require('./email-service');

class TelegramService {
    constructor() {
        this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
        this.reportService = new ReportService();
        this.emailService = new EmailService();
        this.userSessions = new Map();
        
        this.initializeHandlers();
        console.log('✅ Telegram service initialized');
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
            console.error('🔴 Telegram polling error:', error);
        });

        this.bot.on('webhook_error', (error) => {
            console.error('🔴 Telegram webhook error:', error);
        });
    }

    handleStart(msg) {
        const chatId = msg.chat.id;
        const message = `🚨 *WhatsApp Mass Reporter Bot* 🚨

Send ${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION} reports automatically to WhatsApp support using different email addresses.

*✨ Features:*
- Send ${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION} reports per session
- Different temp emails for each report
- Real-time progress updates
- Automatic delivery
- Retry system for failed emails

*📊 Limits:*
- ${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION} reports per session
- ${config.MAX_REPORTS_PER_HOUR} reports per hour
- ${config.MAX_REPORTS_PER_DAY} reports per day

Use /report to start mass reporting!`;

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending start message:', error));
    }

    handleReport(msg) {
        const chatId = msg.chat.id;
        const stats = this.reportService.getUserReportStats(chatId);
        
        if (!stats.canReport) {
            this.bot.sendMessage(chatId, 
                `❌ *Rate Limit Exceeded*\n\nYou've sent ${stats.reportsToday}/${config.MAX_REPORTS_PER_HOUR} reports this hour. Try again later.`,
                { parse_mode: 'Markdown' }
            ).catch(error => console.error('Error sending rate limit message:', error));
            return;
        }

        this.userSessions.set(chatId, { step: 'awaiting_number' });
        this.bot.sendMessage(chatId, 
            '📱 *Step 1/5:* Enter WhatsApp number with country code:\n\nExample: +1234567890',
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for number:', error));
    }

    handleStats(msg) {
        const chatId = msg.chat.id;
        const stats = this.reportService.getUserReportStats(chatId);
        
        const statsMessage = `📊 *Your Reporting Statistics*

- Reports sent this hour: ${stats.reportsToday}/${config.MAX_REPORTS_PER_HOUR}
- Reports remaining this hour: ${stats.remaining}
- Total reports today: ${stats.reportsToday}
- Can submit new reports: ${stats.canReport ? '✅ Yes' : '❌ No'}
- Last report: ${stats.lastReport ? stats.lastReport.toLocaleString() : 'Never'}

*Note:* Limits reset every hour.`;

        this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending stats:', error));
    }

    handleEmailStats(msg) {
        const chatId = msg.chat.id;
        const stats = this.emailService.getStats();
        const failed = this.emailService.getFailedEmails();
        
        const statsMessage = `📧 *Email Service Statistics*

*📊 Overall Performance:*
- Total emails sent: ${stats.total}
- ✅ Successful: ${stats.successful}
- ❌ Failed: ${stats.failed}
- 🔄 Pending retry: ${stats.pendingRetry}
- 📈 Success rate: ${stats.successRate}

*🔄 Retry Queue Status:*
${failed.length > 0 ? 
    `Currently ${failed.length} emails in retry queue\n` +
    failed.slice(0, 3).map(f => `- ${f.reportData.phoneNumber} (attempt ${f.nextAttempt})`).join('\n') +
    (failed.length > 3 ? `\n... and ${failed.length - 3} more` : '')
    : 'No emails in retry queue'}

*⚡ System Status:* ${stats.pendingRetry > 0 ? 'Retry system active' : 'System idle'}`;

        this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending email stats:', error));
    }

    handleHelp(msg) {
        const chatId = msg.chat.id;
        const helpMessage = `🆘 *Mass Report Help Guide*

*📋 How It Works:*
1. Use /report to start
2. Provide WhatsApp number with country code
3. Select violation category
4. Describe the incident in detail
5. Choose how many reports to send (${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION})
6. Bot sends reports automatically from different emails
7. Receive delivery confirmation

*📊 Report Categories:*
${config.REPORT_CATEGORIES.map((cat, index) => `${index + 1}. ${cat} (${config.getCategorySeverity(cat)})`).join('\n')}

*⏰ Time Estimates:*
- ${config.MIN_REPORTS_PER_SESSION} reports: ~30 seconds
- ${config.MAX_REPORTS_PER_SESSION} reports: ~3-5 minutes

*❓ Need Help?*
Contact support if you encounter issues.`;

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
            this.bot.sendMessage(chatId, '❌ Invalid phone number format. Please enter a valid WhatsApp number with country code (e.g., +1234567890):')
                .catch(error => console.error('Error validating number:', error));
            return;
        }

        session.phoneNumber = text;
        session.step = 'awaiting_category';
        this.userSessions.set(chatId, session);

        const categories = config.REPORT_CATEGORIES.map((cat, index) => 
            `${index + 1}. ${cat} (${config.getCategorySeverity(cat)})`
        ).join('\n');
        
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
        this.userSessions.set(chatId, session);

        this.bot.sendMessage(chatId, 
            '📝 *Step 3/5:* Describe the incident in detail:\n\n• What happened?\n• When did it occur?\n• Any specific messages or behavior?\n• Screenshots or evidence details\n\n*Minimum 20 characters*',
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for description:', error));
    }

    handleDescription(chatId, text, session) {
        if (text.length < config.VALIDATION.DESCRIPTION_MIN_LENGTH) {
            this.bot.sendMessage(chatId, `❌ Description too short. Minimum ${config.VALIDATION.DESCRIPTION_MIN_LENGTH} characters required. Please provide more details:`)
                .catch(error => console.error('Error validating description:', error));
            return;
        }

        session.description = text;
        session.step = 'awaiting_contact';
        this.userSessions.set(chatId, session);

        this.bot.sendMessage(chatId, 
            '📞 *Step 4/5* (Optional): Provide your contact information for follow-up or type "skip" to remain anonymous:',
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for contact:', error));
    }

    handleContactInfo(chatId, text, session) {
        session.reporterContact = text.toLowerCase() === 'skip' ? 'Anonymous' : text;
        session.step = 'awaiting_quantity';
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
        this.userSessions.set(chatId, session);
        this.handleMassReporting(chatId, session);
    }

    async handleMassReporting(chatId, session) {
        try {
            const reportTemplate = this.reportService.generateReportTemplate(session);
            const estimatedTime = Math.ceil((session.quantity * config.EMAIL_SEND_DELAY) / 1000);
            
            const progressMsg = await this.bot.sendMessage(chatId,
                `⏳ *Starting ${session.quantity} Reports*\n\n📧 Initializing ${session.quantity} email services...\n⏰ Estimated time: ${estimatedTime} seconds\n\n*Please wait, this may take a while...*`,
                { parse_mode: 'Markdown' }
            );

            const results = await this.sendMultipleReports(chatId, reportTemplate, session.quantity, progressMsg);
            await this.sendDetailedSummary(chatId, results, session, progressMsg);
            
            this.reportService.updateUserReportCount(chatId, session.quantity);

        } catch (error) {
            console.error('Mass reporting error:', error);
            this.bot.sendMessage(chatId, `❌ Critical error: ${error.message}\n\nSome reports may be queued for retry. Check /emailstats for updates.`)
                .catch(err => console.error('Error sending error message:', err));
        }
        
        this.userSessions.delete(chatId);
    }

    async sendMultipleReports(chatId, reportTemplate, quantity, progressMsg) {
        const results = { successful: 0, failed: 0, emails: [] };
        const startTime = Date.now();
        
        for (let i = 0; i < quantity; i++) {
            // Update progress every 10 reports or every 15 seconds
            if (i % 10 === 0 || i === quantity - 1) {
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
        const expectedSuccess = Math.min(100, successRate + Math.round((stats.pendingRetry / session.quantity) * 100));
        
        const summaryMessage = `✅ *Mass Report Operation Complete!*

*📊 Immediate Results:*
- Total attempted: ${session.quantity}
- ✅ Immediate success: ${results.successful}
- 🔄 Queued for retry: ${stats.pendingRetry}
- ❌ Permanent failures: ${results.failed - stats.pendingRetry}

*📈 Success Metrics:*
- Current success rate: ${successRate}%
- Expected after retry: ~${expectedSuccess}%

*📋 Report Details:*
- Number: ${session.phoneNumber}
- Category: ${session.category}
- Quantity requested: ${session.quantity}
- Timestamp: ${new Date().toLocaleString()}

*⚡ Retry System:*
Failed reports are automatically retried up to ${config.MAX_EMAIL_ATTEMPTS} times. Check /emailstats for updates.`;

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
        
        for (const [chatId, session] of this.userSessions.entries()) {
            if (session.lastActivity && session.lastActivity < oneHourAgo) {
                this.userSessions.delete(chatId);
                console.log(`🧹 Cleaned up stale session for user ${chatId}`);
            }
        }
    }
}

// Start session cleanup
setInterval(() => {
    if (telegramServiceInstance) {
        telegramServiceInstance.cleanupSessions();
    }
}, 300000); // Clean every 5 minutes

module.exports = TelegramService;
