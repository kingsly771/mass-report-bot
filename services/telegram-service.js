// Add this method to handle retries and better error reporting
async handleMassReporting(chatId, session) {
    try {
        const reportTemplate = this.reportService.generateReportTemplate(session);
        const progressMsg = await this.bot.sendMessage(chatId,
            `⏳ *Starting ${session.quantity} reports...*\n\n📧 Preparing ${session.quantity} email services...\n⏰ Estimated time: ${Math.ceil(session.quantity * 2.5)} seconds`,
            { parse_mode: 'Markdown' }
        );

        const results = await this.sendMultipleReports(chatId, reportTemplate, session.quantity, progressMsg);
        await this.sendDetailedSummary(chatId, results, session, progressMsg);
        
        this.reportService.updateUserReportCount(chatId, session.quantity);

    } catch (error) {
        console.error('Mass reporting error:', error);
        this.bot.sendMessage(chatId, `❌ Critical error: ${error.message}\n\nSome reports may be queued for retry.`)
            .catch(err => console.error('Error sending error message:', err));
    }
    
    this.userSessions.delete(chatId);
}

async sendDetailedSummary(chatId, results, session, progressMsg) {
    const successRate = Math.round((results.successful / session.quantity) * 100);
    const stats = this.emailService.getStats();
    
    const summaryMessage = `✅ *Mass Report Complete!*

*📊 Immediate Results:*
- Total attempted: ${session.quantity}
- ✅ Immediate success: ${results.successful}
- 🔄 Queued for retry: ${stats.pendingRetry}
- ❌ Permanent failures: ${results.failed - stats.pendingRetry}

*📈 Success Rate:*
- Current: ${successRate}%
- Expected after retry: ${Math.min(100, successRate + Math.round((stats.pendingRetry / session.quantity) * 100))}%

*📋 Report Details:*
- Number: ${session.phoneNumber}
- Category: ${session.category}
- Quantity: ${session.quantity}

*⚡ Retry System:*
Failed reports are automatically retried up to 3 times. Check /emailstats for updates.`;

    try {
        await this.bot.editMessageText(summaryMessage, {
            chat_id: chatId,
            message_id: progressMsg.message_id,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        this.bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' })
            .catch(err => console.error('Error sending fallback summary:', err));
    }
}

// Enhanced email stats command
handleEmailStats(msg) {
    const chatId = msg.chat.id;
    const stats = this.emailService.getStats();
    const failed = this.emailService.getFailedEmails();
    
    const statsMessage = `📧 *Email Service Statistics*

*📊 Overall:*
- Total emails sent: ${stats.total}
- ✅ Successful: ${stats.successful}
- ❌ Failed: ${stats.failed}
- 🔄 Pending retry: ${stats.pendingRetry}
- 📈 Success rate: ${stats.successRate}

*🔄 Retry Queue:*
${failed.length > 0 ? 
    failed.map(f => `- Attempt ${f.nextAttempt} for ${f.reportData.phoneNumber}`).join('\n') 
    : 'No emails in retry queue'}

*⚡ System Status:*
Retry system ${stats.pendingRetry > 0 ? 'active' : 'idle'}`;

    this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' })
        .catch(error => console.error('Error sending email stats:', error));
}
