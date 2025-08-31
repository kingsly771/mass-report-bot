const fs = require('fs');
const path = require('path');

console.log('📊 Bot Statistics');
console.log('='.repeat(40));

// Check if reports backup directory exists
const reportsDir = path.join(__dirname, '../reports_backup');
if (fs.existsSync(reportsDir)) {
    const files = fs.readdirSync(reportsDir);
    console.log(`   Reports backed up: ${files.length}`);
} else {
    console.log('   No reports backed up yet');
}

// Check if .env exists
if (fs.existsSync('.env')) {
    console.log('   Configuration: ✅ Set');
} else {
    console.log('   Configuration: ❌ Missing');
}

console.log('\n💡 Use npm start to run the bot');
