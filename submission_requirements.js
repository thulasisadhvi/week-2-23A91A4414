const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

// --- CONFIGURATION ---
// UPDATE THIS WITH YOUR ACTUAL REPO URL!
const GITHUB_REPO_URL = "https://github.com/sai1432-ss/24A95A4405-SOLUTION"; 

const STUDENT_PRIVATE_KEY = './student_private.pem';
const STUDENT_PUBLIC_KEY = './student_public.pem';
const INSTRUCTOR_PUBLIC_KEY = './instructor_public.pem';
const ENCRYPTED_SEED_FILE = './encrypted_seed.txt';

function getSubmissionData() {
    console.log("\n📋 GATHERING SUBMISSION DATA...");
    console.log("==================================================\n");

    try {
        // --- 1. GitHub Repository URL ---
        console.log("1. GitHub Repository URL:");
        console.log(GITHUB_REPO_URL);
        console.log("-".repeat(50));

        // --- 2. Commit Hash ---
        // Requirement: 40-character hex string
        let commitHash;
        try {
            commitHash = execSync('git log -1 --format=%H').toString().trim();
        } catch (e) {
            throw new Error("Could not get git commit hash. Did you commit your code?");
        }
        console.log("\n2. Commit Hash:");
        console.log(commitHash);
        console.log("-".repeat(50));

        // --- 3. Encrypted Commit Signature ---
        // Requirement: Sign hash (RSA-PSS), Encrypt signature (RSA-OAEP), Base64 single line
        if (!fs.existsSync(STUDENT_PRIVATE_KEY) || !fs.existsSync(INSTRUCTOR_PUBLIC_KEY)) {
            throw new Error("Missing key files for signature generation.");
        }
        
        const studentKey = fs.readFileSync(STUDENT_PRIVATE_KEY, 'utf8');
        const instructorKey = fs.readFileSync(INSTRUCTOR_PUBLIC_KEY, 'utf8');

        // Sign
        const signature = crypto.sign(
            "sha256",
            Buffer.from(commitHash, 'utf8'),
            {
                key: studentKey,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN
            }
        );

        // Encrypt
        const encryptedProof = crypto.publicEncrypt(
            {
                key: instructorKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            signature
        );

        console.log("\n3. Encrypted Commit Signature (Copy full string):");
        const signatureBase64 = encryptedProof.toString('base64');
        console.log(signatureBase64); // This is guaranteed to be single line
        console.log("-".repeat(50));

        // --- 4. Student Public Key ---
        // Requirement: Contents of student_public.pem
        console.log("\n4. Student Public Key:");
        const pubKey = fs.readFileSync(STUDENT_PUBLIC_KEY, 'utf8').trim();
        console.log(pubKey);
        console.log("-".repeat(50));

        // --- 5. Encrypted Seed ---
        // Requirement: Contents of encrypted_seed.txt (Single line)
        console.log("\n5. Encrypted Seed:");
        if (!fs.existsSync(ENCRYPTED_SEED_FILE)) throw new Error("encrypted_seed.txt missing");
        
        // Remove any newlines just in case, though the file should be clean
        const encryptedSeed = fs.readFileSync(ENCRYPTED_SEED_FILE, 'utf8').replace(/[\r\n]+/g, '');
        console.log(encryptedSeed);
        console.log("==================================================\n");

        console.log("✅ DONE! Copy these 5 values into your submission form.");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
    }
}

getSubmissionData();
