#*WhatsApp Mass Reporter Bot 🤖*

A powerful Telegram bot that automatically sends mass reports to WhatsApp support using professional email templates. Send 10-50 reports per session with different email variations to increase visibility and priority.

https://img.shields.io/badge/WhatsApp-Mass%2520Reporter-brightgreen
https://img.shields.io/badge/Telegram-Bot-blue
https://img.shields.io/badge/Node.js-18%252B-green

🚀 Features
Mass Reporting: Send 10-50 reports per session to WhatsApp support

Professional Templates: Pre-built email templates that get attention

Multiple Email Variations: Unique content for each report to avoid duplication flags

Real-time Progress: Live updates during report sending

Automatic Retry System: Failed reports are automatically retried

Rate Limiting: Smart limits to prevent abuse

Security First: Uses App Passwords, never store regular passwords

📋 Prerequisites
Node.js 16.0 or higher

npm or yarn

Telegram account

Gmail account (with 2FA enabled)

Google App Password (required)

⚡ Quick Start
1. Installation
bash
# Clone the repository
git clone https://github.com/yourusername/whatsapp-mass-reporter.git
cd whatsapp-mass-reporter

# Run automated setup
npm run setup

# Install dependencies
npm install
2. Configuration
Telegram Bot Token
Message @BotFather on Telegram

Send /newbot and follow instructions

Copy the bot token

Gmail App Password (REQUIRED)
Enable 2-Factor Authentication

Generate App Password

Select "Mail" → "Other" → Name: "WhatsApp Bot"

Copy the 16-digit app password

Edit .env File
env
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_16_digit_app_password  # ← APP PASSWORD ONLY!
3. Testing
bash
# Test email configuration
npm run test:email

# Test bot configuration
npm run test:bot
4. Run the Bot
bash
# Start the bot
npm start

# Development mode with auto-restart
npm run dev
🎯 How to Use
Starting the Bot
Message your bot on Telegram

Send /start to begin

Mass Reporting Process
Send /report to start

Step 1: Enter WhatsApp number (with country code, e.g., +1234567890)

Step 2: Select violation category (1-10)

Step 3: Describe the incident in detail (min. 20 characters)

Step 4: Provide contact info or type "skip"

Step 5: Choose number of reports (10-50)

Watch progress as reports are sent automatically

Available Commands
/start - Show welcome message and instructions

/report - Start mass reporting process

/mystats - Check your reporting statistics

/emailstats - View email performance metrics

/help - Get help information

📊 Reporting Categories
Spam - Unwanted promotional messages

Harassment - Bullying or threatening behavior

Fake Account - Impersonation or fake profiles

Impersonation - Pretending to be someone else

Illegal Activities - Illegal content or activities

Privacy Violation - Sharing private information

Threats - Direct threats or intimidation

Scam - Fraudulent schemes

Abusive Content - Hate speech or abuse

Other - Other violations

⚙️ Configuration Options
.env File Settings
env
# Reporting Limits
MIN_REPORTS_PER_SESSION=10      # Minimum reports per session
MAX_REPORTS_PER_SESSION=50      # Maximum reports per session
MAX_REPORTS_PER_HOUR=100        # Hourly limit per user
MAX_REPORTS_PER_DAY=500         # Daily limit per user

# Email Settings
EMAIL_SEND_DELAY=3000           # Delay between emails (ms)
MAX_EMAIL_ATTEMPTS=3            # Retry attempts for failed emails
EMAIL_RETRY_DELAY=10000         # Delay between retries (ms)

# SMTP Configuration (Gmail example)
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
🛡️ Security Features
App Passwords Only - Never uses regular Google passwords

Rate Limiting - Prevents abuse and overuse

IP Restrictions - Optional IP-based rate limiting

Session Management - Automatic cleanup of old sessions

No Data Storage - Reports are not stored long-term

🔧 Troubleshooting
Common Issues
❌ Emails not sending:

Verify App Password (not regular password)

Enable 2-factor authentication

Check SMTP settings in .env

❌ Bot not responding:

Check TELEGRAM_BOT_TOKEN in .env

Verify internet connection

❌ Rate limited:

Wait for cooldown period (1 hour)

Reduce number of reports per session

Testing Commands
bash
# Test email functionality
npm run test:email

# Verify configuration
npm run test:config

# Check bot status
npm run test:bot
📁 Project Structure
text
whatsapp-mass-reporter/
├── index.js              # Main application entry point
├── config.js             # Configuration and settings
├── setup.js              # Automated setup script
├── test-email.js         # Email testing utility
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (created by setup)
├── services/
│   ├── telegram-service.js    # Telegram bot handling
│   ├── email-service.js       # Email sending logic
│   └── report-service.js      # Report generation
├── providers/
│   └── real-email-provider.js # SMTP email provider
├── templates/
│   └── report-template.txt    # Email template
├── scripts/              # Utility scripts
├── reports_backup/       # Report backups (optional)
├── temp/                 # Temporary files
└── logs/                 # Application logs
🚨 Important Notes
Legal and Ethical Use
Only report genuine violations

Do not abuse the system

Respect WhatsApp's Terms of Service

Provide accurate information

This tool is for legitimate reporting only

Technical Limitations
Requires stable internet connection

Gmail has daily sending limits (500 emails/day)

WhatsApp support response times may vary

Some emails may be filtered as spam initially

Performance
10 reports: ~30 seconds

50 reports: ~2-3 minutes

Speed depends on email service performance

🤝 Contributing
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing-feature)

Open a Pull Request

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

⚠️ Disclaimer
This bot is designed for legitimate reporting of WhatsApp policy violations. The developers are not responsible for misuse of this tool. Users are responsible for complying with WhatsApp's Terms of Service and applicable laws.

🆘 Support
If you need help:

Check the troubleshooting section above

Verify your .env file configuration

Ensure you're using App Password (not regular password)

Test email functionality with npm run test:email

For bugs or feature requests, please open an issue on GitHub.

⭐ If this project helped you, please give it a star on Github 
WhatsApp Mass Reporter Bot v2.0
By *KINGSLEY771*

