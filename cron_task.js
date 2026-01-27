const fs = require('fs');
const path = require('path');
// Ensure 'totp_generation.js' exists in the same folder
const { generate_totp_code } = require('./totp_generation');

// Docker volume paths
const DATA_DIR = '/data';
const CRON_DIR = '/cron';
const SEED_FILE = path.join(DATA_DIR, 'seed.txt');
const LOG_FILE = path.join(CRON_DIR, 'last_code.txt');

// Ensure cron directory exists (silently ignore if it exists)
if (!fs.existsSync(CRON_DIR)) {
    try { fs.mkdirSync(CRON_DIR, { recursive: true }); } catch (e) {}
}

function runTask() {  
    try {
        // 1. Check if seed exists
        if (!fs.existsSync(SEED_FILE)) {
            console.error("Seed file not found, skipping cron task.");
            return;
        }

        // 2. Read the seed
        const hexSeed = fs.readFileSync(SEED_FILE, 'utf8').trim();
        
        // 3. Generate the TOTP code
        const code = generate_totp_code(hexSeed);

        // 4. Create UTC Timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

        // 5. Log to file
        const logEntry = `${timestamp} - 2FA Code: ${code}`;
        fs.writeFileSync(LOG_FILE, logEntry);
        
        console.log(`[Cron] Logged: ${logEntry}`);

    } catch (error) {
        console.error("[Cron] Error:", error.message);
    }
}

// Run the task immediately when called
runTask();