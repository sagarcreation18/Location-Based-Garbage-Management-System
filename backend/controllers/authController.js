const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");


// ========================================
// Generate JWT Token
// ========================================

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        }
    );
}


// ========================================
// REGISTER
// ========================================

exports.register = async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            password,
            role
        } = req.body;

        // Check required fields
        if (!full_name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            });
        }

        // Validate role
        const allowedRoles = ["Citizen", "Driver"];

        const selectedRole = role || "Citizen";

        if (!allowedRoles.includes(selectedRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
            });
        }

        // Validate phone
        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must contain 10 digits"
            });
        }

        // Validate password
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters"
            });
        }

        // Check existing email
        const [existingEmail] = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Check existing phone
        const [existingPhone] = await pool.execute(
            "SELECT id FROM users WHERE phone = ?",
            [phone]
        );

        if (existingPhone.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Phone number already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await pool.execute(
            `INSERT INTO users
            (full_name, email, phone, password, role)
            VALUES (?, ?, ?, ?, ?)`,
            [
                full_name,
                email,
                phone,
                hashedPassword,
                selectedRole
            ]
        );

        // Find created user
        const [users] = await pool.execute(
            `SELECT id, full_name, email, phone, role, status, created_at
             FROM users
             WHERE id = ?`,
            [result.insertId]
        );

        const user = users[0];

        // Generate token
        const token = generateToken(user);

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            token,
            user
        });

    } catch (error) {

        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};


// ========================================
// LOGIN WITH EMAIL + PASSWORD
// ========================================

exports.login = async (req, res) => {
    try {

        const {
            email,
            password,
            role
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user
        const [users] = await pool.execute(
            `SELECT *, password_hash AS password,
                    IF(is_active = 1, 'Active', 'Inactive') AS status
             FROM users
             WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        // Check role
        if (role && String(user.role).toLowerCase() !== String(role).toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: "Selected role does not match this account"
            });
        }

        // Check account status
        if (user.status !== "Active") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate JWT
        const token = generateToken(user);

        // Never include password hashes in an authentication response.
        delete user.password;
        delete user.password_hash;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {

        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};


// ========================================
// SEND DEMO OTP
// ========================================

exports.sendOTP = async (req, res) => {
    try {

        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Invalid phone number"
            });
        }

        // Check if user exists
        const [users] = await pool.execute(
            `SELECT id, full_name, email, phone, role, status
             FROM users
             WHERE phone = ?`,
            [phone]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No account found with this phone number"
            });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // OTP valid for 5 minutes
        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // Remove old OTPs
        await pool.execute(
            `DELETE FROM otp_codes
             WHERE phone = ?`,
            [phone]
        );

        // Save OTP
        await pool.execute(
            `INSERT INTO otp_codes
             (phone, otp, expires_at)
             VALUES (?, ?, ?)`,
            [
                phone,
                otp,
                expiresAt
            ]
        );

        // Demo only
        console.log(`📱 Demo OTP for ${phone}: ${otp}`);

        return res.status(200).json({
            success: true,
            message: "Demo OTP generated successfully",

            // Only for development/demo
            demoOTP: otp,

            expiresIn: "5 minutes"
        });

    } catch (error) {

        console.error("Send OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while generating OTP"
        });
    }
};


// ========================================
// VERIFY OTP
// ========================================

exports.verifyOTP = async (req, res) => {
    try {

        const {
            phone,
            otp,
            role
        } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required"
            });
        }

        // Find OTP
        const [otpRecords] = await pool.execute(
            `SELECT *
             FROM otp_codes
             WHERE phone = ?
             AND otp = ?
             AND verified = FALSE
             ORDER BY id DESC
             LIMIT 1`,
            [phone, otp]
        );

        if (otpRecords.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        const otpRecord = otpRecords[0];

        // Check expiry
        if (new Date(otpRecord.expires_at) < new Date()) {

            return res.status(401).json({
                success: false,
                message: "OTP has expired"
            });
        }

        // Find user
        const [users] = await pool.execute(
            `SELECT id, full_name, email, phone, role, status, created_at
             FROM users
             WHERE phone = ?`,
            [phone]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User account not found"
            });
        }

        const user = users[0];

        // Check role
        if (role && user.role !== role) {
            return res.status(403).json({
                success: false,
                message: "Selected role does not match this account"
            });
        }

        if (user.status !== "Active") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        // Mark OTP as verified
        await pool.execute(
            `UPDATE otp_codes
             SET verified = TRUE
             WHERE id = ?`,
            [otpRecord.id]
        );

        // Generate JWT
        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            token,
            user
        });

    } catch (error) {

        console.error("Verify OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while verifying OTP"
        });
    }
};


// ========================================
// GET CURRENT USER
// ========================================

exports.getMe = async (req, res) => {
    try {

        const [users] = await pool.execute(
            `SELECT id, full_name, email, phone, role, status, created_at
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: users[0]
        });

    } catch (error) {

        console.error("Get user error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
