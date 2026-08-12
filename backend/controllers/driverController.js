const pool = require("../config/db");

async function driverForUser(userId) {
    const [drivers] = await pool.execute(
        `SELECT d.*, u.full_name, u.email, u.phone, IF(u.is_active = 1, 'Active', 'Inactive') AS account_status
         FROM drivers d JOIN users u ON u.id = d.user_id
         WHERE d.user_id = ? AND u.is_active = 1`, [userId]
    );
    return drivers[0];
}

function apiError(res, error, fallback = "Unable to complete the request") {
    console.error("Driver API error:", error.message);
    return res.status(500).json({ success: false, message: fallback });
}

exports.dashboardStats = async (req, res) => {
    try {
        const driver = await driverForUser(req.user.id);
        if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" });
        const [stats] = await pool.execute(
            `SELECT COUNT(*) AS assigned,
                    SUM(status = 'Completed') AS completed,
                    SUM(status IN ('Pending', 'In Progress')) AS pending,
                    COALESCE(SUM(CASE WHEN ch.collected_at >= CURDATE() THEN ch.waste_collected ELSE 0 END), 0) AS waste_collected
             FROM garbage_bins gb
             LEFT JOIN collection_history ch ON ch.bin_id = gb.id AND ch.driver_id = ?
             WHERE gb.assigned_driver_id = ?`, [driver.id, driver.id]
        );
        const value = stats[0];
        res.json({ success: true, data: { assigned: Number(value.assigned || 0), completed: Number(value.completed || 0), pending: Number(value.pending || 0), wasteCollected: Number(value.waste_collected || 0), status: driver.driver_status } });
    } catch (error) { apiError(res, error, "Unable to load dashboard statistics"); }
};

exports.todayRoute = async (req, res) => {
    try {
        const driver = await driverForUser(req.user.id);
        if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" });
        const [bins] = await pool.execute(
            `SELECT id, bin_code, location, latitude, longitude, capacity, current_level, status, priority, last_collection
             FROM garbage_bins WHERE assigned_driver_id = ? ORDER BY route_order, id`, [driver.id]
        );
        res.json({ success: true, data: { routeName: driver.assigned_area ? `${driver.assigned_area} Collection Route` : "Today's Collection Route", bins } });
    } catch (error) { apiError(res, error, "Unable to load today's route"); }
};

exports.assignedBins = async (req, res) => {
    try {
        const driver = await driverForUser(req.user.id);
        if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" });
        const [bins] = await pool.execute(`SELECT id, bin_code, location, latitude, longitude, capacity, current_level, status, priority, last_collection FROM garbage_bins WHERE assigned_driver_id = ? ORDER BY route_order, id`, [driver.id]);
        res.json({ success: true, data: bins });
    } catch (error) { apiError(res, error, "Unable to load assigned bins"); }
};

exports.binDetails = async (req, res) => {
    try {
        const driver = await driverForUser(req.user.id);
        const [bins] = await pool.execute(`SELECT id, bin_code, location, latitude, longitude, capacity, current_level, status, priority, bin_type, last_collection FROM garbage_bins WHERE id = ? AND assigned_driver_id = ?`, [req.params.id, driver && driver.id]);
        if (!bins.length) return res.status(404).json({ success: false, message: "Assigned bin not found" });
        res.json({ success: true, data: bins[0] });
    } catch (error) { apiError(res, error, "Unable to load bin details"); }
};

exports.collectBin = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const driver = await driverForUser(req.user.id);
        if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" });
        const waste = Number(req.body.wasteCollected || 0);
        if (!Number.isFinite(waste) || waste < 0 || waste > 2000) return res.status(400).json({ success: false, message: "Waste collected must be between 0 and 2000 kg" });
        await connection.beginTransaction();
        const [bins] = await connection.execute(`SELECT id, bin_code FROM garbage_bins WHERE id = ? AND assigned_driver_id = ? FOR UPDATE`, [req.params.id, driver.id]);
        if (!bins.length) { await connection.rollback(); return res.status(403).json({ success: false, message: "You are not authorized to collect this bin" }); }
        await connection.execute(`UPDATE garbage_bins SET status = 'Completed', current_level = 0, last_collection = NOW() WHERE id = ?`, [req.params.id]);
        await connection.execute(`INSERT INTO collection_history (driver_id, bin_id, waste_collected, status, collected_at) VALUES (?, ?, ?, 'Completed', NOW())`, [driver.id, req.params.id, waste]);
        await connection.execute(`UPDATE collection_requests SET status = 'Completed' WHERE bin_id = ? AND status IN ('Pending', 'Assigned', 'In Progress')`, [req.params.id]);
        await connection.execute(`INSERT INTO notifications (user_id, message, type) SELECT id, CONCAT('Collection completed for ', ?), 'success' FROM users WHERE role = 'Admin'`, [bins[0].bin_code]);
        await connection.commit();
        res.json({ success: true, message: "Collection completed successfully", data: { binId: req.params.id, wasteCollected: waste, collectedAt: new Date() } });
    } catch (error) { await connection.rollback(); apiError(res, error, "Unable to update collection status"); } finally { connection.release(); }
};

exports.skipBin = async (req, res) => {
    try {
        const driver = await driverForUser(req.user.id); const reason = String(req.body.reason || "").trim();
        if (!reason || reason.length > 300) return res.status(400).json({ success: false, message: "A valid skip reason is required" });
        const [result] = await pool.execute(`UPDATE garbage_bins SET status = 'Skipped' WHERE id = ? AND assigned_driver_id = ?`, [req.params.id, driver && driver.id]);
        if (!result.affectedRows) return res.status(403).json({ success: false, message: "You are not authorized to skip this bin" });
        await pool.execute(`INSERT INTO collection_history (driver_id, bin_id, status, skip_reason, collected_at) VALUES (?, ?, 'Skipped', ?, NOW())`, [driver.id, req.params.id, reason]);
        res.json({ success: true, message: "Collection skipped and admin notified" });
    } catch (error) { apiError(res, error, "Unable to skip collection"); }
};

exports.updateLocation = async (req, res) => {
    try {
        const driver = await driverForUser(req.user.id); const latitude = Number(req.body.latitude), longitude = Number(req.body.longitude);
        if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" });
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" });
        await pool.execute(`INSERT INTO driver_locations (driver_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, NOW())`, [driver.id, latitude, longitude]);
        res.json({ success: true, message: "Location updated" });
    } catch (error) { apiError(res, error, "Unable to store location"); }
};

exports.reportProblem = async (req, res) => { try { const driver = await driverForUser(req.user.id); const { problemType, description, location } = req.body; if (!problemType || !description || !location) return res.status(400).json({ success: false, message: "Problem type, description and location are required" }); await pool.execute(`INSERT INTO complaints (driver_id, category, description, location, status) VALUES (?, ?, ?, ?, 'Open')`, [driver.id, String(problemType).slice(0,60), String(description).slice(0,1000), String(location).slice(0,180)]); res.status(201).json({ success: true, message: "Problem reported successfully" }); } catch (error) { apiError(res, error, "Unable to report problem"); } };
exports.collectionHistory = async (req, res) => { try { const driver = await driverForUser(req.user.id); const [rows] = await pool.execute(`SELECT ch.id, DATE_FORMAT(ch.collected_at, '%d %b %Y') AS date, gb.bin_code, gb.location, DATE_FORMAT(ch.collected_at, '%h:%i %p') AS collection_time, ch.waste_collected, ch.status, ch.skip_reason FROM collection_history ch JOIN garbage_bins gb ON gb.id = ch.bin_id WHERE ch.driver_id = ? ORDER BY ch.collected_at DESC LIMIT 100`, [driver.id]); res.json({ success: true, data: rows }); } catch (error) { apiError(res, error, "Unable to load collection history"); } };
exports.notifications = async (req, res) => { try { const [rows] = await pool.execute(`SELECT id, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.user.id]); res.json({ success: true, data: rows }); } catch (error) { apiError(res, error, "Unable to load notifications"); } };
exports.readNotification = async (req, res) => { try { const [result] = await pool.execute(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]); if (!result.affectedRows) return res.status(404).json({ success: false, message: "Notification not found" }); res.json({ success: true, message: "Notification marked as read" }); } catch (error) { apiError(res, error); } };
exports.profile = async (req, res) => { try { const driver = await driverForUser(req.user.id); if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" }); delete driver.user_id; res.json({ success: true, data: driver }); } catch (error) { apiError(res, error, "Unable to load profile"); } };
exports.updateProfile = async (req, res) => { try { const { full_name, phone } = req.body; if (!full_name || !/^[0-9]{10}$/.test(String(phone || ""))) return res.status(400).json({ success: false, message: "Valid name and 10-digit phone are required" }); await pool.execute(`UPDATE users SET full_name = ?, phone = ? WHERE id = ?`, [String(full_name).slice(0,100), phone, req.user.id]); res.json({ success: true, message: "Profile updated successfully" }); } catch (error) { apiError(res, error, "Unable to update profile"); } };
exports.updateStatus = async (req, res) => { try { const allowed = ['Available','On Route','On Break','Completed','Offline']; if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid driver status" }); const [result] = await pool.execute(`UPDATE drivers SET driver_status = ? WHERE user_id = ?`, [req.body.status, req.user.id]); if (!result.affectedRows) return res.status(404).json({ success: false, message: "Driver profile not found" }); res.json({ success: true, message: "Driver status updated", data: { status: req.body.status } }); } catch (error) { apiError(res, error, "Unable to update driver status"); } };
