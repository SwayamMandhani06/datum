const fs = require('fs');
const path = require('path');

const cssFile = fs.readdirSync('dist/assets').find(f => f.endsWith('.css'));
const css = fs.readFileSync(path.join('dist/assets', cssFile), 'utf8');

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) files = files.concat(walk(fp));
    else if (fp.endsWith('.tsx') || fp.endsWith('.ts')) files.push(fp);
  }
  return files;
}

const files = walk('src');
const missingClasses = new Map();

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const classMatches = [
    ...content.matchAll(/className=["']([^"']+)["']/g),
    ...content.matchAll(/className=\{`([^`]+)`\}/g),
  ];
  for (const m of classMatches) {
    const raw = m[1] || '';
    const tokens = raw.replace(/\$\{[^}]+\}/g, '').split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      if (t.startsWith('!') || t.includes(':') || t.includes('[') || t.includes('/') || t.startsWith('-')) {
        continue;
      }
      // check if in css
      const cleanT = t.trim();
      if (!cleanT) continue;
      const escapedForCss = cleanT.replace(/\./g, '\\.');
      const classRegex = new RegExp('\\.' + escapedForCss.replace(/([*+?^=!:${}()|\[\]\/\\])/g, '\\$1') + '(?=[^a-zA-Z0-9_-]|$)', 'i');
      if (!classRegex.test(css)) {
        if (!missingClasses.has(cleanT)) missingClasses.set(cleanT, []);
        missingClasses.get(cleanT).push(path.relative('.', f));
      }
    }
  }
}

console.log('=== POTENTIALLY MISSING OR INVALID CLASSES ===');
for (const [cls, list] of missingClasses.entries()) {
  console.log(`${cls} (${list.length} occurrences): ${list.slice(0, 3).join(', ')}`);
}
