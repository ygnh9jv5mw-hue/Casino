// Compare calculator charts to the published 6-deck charts used in the app.
const fs = require('fs');
const H17 = {
  h17:'SSSSSSSSSR', h16:'SSSSSHHRRR', h15:'SSSSSHHHRR', h14:'SSSSSHHHHH', h13:'SSSSSHHHHH', h12:'HHSSSHHHHH', h11:'DDDDDDDDDD', h10:'DDDDDDDDHH', h9:'HDDDDHHHHH', h8:'HHHHHHHHHH',
  s20:'SSSSSSSSSS', s19:'SSSSDSSSSS', s18:'DDDDDSSHHH', s17:'HDDDDHHHHH', s16:'HHDDDHHHHH', s15:'HHDDDHHHHH', s14:'HHHDDHHHHH', s13:'HHHDDHHHHH',
  p11:'PPPPPPPPPP', p10:'SSSSSSSSSS', p9:'PPPPPSPPSS', p8:'PPPPPPPPPR', p7:'PPPPPPHHHH', p6:'PPPPPHHHHH', p5:'DDDDDDDDHH', p4:'HHHPPHHHHH', p3:'PPPPPPHHHH', p2:'PPPPPPHHHH' };
const S17 = Object.assign({}, H17, { h17:'SSSSSSSSSS', h15:'SSSSSHHHRH', h11:'DDDDDDDDDH', s19:'SSSSSSSSSS', s18:'SDDDDSSHHH', p8:'PPPPPPPPPP' });
const UPR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]; // dealer 2..9,T,A as calc rank index
function compare(file, fixture) {
  const c = JSON.parse(fs.readFileSync(file, 'utf8')); let bad = 0, n = 0;
  for (const row in fixture) for (let i = 0; i < 10; i++) {
    n++; const got = c[row + '-' + UPR[i]].top, want = fixture[row][i];
    if (got !== want) { bad++; console.log(`  MISMATCH ${row} vs ${['2','3','4','5','6','7','8','9','T','A'][i]}: calc ${got} (noR ${c[row + '-' + UPR[i]].noR}), chart ${want}`); }
  }
  console.log(`${file}: ${n - bad}/${n} cells match`);
}
const which = process.argv[2];
if (which === 'h17') compare('c6h17.json', H17); else compare('c6s17.json', S17);
