const fs = require('fs');
let u = fs.readFileSync('src/ui.js', 'utf8');

/* 1) 序号 → 可输入 */
const oldN = `'<div class="spell-slot"><div class="ss-n">' + (i + 1) + '</div>' +`;
const newN = `'<div class="spell-slot"><input class="ss-n" type="number" inputmode="numeric" ' +
        'min="1" max="' + S.loadout.length + '" value="' + (i + 1) + '" data-pos="' + i + '" ' +
        'title="填数字直接换到这个位次">' +`;
if (!u.includes(oldN)) { console.log('MISS ss-n'); process.exit(1); }
u = u.replace(oldN, newN);

/* 2) 统一移动函数：法术与条件一起走 */
const anchor = `  function renderSpellSlots() {`;
const helper = `  function moveSpell(from, to) {
    var n = S.loadout.length;
    if (from === to || from < 0 || from >= n || to < 0 || to >= n) return false;
    var it = S.loadout.splice(from, 1)[0];
    S.loadout.splice(to, 0, it);
    if (S.conds && S.conds.length) {
      var cv = S.conds[from];
      S.conds.splice(from, 1);
      S.conds.splice(to, 0, cv);
    }
    return true;
  }

  function renderSpellSlots() {`;
if (!u.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
u = u.replace(anchor, helper);

/* 3) 输入框事件 */
const condTail = `    $('spell-slots').querySelectorAll('[data-cond]').forEach(function (sel) {`;
const posHandler = `    $('spell-slots').querySelectorAll('[data-pos]').forEach(function (inp) {
      inp.onchange = function () {
        var from = parseInt(inp.getAttribute('data-pos'), 10);
        var to = parseInt(inp.value, 10) - 1;
        if (isNaN(to)) { renderSpellSlots(); return; }
        to = Math.max(0, Math.min(S.loadout.length - 1, to));
        if (moveSpell(from, to)) {
          W.save();
          toast('移到第 ' + (to + 1) + ' 位');
        }
        renderSpellSlots();
      };
      inp.onkeydown = function (ev2) { if (ev2.key === 'Enter') inp.blur(); };
    });
` + condTail;
u = u.replace(condTail, posHandler);

/* 4) 上下箭头也走同一个函数 */
const oldArrow = `    if (up || down) {
      var id = (up || down).getAttribute(up ? 'data-up' : 'data-down');
      var i = S.loadout.indexOf(id), j = i + (up ? -1 : 1);
      if (i < 0 || j < 0 || j >= S.loadout.length) return;
      var t = S.loadout[i]; S.loadout[i] = S.loadout[j]; S.loadout[j] = t;
      W.save(); renderSpellSlots();
    }`;
const newArrow = `    if (up || down) {
      var id = (up || down).getAttribute(up ? 'data-up' : 'data-down');
      var i = S.loadout.indexOf(id), j = i + (up ? -1 : 1);
      if (moveSpell(i, j)) { W.save(); renderSpellSlots(); }
    }`;
if (!u.includes(oldArrow)) { console.log('WARN arrow handler unchanged'); } else { u = u.replace(oldArrow, newArrow); }

fs.writeFileSync('src/ui.js', u, 'utf8');
console.log('ui.js 改完');
