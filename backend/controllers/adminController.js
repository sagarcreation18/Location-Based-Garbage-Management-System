const pool = require("../config/db");
const allowedBinStatuses = ["Pending", "In Progress", "Completed", "Skipped", "Normal", "Almost Full", "Full"];
const allowedRequestStatuses = ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"];
const fail = (res, error, message = "Unable to complete the request") => { console.error("Admin API error:", error.message); return res.status(500).json({ success: false, message }); };
const number = (v, fallback = null) => (v === "" || v === undefined || v === null ? fallback : Number(v));

exports.dashboard = async (req, res) => { try {
    const [[bins], [drivers], [requests], [complaints], [waste]] = await Promise.all([
        pool.execute("SELECT COUNT(*) AS total, SUM(status = 'Full') AS full FROM garbage_bins"),
        pool.execute("SELECT COUNT(*) AS total, SUM(driver_status = 'On Route') AS on_route FROM drivers"),
        pool.execute("SELECT COUNT(*) AS pending FROM collection_requests WHERE status IN ('Pending', 'Assigned', 'In Progress')"),
        pool.execute("SELECT COUNT(*) AS open FROM complaints WHERE status <> 'Resolved'"),
        pool.execute("SELECT DATE_FORMAT(collected_at, '%a') AS day, COALESCE(SUM(waste_collected), 0) AS kilograms FROM collection_history WHERE collected_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(collected_at), day ORDER BY DATE(collected_at)")
    ]);
    res.json({ success: true, data: { stats: { totalBins: Number(bins[0].total), fullBins: Number(bins[0].full || 0), totalDrivers: Number(drivers[0].total), activeDrivers: Number(drivers[0].on_route || 0), pendingRequests: Number(requests[0].pending), openComplaints: Number(complaints[0].open) }, wasteCollection: waste } });
} catch (e) { fail(res, e, "Unable to load admin dashboard"); } };

exports.listBins = async (req, res) => { try { const [rows] = await pool.execute(`SELECT gb.*, d.id AS driver_id, u.full_name AS assigned_driver FROM garbage_bins gb LEFT JOIN drivers d ON d.id = gb.assigned_driver_id LEFT JOIN users u ON u.id = d.user_id ORDER BY gb.id DESC`); res.json({ success: true, data: rows }); } catch (e) { fail(res, e, "Unable to load garbage bins"); } };
exports.createBin = async (req, res) => { try { const b = req.body; if (!b.bin_code || !b.location) return res.status(400).json({ success: false, message: "Bin code and location are required" }); const level = number(b.current_level, 0), capacity = number(b.capacity, 120); if (!Number.isFinite(level) || !Number.isFinite(capacity) || level < 0 || level > 100 || capacity <= 0) return res.status(400).json({ success: false, message: "Valid bin capacity and level are required" }); const [result] = await pool.execute(`INSERT INTO garbage_bins (bin_code, location, latitude, longitude, capacity, current_level, bin_type, status, priority, assigned_driver_id, route_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [String(b.bin_code).slice(0,30), String(b.location).slice(0,180), number(b.latitude), number(b.longitude), capacity, level, String(b.bin_type || "General Waste").slice(0,60), allowedBinStatuses.includes(b.status) ? b.status : "Pending", ["Normal","High","Urgent"].includes(b.priority) ? b.priority : "Normal", number(b.assigned_driver_id), number(b.route_order, 0)]); res.status(201).json({ success: true, message: "Garbage bin added successfully", data: { id: result.insertId } }); } catch (e) { if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "Bin code already exists" }); fail(res, e, "Unable to add garbage bin"); } };
exports.updateBin = async (req, res) => { try { const b = req.body; if (!b.location) return res.status(400).json({ success: false, message: "Location is required" }); const [result] = await pool.execute(`UPDATE garbage_bins SET location=?, latitude=?, longitude=?, capacity=?, current_level=?, bin_type=?, status=?, priority=?, assigned_driver_id=?, route_order=? WHERE id=?`, [String(b.location).slice(0,180), number(b.latitude), number(b.longitude), number(b.capacity,120), number(b.current_level,0), String(b.bin_type||"General Waste").slice(0,60), allowedBinStatuses.includes(b.status)?b.status:"Pending", ["Normal","High","Urgent"].includes(b.priority)?b.priority:"Normal", number(b.assigned_driver_id), number(b.route_order,0), req.params.id]); if (!result.affectedRows) return res.status(404).json({ success:false,message:"Garbage bin not found" }); res.json({success:true,message:"Garbage bin updated successfully"}); } catch(e){fail(res,e,"Unable to update garbage bin");} };
exports.deleteBin = async (req,res) => { try { const [result]=await pool.execute("DELETE FROM garbage_bins WHERE id=?",[req.params.id]); if(!result.affectedRows)return res.status(404).json({success:false,message:"Garbage bin not found"});res.json({success:true,message:"Garbage bin deleted successfully"}); }catch(e){fail(res,e,"Unable to delete garbage bin");} };

exports.listDrivers = async (req,res) => { try { const [rows]=await pool.execute(`SELECT d.*,u.full_name,u.email,u.phone,u.is_active, COUNT(CASE WHEN ch.status='Completed' AND DATE(ch.collected_at)=CURDATE() THEN 1 END) AS today_collections FROM drivers d JOIN users u ON u.id=d.user_id LEFT JOIN collection_history ch ON ch.driver_id=d.id GROUP BY d.id ORDER BY u.full_name`);res.json({success:true,data:rows});}catch(e){fail(res,e,"Unable to load drivers");} };
exports.createDriver = async (req,res) => { const c=await pool.getConnection();try { const d=req.body;if(!d.full_name||!d.email||!d.phone||!d.password)return res.status(400).json({success:false,message:"Name, email, phone and password are required"});if(!/^[0-9]{10}$/.test(String(d.phone))||String(d.password).length<6)return res.status(400).json({success:false,message:"Use a valid 10-digit phone and 6-character password"});const bcrypt=require("bcryptjs");const hash=await bcrypt.hash(String(d.password),10);await c.beginTransaction();const [user]=await c.execute(`INSERT INTO users(full_name,email,phone,password_hash,role,is_verified,is_active) VALUES(?,?,?,?, 'driver',TRUE,TRUE)`,[String(d.full_name).slice(0,100),String(d.email).toLowerCase().slice(0,150),d.phone,hash]);const [driver]=await c.execute(`INSERT INTO drivers(user_id,vehicle_number,license_number,assigned_area,driver_status) VALUES(?,?,?,?, 'Available')`,[user.insertId,String(d.vehicle_number||"").slice(0,30),String(d.license_number||"").slice(0,60),String(d.assigned_area||"").slice(0,120)]);await c.commit();res.status(201).json({success:true,message:"Driver added successfully",data:{id:driver.insertId}});}catch(e){await c.rollback();if(e.code==='ER_DUP_ENTRY')return res.status(409).json({success:false,message:"Email or phone is already registered"});fail(res,e,"Unable to add driver");}finally{c.release();} };
exports.updateDriver = async (req,res) => { try {const d=req.body;if(!d.full_name||!d.phone)return res.status(400).json({success:false,message:"Name and phone are required"});const [result]=await pool.execute(`UPDATE drivers d JOIN users u ON u.id=d.user_id SET u.full_name=?,u.phone=?,d.vehicle_number=?,d.license_number=?,d.assigned_area=?,d.driver_status=? WHERE d.id=?`,[String(d.full_name).slice(0,100),d.phone,String(d.vehicle_number||"").slice(0,30),String(d.license_number||"").slice(0,60),String(d.assigned_area||"").slice(0,120),["Available","On Route","On Break","Completed","Offline"].includes(d.driver_status)?d.driver_status:"Available",req.params.id]);if(!result.affectedRows)return res.status(404).json({success:false,message:"Driver not found"});res.json({success:true,message:"Driver updated successfully"});}catch(e){fail(res,e,"Unable to update driver");} };
exports.deleteDriver = async (req,res) => { try {const [drivers]=await pool.execute("SELECT user_id FROM drivers WHERE id=?",[req.params.id]);if(!drivers.length)return res.status(404).json({success:false,message:"Driver not found"});await pool.execute("DELETE FROM users WHERE id=?",[drivers[0].user_id]);res.json({success:true,message:"Driver account deleted successfully"});}catch(e){fail(res,e,"Unable to delete driver");} };

exports.listCitizens=async(req,res)=>{try{const [rows]=await pool.execute(`SELECT u.id,u.full_name,u.email,u.phone,u.is_active,u.created_at,COUNT(DISTINCT cr.id) AS requests,COUNT(DISTINCT c.id) AS complaints FROM users u LEFT JOIN collection_requests cr ON cr.citizen_id=u.id LEFT JOIN complaints c ON c.citizen_id=u.id WHERE u.role='citizen' GROUP BY u.id ORDER BY u.id DESC`);res.json({success:true,data:rows});}catch(e){fail(res,e,"Unable to load citizens");}};
exports.setCitizenActive=async(req,res)=>{try{const [r]=await pool.execute(`UPDATE users SET is_active=? WHERE id=? AND role='citizen'`,[Boolean(req.body.is_active),req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Citizen not found"});res.json({success:true,message:"Citizen account updated"});}catch(e){fail(res,e,"Unable to update citizen");}};
exports.deleteCitizen=async(req,res)=>{try{const [r]=await pool.execute(`DELETE FROM users WHERE id=? AND role='citizen'`,[req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Citizen not found"});res.json({success:true,message:"Citizen account deleted"});}catch(e){fail(res,e,"Unable to delete citizen");}};

exports.listRequests=async(req,res)=>{try{const [rows]=await pool.execute(`SELECT cr.*,citizen.full_name AS citizen_name,gb.bin_code,gb.location,gb.assigned_driver_id,u.full_name AS driver_name FROM collection_requests cr LEFT JOIN users citizen ON citizen.id=cr.citizen_id LEFT JOIN garbage_bins gb ON gb.id=cr.bin_id LEFT JOIN drivers d ON d.id=gb.assigned_driver_id LEFT JOIN users u ON u.id=d.user_id ORDER BY cr.id DESC`);res.json({success:true,data:rows});}catch(e){fail(res,e,"Unable to load collection requests");}};
exports.updateRequest=async(req,res)=>{try{const status=req.body.status;if(!allowedRequestStatuses.includes(status))return res.status(400).json({success:false,message:"Invalid request status"});const [r]=await pool.execute("UPDATE collection_requests SET status=? WHERE id=?",[status,req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Collection request not found"});res.json({success:true,message:"Collection request updated"});}catch(e){fail(res,e,"Unable to update collection request");}};
exports.listComplaints=async(req,res)=>{try{const [rows]=await pool.execute(`SELECT c.*,citizen.full_name AS citizen_name,u.full_name AS driver_name FROM complaints c LEFT JOIN users citizen ON citizen.id=c.citizen_id LEFT JOIN drivers d ON d.id=c.driver_id LEFT JOIN users u ON u.id=d.user_id ORDER BY c.created_at DESC`);res.json({success:true,data:rows});}catch(e){fail(res,e,"Unable to load complaints");}};
exports.updateComplaint=async(req,res)=>{try{const status=String(req.body.status||'').slice(0,30);if(!status)return res.status(400).json({success:false,message:"Complaint status is required"});const [r]=await pool.execute("UPDATE complaints SET status=? WHERE id=?",[status,req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Complaint not found"});res.json({success:true,message:"Complaint updated"});}catch(e){fail(res,e,"Unable to update complaint");}};
exports.deleteComplaint=async(req,res)=>{try{const [r]=await pool.execute("DELETE FROM complaints WHERE id=?",[req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Complaint not found"});res.json({success:true,message:"Complaint deleted"});}catch(e){fail(res,e,"Unable to delete complaint");}};
exports.liveLocations=async(req,res)=>{try{const [rows]=await pool.execute(`SELECT dl.driver_id,dl.latitude,dl.longitude,dl.recorded_at,d.driver_status,u.full_name,d.vehicle_number FROM driver_locations dl JOIN (SELECT driver_id,MAX(recorded_at) latest FROM driver_locations GROUP BY driver_id) newest ON newest.driver_id=dl.driver_id AND newest.latest=dl.recorded_at JOIN drivers d ON d.id=dl.driver_id JOIN users u ON u.id=d.user_id WHERE dl.recorded_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) ORDER BY dl.recorded_at DESC`);res.json({success:true,data:rows});}catch(e){fail(res,e,"Unable to load live driver locations");}};
exports.listRoutes=async(req,res)=>{try{const[rows]=await pool.execute(`SELECT r.*,u.full_name AS driver_name,COUNT(gb.id) AS assigned_bins FROM routes r LEFT JOIN drivers d ON d.id=r.driver_id LEFT JOIN users u ON u.id=d.user_id LEFT JOIN garbage_bins gb ON gb.assigned_driver_id=r.driver_id GROUP BY r.id ORDER BY r.created_at DESC`);res.json({success:true,data:rows});}catch(e){fail(res,e,"Unable to load routes");}};
exports.createRoute=async(req,res)=>{try{const{route_name,driver_id,area}=req.body;if(!route_name)return res.status(400).json({success:false,message:"Route name is required"});if(driver_id){const[d]=await pool.execute("SELECT id FROM drivers WHERE id=?",[driver_id]);if(!d.length)return res.status(400).json({success:false,message:"Assigned driver not found"});}const[r]=await pool.execute("INSERT INTO routes(route_name,driver_id,area,status) VALUES(?,?,?,'Active')",[String(route_name).slice(0,120),number(driver_id),String(area||'').slice(0,120)]);res.status(201).json({success:true,message:"Route created successfully",data:{id:r.insertId}});}catch(e){fail(res,e,"Unable to create route");}};
exports.updateRoute=async(req,res)=>{try{const{route_name,driver_id,area,status}=req.body;if(!route_name)return res.status(400).json({success:false,message:"Route name is required"});const[r]=await pool.execute("UPDATE routes SET route_name=?,driver_id=?,area=?,status=? WHERE id=?",[String(route_name).slice(0,120),number(driver_id),String(area||'').slice(0,120),['Active','Inactive','Completed'].includes(status)?status:'Active',req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Route not found"});res.json({success:true,message:"Route updated successfully"});}catch(e){fail(res,e,"Unable to update route");}};
exports.deleteRoute=async(req,res)=>{try{const[r]=await pool.execute("DELETE FROM routes WHERE id=?",[req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Route not found"});res.json({success:true,message:"Route deleted successfully"});}catch(e){fail(res,e,"Unable to delete route");}};
exports.assignBin=async(req,res)=>{try{const driverId=number(req.body.driver_id);if(driverId!==null){const[d]=await pool.execute("SELECT id FROM drivers WHERE id=?",[driverId]);if(!d.length)return res.status(400).json({success:false,message:"Driver not found"});}const[r]=await pool.execute("UPDATE garbage_bins SET assigned_driver_id=?,route_order=? WHERE id=?",[driverId,number(req.body.route_order,0),req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Garbage bin not found"});res.json({success:true,message:"Driver assigned to bin successfully"});}catch(e){fail(res,e,"Unable to assign driver");}};
exports.notifications=async(req,res)=>{try{const [rows]=await pool.execute(`SELECT n.*,u.full_name FROM notifications n LEFT JOIN users u ON u.id=n.user_id ORDER BY n.created_at DESC LIMIT 100`);res.json({success:true,data:rows});}catch(e){fail(res,e,"Unable to load notifications");}};
exports.readNotification=async(req,res)=>{try{const[r]=await pool.execute("UPDATE notifications SET is_read=TRUE WHERE id=?",[req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Notification not found"});res.json({success:true,message:"Notification marked as read"});}catch(e){fail(res,e);}};
exports.deleteNotification=async(req,res)=>{try{const[r]=await pool.execute("DELETE FROM notifications WHERE id=?",[req.params.id]);if(!r.affectedRows)return res.status(404).json({success:false,message:"Notification not found"});res.json({success:true,message:"Notification deleted"});}catch(e){fail(res,e,"Unable to delete notification");}};
exports.settings=async(req,res)=>{try{const[rows]=await pool.execute("SELECT setting_key,setting_value FROM system_settings");res.json({success:true,data:Object.fromEntries(rows.map(x=>[x.setting_key,x.setting_value]))});}catch(e){fail(res,e,"Unable to load system settings");}};
exports.updateSettings=async(req,res)=>{try{const allowed=['system_name','city','map_default_zoom','notifications_enabled'];const items=Object.entries(req.body).filter(([key])=>allowed.includes(key));if(!items.length)return res.status(400).json({success:false,message:"No valid settings provided"});for(const[key,value]of items)await pool.execute("INSERT INTO system_settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",[key,String(value).slice(0,500)]);res.json({success:true,message:"System settings updated successfully"});}catch(e){fail(res,e,"Unable to update system settings");}};
exports.report=async(req,res)=>{try{const [[totals],[drivers],[bins]] = await Promise.all([pool.execute("SELECT COUNT(*) collections,COALESCE(SUM(waste_collected),0) waste FROM collection_history WHERE collected_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)",[req.query.from||new Date().toISOString().slice(0,10),req.query.to||new Date().toISOString().slice(0,10)]),pool.execute("SELECT d.id,u.full_name,d.driver_status,COUNT(ch.id) completed FROM drivers d JOIN users u ON u.id=d.user_id LEFT JOIN collection_history ch ON ch.driver_id=d.id AND ch.status='Completed' GROUP BY d.id"),pool.execute("SELECT status,COUNT(*) total FROM garbage_bins GROUP BY status")]);res.json({success:true,data:{totals:totals[0],drivers,bins}});}catch(e){fail(res,e,"Unable to generate report");}};


// Route assignments use an explicit route-to-bin relationship so each driver sees the bins selected for that route.
exports.listRoutes = async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT r.*, u.full_name AS driver_name, COUNT(rb.bin_id) AS assigned_bins
      FROM routes r
      LEFT JOIN drivers d ON d.id = r.driver_id
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN route_bins rb ON rb.route_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) { fail(res, error, "Unable to load routes"); }
};

exports.createRoute = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const routeName = String(req.body.route_name || "").trim();
    const area = String(req.body.area || "").trim();
    const driverId = Number(req.body.driver_id);
    const binIds = [...new Set((Array.isArray(req.body.bin_ids) ? req.body.bin_ids : []).map(Number).filter(Number.isInteger))];

    if (!routeName) return res.status(400).json({ success: false, message: "Route name is required" });
    if (!Number.isInteger(driverId) || driverId <= 0) return res.status(400).json({ success: false, message: "Choose a driver for this route" });
    if (!binIds.length) return res.status(400).json({ success: false, message: "Select at least one garbage bin on the map" });

    const [drivers] = await connection.execute("SELECT id, user_id FROM drivers WHERE id = ?", [driverId]);
    if (!drivers.length) return res.status(400).json({ success: false, message: "Assigned driver was not found" });

    const placeholders = binIds.map(() => "?").join(",");
    const [bins] = await connection.execute(`SELECT id FROM garbage_bins WHERE id IN (${placeholders})`, binIds);
    if (bins.length !== binIds.length) return res.status(400).json({ success: false, message: "One or more selected bins no longer exist" });

    await connection.beginTransaction();
    const [route] = await connection.execute(
      "INSERT INTO routes(route_name, driver_id, area, status) VALUES(?,?,?,'Active')",
      [routeName.slice(0, 120), driverId, area.slice(0, 120)]
    );

    // A bin belongs to one active plan at a time; move it from an older plan if necessary.
    await connection.execute(`DELETE FROM route_bins WHERE bin_id IN (${placeholders})`, binIds);
    for (let index = 0; index < binIds.length; index += 1) {
      await connection.execute("INSERT INTO route_bins(route_id, bin_id, route_order) VALUES(?,?,?)", [route.insertId, binIds[index], index + 1]);
      await connection.execute("UPDATE garbage_bins SET assigned_driver_id = ?, route_order = ? WHERE id = ?", [driverId, index + 1, binIds[index]]);
    }
    await connection.execute("UPDATE drivers SET assigned_area = ? WHERE id = ?", [routeName.slice(0, 120), driverId]);
    await connection.execute(
      "INSERT INTO notifications(user_id, message, type) VALUES (?, ?, 'info')",
      [drivers[0].user_id, "New route assigned: " + routeName.slice(0, 120) + " (" + binIds.length + " bins)"]
    );
    await connection.commit();
    res.status(201).json({ success: true, message: "Route created and assigned successfully", data: { id: route.insertId, selectedBins: binIds.length } });
  } catch (error) {
    await connection.rollback();
    fail(res, error, "Unable to create route");
  } finally {
    connection.release();
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const audience = String(req.body.audience || "").toLowerCase();
    const message = String(req.body.message || "").trim();
    const type = ["info", "success", "warning", "urgent"].includes(String(req.body.type || "").toLowerCase()) ? String(req.body.type).toLowerCase() : "info";
    const roles = audience === "drivers" ? ["driver"] : audience === "citizens" ? ["citizen"] : audience === "all" ? ["driver", "citizen"] : null;
    if (!roles) return res.status(400).json({ success: false, message: "Choose Drivers, Citizens, or Everyone" });
    if (message.length < 3 || message.length > 500) return res.status(400).json({ success: false, message: "Notification message must be between 3 and 500 characters" });

    const placeholders = roles.map(() => "?").join(",");
    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, message, type)
       SELECT id, ?, ? FROM users WHERE is_active = TRUE AND LOWER(role) IN (${placeholders})`,
      [message, type, ...roles]
    );
    res.status(201).json({ success: true, message: `Notification sent to ${result.affectedRows} recipient(s)`, data: { recipients: result.affectedRows } });
  } catch (error) { fail(res, error, "Unable to send notification"); }
};