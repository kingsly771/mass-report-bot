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
    }

    initializeHandlers() {
        // Use arrow functions to preserve 'this' context
        this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
        this.bot.onText(/\/report/, (msg) => this.handleReport(msg));
        this.bot.onText(/\/mystats/, (msg) => this.handleStats(msg));
        this.bot.onText(/\/emailstats/, (msg) => this.handleEmailStats(msg));
        this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
        this.bot.on('message', (msg) => this.handleMessage(msg));
    }

    handleStart(msg) {
        const chatId = msg.chat.id;
        const message = `🚨 *WhatsApp Mass Reporter Bot* 🚨

Send 10-100 reports automatically to WhatsApp support using different email addresses.

*✨ Features:*
- Send 10-100 reports per session
- Different temp emails for each report
- Real-time progress updates
- Automatic delivery

*📊 Limits:*
- ${config.MIN_REPORTS_PER_SESSION}-${config.MAX_REPORTS_PER_SESSION} reports per session
- ${config.MAX_REPORTS_PER_HOUR} reports per hour

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
- Reports remaining: ${stats.remaining}
- Can submit new reports: ${stats.canReport ? '✅ Yes' : '❌ No'}
- Last report: ${stats.lastReport ? stats.lastReport.toLocaleString() : 'Never'}`;

        this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending stats:', error));
    }

    handleEmailStats(msg) {
        const chatId = msg.chat.id;
        const stats = this.emailService.getStats();
        
        const statsMessage = `📧 *Email Service Statistics*

- Total emails sent: ${stats.total}
- Successful deliveries: ${stats.successful}
- Failed attempts: ${stats.failed}
- Success rate: ${stats.successRate}`;

        this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending email stats:', error));
    }

    handleHelp(msg) {
        const chatId = msg.chat.id;
        const helpMessage = `🆘 *Mass Report Help Guide*

*How It Works:*
1. Use /report to start
2. Provide WhatsApp number & details  
3. Choose how many reports to send (10-100)
4. Bot sends reports automatically
5. Get delivery confirmation

*Report Categories:*\n${config.REPORT_CATEGORIES.map((cat, index) => `${index + 1}. ${cat}`).join('\n')}`;

        this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' })
            .catch(error => console.error('Error sending help:', error));
    }

    handleMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        if (!text || text.startsWith('/')) return;

        const session = this.userSessions.get(chatId);
        if (!session) return;

        console.log(`User ${chatId} at step ${session.step}: ${text.substring(0, 50)}...`);

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
            this.bot.sendMessage(chatId, '❌ Invalid phone number format. Please enter a valid WhatsApp number with country code:')
                .catch(error => console.error('Error validating number:', error));
            return;
        }

        session.phoneNumber = text;
        session.step = 'awaiting_category';
        this.userSessions.set(chatId, session);

        const categories = config.REPORT_CATEGORIES.map((cat, index) => `${index + 1}. ${cat}`).join('\n');
        this.bot.sendMessage(chatId, 
            `📋 *Step 2/5:* Select violation category:\n\n${categories}\n\nReply with number (1-${config.REPORT_CATEGORIES.length})`,
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for category:', error));
    }

    handleCategory(chatId, text, session) {
        const categoryIndex = parseInt(text) - 1;
        
        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= config.REPORT_CATEGORIES.length) {
            this.bot.sendMessage(chatId, `❌ Invalid selection. Choose number 1-${config.REPORT_CATEGORIES.length}:`)
                .catch(error => console.error('Error validating category:', error));
            return;
        }

        session.category = config.REPORT_CATEGORIES[categoryIndex];
        session.step = 'awaiting_description';
        this.userSessions.set(chatId, session);

        this.bot.sendMessage(chatId, 
            '📝 *Step 3/5:* Describe the incident in detail:\n\n- What happened?\n- When?\n- Specific messages/behavior?',
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for description:', error));
    }

    handleDescription(chatId, text, session) {
        if (text.length < 20) {
            this.bot.sendMessage(chatId, '❌ Description too short. Minimum 20 characters:')
                .catch(error => console.error('Error validating description:', error));
            return;
        }

        session.description = text;
        session.step = 'awaiting_contact';
        this.userSessions.set(chatId, session);

        this.bot.sendMessage(chatId, 
            '📞 *Step 4/5* (Optional): Provide contact for follow-up or type "skip":',
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
            `📊 *Step 5/5:* How many reports? (10-${maxAllowed})\n\nAvailable: ${maxAllowed} reports\nMinimum: 10 reports`,
            { parse_mode: 'Markdown' }
        ).catch(error => console.error('Error asking for quantity:', error));
    }

    handleReportQuantity(chatId, text, session) {
        const quantity = parseInt(text);
        const stats = this.reportService.getUserReportStats(chatId);
        const maxAllowed = Math.min(config.MAX_REPORTS_PER_SESSION, stats.remaining);

        if (isNaN(quantity) || quantity < 10 || quantity > maxAllowed) {
            this.bot.sendMessage(chatId, `❌ Invalid. Enter number between 10 and ${maxAllowed}:`)
                .catch(error => console.error('Error validating quantity:', error));
            return;
        }

        session.quantity = quantity;
        this.handleMassReporting(chatId, session);
    }

    async handleMassReporting(chatId, session) {
        try {
            const reportTemplate = this.reportService.generateReportTemplate(session);
            const progressMsg = await this.bot.sendMessage(chatId,
                `⏳ *Starting ${session.quantity} reports...*\n\nPreparing email services...`,
                { parse_mode: 'Markdown' }
            );

            const results = await this.sendMultipleReports(chatId, reportTemplate, session.quantity, progressMsg);
            await this.sendSummary(chatId, results, session, progressMsg);
            
            this.reportService.updateUserReportCount(chatId, session.quantity);

        } catch (error) {
            console.error('Mass reporting error:', error);
            this.bot.sendMessage(chatId, `❌ Error: ${error.message}`)
                .catch(err => console.error('Error sending error message:', err));
        }
        
        this.userSessions.delete(chatId);
    }

    async sendMultipleReports(chatId, reportTemplate, quantity, progressMsg) {
        const results = { successful: 0, failed: 0, emails: [] };
        
        for (let i = 0; i < quantity; i++) {
            // Update progress every 10 reports
            if (i % 10 === 0 || i === quantity - 1) {
                await this.updateProgress(chatId, progressMsg, i, quantity, results);
            }

            try {
                const emailResult = await this.emailService.sendWhatsAppReport(reportTemplate);
                if (emailResult.sendResult.success) {
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
            }
        }
        
        return results;
    }

    async updateProgress(chatId, progressMsg, current, total, results) {
        const progressText = `📧 *Progress: ${current + 1}/${total}*\n\n✅ ${results.successful} successful\n❌ ${results.failed} failed`;
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

    async sendSummary(chatId, results, session, progressMsg) {
        const successRate = Math.round((results.successful / session.quantity) * 100);
        
        const summaryMessage = `✅ *Mass Report Complete!*

*📊 Results:*
- Total sent: ${session.quantity}
- ✅ Successful: ${results.successful}
- ❌ Failed: ${results.failed}
- 📈 Success rate: ${successRate}%

*📋 Details:*
- Number: ${session.phoneNumber}
- Category: ${session.category}
- Quantity: ${session.quantity}`;

        try {
            await this.bot.editMessageText(summaryMessage, {
                chat_id: chatId,
                message_id: progressMsg.message_id,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('Error sending summary:', error);
            // Fallback: send new message
            this.bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' })
                .catch(err => console.error('Error sending fallback summary:', err));
        }
    }
}

module.exports = TelegramService;
