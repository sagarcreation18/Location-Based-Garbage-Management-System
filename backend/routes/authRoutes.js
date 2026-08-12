const express = require("express");

const {
    register,
    login,
    sendOTP,
    verifyOTP,
    getMe
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// Register
router.post("/register", register);


// Email + Password login
router.post("/login", login);


// Phone OTP
router.post("/send-otp", sendOTP);

router.post("/verify-otp", verifyOTP);


// Current logged-in user
router.get("/me", authMiddleware, getMe);


module.exports = router;