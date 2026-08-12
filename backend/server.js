const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");

const app = express();


// ========================================
// Middleware
// ========================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// ========================================
// Test Route
// ========================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "EcoTech Smart City Backend API is running 🚛🌱",
        version: "1.0.0"
    });

});


// ========================================
// Authentication Routes
// ========================================

app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);


// ========================================
// 404 Handler
// ========================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });

});


// ========================================
// Error Handler
// ========================================

app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({
        success: false,
        message: "Something went wrong on the server"
    });

});


// ========================================
// Start Server
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log("");
    console.log("==========================================");
    console.log("🌱 EcoTech Smart City Backend");
    console.log("==========================================");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("==========================================");
    console.log("");

});
