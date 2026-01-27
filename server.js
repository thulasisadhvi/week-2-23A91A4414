const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- 1. IMPORT YOUR HELPER FILES ---
// Ensure 'totp_generation.js' and 'totp_verification.js' are in the same folder
const { generate_totp_code } = require('./totp_generation');
const { verify_totp_code } = require('./totp_verification');

const app = express();
const PORT = 8080;

app.use(express.json());

// --- CONFIGURATION ---
const PRIVATE_KEY_PATH = './student_private.pem';
// NOTE: Change to './data' if testing locally on Windows
const DATA_DIR = './data'; 
const SEED_FILE_PATH = path.join(DATA_DIR, 'seed.txt');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)){
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

// --- ENDPOINT 1: POST /decrypt-seed (Existing) ---
app.post('/decrypt-seed', (req, res) => {
    console.log("📥 Received decryption request...");
    try {
        const { encrypted_seed } = req.body;
        if (!encrypted_seed) return res.status(500).json({ error: "Decryption failed" });
        if (!fs.existsSync(PRIVATE_KEY_PATH)) return res.status(500).json({ error: "Private key missing" });

        const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
        const buffer = Buffer.from(encrypted_seed, 'base64');
        const decryptedBuffer = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            buffer
        );
        const decryptedSeed = decryptedBuffer.toString('utf8').trim();

        if (!/^[0-9a-fA-F]{64}$/.test(decryptedSeed)) {
            return res.status(500).json({ error: "Decryption failed (Invalid Hex)" });
        }

        fs.writeFileSync(SEED_FILE_PATH, decryptedSeed);
        console.log("✅ Seed decrypted and saved.");
        return res.status(200).json({ status: "ok" });

    } catch (error) {
        console.error("Decryption Error:", error.message);
        return res.status(500).json({ error: "Decryption failed" });
    }
});

// --- ENDPOINT 2: GET /generate-2fa (New) ---
app.get('/generate-2fa', (req, res) => {
    try {
        // 1. Check if seed exists
        if (!fs.existsSync(SEED_FILE_PATH)) {
            return res.status(500).json({ error: "Seed not decrypted yet" });
        }

        // 2. Read seed and generate code
        const hexSeed = fs.readFileSync(SEED_FILE_PATH, 'utf8').trim();
        const code = generate_totp_code(hexSeed);

        // 3. Calculate validity
        const seconds = Math.floor(Date.now() / 1000);
        const validFor = 30 - (seconds % 30);

        return res.status(200).json({ code: code, valid_for: validFor });

    } catch (error) {
        console.error("Generate Error:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- ENDPOINT 3: POST /verify-2fa (New) ---
app.post('/verify-2fa', (req, res) => {
    try {
        const { code } = req.body;
        
        // Handle Missing Input (HTTP 400)
        if (!code) return res.status(400).json({ error: "Missing code" });

        // Handle Missing Seed (HTTP 500)
        if (!fs.existsSync(SEED_FILE_PATH)) {
            return res.status(500).json({ error: "Seed not found" });
        }

        // Verify
        const hexSeed = fs.readFileSync(SEED_FILE_PATH, 'utf8').trim();
        const isValid = verify_totp_code(hexSeed, code);

        return res.status(200).json({ valid: isValid });

    } catch (error) {
        console.error("Verify Error:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Microservice listening on port ${PORT}`);
});