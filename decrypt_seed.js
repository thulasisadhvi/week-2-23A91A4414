const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const PRIVATE_KEY_PATH = './student_private.pem';
const ENCRYPTED_SEED_PATH = './encrypted_seed.txt';
const OUTPUT_FILE = 'data/seed.txt';

function decryptSeed() {
    console.log("--- Starting Step 5: Decryption ---");

    // 1. Load Private Key
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
        console.error(`❌ Error: Private key not found at ${PRIVATE_KEY_PATH}`);
        return;
    }
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    // 2. Load Encrypted Seed
    if (!fs.existsSync(ENCRYPTED_SEED_PATH)) {
        console.error(`❌ Error: Encrypted seed file not found at ${ENCRYPTED_SEED_PATH}`);
        console.error("   (Did Step 4 complete successfully?)");
        return;
    }
    const encryptedBase64 = fs.readFileSync(ENCRYPTED_SEED_PATH, 'utf8').trim();
    
    // Convert Base64 string to Buffer
    const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');

    try {
        console.log("🔓 Attempting decryption using RSA-OAEP-256...");

        // 3. Decrypt
        // Requirement: RSA/OAEP with SHA-256 hash algorithm and MGF1
        const decryptedBuffer = crypto.privateDecrypt(
            {
                key: privateKey,
                // "Padding: OAEP"
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                // "Hash Algorithm: SHA-256" (Node.js uses this for both Hash and MGF1)
                oaepHash: 'sha256',
            },
            encryptedBuffer
        );

        // Convert to string
        const decryptedSeed = decryptedBuffer.toString('utf8').trim();

        // 4. Validate
        // Requirement: Must be 64-character hex string
        const hexRegex = /^[0-9a-fA-F]{64}$/;
        if (!hexRegex.test(decryptedSeed)) {
            throw new Error(`Invalid seed format. Expected 64 hex chars, got: ${decryptedSeed}`);
        }

        console.log("✅ Validation passed: 64-character hex string.");

        // 5. Save to file
        fs.writeFileSync(OUTPUT_FILE, decryptedSeed);
        console.log(`\n🎉 SUCCESS! Decrypted seed saved to: ${OUTPUT_FILE}`);
        console.log("⚠️  Keep 'seed.txt'");

    } catch (error) {
        console.error("\n❌ Decryption Failed:", error.message);
        console.log("\nPossible causes:");
        console.log("1. The 'student_private.pem' does not match the public key sent in Step 4.");
        console.log("2. The 'encrypted_seed.txt' file is corrupted or empty.");
    }
}

decryptSeed();