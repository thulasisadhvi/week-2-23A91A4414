const crypto = require('crypto');
const fs = require('fs');

function generateStudentKeys() {
    console.log("Generating RSA 4096-bit Key Pair... (This may take a moment)");

    // 1. Generate the Key Pair
    // Requirement: RSA 4096 bits, standard exponent 65537
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096, // REQUIRED: 4096 bits
        publicKeyEncoding: {
            type: 'pkcs1', // "Public Key Cryptography Standards #1"
            format: 'pem'  // REQUIRED: PEM format
        },
        privateKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'  // REQUIRED: PEM format
        }
    });

    // 2. Save the files to disk
    // Requirement: Specific filenames provided in instructions
    fs.writeFileSync('student_public.pem', publicKey);
    fs.writeFileSync('student_private.pem', privateKey);

    console.log("\n✅ Keys created successfully!");
    console.log("Created: student_public.pem");
    console.log("Created: student_private.pem");
}

generateStudentKeys();