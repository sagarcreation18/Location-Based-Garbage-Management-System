const pool = require("../config/db");
const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));

async function sendResendTicket(user, subject, message) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.SUPPORT_EMAIL) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [process.env.SUPPORT_EMAIL], reply_to: user.email, subject: `[EcoSmart Support] ${subject}`, html: `<h2>EcoSmart support request</h2><p><b>From:</b> ${escapeHtml(user.full_name)} (${escapeHtml(user.email)})</p><p><b>Subject:</b> ${escapeHtml(subject)}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` }) });
  if (!response.ok) throw new Error("Resend could not deliver the support email");
  return true;
}

exports.createTicket = async (req, res) => {
  try {
    const subject = String(req.body.subject || "").trim(); const message = String(req.body.message || "").trim();
    if (!subject || !message || subject.length > 150 || message.length > 2000) return res.status(400).json({ success: false, message: "Enter a subject and a support message of up to 2,000 characters" });
    const [users] = await pool.execute("SELECT full_name,email FROM users WHERE id=?", [req.user.id]);
    if (!users.length) return res.status(404).json({ success: false, message: "User account not found" });
    const [ticket] = await pool.execute("INSERT INTO support_tickets (user_id, subject, message, status, created_at) VALUES (?, ?, ?, 'Open', NOW())", [req.user.id, subject, message]);
    let emailed = false; try { emailed = await sendResendTicket(users[0], subject, message); } catch (error) { console.error("Resend support error:", error.message); }
    res.status(201).json({ success: true, message: emailed ? "Support request sent by email" : "Support request saved. Email delivery is not configured yet.", data: { id: ticket.insertId, emailed } });
  } catch (error) { console.error("Support ticket error:", error.message); res.status(500).json({ success: false, message: "Unable to create support request" }); }
};

exports.askAssistant = async (req, res) => {
  try {
    const message = String(req.body.message || "").trim(); if (!message || message.length > 1000) return res.status(400).json({ success: false, message: "Ask a question of up to 1,000 characters" });
    if (!process.env.GEMINI_API_KEY) return res.json({ success: true, data: { reply: "I can help with collection requests, complaints, bin locations, login, and dashboard access. For account-specific help, please create a support ticket or use WhatsApp." }, configured: false });
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: "You are EcoSmart Ballari customer support. Answer briefly, politely, and only about waste collection, complaints, account login, maps, or dashboard features. Do not request passwords, OTPs, tokens, or personal sensitive data. If the request needs human review, advise the user to create a support ticket." }] }, contents: [{ role: "user", parts: [{ text: message }] }] }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || "Gemini request failed");
    const reply = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
    if (!reply) throw new Error("Gemini did not return a response");
    res.json({ success: true, data: { reply }, configured: true });
  } catch (error) { console.error("Gemini support error:", error.message); res.status(502).json({ success: false, message: "The AI assistant is temporarily unavailable. Please use email or WhatsApp support." }); }
};
