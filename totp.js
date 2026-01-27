const { authenticator } = require('otplib');
const base32 = require('hi-base32');

/**
 * Generate current TOTP code from hex seed
 * * Args:
 * hex_seed: 64-character hex string
 * * Returns:
 * 6-digit TOTP code as string
 */
function generate_totp_code(hex_seed) {
    // Implementation Step 1: Convert hex seed to bytes
    // "Parse 64-character hex string to bytes"
    const buffer = Buffer.from(hex_seed, 'hex');

    // Implementation Step 2: Convert bytes to base32 encoding
    // "Encode the bytes using base32 encoding"
    // "Decode to string" (handled by the library returning a string)
    const secret = base32.encode(buffer);

    // Implementation Step 3: Create TOTP object / Configure settings
    // "Use default settings: SHA-1, 30s period, 6 digits"
    authenticator.options = { 
        digits: 6, 
        step: 30, 
        algorithm: 'sha1' 
    };

    // Implementation Step 4: Generate current TOTP code
    // "Call library method to get current code"
    const code = authenticator.generate(secret);

    // Implementation Step 5: Return the code
    return code;
}

module.exports = { generate_totp_code };