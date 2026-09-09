const pool = require("../config/db");
const { saveBase64Image } = require("../utils/uploadImage");
async function driverForUser(userId) { const [drivers] = await pool.execute("SELECT d.* FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.user_id=? AND u.is_active=1", [userId]); return drivers[0]; }

exports.collect = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const driver = await driverForUser(req.user.id), waste = Number(req.body.wasteCollected || 0);
    if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" });
    if (!Number.isFinite(waste) || waste < 0 || waste > 2000) return res.status(400).json({ success: false, message: "Waste collected must be between 0 and 2000 kg" });
    if (!req.body.beforeImage || !req.body.afterImage) return res.status(400).json({ success: false, message: "A photo before and after collection is required" });
    const before = await saveBase64Image(req.body.beforeImage), after = await saveBase64Image(req.body.afterImage);
    await connection.beginTransaction();
    const [bins] = await connection.execute("SELECT id,bin_code FROM garbage_bins WHERE id=? AND assigned_driver_id=? FOR UPDATE", [req.params.id, driver.id]);
    if (!bins.length) { await connection.rollback(); return res.status(403).json({ success: false, message: "You are not authorized to collect this bin" }); }
    await connection.execute("UPDATE garbage_bins SET status='Completed',current_level=0,last_collection=NOW() WHERE id=?", [req.params.id]);
    await connection.execute("INSERT INTO collection_history(driver_id,bin_id,waste_collected,status,before_image_path,after_image_path,verification_status,collected_at) VALUES(?,?,?,'Completed',?,?,'Pending',NOW())", [driver.id, req.params.id, waste, before, after]);
    await connection.execute("UPDATE collection_requests SET status='Completed' WHERE bin_id=? AND status IN ('Pending','Assigned','In Progress')", [req.params.id]);
    await connection.execute("INSERT INTO notifications(user_id,message,type) SELECT id,CONCAT('Collection proof awaiting verification for ',?),'info' FROM users WHERE LOWER(role)='admin'", [bins[0].bin_code]);
    await connection.commit();
    res.json({ success: true, message: "Collection completed. Proof sent for admin verification." });
  } catch (error) { await connection.rollback(); res.status(/image/i.test(error.message) ? 400 : 500).json({ success: false, message: /image/i.test(error.message) ? error.message : "Unable to update collection status" }); }
  finally { connection.release(); }
};
