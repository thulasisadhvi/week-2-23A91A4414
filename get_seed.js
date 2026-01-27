const fs = require('fs');

// --- CONFIGURATION ---
const STUDENT_ID = "23A91A4414"; 
const REPO_URL = "https://github.com/thulasisadhvi/week-2-23A91A4414";
const API_URL = "https://eajeyq4r3zljoq4rpovy2nthda0vtjqf.lambda-url.ap-south-1.on.aws";

async function requestSeed(studentId, githubRepoUrl, apiUrl) {
    console.log("--- Starting Request for Seed ---");

    // --- Step 1: Read student public key from PEM file ---
    // "Open and read the public key file"
    // "Keep the PEM format with BEGIN/END markers"
    const publicKeyPath = './student_public.pem';
    if (!fs.existsSync(publicKeyPath)) {
        console.error(`❌ Error: ${publicKeyPath} not found.`);
        return;
    }
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    // --- Step 2: Prepare HTTP POST request payload ---
    // "Create JSON with student_id, github_repo_url, public_key"
    // "Most HTTP libraries handle newlines in JSON automatically" (JSON.stringify does this)
    const payload = {
        student_id: studentId,
        github_repo_url: githubRepoUrl,
        public_key: publicKey
    };

    try {
        // --- Step 3: Send POST request to instructor API ---
        // "Use your language's HTTP client" (Using native fetch for Node 18+)
        // "Set Content-Type: application/json"
        console.log("Sending request...");
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // --- Step 4: Parse JSON response ---
        // "Handle error responses appropriately"
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        // "Extract 'encrypted_seed' field"
        const data = await response.json();
        
        if (!data.encrypted_seed) {
            throw new Error("Response missing 'encrypted_seed' field");
        }

        // --- Step 5: Save encrypted seed to file ---
        // "Write to encrypted_seed.txt as plain text"
        fs.writeFileSync('encrypted_seed.txt', data.encrypted_seed);
        
        // Output the specific JSON format you requested
        console.log(JSON.stringify({
            status: "success",
            encrypted_seed: data.encrypted_seed
        }, null, 2));



    } catch (error) {
        console.error("\n❌ Request Failed:", error.message);
    }
}

// Run the function
requestSeed(STUDENT_ID, REPO_URL, API_URL);