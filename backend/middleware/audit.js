const pool = require("../config/db");
module.exports = function audit(moduleName) {
  return (req, res, next) => {
    res.on("finish", () => {
      if (!req.user || req.method === "GET") return;
      pool.execute("INSERT INTO audit_logs (user_id, module_name, action, method, resource, status_code, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())", [req.user.id, moduleName, `${req.method} ${req.path}`.slice(0, 150), req.method, req.originalUrl.slice(0, 255), res.statusCode]).catch(error => console.error("Audit log error:", error.message));
    });
    next();
  };
};
