const pool = require("../config/db");

async function driverForUser(userId) {
  const [rows] = await pool.execute(
    "SELECT d.id FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.user_id=? AND u.is_active=TRUE",
    [userId]
  );
  return rows[0];
}

function fail(res, error, message) {
  console.error("Fuel log API:", error.message);
  res.status(500).json({ success: false, message });
}

exports.listMine = async (req, res) => {
  try {
    const driver = await driverForUser(req.user.id);
    if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" });
    const [rows] = await pool.execute(
      "SELECT id,fuel_litres,fuel_cost,odometer_km,note,logged_at FROM fuel_logs WHERE driver_id=? ORDER BY logged_at DESC,id DESC LIMIT 100",
      [driver.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) { fail(res, error, "Unable to load fuel logs"); }
};

exports.create = async (req, res) => {
  try {
    const driver = await driverForUser(req.user.id);
    if (!driver) return res.status(404).json({ success: false, message: "Driver profile not found" });

    const litres = Number(req.body.fuel_litres);
    const cost = req.body.fuel_cost === "" || req.body.fuel_cost == null ? null : Number(req.body.fuel_cost);
    const odometer = Number(req.body.odometer_km);
    const note = String(req.body.note || "").trim();

    if (!Number.isFinite(litres) || litres <= 0 || litres > 1000) return res.status(400).json({ success: false, message: "Fuel quantity must be between 0.1 and 1000 litres" });
    if (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 1000000)) return res.status(400).json({ success: false, message: "Enter a valid fuel cost" });
    if (!Number.isFinite(odometer) || odometer < 0 || odometer > 10000000) return res.status(400).json({ success: false, message: "Enter a valid odometer reading" });
    if (note.length > 300) return res.status(400).json({ success: false, message: "Note must be 300 characters or less" });

    const [last] = await pool.execute("SELECT odometer_km FROM fuel_logs WHERE driver_id=? ORDER BY logged_at DESC,id DESC LIMIT 1", [driver.id]);
    if (last.length && odometer < Number(last[0].odometer_km)) return res.status(400).json({ success: false, message: "Odometer reading cannot be lower than your previous fuel log" });

    const [result] = await pool.execute(
      "INSERT INTO fuel_logs(driver_id,fuel_litres,fuel_cost,odometer_km,note,logged_at) VALUES(?,?,?,?,?,NOW())",
      [driver.id, litres, cost, odometer, note || null]
    );
    res.status(201).json({ success: true, message: "Fuel and kilometre log saved.", data: { id: result.insertId } });
  } catch (error) { fail(res, error, "Unable to save fuel log"); }
};

exports.listAdmin = async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT fl.id,fl.driver_id,fl.fuel_litres,fl.fuel_cost,fl.odometer_km,fl.note,fl.logged_at,
        u.full_name,u.email,d.vehicle_number,d.assigned_area
       FROM fuel_logs fl
       JOIN drivers d ON d.id=fl.driver_id
       JOIN users u ON u.id=d.user_id
       ORDER BY fl.driver_id,fl.logged_at ASC,fl.id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) { fail(res, error, "Unable to load fuel-efficiency data"); }
};
