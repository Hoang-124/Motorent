const fs = require("fs");

function patchFile(filepath, replacements) {
  let content = fs.readFileSync(filepath, "utf-8");
  // Normalize to LF temporarily
  const isCrlf = content.includes("\r\n");
  content = content.replace(/\r\n/g, "\n");

  for (const { target, replacement } of replacements) {
    const normTarget = typeof target === "string" ? target.replace(/\r\n/g, "\n") : target;
    if (typeof normTarget === "string") {
      if (!content.includes(normTarget)) {
        console.warn(`[WARN] Target not found in ${filepath}:\n${normTarget.slice(0, 100)}...`);
      } else {
        content = content.replace(normTarget, replacement.replace(/\r\n/g, "\n"));
      }
    } else {
      content = content.replace(normTarget, replacement);
    }
  }

  if (isCrlf) {
    content = content.replace(/\n/g, "\r\n");
  }
  fs.writeFileSync(filepath, content, "utf-8");
  console.log(`[OK] Patched ${filepath}`);
}

module.exports = { patchFile };

