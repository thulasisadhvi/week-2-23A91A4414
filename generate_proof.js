const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

// --- CONFIGURATION ---
const STUDENT_PRIVATE_KEY = './student_private.pem';
const INSTRUCTOR_PUBLIC_KEY = './instructor_public.pem';
const OUTPUT_FILE = 'proof.txt';

function generateProof() {
    console.log("\n🔐 Starting Proof Generation Process...");

    // 1. Validate Keys
    if (!fs.existsSync(STUDENT_PRIVATE_KEY) || !fs.existsSync(INSTRUCTOR_PUBLIC_KEY)) {
        console.error("❌ Error: Key files missing.");
        console.error("   Ensure 'student_private.pem' and 'instructor_public.pem' are in this folder.");
        process.exit(1);
    }

    try {
        // 2. Get Latest Git Commit Hash
        // Command: git log -1 --format=%H
        console.log("   GIT: Retrieving latest commit hash...");
        let commitHash;
        try {
            commitHash = execSync('git log -1 --format=%H').toString().trim();
        } catch (e) {
            throw new Error("Failed to run git command. Are you in a git repository?");
        }

        if (!commitHash || commitHash.length !== 40) {
            throw new Error(`Invalid commit hash: ${commitHash}`);
        }
        console.log(`   📝 Commit Hash: ${commitHash}`);

        // 3. Load Keys
        const studentKey = fs.readFileSync(STUDENT_PRIVATE_KEY, 'utf8');
        const instructorKey = fs.readFileSync(INSTRUCTOR_PUBLIC_KEY, 'utf8');

        // 4. Sign the Hash (RSA-PSS with SHA-256)
        console.log("   ✍️  Signing hash with your private key (RSA-PSS)...");
        const signature = crypto.sign(
            "sha256",
            Buffer.from(commitHash, 'utf8'),
            {
                key: studentKey,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN
            }
        );

        // 5. Encrypt the Signature (RSA-OAEP with SHA-256)
        console.log("   🔒 Encrypting signature with instructor public key (RSA-OAEP)...");
        const encryptedProof = crypto.publicEncrypt(
            {
                key: instructorKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            signature
        );

        // 6. Encode to Base64
        const finalProofString = encryptedProof.toString('base64');

        // 7. Output
        console.log("\n✅ Proof Generated Successfully!");
        console.log("---------------- COPY THE STRING BELOW ----------------");
        console.log(finalProofString);
        console.log("-------------------------------------------------------");

        // Optional: Save to file for easy copying
        fs.writeFileSync(OUTPUT_FILE, finalProofString);
        console.log(`\n📄 Also saved to '${OUTPUT_FILE}' for convenience.`);

    } catch (error) {
        console.error("\n❌ Error generating proof:", error.message);
    }
}

generateProof();
