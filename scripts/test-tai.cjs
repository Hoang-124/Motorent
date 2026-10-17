const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const server = path.join(root, 'server');
const vitest = path.join(server, 'node_modules', 'vitest', 'vitest.mjs');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'motorent-tai-'));
const configs = ['guest', 'categories', 'management', 'pricing', 'manager-pricing', 'fleet', 'dashboard'];
// Each suite owns a uniquely named localhost database and checks its connection
// before cleanup. Never fall back to the inherited default test configuration.
for (const name of configs) {
  const config = `vitest.${name}.config.mts`;
  if (!fs.existsSync(path.join(server, config))) { console.error(`Thiếu cấu hình kiểm thử ${config}`); process.exit(1); }
  const result = spawnSync(process.execPath, [vitest, 'run', '--config', config], { cwd: server, stdio: 'inherit', env: { ...process.env, TEMP: tempDir, TMP: tempDir } });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const imageCheck = spawnSync(process.execPath, [path.join(root, 'client', 'scripts', 'check-image-helper.mjs')], { cwd: path.join(root, 'client'), stdio: 'inherit' });
process.exitCode = imageCheck.status ?? 1;
