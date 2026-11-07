const fs = require('fs'); const UPR = [1,2,3,4,5,6,7,8,9,0];
const rows = ['h17','h16','h15','h14','h13','h12','h11','h10','h9','h8','s20','s19','s18','s17','s16','s15','s14','s13','p11','p10','p9','p8','p7','p6','p5','p4','p3','p2'];
const code = (x) => x.top === 'D' ? (x.noD === 'S' ? 'd' : 'D') : x.top === 'R' ? (x.noR === 'S' ? 'r' : x.noR === 'P' ? 'q' : x.noR === 'H' ? 'R' : '?' + x.noR) : x.top;
for (const f of ['c2h17.json', 'c2s17.json']) {
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(f, JSON.stringify(Object.fromEntries(rows.map(r => [r, UPR.map(u => code(c[r + '-' + u])).join('')]))));
}
