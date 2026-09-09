const pool = require("../config/db");

exports.deleteRequest = async (req, res) => {
  try {
    const [result] = await pool.execute("DELETE FROM collection_requests WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Collection request not found" });
    res.json({ success: true, message: "Collection request deleted successfully" });
  } catch (error) {
    console.error("Admin delete request:", error.message);
    res.status(500).json({ success: false, message: "Unable to delete collection request" });
  }
};
