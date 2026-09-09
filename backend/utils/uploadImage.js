const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const allowed = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

exports.saveBase64Image = async value => {
  if (!value) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match || !allowed[match[1]]) throw new Error("Only JPG, PNG, or WebP image files are allowed");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new Error("Image must be smaller than 2 MB");
  const filename = `${crypto.randomUUID()}.${allowed[match[1]]}`;
  const folder = path.join(__dirname, "..", "uploads", "problems");
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, filename), bytes, { flag: "wx" });
  return `/uploads/problems/${filename}`;
};
