module.exports = function requireDriver(req, res, next) {
    if (!req.user || String(req.user.role).toLowerCase() !== "driver") {
        return res.status(403).json({ success: false, message: "Driver access is required" });
    }
    next();
};
