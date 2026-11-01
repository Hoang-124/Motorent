const fs = require("fs");
const path = require("path");

const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && file !== "locales") {
        results = results.concat(walk(full));
      }
    } else if (/\.(tsx|ts)$/.test(file) && !file.includes("autoTranslator") && !file.includes("locales")) {
      results.push(full);
    }
  }
  return results;
}

const files = walk("./client/src");
const summary = [];

for (const f of files) {
  const content = fs.readFileSync(f, "utf-8");
  const lines = content.split("\n");
  let viCount = 0;
  const sampleLines = [];
  lines.forEach((l, idx) => {
    if (viRegex.test(l)) {
      viCount++;
      if (sampleLines.length < 3) sampleLines.push(`L${idx+1}: ${l.trim().slice(0, 75)}`);
    }
  });
  if (viCount > 0) {
    summary.push({ file: f.replace(/\\/g, "/"), viCount, samples: sampleLines });
  }
}

summary.sort((a, b) => b.viCount - a.viCount);
console.log(`Total files with Vietnamese: ${summary.length}`);
summary.forEach(s => {
  console.log(`${s.file}: ${s.viCount} lines`);
  s.samples.forEach(samp => console.log(`   ${samp}`));
});

