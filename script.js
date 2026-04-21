// ===== HELPERS =====
function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '';
  const s = Math.round(seconds);
  const totalMins = Math.floor(s / 60);
  const sec = s % 60;
  if (totalMins === 0) return `${sec} giây`;
  if (sec === 0) return `${totalMins} phút`;
  return `${totalMins} phút ${sec} giây`;
}

// ===== STATE =====
let currentSlide = 0;
let totalSlides = 0;
let isTransitioning = false;

// ===== CARD DESIGNER =====
const DOV_CW = 240, DOV_CH = 340;

const mkDefaultCard = () => ({
  saved:  false,
  bgImage: null,
  avatar: { x:50, y:34, size:110 },
  badge:  { x:78, y:15, size:44, show:true },
  name:   { x:50, y:62, show:true, fontSize:16 },
  code:   { x:50, y:71, show:true, fontSize:11 },
  org:    { x:50, y:78, show:true, fontSize:12 },
  score:  { x:50, y:86, show:true, fontSize:15 },
  time:   { x:50, y:93, show:true, fontSize:11 },
  frame:  'auto',
});

let dovCfgs  = {};
let dovLevel = 4;
let dovDrag  = null;

function dovLoad() {
  try { const s = localStorage.getItem('bxhCardConfig'); if (s) dovCfgs = JSON.parse(s); } catch(e) {}
}
function dovPersist() {
  localStorage.setItem('bxhCardConfig', JSON.stringify(dovCfgs));
}
function dovCfg(lvl) {
  const l = lvl !== undefined ? lvl : dovLevel;
  if (!dovCfgs[l]) dovCfgs[l] = mkDefaultCard();
  const cfg = dovCfgs[l];
  // backfill missing fields from newer schema
  if (!cfg.code) cfg.code = { x:50, y:71, show:true, fontSize:11 };
  if (!cfg.time) cfg.time = { x:50, y:93, show:true, fontSize:11 };
  return cfg;
}

function openDesigner() {
  const tabs = document.querySelector('.dov-tabs');
  tabs.innerHTML = '';
  const map = window.bxhPrizeLevelNames || {};
  const levels = Object.keys(map).map(Number).sort((a, b) => b - a);
  if (levels.length === 0) {
    // fallback static tabs
    [[4,'Đặc biệt'],[3,'Nhất'],[2,'Nhì'],[1,'Ba'],[0,'Cơ bản']].forEach(([l, label]) => {
      tabs.innerHTML += `<button class="dov-tab" data-l="${l}" onclick="dovSetLevel(${l})">${label}</button>`;
    });
    levels.push(4);
  } else {
    levels.forEach(lvl => {
      const btn = document.createElement('button');
      btn.className = 'dov-tab';
      btn.dataset.l = lvl;
      btn.textContent = map[lvl];
      btn.onclick = () => dovSetLevel(lvl);
      tabs.appendChild(btn);
    });
  }
  document.getElementById('designerOv').style.display = 'flex';
  dovSetLevel(levels[0] ?? 4);
}
function closeDesigner() {
  document.getElementById('designerOv').style.display = 'none';
}
function dovSetLevel(lvl) {
  dovLevel = lvl;
  document.querySelectorAll('.dov-tab').forEach(t => t.classList.toggle('active', +t.dataset.l === lvl));
  dovRender();
}

const DOV_BADGE_EMOJI = ['🏅','🥉','🥈','🥇','🏆'];

function dovRender() {
  const cfg = dovCfg();
  const canvas = document.getElementById('dovCanvas');
  if (!canvas) return;

  canvas.style.backgroundImage = cfg.bgImage ? `url(${cfg.bgImage})` : 'none';
  canvas.style.backgroundSize = 'cover';
  canvas.style.backgroundPosition = 'center';

  const av = cfg.avatar;
  const frameFile = cfg.frame === 'none' ? null
    : cfg.frame === 'auto' ? `frames/frame-level${dovLevel}.svg`
    : cfg.frame;
  const fSz  = Math.round(av.size * 1.45);
  const fOff = (av.size - fSz) / 2; // relative to avatar top-left

  // frame as separate canvas child (z-index:3, behind badge z-index:5)
  const frameEl = frameFile
    ? `<img src="${frameFile}"
         style="position:absolute;
                left:calc(${av.x}% - ${av.size/2}px + ${fOff}px);
                top:calc(${av.y}% - ${av.size/2}px + ${fOff}px);
                width:${fSz}px;height:${fSz}px;
                pointer-events:none;z-index:3" draggable="false">`
    : '';

  const bd = cfg.badge;
  const badgeEl = bd.show ? `
    <div class="dov-el" data-key="badge"
         style="left:calc(${bd.x}% - ${bd.size/2}px);top:calc(${bd.y}% - ${bd.size/2}px);
                width:${bd.size}px;height:${bd.size}px;font-size:${Math.round(bd.size*0.62)}px;
                cursor:move;z-index:5;display:flex;align-items:center;justify-content:center">
      ${DOV_BADGE_EMOJI[dovLevel]}
    </div>` : '';

  // name with ribbon badge style
  const mkTxt = (key, sample, extraStyle = '') => {
    const e = cfg[key];
    if (!e || !e.show) return '';
    const isName = key === 'name';
    const ribbonStyle = isName
      ? 'background:linear-gradient(90deg,rgba(180,20,20,0.2),rgba(200,30,30,0.8),rgba(180,20,20,0.2));padding:4px 14px;border-top:1px solid rgba(220,50,50,0.6);border-bottom:1px solid rgba(220,50,50,0.6);font-family:"Playfair Display",serif;font-weight:800;color:#E5C167;text-shadow:0 1px 4px rgba(0,0,0,0.6);'
      : '';
    return `<div class="dov-el dov-text-el" data-key="${key}"
                 style="left:${e.x}%;top:${e.y}%;font-size:${e.fontSize}px;cursor:move;z-index:6;${ribbonStyle}${extraStyle}">
               ${sample}
             </div>`;
  };

  canvas.innerHTML = `
    <div class="dov-el dov-av-el" data-key="avatar"
         style="left:calc(${av.x}% - ${av.size/2}px);top:calc(${av.y}% - ${av.size/2}px);
                width:${av.size}px;height:${av.size}px;cursor:move;z-index:4;border-radius:50%;overflow:hidden">
      <div style="width:${av.size}px;height:${av.size}px;border-radius:50%;
                  background:linear-gradient(135deg,#3a5580,#1a2f50);
                  display:flex;align-items:center;justify-content:center;
                  font-size:${Math.round(av.size*0.45)}px">👤</div>
    </div>
    ${frameEl}
    ${badgeEl}
    ${mkTxt('name',  'Nguyễn Văn A')}
    ${mkTxt('code',  'NV001')}
    ${mkTxt('org',   'Tổng đại lý HN')}
    ${mkTxt('score', '980 điểm')}
    ${mkTxt('time',  '12 phút 30 giây')}
  `;

  canvas.querySelectorAll('.dov-el').forEach(el => el.addEventListener('mousedown', dovMouseDown));

  document.getElementById('dovAvSize').value = av.size;
  document.getElementById('dovAvSizeVal').textContent = av.size;
  document.getElementById('dovBadgeSize').value = bd.size;
  document.getElementById('dovBadgeSizeVal').textContent = bd.size;
  document.getElementById('dovBadgeShow').checked   = bd.show;
  document.getElementById('dovShowName').checked    = cfg.name.show;
  document.getElementById('dovShowCode').checked    = cfg.code?.show ?? true;
  document.getElementById('dovShowOrg').checked     = cfg.org.show;
  document.getElementById('dovShowScore').checked   = cfg.score.show;
  document.getElementById('dovShowTime').checked    = cfg.time?.show ?? true;
  document.getElementById('dovFrameSel').value      = cfg.frame;
  const urlInp = document.getElementById('dovBgUrlInput');
  if (urlInp && !cfg.bgImage?.startsWith('data:')) urlInp.value = cfg.bgImage || '';

}

function dovMouseDown(e) {
  e.preventDefault(); e.stopPropagation();
  const rect = document.getElementById('dovCanvas').getBoundingClientRect();
  dovDrag = { key: e.currentTarget.dataset.key, rect };
  document.addEventListener('mousemove', dovMouseMove);
  document.addEventListener('mouseup', dovMouseUp);
}
function dovMouseMove(e) {
  if (!dovDrag) return;
  const { key, rect } = dovDrag;
  const cfg = dovCfg();
  const x = +Math.min(100, Math.max(0, (e.clientX - rect.left) / rect.width * 100)).toFixed(1);
  const y = +Math.min(100, Math.max(0, (e.clientY - rect.top) / rect.height * 100)).toFixed(1);
  if (cfg[key]) { cfg[key].x = x; cfg[key].y = y; }
  dovRender();
}
function dovMouseUp() {
  dovDrag = null;
  document.removeEventListener('mousemove', dovMouseMove);
  document.removeEventListener('mouseup', dovMouseUp);
}

function onAvSize(v)        { dovCfg().avatar.size = +v; document.getElementById('dovAvSizeVal').textContent = v; dovRender(); }
function onBadgeSize(v)     { dovCfg().badge.size  = +v; document.getElementById('dovBadgeSizeVal').textContent = v; dovRender(); }
function onBadgeShow(v)     { dovCfg().badge.show  = v; dovRender(); }
function onTxtShow(key, v)  { dovCfg()[key].show   = v; dovRender(); }
function onFrameSel(v)      { dovCfg().frame = v; dovRender(); }
function onBgImageUrl(url)  { dovCfg().bgImage = url || null; dovRender(); }
function onBgImageFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { dovCfg().bgImage = ev.target.result; dovRender(); };
  reader.readAsDataURL(file);
}
function clearBgImage() { dovCfg().bgImage = null; document.getElementById('dovBgUrlInput').value = ''; dovRender(); }

function saveLevelCfg() {
  dovCfg().saved = true;   // mark as explicitly saved
  dovPersist();
  if (typeof buildSlides === 'function' && document.getElementById('mainContent').style.display !== 'none') buildSlides();
  const btn = document.querySelector('.dov-btn-save');
  btn.textContent = '✅ Đã lưu!';
  setTimeout(() => { btn.textContent = '💾 Lưu & Áp dụng'; }, 1500);
}
function resetLevelCfg() {
  dovCfgs[dovLevel] = mkDefaultCard(); // saved=false → back to default rendering
  dovPersist();
  dovRender();
  if (typeof buildSlides === 'function' && document.getElementById('mainContent').style.display !== 'none') buildSlides();
}

function renderCustomCard(item, level) {
  const cfg = dovCfgs[level];
  if (!cfg) return null;
  const u   = item.__expand?.user || {};
  const org = item.__expand?.orgs?.[0]?.short_name || '';
  const av  = cfg.avatar;

  const frameFile = cfg.frame === 'none' ? null
    : cfg.frame === 'auto' ? `frames/frame-level${level}.svg`
    : cfg.frame;
  const fSz  = Math.round(av.size * 1.45);
  const fOff = (av.size - fSz) / 2;

  const frameEl = frameFile
    ? `<img src="${frameFile}"
         style="position:absolute;
                left:calc(${av.x}% - ${av.size/2}px + ${fOff}px);
                top:calc(${av.y}% - ${av.size/2}px + ${fOff}px);
                width:${fSz}px;height:${fSz}px;pointer-events:none;z-index:3">`
    : '';

  const bd = cfg.badge;
  const badgeEl = bd.show
    ? `<div style="position:absolute;left:calc(${bd.x}% - ${bd.size/2}px);top:calc(${bd.y}% - ${bd.size/2}px);
                  width:${bd.size}px;height:${bd.size}px;font-size:${Math.round(bd.size*0.62)}px;
                  display:flex;align-items:center;justify-content:center;z-index:5">
         ${DOV_BADGE_EMOJI[level]}
       </div>`
    : '';

  const mkEl = (key, text, extraStyle = '') => {
    const e = cfg[key];
    if (!e?.show || !text) return '';
    const isName = key === 'name';
    const ribbonStyle = isName
      ? 'background:linear-gradient(90deg,rgba(180,20,20,0.2),rgba(200,30,30,0.8),rgba(180,20,20,0.2));padding:4px 14px;border-top:1px solid rgba(220,50,50,0.6);border-bottom:1px solid rgba(220,50,50,0.6);font-family:"Playfair Display",serif;font-weight:800;color:#E5C167;text-shadow:0 1px 4px rgba(0,0,0,0.6);'
      : '';
    return `<div style="position:absolute;left:${e.x}%;top:${e.y}%;
                        transform:translateX(-50%);font-size:${e.fontSize}px;
                        color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.7);
                        white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis;
                        text-align:center;z-index:${isName?6:5};${ribbonStyle}${extraStyle}">${text}</div>`;
  };

  const bgStyle = cfg.bgImage
    ? `background-image:url(${cfg.bgImage});background-size:cover;background-position:center;`
    : '';

  const timeStr = item.spent_time ? formatTime(item.spent_time) : '';

  return `
    <div class="custom-card" style="position:relative;overflow:hidden;width:100%;height:100%;${bgStyle}">
      <div style="position:absolute;left:calc(${av.x}% - ${av.size/2}px);top:calc(${av.y}% - ${av.size/2}px);
                  width:${av.size}px;height:${av.size}px;z-index:4;border-radius:50%;overflow:hidden">
        ${makeAvatarHTML(u, av.size, 'cc-av')}
      </div>
      ${frameEl}
      ${badgeEl}
      ${mkEl('name',  u.name || 'N/A')}
      ${mkEl('code',  u.code || '')}
      ${mkEl('org',   org)}
      ${mkEl('score', item.score + ' điểm')}
      ${mkEl('time',  timeStr)}
    </div>`;
}

dovLoad();



// ===== CURL EXECUTOR =====
function parseCurlCommand(raw) {
  // Normalize line continuations (\<newline>)
  const cmd = raw.replace(/\\\s*\n/g, ' ').trim();

  // Tokenizer: respects ', ", and $'...' (ANSI-C quoting)
  const tokens = [];
  let i = 0;
  while (i < cmd.length) {
    if (cmd[i] === ' ' || cmd[i] === '\t') { i++; continue; }

    // $'...' — ANSI-C quoting: processes \r \n \t \\ etc.
    if (cmd[i] === '$' && cmd[i + 1] === "'") {
      i += 2;
      let s = '';
      while (i < cmd.length && cmd[i] !== "'") {
        if (cmd[i] === '\\') {
          i++;
          switch (cmd[i]) {
            case 'n':  s += '\n'; break;
            case 'r':  s += '\r'; break;
            case 't':  s += '\t'; break;
            case '\\': s += '\\'; break;
            case "'":  s += "'";  break;
            case '"':  s += '"';  break;
            default:   s += '\\' + (cmd[i] || '');
          }
        } else {
          s += cmd[i];
        }
        i++;
      }
      tokens.push(s);
      i++; // skip closing '
      continue;
    }

    // Single or double quoted string
    if (cmd[i] === "'" || cmd[i] === '"') {
      const q = cmd[i]; let j = i + 1; let s = '';
      while (j < cmd.length && cmd[j] !== q) {
        if (cmd[j] === '\\' && q === '"') { j++; s += cmd[j] || ''; }
        else s += cmd[j];
        j++;
      }
      tokens.push(s); i = j + 1;
      continue;
    }

    // Unquoted token
    let j = i;
    while (j < cmd.length && cmd[j] !== ' ' && cmd[j] !== '\t') j++;
    tokens.push(cmd.slice(i, j)); i = j;
  }

  let url = '', method = null, headers = {}, body = null;

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok === 'curl') continue;
    if (tok === '-X' || tok === '--request') { method = tokens[++t]; continue; }
    if (tok === '-H' || tok === '--header') {
      const hdr = tokens[++t]; const ci = hdr.indexOf(':');
      if (ci > 0) headers[hdr.slice(0, ci).trim()] = hdr.slice(ci + 1).trim();
      continue;
    }
    if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
      body = tokens[++t]; if (!method) method = 'POST'; continue;
    }
    if (tok === '-b' || tok === '--cookie') { headers['Cookie'] = tokens[++t]; continue; }
    if (tok === '--compressed' || tok === '-s' || tok === '-v' || tok === '-i' || tok === '-L') continue;
    if (tok === '-o' || tok === '--output' || tok === '-u' || tok === '--user' ||
        tok === '--max-time' || tok === '--connect-timeout') { t++; continue; }
    if (tok.startsWith('-')) continue;
    if (!url) url = tok;
  }

  if (!method) method = body ? 'POST' : 'GET';
  return { url, method: method.toUpperCase(), headers, body };
}

const PROXY = '/proxy';

async function checkProxy() {
  try {
    const res = await fetch('/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(1500) });
    return res.status !== 0;
  } catch { return false; }
}

async function executeCurl() {
  const raw = document.getElementById('cfgCurl').value.trim();
  const statusEl = document.getElementById('curlStatus');
  if (!raw) { statusEl.textContent = '⚠️ Chưa nhập lệnh curl'; statusEl.className = 'curl-status error'; return; }

  let parsed;
  try { parsed = parseCurlCommand(raw); } catch(e) {
    statusEl.textContent = '❌ Lỗi parse curl: ' + e.message;
    statusEl.className = 'curl-status error'; return;
  }
  if (!parsed.url) {
    statusEl.textContent = '❌ Không tìm thấy URL trong lệnh curl';
    statusEl.className = 'curl-status error'; return;
  }

  statusEl.textContent = '⏳ Đang kiểm tra proxy...';
  statusEl.className = 'curl-status loading';

  const proxyOk = await checkProxy();
  if (!proxyOk) {
    statusEl.innerHTML = '❌ Proxy chưa chạy — mở Terminal, chạy: <code style="background:rgba(255,255,255,0.1);padding:1px 6px;border-radius:4px">node proxy.js</code>';
    statusEl.className = 'curl-status error';
    return;
  }

  statusEl.textContent = '⏳ Đang gọi API qua proxy...';

  try {
    const res = await fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: parsed.url, method: parsed.method, headers: parsed.headers, body: parsed.body }),
    });
    const text = await res.text();
    const json = JSON.parse(text);
    const result = json.result;
    if (!Array.isArray(result)) {
      statusEl.textContent = '❌ Response không có trường "result" hoặc không phải mảng';
      statusEl.className = 'curl-status error'; return;
    }
    document.getElementById('cfgData').value = JSON.stringify(result);
    statusEl.textContent = `✅ Thành công — ${result.length} thí sinh`;
    statusEl.className = 'curl-status success';
  } catch(e) {
    if (e instanceof SyntaxError) {
      statusEl.textContent = '⚠️ API trả về nhưng không phải JSON hợp lệ';
    } else {
      statusEl.textContent = '❌ ' + e.message;
    }
    statusEl.className = 'curl-status error';
  }
}

// ===== FILE LOADING =====
function loadJsonFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('cfgData').value = e.target.result;
  };
  reader.readAsText(file);
}

// ===== CONFIG HELPERS =====
function addPrize() {
  const row = document.createElement('div');
  row.className = 'prize-row';
  row.innerHTML = `
    <input type="text" value="" placeholder="Tên giải">
    <input type="number" value="10" min="1" placeholder="SL">
    <button class="btn-remove-prize" onclick="removePrize(this)" title="Xóa">✕</button>`;
  document.getElementById('prizeList').appendChild(row);
}

function removePrize(btn) {
  const list = document.getElementById('prizeList');
  if (list.children.length > 1) btn.parentElement.remove();
}

function getPrizeConfig() {
  const rows = document.querySelectorAll('#prizeList .prize-row');
  return Array.from(rows).map(r => {
    const inputs = r.querySelectorAll('input');
    return { name: inputs[0].value.trim(), count: parseInt(inputs[1].value) || 0 };
  }).filter(p => p.name && p.count > 0);
}

// ===== AVATAR =====
const avatarColors = [
  '#0079C1','#005a91','#BD952F','#E5C167','#3399d6',
  '#896A23','#0e7490','#4f46e5','#7c3aed','#c026d3'
];

function getAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

function getInitials(name) {
  const p = name.split(' ');
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function makeAvatarHTML(user, size, extraClass) {
  const cls = extraClass || (size > 60 ? 'podium-avatar' : 'card-avatar');
  if (user.avatar) {
    const safeName = (user.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `<img src="${user.avatar}" alt="${user.name}"
      style="width:${size}px;height:${size}px"
      class="${cls}"
      onerror="this.outerHTML=makeAvatarPlaceholder('${safeName}',${size},'${cls}')">`;
  }
  return makeAvatarPlaceholder(user.name, size, cls);
}

function makeAvatarPlaceholder(name, size, cls) {
  const c = getAvatarColor(name);
  const fs = Math.round(size * 0.36);
  return `<div class="${cls}" style="width:${size}px;height:${size}px;background:${c};display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%">
    <span style="font-size:${fs}px;font-weight:700;color:#fff">${getInitials(name)}</span>
  </div>`;
}

// ===== PARTICLES =====
function createParticles() {
  const c = document.getElementById('particles');
  if (!c) return;
  const colors = ['#E5C167', '#0079C1', '#BD952F', '#fff'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (4 + Math.random() * 8) + 's';
    p.style.animationDelay = Math.random() * 10 + 's';
    p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.appendChild(p);
  }
}

// ===== PRIZE LEVEL (higher = more prestigious) =====
function getPrizeLevel(index, total) {
  if (total <= 1) return 4;
  if (total === 2) return index === 0 ? 1 : 4;
  if (total === 3) return [1, 2, 4][index];
  if (total === 4) return [1, 2, 3, 4][index];
  // 5+: first is level 0, last is 4, distribute in between
  const level = Math.round((index / (total - 1)) * 4);
  return level;
}

function getPrizeEmoji(level) {
  return { 0: '🎖️', 1: '🥉', 2: '🥈', 3: '🥇', 4: '🏆' }[level] || '⭐';
}

// ===== RENDER: PODIUM (1–4 người) =====
function renderPodiumGrid(items, startRank, prizeLevel) {
  const count = items.length;
  const avatarSize = count === 1 ? 280 : count === 2 ? 150 : count === 3 ? 120 : 100;

  let html = `<div class="podium-grid podium-count-${count}">`;
  items.forEach((item, i) => {
    if (dovCfgs[prizeLevel]?.saved) {
      html += `<div class="custom-card-wrap card-reveal" style="animation-delay:${(0.5 + i*1.0).toFixed(2)}s">
        ${renderCustomCard(item, prizeLevel)}
      </div>`;
      return;
    }
    const u    = item.__expand?.user || {};
    const org  = item.__expand?.orgs?.[0]?.short_name || '';
    const rank = startRank + i;
    const medals = ['🏆','🥇','🥈','🥉'];
    const medal  = medals[rank - 1] || `#${rank}`;

    html += `
      <div class="card-reveal" style="animation-delay:${(0.5 + i*1.0).toFixed(2)}s">
      <div class="podium-card">
        <div class="podium-av-col">
          <div class="podium-medal">${medal}</div>
          <div class="av-frame">
            ${makeAvatarHTML(u, avatarSize, 'podium-av')}
          </div>
        </div>
        <div class="podium-info-col">
          <div class="podium-name">${u.name || 'N/A'}</div>
          <div class="podium-code">${u.code || ''}</div>
          ${org ? `<div class="podium-org-badge" title="${org}">${org}</div>` : ''}
          <div class="podium-score-time">
            <span class="podium-score">${item.score} điểm</span>
            ${item.spent_time ? `<span class="podium-time">⏱ ${formatTime(item.spent_time)}</span>` : ''}
          </div>
        </div>
      </div>
      </div>`;
  });
  html += '</div>';
  return html;
}


function renderHonorGrid(items, startRank, prizeLevel) {
  let html = '<div class="honor-grid">';
  items.forEach((item, i) => {
    if (dovCfgs[prizeLevel]?.saved) {
      html += `<div class="custom-card-wrap card-reveal" style="animation-delay:${(0.3 + i*0.6).toFixed(2)}s">
        ${renderCustomCard(item, prizeLevel)}
      </div>`;
      return;
    }
    const u = item.__expand?.user || {};
    const org = item.__expand?.orgs?.[0]?.short_name || '';
    const code = u.code || '';
    html += `
      <div class="card-reveal" style="animation-delay:${(0.3 + i*0.6).toFixed(2)}s">
      <div class="honor-card">
        <div class="av-frame">
          ${makeAvatarHTML(u, 120, 'honor-avatar')}
        </div>
        <div class="honor-name-wrap">
          <div class="honor-name">${u.name || 'N/A'}</div>
          ${code ? `<div class="honor-name-code">${code}</div>` : ''}
        </div>
        <div class="honor-info">
          ${org  ? `<div class="honor-org-badge">${org}</div>`  : ''}
        </div>
        <div class="honor-footer">
          <div class="honor-score">${item.score}<span class="honor-score-unit">đ</span></div>
          ${item.spent_time ? `<div class="honor-time">⏱ ${formatTime(item.spent_time)}</div>` : ''}
        </div>
      </div>
      </div>`;
  });
  html += '</div>';
  return html;
}

// ===== RENDER: DUAL TABLE (no scroll, 2 columns) =====
const MAX_ROWS_PER_SECTION = 30; // 15 per column

function renderSingleTable(items, startRank) {
  let html = `<table class="rank-table">
    <thead><tr>
      <th class="col-rank">#</th>
      <th class="col-name">Họ và tên</th>
      <th class="col-code">Mã</th>
      <th class="col-org">Đơn vị</th>
      <th class="col-score" style="text-align:right">Điểm</th>
    </tr></thead><tbody>`;
  items.forEach((item, i) => {
    const u = item.__expand?.user || {};
    const org = item.__expand?.orgs?.[0]?.short_name || '';
    html += `<tr style="transition-delay:${(0.3 + i * 0.12).toFixed(2)}s">
      <td class="col-rank">${startRank + i}</td>
      <td class="col-name">${u.name || 'N/A'}</td>
      <td class="col-code">${u.code || ''}</td>
      <td class="col-org" title="${org}">${org}</td>
      <td class="col-score">${item.score}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  return html;
}

function renderDualTable(items, startRank) {
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);
  let html = '<div class="dual-table">';
  html += `<div class="table-col">${renderSingleTable(left, startRank)}</div>`;
  if (right.length > 0) {
    html += `<div class="table-col">${renderSingleTable(right, startRank + half)}</div>`;
  }
  html += '</div>';
  return html;
}

// ===== RENDER: ORG CHART (horizontal bar) =====
function renderOrgChart(items) {
  const orgMap = {};
  items.forEach(item => {
    const org = item.__expand?.orgs?.[0]?.short_name || 'Khác';
    orgMap[org] = (orgMap[org] || 0) + 1;
  });
  const sorted = Object.entries(orgMap).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10);
  if (rest.length > 0) {
    const otherCount = rest.reduce((s, [, c]) => s + c, 0);
    top.push([`Khác (${rest.length} đơn vị)`, otherCount]);
  }
  const max = top[0]?.[1] || 1;

  let html = '<div class="org-chart">';
  top.forEach(([name, count], i) => {
    const pct = Math.max(5, (count / max) * 100);
    html += `<div class="org-chart-bar" style="animation-delay:${i * 0.05}s" data-pct="${pct}">
      <span class="org-chart-label">${name}</span>
      <div class="org-chart-track">
        <div class="org-chart-fill" style="width:0%"></div>
      </div>
      <span class="org-chart-value">${count}</span>
    </div>`;
  });
  html += '</div>';
  return html;
}

function animateChartBars(slideEl) {
  const bars = slideEl.querySelectorAll('.org-chart-bar');
  bars.forEach(bar => {
    const pct = bar.dataset.pct;
    const fill = bar.querySelector('.org-chart-fill');
    if (fill) {
      // Reset width then force reflow to ensure transition starts reliably
      fill.style.width = '0%';
      // force reflow
      void fill.offsetWidth;
      requestAnimationFrame(() => { fill.style.width = pct + '%'; });
    }
  });
}

// ===== BUILD ALL SLIDES =====
function buildSlides(data, prizes, contestName, contestDesc) {
  const container = document.getElementById('slideContainer');
  container.innerHTML = '';

  // --- Slide 0: Hero ---
  const heroSlide = document.createElement('section');
  heroSlide.className = 'slide hero active';
  heroSlide.id = 'slide-0';
  const totalPrizes = prizes.reduce((s, p) => s + p.count, 0);
  heroSlide.innerHTML = `
    <div class="particles" id="particles"></div>
    <img src="https://www.baovietnhantho.com.vn/img/bao-viet-nhan-tho.jpg" alt="Logo" class="hero-logo"
         onerror="this.style.display='none'">
    <div class="hero-badge">BẢNG VINH DANH</div>
    <h1>${contestName}</h1>
    <p class="hero-subtitle">${contestDesc}</p>
    <div class="hero-stats">
      <div class="hero-stat">
        <div class="hero-stat-number" id="statTotal">0</div>
        <div class="hero-stat-label">Thí sinh</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-number" id="statPrizes">0</div>
        <div class="hero-stat-label">Giải thưởng</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-number" id="statTop">0</div>
        <div class="hero-stat-label">Điểm cao nhất</div>
      </div>
    </div>
    <div class="scroll-indicator">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
      </svg>
    </div>`;
  container.appendChild(heroSlide);

  // --- Reverse prizes: show smaller prizes first, grand prize last ---
  const reversedPrizes = [...prizes].reverse();
  // Calculate data offsets for reversed order
  const prizeOffsets = [];
  {
    let off = 0;
    for (const p of prizes) {
      prizeOffsets.push(off);
      off += p.count;
    }
  }
  const reversedOffsets = [...prizeOffsets].reverse();

  // Store level → prize name for card designer
  window.bxhPrizeLevelNames = {};
  prizes.forEach((p, i) => {
    const lvl = getPrizeLevel(i, prizes.length);
    window.bxhPrizeLevelNames[lvl] = p.name;
  });

  // Slide names for nav
  const slideNames = ['Trang chủ'];

  // ── Background decorations: bokeh + light streaks per level ──
  const LEVEL_PALETTE = {
    4: { bokeh: ['#0079C1','#3399d6','#00aaff','#005a91'], streak: 'rgba(100,180,255,0.55)' },
    3: { bokeh: ['#C0C0C0','#e8e8f0','#a0a8c0','#d0d8e8'], streak: 'rgba(220,228,255,0.55)' },
    2: { bokeh: ['#BD952F','#E5C167','#f0a830','#896A23'], streak: 'rgba(229,193,103,0.55)' },
    1: { bokeh: ['#E5C167','#BD952F','#A00028','#d4003a'], streak: 'rgba(229,193,103,0.55)' },
    0: { bokeh: ['#0079C1','#005a91','#3399d6','#223a52'], streak: 'rgba(80,140,200,0.35)' },
  };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function slideBgDecorations(lvl) {
    const pal = LEVEL_PALETTE[lvl] ?? LEVEL_PALETTE[0];
    let bokehHtml = '';
    const bkCount = 10;
    for (let i = 0; i < bkCount; i++) {
      const size   = rnd(50, 200) | 0;
      const x      = rnd(0, 100).toFixed(1);
      const y      = rnd(0, 100).toFixed(1);
      const color  = pal.bokeh[i % pal.bokeh.length];
      const blur   = rnd(30, 80) | 0;
      const op     = rnd(0.06, 0.18).toFixed(2);
      const dur    = rnd(8, 22).toFixed(1);
      const delay  = rnd(0, 12).toFixed(1);
      const rise   = (rnd(40, 120) | 0);
      bokehHtml += `<div class="bk" style="
        width:${size}px;height:${size}px;
        left:${x}%;top:${y}%;
        background:${color};
        filter:blur(${blur}px);
        opacity:${op};
        --bk-rise:-${rise}px;
        animation-duration:${dur}s;
        animation-delay:-${delay}s;
      "></div>`;
    }
    let streakHtml = '';
    const skCount = 4;
    for (let i = 0; i < skCount; i++) {
      const x     = rnd(5, 95).toFixed(1);
      const h     = rnd(30, 65) | 0;
      const angle = rnd(18, 38).toFixed(1);
      const dur   = rnd(28, 55).toFixed(1);
      const delay = rnd(0, 30).toFixed(1);
      const w     = rnd(1, 2.5).toFixed(1);
      streakHtml += `<div class="sk" style="
        left:${x}%;
        height:${h}vh;
        width:${w}px;
        --sk-angle:${angle}deg;
        background:linear-gradient(to bottom,transparent,${pal.streak},transparent);
        animation-duration:${dur}s;
        animation-delay:-${delay}s;
      "></div>`;
    }
    return `<div class="slide-bokeh">${bokehHtml}</div><div class="slide-streaks">${streakHtml}</div>`;
  }

  let slideIndex = 1;
  reversedPrizes.forEach((prize, ri) => {
    const origIndex = prizes.length - 1 - ri;
    const level = getPrizeLevel(origIndex, prizes.length);
    const emoji = getPrizeEmoji(level);
    const offset = reversedOffsets[ri];
    const items = data.slice(offset, offset + prize.count);
    if (items.length === 0) return;

    // Helper to create a slide element
    // skipHeaderAnim: nếu true → không chạy animation phần header (dùng cho trang phụ của cùng 1 giải)
    function makeSlide(className, content, navLabel, skipHeaderAnim) {
      const s = document.createElement('section');
      s.className = `slide prize-level-${level} ${className || ''}`;
      if (skipHeaderAnim) s.classList.add('no-section-anim');
      s.id = `slide-${slideIndex}`;
      s.innerHTML = slideBgDecorations(level) + content;
      container.appendChild(s);
      slideNames.push(navLabel);
      slideIndex++;
      return s;
    }

    function sectionHeader(subtitle) {
      return `<div class="section-header">
        <div class="section-badge">${emoji} ${prize.name}</div>
        <div class="section-title">${prize.name}</div>
        <div class="section-subtitle">${subtitle}</div>
      </div>`;
    }

    // >50: chart slide + paginated table slides
    if (items.length > 50) {
      makeSlide('chart-slide',
        sectionHeader(`${items.length} thí sinh — Phân bổ theo đơn vị`) + renderOrgChart(items),
        `${prize.name} — Thống kê`
      );
      for (let p = 0; p < items.length; p += MAX_ROWS_PER_SECTION) {
        const chunk = items.slice(p, p + MAX_ROWS_PER_SECTION);
        const pageNum = Math.floor(p / MAX_ROWS_PER_SECTION) + 1;
        const totalPages = Math.ceil(items.length / MAX_ROWS_PER_SECTION);
        const pageLabel = totalPages > 1 ? ` (${pageNum}/${totalPages})` : '';
        // Nếu là trang thứ 2+ của cùng một giải thì không cần chơi lại animation tiêu đề
        makeSlide('',
          sectionHeader(`${items.length} thí sinh xuất sắc${pageLabel}`) +
          renderDualTable(chunk, offset + p + 1),
          `${prize.name}${pageLabel}`,
          pageNum > 1
        );
      }
    }
    // 21–50: paginated dual tables
    else if (items.length > 20) {
      for (let p = 0; p < items.length; p += MAX_ROWS_PER_SECTION) {
        const chunk = items.slice(p, p + MAX_ROWS_PER_SECTION);
        const pageNum = Math.floor(p / MAX_ROWS_PER_SECTION) + 1;
        const totalPages = Math.ceil(items.length / MAX_ROWS_PER_SECTION);
        const pageLabel = totalPages > 1 ? ` (${pageNum}/${totalPages})` : '';
        makeSlide('',
          sectionHeader(`${items.length} thí sinh xuất sắc${pageLabel}`) +
          renderDualTable(chunk, offset + p + 1),
          `${prize.name}${pageLabel}`,
          pageNum > 1
        );
      }
    }
    // 5–20: honor cards, max 10/slide
    else if (items.length > 4) {
      const MAX_HONOR = 10;
      for (let p = 0; p < items.length; p += MAX_HONOR) {
        const chunk = items.slice(p, p + MAX_HONOR);
        const pageNum = Math.floor(p / MAX_HONOR) + 1;
        const totalPages = Math.ceil(items.length / MAX_HONOR);
        const pageLabel = totalPages > 1 ? ` (${pageNum}/${totalPages})` : '';
        makeSlide('',
          sectionHeader(`${items.length} thí sinh xuất sắc${pageLabel}`) +
          renderHonorGrid(chunk, offset + p + 1, level),
          `${prize.name}${pageLabel}`,
          pageNum > 1
        );
      }
    }
    // 1–4: podium nổi bật
    else {
      makeSlide('podium-slide',
        sectionHeader(`${items.length} thí sinh xuất sắc`) + renderPodiumGrid(items, offset + 1, level),
        prize.name
      );
    }
  });

  // --- Final slide: footer ---
  const footerSlide = document.createElement('section');
  footerSlide.className = 'slide footer-slide';
  footerSlide.id = `slide-${slideIndex}`;
  footerSlide.innerHTML = `
    <div class="footer-logo">${contestName}</div>
    <p>Powered by LotusLMS • Bảng vinh danh được tạo tự động</p>`;
  container.appendChild(footerSlide);
  slideNames.push('Kết thúc');
  slideIndex++;

  totalSlides = slideIndex;

  // --- Build nav dots ---
  const navDots = document.getElementById('navDots');
  navDots.innerHTML = '';
  slideNames.forEach((name, i) => {
    navDots.innerHTML += `<button class="nav-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})">
      <span class="nav-dot-label">${name}</span>
    </button>`;
  });

  // --- Slide counter ---
  updateSlideCounter();
}

// ===== SLIDE NAVIGATION =====
function goToSlide(index) {
  if (isTransitioning || index === currentSlide || index < 0 || index >= totalSlides) return;
  isTransitioning = true;

  const slides = document.querySelectorAll('#slideContainer .slide');
  const oldSlide = slides[currentSlide];
  const newSlide = slides[index];
  const direction = index > currentSlide ? 'up' : 'down';

  oldSlide.classList.remove('active');
  oldSlide.classList.add(direction === 'up' ? 'exit-up' : 'exit-down');

  newSlide.classList.remove('exit-up', 'exit-down');
  newSlide.style.transform = direction === 'up' ? 'translateY(80px) scale(1.05)' : 'translateY(-80px) scale(1.05)';
  newSlide.style.opacity = '0';

  requestAnimationFrame(() => {
    newSlide.classList.add('active');
    newSlide.style.transform = '';
    newSlide.style.opacity = '';
  });

  currentSlide = index;
  updateNavDots();
  updateSlideCounter();

  // Animate chart bars if entering a chart slide
  if (newSlide.classList.contains('chart-slide')) {
    setTimeout(() => animateChartBars(newSlide), 300);
  }

  // Use transitionend to re-enable controls when the slide transition completes.
  let settled = false;
  function clearTransition() {
    if (settled) return; settled = true;
    oldSlide.classList.remove('exit-up', 'exit-down');
    isTransitioning = false;
    newSlide.removeEventListener('transitionend', onNewTransitionEnd);
    oldSlide.removeEventListener('transitionend', onOldTransitionEnd);
    clearTimeout(fallbackTimeout);
  }

  function onNewTransitionEnd(e) {
    if (e.target !== newSlide) return;
    if (e.propertyName && (e.propertyName.includes('transform') || e.propertyName.includes('opacity'))) {
      clearTransition();
    }
  }
  function onOldTransitionEnd(e) {
    if (e.target !== oldSlide) return;
    if (e.propertyName && (e.propertyName.includes('transform') || e.propertyName.includes('opacity'))) {
      clearTransition();
    }
  }

  newSlide.addEventListener('transitionend', onNewTransitionEnd);
  oldSlide.addEventListener('transitionend', onOldTransitionEnd);

  // Fallback: in case transitionend doesn't fire, unlock after 1400ms
  const fallbackTimeout = setTimeout(clearTransition, 1400);
}

function nextSlide() { goToSlide(currentSlide + 1); }
function prevSlide() { goToSlide(currentSlide - 1); }

function updateNavDots() {
  document.querySelectorAll('.nav-dot').forEach((d, i) =>
    d.classList.toggle('active', i === currentSlide)
  );
}

function updateSlideCounter() {
  const counter = document.getElementById('slideCounter');
  if (counter) {
    counter.innerHTML = `<span class="current">${currentSlide + 1}</span> / ${totalSlides}`;
  }
}

// ===== KEYBOARD & SCROLL =====
function setupControls() {
  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('configPanel') &&
        !document.getElementById('configPanel').classList.contains('hidden')) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        prevSlide();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(totalSlides - 1);
        break;
    }
  });

  // Mouse wheel
  let wheelTimeout = null;
  document.addEventListener('wheel', (e) => {
    if (document.getElementById('configPanel') &&
        !document.getElementById('configPanel').classList.contains('hidden')) return;

    e.preventDefault();
    if (wheelTimeout) return;
    wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 800);

    if (e.deltaY > 0) nextSlide();
    else if (e.deltaY < 0) prevSlide();
  }, { passive: false });

  // Touch
  let touchStartY = 0;
  document.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; });
  document.addEventListener('touchend', (e) => {
    const diff = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  });
}

// ===== ANIMATED COUNTER =====
function animateCounter(el, target) {
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 60));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current;
  }, 25);
}

// ===== PARSE INPUT DATA =====
function parseInputData(raw) {
  try {
    const json = JSON.parse(raw);
    if (json.result && Array.isArray(json.result)) return json.result;
    if (Array.isArray(json)) return json;
    throw new Error('Cần dạng {"result":[...]} hoặc [...]');
  } catch (e) {
    alert('Lỗi parse JSON: ' + e.message);
    return null;
  }
}

// ===== START APP =====
async function startApp() {
  const contestName = document.getElementById('cfgContestName').value.trim() || 'Cuộc thi';
  const contestDesc = document.getElementById('cfgContestDesc').value.trim();
  const rawData = document.getElementById('cfgData').value.trim();
  const prizes = getPrizeConfig();

  if (prizes.length === 0) {
    alert('Vui lòng thêm ít nhất 1 giải thưởng');
    return;
  }

  document.getElementById('configPanel').classList.add('hidden');
  document.getElementById('loadingScreen').classList.remove('hidden');

  let data;
  if (rawData) {
    data = parseInputData(rawData);
  }

  // Nếu không có data (ô trống hoặc parse lỗi) → load data.json mặc định
  if (!data || data.length === 0) {
    try {
      const resp = await fetch('data.json');
      if (resp.ok) {
        const json = await resp.json();
        data = Array.isArray(json) ? json : (json.result || []);
      }
    } catch (e) { /* ignore */ }
  }

  if (!data || data.length === 0) {
    alert('Không có dữ liệu. Vui lòng paste JSON hoặc chọn file JSON.');
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('configPanel').classList.remove('hidden');
    return;
  }
  data.sort((a, b) => a.ranking - b.ranking);

  const totalPrizeCount = prizes.reduce((s, p) => s + p.count, 0);
  const displayData = data.slice(0, totalPrizeCount);

  buildSlides(displayData, prizes, contestName, contestDesc);
  createParticles();
  setupControls();

  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
    const main = document.getElementById('mainContent');
    main.style.display = 'block';
    requestAnimationFrame(() => main.classList.add('show'));

    setTimeout(() => {
      animateCounter(document.getElementById('statTotal'), data.length);
      animateCounter(document.getElementById('statPrizes'), totalPrizeCount);
      animateCounter(document.getElementById('statTop'), data[0]?.score || 0);
    }, 400);
  }, 1000);
}
