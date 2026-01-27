const fs = require('fs');
const crypto = require('crypto');

// --- CONFIGURATION ---
const STUDENT_ID = "24A95A4405"; 
const REPO_URL = "https://github.com/sai1432-ss/24A95A4405-SOLUTION";
const INSTRUCTOR_API_URL = "https://eajeyq4r3zljoq4rpovy2nthda0vtjqf.lambda-url.ap-south-1.on.aws";
const LOCAL_API_URL = "http://localhost:8080";

// --- STEP 1: KEY GENERATION ---
function ensureKeys() {
    console.log("\n========================================");
    console.log("1️⃣  STEP 1: Checking Keys");
    console.log("========================================");
    
    if (fs.existsSync('./student_private.pem') && fs.existsSync('./student_public.pem')) {
        console.log("   ✅ Keys already exist locally.");
        return;
    }

    console.log("   ⚠️  Keys missing. Generating new RSA 4096-bit keys...");
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });

    fs.writeFileSync('student_public.pem', publicKey);
    fs.writeFileSync('student_private.pem', privateKey);
    console.log("   ✅ Keys generated and saved successfully.");
}

// --- STEP 2: GET ENCRYPTED SEED ---
async function ensureEncryptedSeed() {
    console.log("\n========================================");
    console.log("2️⃣  STEP 2: Getting Encrypted Seed");
    console.log("========================================");

    if (fs.existsSync('./encrypted_seed.txt')) {
        console.log("   ✅ 'encrypted_seed.txt' already exists locally.");
        return fs.readFileSync('./encrypted_seed.txt', 'utf8').trim();
    }

    console.log("   ⚠️  File missing. Requesting from Instructor API...");
    const publicKey = fs.readFileSync('./student_public.pem', 'utf8');
    
    const payload = {
        student_id: STUDENT_ID,
        github_repo_url: REPO_URL,
        public_key: publicKey
    };

    try {
        const response = await fetch(INSTRUCTOR_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        
        if (!data.encrypted_seed) throw new Error("No seed in response");

        fs.writeFileSync('encrypted_seed.txt', data.encrypted_seed);
        console.log("   ✅ Seed downloaded from API and saved to 'encrypted_seed.txt'.");
        return data.encrypted_seed;

    } catch (error) {
        console.error("   ❌ Failed to get seed:", error.message);
        process.exit(1);
    }
}

// --- STEP 3: SEND TO DOCKER ---
async function provisionDocker(encryptedSeed) {
    console.log("\n========================================");
    console.log("3️⃣  STEP 3: Provisioning Docker Container");
    console.log("========================================");
    console.log("   📤 Sending encrypted seed to http://localhost:8080/decrypt-seed ...");

    try {
        const response = await fetch(`${LOCAL_API_URL}/decrypt-seed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted_seed: encryptedSeed })
        });

        const text = await response.text();
        if (response.ok) {
            console.log("   ✅ Success! Docker received the seed.");
            console.log("   📂 Docker has decrypted it and saved it to /data/seed.txt");
        } else {
            throw new Error(`Server responded: ${response.status} ${text}`);
        }
    } catch (error) {
        console.error("   ❌ Failed to talk to Docker:", error.message);
        console.log("   💡 Hint: Is your container running? Try 'docker-compose up -d'");
        process.exit(1);
    }
}

// --- STEP 4: VERIFY ENDPOINTS ---
async function verifyEndpoints() {
    console.log("\n========================================");
    console.log("4️⃣  STEP 4: Verifying 2FA Logic");
    console.log("========================================");
    
    try {
        // --- A. Generate Code ---
        console.log("   🔹 Testing Generation Endpoint...");
        const genRes = await fetch(`${LOCAL_API_URL}/generate-2fa`);
        if (!genRes.ok) throw new Error("Generate endpoint failed");
        
        const genData = await genRes.json();
        console.log(`      ✅ Received Code: [ ${genData.code} ] (Valid for ${genData.valid_for}s)`);

        // --- B. Verify Valid Code ---
        console.log("\n   🔹 Testing Verification with VALID code...");
        const verifyRes = await fetch(`${LOCAL_API_URL}/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: genData.code })
        });
        const verifyData = await verifyRes.json();
        
        if (verifyData.valid === true) {
            console.log("      ✅ Success: Server accepted the valid code.");
        } else {
            console.error("      ❌ Error: Server rejected the valid code!");
        }

        // --- C. Verify Invalid Code (The New Test) ---
        console.log("\n   🔹 Testing Verification with INVALID code ('000000')...");
        const invalidRes = await fetch(`${LOCAL_API_URL}/verify-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: "000000" })
        });
        const invalidData = await invalidRes.json();

        if (invalidData.valid === false) {
            console.log("      ✅ Success: Server correctly rejected the invalid code.");
        } else {
            console.error("      ❌ Error: Server ACCEPTED an invalid code! (Security Risk)");
        }

        console.log("\n========================================");
        console.log("🎉  FULL SYSTEM IS OPERATIONAL!");
        console.log("========================================");

    } catch (error) {
        console.error("   ❌ Verification failed:", error.message);
    }
}

// --- MAIN EXECUTION FLOW ---
async function run() {
    ensureKeys();
    const seed = await ensureEncryptedSeed();
    await provisionDocker(seed);
    await verifyEndpoints();
}

run();