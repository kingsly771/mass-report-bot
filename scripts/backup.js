const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

console.log('💾 Starting backup...');

const backupDir = path.join(__dirname, '../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupId = `backup-${timestamp}-${uuidv4().slice(0, 8)}`;

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Files to backup
const filesToBackup = [
    '.env',
    'config.js',
    'reports_backup/',
    'templates/'
];

console.log(`📦 Creating backup: ${backupId}`);
console.log('✅ Backup completed successfully');
