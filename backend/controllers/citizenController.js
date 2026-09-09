const pool = require("../config/db");
const { saveBase64Image } = require("../utils/uploadImage");
const requestStatuses = ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"];
const complaintPriorities = ["Low", "Medium", "High", "Critical"];
const error = (res, err, message) => { console.error("Citizen API error:", err.message); return res.status(500).json({ success: false, message }); };

async function notifyAdmins(message, type = "info") {
  await pool.execute("INSERT INTO notifications (user_id, message, type) SELECT id, ?, ? FROM users WHERE role = 'admin' AND is_active = TRUE", [message.slice(0, 500), type]);
}

exports.dashboard = async (req, res) => {
  try {
    const [[requests], [complaints], [bins]] = await Promise.all([
      pool.execute("SELECT COUNT(*) total, SUM(status IN ('Pending','Assigned','In Progress')) active, SUM(status='Completed') completed FROM collection_requests WHERE citizen_id=?", [req.user.id]),
      pool.execute("SELECT COUNT(*) total, SUM(status <> 'Resolved') open FROM complaints WHERE citizen_id=?", [req.user.id]),
      pool.execute("SELECT id, bin_code, location, latitude, longitude, current_level, status, priority, last_collection FROM garbage_bins ORDER BY current_level DESC LIMIT 50")
    ]);
    res.json({ success: true, data: { stats: { requests: Number(requests[0].total || 0), activeRequests: Number(requests[0].active || 0), completedRequests: Number(requests[0].completed || 0), complaints: Number(complaints[0].total || 0), openComplaints: Number(complaints[0].open || 0) }, bins } });
  } catch (err) { error(res, err, "Unable to load citizen dashboard"); }
};

exports.bins = async (req, res) => { try { const [bins] = await pool.execute("SELECT id, bin_code, location, latitude, longitude, capacity, current_level, status, priority, last_collection FROM garbage_bins ORDER BY current_level DESC"); res.json({ success: true, data: bins }); } catch (err) { error(res, err, "Unable to load garbage bins"); } };

exports.listRequests = async (req, res) => { try { const [rows] = await pool.execute(`SELECT cr.*, gb.bin_code, d.vehicle_number, u.full_name AS driver_name FROM collection_requests cr LEFT JOIN garbage_bins gb ON gb.id=cr.bin_id LEFT JOIN drivers d ON d.id=cr.assigned_driver_id LEFT JOIN users u ON u.id=d.user_id WHERE cr.citizen_id=? ORDER BY cr.created_at DESC`, [req.user.id]); res.json({ success: true, data: rows }); } catch (err) { error(res, err, "Unable to load collection requests"); } };

exports.createRequest = async (req, res) => {
  try {
    const { bin_id, location, request_type, description, scheduled_date } = req.body;
    if (!location || !request_type) return res.status(400).json({ success: false, message: "Location and request type are required" });
    if (bin_id) { const [bins] = await pool.execute("SELECT id FROM garbage_bins WHERE id=?", [bin_id]); if (!bins.length) return res.status(400).json({ success: false, message: "Selected garbage bin was not found" }); }
    const [result] = await pool.execute(`INSERT INTO collection_requests (citizen_id, bin_id, location, request_type, description, scheduled_date, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`, [req.user.id, bin_id || null, String(location).slice(0, 180), String(request_type).slice(0, 80), String(description || "").slice(0, 1000), scheduled_date || null]);
    await notifyAdmins(`New collection request REQ-${result.insertId} received for ${location}`, "info");
    res.status(201).json({ success: true, message: "Collection request submitted successfully", data: { id: result.insertId } });
  } catch (err) { error(res, err, "Unable to create collection request"); }
};

exports.cancelRequest = async (req, res) => { try { const [result] = await pool.execute("UPDATE collection_requests SET status='Cancelled' WHERE id=? AND citizen_id=? AND status='Pending'", [req.params.id, req.user.id]); if (!result.affectedRows) return res.status(400).json({ success: false, message: "Only your pending requests can be cancelled" }); res.json({ success: true, message: "Collection request cancelled" }); } catch (err) { error(res, err, "Unable to cancel collection request"); } };

exports.listComplaints = async (req, res) => { try { const [rows] = await pool.execute("SELECT id, category, description, location, priority, status, created_at FROM complaints WHERE citizen_id=? ORDER BY created_at DESC", [req.user.id]); res.json({ success: true, data: rows }); } catch (err) { error(res, err, "Unable to load complaints"); } };
exports.createComplaint = async (req, res) => { try { const { category, description, location, priority, image } = req.body; if (!category || !description || !location) return res.status(400).json({ success: false, message: "Category, description and location are required" }); const safePriority = complaintPriorities.includes(priority) ? priority : "Medium"; const imagePath = await saveBase64Image(image); const [result] = await pool.execute("INSERT INTO complaints (citizen_id, category, description, location, priority, image_path, status) VALUES (?, ?, ?, ?, ?, ?, 'Open')", [req.user.id, String(category).slice(0, 60), String(description).slice(0, 1000), String(location).slice(0, 180), safePriority, imagePath]); await notifyAdmins(`New ${safePriority.toLowerCase()} complaint CMP-${result.insertId}: ${category}`, "warning"); res.status(201).json({ success: true, message: "Complaint submitted successfully", data: { id: result.insertId } }); } catch (err) { if (err.message.includes("image")) return res.status(400).json({ success: false, message: err.message }); error(res, err, "Unable to submit complaint"); } };

exports.notifications = async (req, res) => { try { const [rows] = await pool.execute("SELECT id, message, type, is_read, created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100", [req.user.id]); res.json({ success: true, data: rows }); } catch (err) { error(res, err, "Unable to load notifications"); } };
exports.readNotification = async (req, res) => { try { const [result] = await pool.execute("UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?", [req.params.id, req.user.id]); if (!result.affectedRows) return res.status(404).json({ success: false, message: "Notification not found" }); res.json({ success: true, message: "Notification marked as read" }); } catch (err) { error(res, err, "Unable to update notification"); } };
exports.deleteNotification = async (req, res) => { try { const [result] = await pool.execute("DELETE FROM notifications WHERE id=? AND user_id=?", [req.params.id, req.user.id]); if (!result.affectedRows) return res.status(404).json({ success: false, message: "Notification not found" }); res.json({ success: true, message: "Notification deleted" }); } catch (err) { error(res, err, "Unable to delete notification"); } };

exports.profile = async (req, res) => { try { const [users] = await pool.execute("SELECT id, full_name, email, phone, avatar_url, is_active, created_at FROM users WHERE id=? AND role='citizen'", [req.user.id]); if (!users.length) return res.status(404).json({ success: false, message: "Citizen profile not found" }); res.json({ success: true, data: users[0] }); } catch (err) { error(res, err, "Unable to load profile"); } };
exports.updateProfile = async (req, res) => { try { const { full_name, phone } = req.body; if (!full_name || !/^[0-9]{10}$/.test(String(phone || ""))) return res.status(400).json({ success: false, message: "Valid name and 10-digit phone are required" }); await pool.execute("UPDATE users SET full_name=?, phone=? WHERE id=? AND role='citizen'", [String(full_name).slice(0, 100), phone, req.user.id]); res.json({ success: true, message: "Profile updated successfully" }); } catch (err) { if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "Phone number is already registered" }); error(res, err, "Unable to update profile"); } };
