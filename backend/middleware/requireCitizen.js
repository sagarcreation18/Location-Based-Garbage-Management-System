const pool = require("../config/db");

module.exports = async function requireCitizen(req, res, next) {
  try {
    if (!req.user || String(req.user.role).toLowerCase() !== "citizen") {
      return res.status(403).json({ success: false, message: "Citizen access is required" });
    }
    const [users] = await pool.execute("SELECT is_active FROM users WHERE id = ?", [req.user.id]);
    if (!users.length || !users[0].is_active) return res.status(403).json({ success: false, message: "Your account is inactive" });
    next();
  } catch (error) {
    next(error);
  }
};
