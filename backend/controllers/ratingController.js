const pool = require("../config/db");

exports.listMine = async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT request_id, rating, feedback, created_at FROM collection_ratings WHERE citizen_id=? ORDER BY created_at DESC", [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: "Unable to load service ratings" }); }
};

exports.create = async (req, res) => {
  try {
    const requestId = Number(req.params.id), rating = Number(req.body.rating), feedback = String(req.body.feedback || "").trim();
    if (!Number.isInteger(requestId) || requestId < 1 || !Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Choose a rating from 1 to 5 stars" });
    if (feedback.length > 1000) return res.status(400).json({ success: false, message: "Feedback must be 1000 characters or less" });
    const [requests] = await pool.execute("SELECT id FROM collection_requests WHERE id=? AND citizen_id=? AND status='Completed'", [requestId, req.user.id]);
    if (!requests.length) return res.status(400).json({ success: false, message: "You can rate only your completed collection requests" });
    await pool.execute("INSERT INTO collection_ratings (request_id,citizen_id,rating,feedback) VALUES (?,?,?,?)", [requestId, req.user.id, rating, feedback || null]);
    res.status(201).json({ success: true, message: "Thank you for rating the collection service." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "You have already rated this collection" });
    console.error("Rating create:", error.message);
    res.status(500).json({ success: false, message: "Unable to save your rating" });
  }
};

exports.listAdmin = async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT r.id,r.request_id,r.rating,r.feedback,r.created_at,u.full_name citizen_name,u.email citizen_email,cr.location,cr.request_type FROM collection_ratings r JOIN users u ON u.id=r.citizen_id JOIN collection_requests cr ON cr.id=r.request_id ORDER BY r.created_at DESC LIMIT 200");
    res.json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: "Unable to load service ratings" }); }
};
