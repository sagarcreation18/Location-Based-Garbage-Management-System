const pool = require("../config/db");

function fail(res, error, message) {
  console.error("Archive API:", error.message);
  res.status(500).json({ success: false, message });
}

exports.listBins = async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT gb.*, d.id AS driver_id, u.full_name AS assigned_driver
       FROM garbage_bins gb
       LEFT JOIN drivers d ON d.id=gb.assigned_driver_id
       LEFT JOIN users u ON u.id=d.user_id
       WHERE gb.is_active=TRUE
       ORDER BY gb.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) { fail(res, error, "Unable to load garbage bins"); }
};

exports.listDrivers = async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.*,u.full_name,u.email,u.phone,u.is_active,
        COUNT(CASE WHEN ch.status='Completed' AND DATE(ch.collected_at)=CURDATE() THEN 1 END) AS today_collections
       FROM drivers d
       JOIN users u ON u.id=d.user_id
       LEFT JOIN collection_history ch ON ch.driver_id=d.id
       WHERE u.is_active=TRUE
       GROUP BY d.id
       ORDER BY u.full_name`
    );
    res.json({ success: true, data: rows });
  } catch (error) { fail(res, error, "Unable to load drivers"); }
};

exports.archiveBin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [bins] = await connection.execute("SELECT id,bin_code FROM garbage_bins WHERE id=? AND is_active=TRUE FOR UPDATE", [req.params.id]);
    if (!bins.length) { await connection.rollback(); return res.status(404).json({ success: false, message: "Garbage bin not found" }); }
    await connection.execute("DELETE FROM route_bins WHERE bin_id=?", [req.params.id]);
    await connection.execute("UPDATE collection_requests SET bin_id=NULL WHERE bin_id=?", [req.params.id]);
    await connection.execute("UPDATE garbage_bins SET is_active=FALSE,assigned_driver_id=NULL,route_order=0 WHERE id=?", [req.params.id]);
    await connection.commit();
    res.json({ success: true, message: "Garbage bin archived. Historical collection records were kept." });
  } catch (error) {
    await connection.rollback();
    fail(res, error, "Unable to archive garbage bin");
  } finally { connection.release(); }
};

exports.archiveDriver = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [drivers] = await connection.execute(
      "SELECT d.id,d.user_id FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.id=? AND u.is_active=TRUE FOR UPDATE",
      [req.params.id]
    );
    if (!drivers.length) { await connection.rollback(); return res.status(404).json({ success: false, message: "Driver not found" }); }
    const driver = drivers[0];
    await connection.execute("UPDATE garbage_bins SET assigned_driver_id=NULL,route_order=0 WHERE assigned_driver_id=?", [driver.id]);
    await connection.execute("UPDATE collection_requests SET assigned_driver_id=NULL WHERE assigned_driver_id=?", [driver.id]);
    await connection.execute("UPDATE routes SET status='Inactive' WHERE driver_id=? AND status='Active'", [driver.id]);
    await connection.execute("UPDATE drivers SET driver_status='Offline',assigned_area=NULL WHERE id=?", [driver.id]);
    await connection.execute("UPDATE users SET is_active=FALSE WHERE id=?", [driver.user_id]);
    await connection.commit();
    res.json({ success: true, message: "Driver archived and unassigned from active work. Historical records were kept." });
  } catch (error) {
    await connection.rollback();
    fail(res, error, "Unable to archive driver");
  } finally { connection.release(); }
};
