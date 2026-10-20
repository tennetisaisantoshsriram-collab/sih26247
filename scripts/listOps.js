const fs = require('fs');
const content = fs.readFileSync('lib/levels.ts', 'utf8');

const lines = content.split('\n');
const ops = [];
let cur = {};

lines.forEach((l, i) => {
  const opMatch = l.match(/opName:\s*"([^"]+)"/);
  if (opMatch) {
    cur.opName = opMatch[1];
    cur.line = i + 1;
  }
  const tgtMatch = l.match(/targetName:\s*"([^"]+)"/);
  if (tgtMatch && cur.opName) {
    cur.targetName = tgtMatch[1];
    ops.push({ ...cur });
    cur = {};
  }
});

console.log('Total ops parsed:', ops.length);
fs.writeFileSync('scripts/parsed_ops.json', JSON.stringify(ops, null, 2));
console.log('Saved to scripts/parsed_ops.json');
