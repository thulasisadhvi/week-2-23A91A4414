const { authenticator } = require('otplib');
const base32 = require('hi-base32');

/**
 * Verify TOTP code with time window tolerance
 * * Args:
 * hex_seed: 64-character hex string
 * code: 6-digit code to verify
 * valid_window: Number of periods before/after to accept (default 1 = ±30s)
 * * Returns:
 * True if code is valid, False otherwise
 */
function verify_totp_code(hex_seed, code, valid_window = 1) {
    try {
        // Implementation Step 1: Convert hex seed to base32
        // Same process as generation: Hex -> Buffer -> Base32
        const buffer = Buffer.from(hex_seed, 'hex');
        const secret = base32.encode(buffer);

        // Implementation Step 2: Create TOTP object & Configure
        // We set the options here to ensure the window is correct
        authenticator.options = {
            digits: 6,
            step: 30,
            algorithm: 'sha1',
            window: valid_window // Implementation Step 3: Set tolerance
        };

        // Implementation Step 4: Return verification result
        // Library checks current period ± valid_window periods
        return authenticator.check(code, secret);

    } catch (error) {
        console.error("Error verifying TOTP:", error.message);
        return false;
    }
}

module.exports = { verify_totp_code };