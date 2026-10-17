// Read-only checks against the running application; never seeds or writes MongoDB.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const base = (process.env.TAI_CHECK_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const percentile = (values, ratio) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * ratio) - 1)];
const ms = (value) => Math.round(value * 100) / 100;
const get = async (pathname) => {
  const start = performance.now();
  const response = await fetch(`${base}${pathname}`, { signal: AbortSignal.timeout(10000) });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`${pathname}: HTTP ${response.status}`);
  return { body, duration: ms(performance.now() - start) };
};
(async () => {
  const report = { measuredAt: new Date().toISOString(), timezone: 'Asia/Ho_Chi_Minh', apiBase: base, health: null, catalog: null, searches: [], images: [], policyPublished: false };
  report.health = (await get('/health')).body.data;
  const fleet = (await get('/vehicles')).body.data;
  report.catalog = { total: fleet.length, yamahaCount: fleet.filter((vehicle) => vehicle.brand.toLowerCase() === 'yamaha').length };
  for (const query of ['page=1&limit=12', 'q=Y&page=1&limit=12', 'q=Ya&page=1&limit=12', 'q=43-B1&page=1&limit=12', 'brand=Yamaha&category=xe-tay-ga&minPrice=90000&maxPrice=140000&page=1&limit=12', 'sort=rating_desc&page=1&limit=12']) {
    const endpoint = `/vehicles?${query}`;
    const warmup = await get(endpoint);
    const durations = [];
    for (let iteration = 0; iteration < 10; iteration++) durations.push((await get(endpoint)).duration);
    report.searches.push({ query, count: warmup.body.data.length, total: warmup.body.pagination?.total, firstRequestMs: warmup.duration, p50Ms: ms(percentile(durations, 0.5)), p95Ms: ms(percentile(durations, 0.95)), maxMs: Math.max(...durations), within200ms: percentile(durations, 0.95) < 200 });
  }
  report.policyPublished = Boolean((await get('/pages/dieu-khoan-dich-vu')).body.data.content);
  const requireClient = createRequire(path.join(root, 'client', 'package.json'));
  const ts = requireClient('typescript');
  const helper = ts.transpileModule(fs.readFileSync(path.join(root, 'client', 'src', 'utils', 'imageHelper.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const { getOptimizedVehicleImageUrl } = await import(`data:text/javascript;base64,${Buffer.from(helper.outputText).toString('base64')}`);
  for (const vehicle of fleet.filter((entry) => entry.images?.length).slice(0, 5)) {
    const source = getOptimizedVehicleImageUrl(vehicle.images[0], 640);
    const url = new URL(source, base);
    const start = performance.now();
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(10000), headers: { Accept: 'image/webp,image/*' } });
      const bytes = (await response.arrayBuffer()).byteLength;
      const duration = ms(performance.now() - start);
      report.images.push({ vehicle: vehicle.vehicleModel, host: url.host, status: response.status, contentType: response.headers.get('content-type'), bytes, downloadMs: duration, within2Seconds: response.ok && duration < 2000 });
    } catch (error) { report.images.push({ vehicle: vehicle.vehicleModel, host: url.host, error: error.name, downloadMs: ms(performance.now() - start), within2Seconds: false }); }
  }
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  const reportPath = path.join(root, 'docs', 'tai-runtime-results.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => { console.error(`[CHECK] ${error.message}`); process.exitCode = 1; });
