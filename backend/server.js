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

// Browser configuration is generated from Railway variables in production so
// deployable keys are never stored in the repository. Google Maps browser keys
// remain visible to browsers by design and must be restricted by HTTP referrer.
if (process.env.NODE_ENV === "production") {
    app.get("/app/maps-config.js", (req, res) => {
        const key = JSON.stringify(process.env.GOOGLE_MAPS_API_KEY || "");
        res.type("application/javascript").set("Cache-Control", "no-store").send(`window.GOOGLE_MAPS_API_KEY = ${key};
window.loadGoogleMaps = function loadGoogleMaps() {
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (window.__googleMapsPromise) return window.__googleMapsPromise;
  if (!window.GOOGLE_MAPS_API_KEY) return Promise.reject(new Error("Google Maps is not configured."));
  window.__googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(window.GOOGLE_MAPS_API_KEY) + "&v=weekly";
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Google Maps could not load."));
    document.head.appendChild(script);
  });
  return window.__googleMapsPromise;
};`);
    });
    app.get("/app/oauth-config.js", (req, res) => {
        res.type("application/javascript").set("Cache-Control", "no-store").send(`window.GOOGLE_OAUTH_CLIENT_ID = ${JSON.stringify(process.env.GOOGLE_OAUTH_CLIENT_ID || "")};`);
    });
}

app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "1d", fallthrough: false }));
app.use("/app", express.static(path.join(__dirname, ".."), { index: "index.html", fallthrough: false }));


// ========================================
// Test Route
// ========================================

app.get("/health", (req, res) => {
    res.json({ success: true, message: "EcoSmart service is healthy", version: "1.0.0" });
});

app.get("/", (req, res) => {
    res.redirect("/app/index.html");
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
