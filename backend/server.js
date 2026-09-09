const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { corsOptions, securityHeaders } = require("./middleware/security");
const rateLimit = require("./middleware/rateLimit");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const adminRoutes = require("./routes/adminRoutes");
const citizenRoutes = require("./routes/citizenRoutes");
const supportRoutes = require("./routes/supportRoutes");

const app = express();
app.disable("x-powered-by");


// ========================================
// Middleware
// ========================================

app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(rateLimit());

app.use(express.json({ limit: "3mb" }));

app.use(express.urlencoded({
    extended: true,
    limit: "3mb"
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "1d", fallthrough: false }));
app.use("/app", express.static(path.join(__dirname, ".."), { index: "index.html", fallthrough: false }));


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
app.use("/api/admin", adminRoutes);
app.use("/api/citizen", citizenRoutes);
app.use("/api/support", supportRoutes);


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
