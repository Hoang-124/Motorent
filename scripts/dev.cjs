const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const dotenv = require('../server/node_modules/dotenv');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, 'server', '.env');
const serverEnvironment = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
const port = Number(process.env.PORT || serverEnvironment.PORT || 5000);

const canConnect = (host, probePort) => new Promise((resolve) => {
  const socket = net.createConnection({ host, port: probePort });
  socket.setTimeout(1500);
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => { socket.destroy(); resolve(false); });
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
});
const isListening = async (probePort = port) => (await Promise.all(['127.0.0.1', '::1'].map((host) => canConnect(host, probePort)))).some(Boolean);

(async () => {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT trong server/.env không hợp lệ.');
  let reuseServer = false;
  let reuseClient = false;
  if (await isListening()) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(3000) });
      const health = await response.json();
      reuseServer = response.ok && health.success && health.data?.service === 'motorent' && health.data?.status === 'UP';
    } catch { /* Display the occupied-port guidance below. */ }
    if (!reuseServer) throw new Error(`Cổng ${port} đang được một tiến trình khác sử dụng. Dừng lần chạy npm run dev cũ bằng Ctrl+C rồi chạy lại. Không khởi động thêm server trên cùng cổng.`);
    console.log(`[DEV] Dùng server MOTORENT đang chạy ở cổng ${port}; khởi động giao diện.`);
  }
  if (await isListening(5173)) {
    try {
      const response = await fetch('http://localhost:5173/', { signal: AbortSignal.timeout(3000) });
      const html = await response.text();
      reuseClient = response.ok && /motorent/i.test(html) && /\/@vite\/client/.test(html) && /\/src\/main\.tsx/.test(html);
    } catch { /* Report the occupied port rather than starting another client. */ }
    if (!reuseClient) throw new Error('Cổng 5173 đang được ứng dụng khác sử dụng. Dừng lần chạy cũ hoặc giải phóng cổng rồi chạy lại.');
    console.log('[DEV] Giao diện MOTORENT đã chạy: http://localhost:5173/');
  }
  if (reuseServer && reuseClient) return;
  const concurrentlyBinary = path.join(path.dirname(require.resolve('concurrently/package.json')), 'dist', 'bin', 'concurrently.js');
  const commands = [...(reuseServer ? [] : ['npm --prefix server run dev']), ...(reuseClient ? [] : ['npm --prefix client run dev'])];
  const names = [...(reuseServer ? [] : ['SERVER']), ...(reuseClient ? [] : ['CLIENT'])];
  const colors = [...(reuseServer ? [] : ['blue']), ...(reuseClient ? [] : ['green'])];
  const child = spawn(process.execPath, [concurrentlyBinary, '--kill-others-on-fail', '-n', names.join(','), '-c', colors.join(','), ...commands], { cwd: root, stdio: 'inherit' });
  child.once('error', (error) => { console.error(`[DEV] ${error.message}`); process.exitCode = 1; });
  child.once('exit', (code) => { process.exitCode = code ?? 0; });
})().catch((error) => { console.error(`[DEV] ${error.message}`); process.exitCode = 1; });
