// Memastikan node_modules sesuai package-lock.json sebelum aplikasi dijalankan.
// Setelah `git pull`, rekan bisa menambah/mengubah paket; tanpa `npm install`
// aplikasi akan crash (mis. "Cannot find module 'xlsx-js-style'").
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lockPath = path.join(root, "package-lock.json");
const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, "utf8")) : null;

const outdated = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((name) => {
  const installedPath = path.join(root, "node_modules", name, "package.json");
  if (!fs.existsSync(installedPath)) return true;
  const expected = lock?.packages?.[`node_modules/${name}`]?.version;
  if (!expected) return false;
  return JSON.parse(fs.readFileSync(installedPath, "utf8")).version !== expected;
});

if (outdated.length > 0) {
  console.log(`[ensure-deps] Paket belum terpasang/berbeda versi: ${outdated.join(", ")}`);
  console.log("[ensure-deps] Menjalankan npm install...");
  execSync("npm install", { cwd: root, stdio: "inherit" });
}
