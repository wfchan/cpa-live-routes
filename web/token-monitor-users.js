// Settings ownership is refreshed with every poll; traffic dictionaries stay unchanged.
let userLabels = new Map(), userLabelsSignature = '';
function updateUserLabels(items) {
  const labels = Array.isArray(items) ? items.filter(u => u && /^[a-f0-9]{8}$/.test(u.fp)
    && typeof u.mask === 'string' && typeof u.name === 'string' && /^#[a-f0-9]{6}$/i.test(u.color)) : [];
  const signature = JSON.stringify(labels);
  if (signature === userLabelsSignature) return;
  userLabelsSignature = signature;
  userLabels = new Map(labels.map(u => [u.fp + ':' + u.mask, u]));
  motionLayer.key = '';
}
function clientUser(id) {
  const client = D.clients.get(id), key = client && D.keys.get(client.key);
  return key ? userLabels.get(key.fp + ':' + key.mask) : undefined;
}
function drawClient(n, x, y, w, h, small, bf, badge, bw, px, iw, f1, f2, three, l1, l2) {
  const user = clientUser(n.id), nm = mini() ? cliShort(n.id) : cliName(n.id), dotW = 14, sc = n.sess.size;
  const userFont = `600 ${small ? 9 : 10}px ${SANS}`;
  X.font = userFont;
  const userText = user ? fit(user.name, Math.max(0, iw * .52 - 10)) : '';
  const uw = userText ? X.measureText(userText).width + 10 : 0;
  const rightSpace = user ? uw + 5 : mini() ? 0 : bw + 6;
  X.font = f1;
  const cw = Math.max(0, Math.min(iw - rightSpace, X.measureText(nm).width + 12 + dotW));
  if (cw > dotW + 6) {
    X.fillStyle = C.ter; rr(px, l1 - 9, cw, 18, 5); X.fill();
    X.fillStyle = cliColor(n.id); X.beginPath(); X.arc(px + 8, l1, 3.2, 0, 7); X.fill();
    txt(nm, px + 8 + dotW - 3, l1, f1, C.text, cw - dotW - 6);
  }
  if (userText) {
    X.fillStyle = C.card; rr(px + iw - uw, l1 - 8, uw, 16, 4); X.fill();
    X.strokeStyle = user.color; X.lineWidth = 1;
    rr(px + iw - uw + .5, l1 - 7.5, uw - 1, 15, 4); X.stroke();
    txt(userText, px + iw - 5, l1, userFont, C.text, 0, 'right');
  } else if (!mini()) txt(badge, px + iw, l1, bf, C.faint, 0, 'right');
  const tg = sc ? (expanded.has(n.id) ? '▾ ' : '▸ ') + sc + ' sessions' : '';
  if (mini()) {
    txt(badge, px + iw, l2, bf, C.faint, 0, 'right');
    if (tg) txt(tg, px, l2, f2, C.info, Math.max(1, iw - bw - 4));
  } else if (three) {
    txt(cliSub(n.id), px, l2, f2, C.muted, iw);
    const bottom = y + h - 11;
    if (user) txt(badge, px + iw, bottom, bf, C.faint, 0, 'right');
    if (tg) txt(tg, px, bottom, f2, C.info, Math.max(1, iw - (user ? bw + 4 : 0)));
  } else {
    X.font = f2;
    const countWidth = user ? bw + 5 : tg ? X.measureText(tg).width + 6 : 0;
    txt(cliSub(n.id), px, l2, f2, C.muted, Math.max(1, iw - countWidth));
    if (user) txt(badge, px + iw, l2, bf, C.faint, 0, 'right');
    else if (tg) txt(tg, px + iw, l2, f2, C.info, 0, 'right');
  }
}
