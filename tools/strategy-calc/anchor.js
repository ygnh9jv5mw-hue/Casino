const fs = require('fs');
const c6 = JSON.parse(fs.readFileSync('idx6.json')), c2 = JSON.parse(fs.readFileSync('idx2.json'));
const PUB = { ins: 3, '16v10': 0, '15v10': 4, TTv5: 5, TTv6: 4, '10v10': 4, '12v3': 2, '12v2': 3, '11vA': 1, '9v2': 1, '10vA': 4, '9v7': 3, '16v9': 5, '13v2': -1, '12v4': 0, '12v5': -2, '12v6': -1, '13v3': -2, '14v10R': 3, '15v10R': 0, '15v9R': 2, '15vAR': 1 };
const r = (x) => { const v = Math.round(x); return v === 0 ? 0 : v; };
const out = {};
console.log('id       6D-S17 6D-H17 2D-S17 2D-H17');
for (const id in PUB) {
  const base = c6[id].s17;
  const a = { s6: PUB[id], h6: r(PUB[id] + c6[id].h17 - base), s2: r(PUB[id] + c2[id].s17 - base), h2: r(PUB[id] + c2[id].h17 - base) };
  out[id] = a;
  console.log(id.padEnd(8), String(a.s6).padStart(6), String(a.h6).padStart(6), String(a.s2).padStart(6), String(a.h2).padStart(6));
}
fs.writeFileSync('anchored.json', JSON.stringify(out));
