// Shared helpers + player detail modal for the Norge stats site.
// Pages must define a global DATA (from data.json) before showPlayer is used.

// full-stats table row fields
const F = { name:0, gp:1, min:2, fgm:3, fga:4, tpm:5, tpa:6, ftm:7, fta:8,
            ast:9, past:10, to:11, reb:12, stl:13, blk:14 };
// game log row fields
const GL = { date:0, season:1, opp:2, wl:3, score:4, min:5, fgm:6, fga:7,
             tpm:8, tpa:9, ftm:10, fta:11, ast:12, past:13, to:14,
             reb:15, stl:16, blk:17 };

function tMetric(r, k) {
  const pts = 2*r[F.fgm] + r[F.tpm] + r[F.ftm];
  switch (k) {
    case 'name': return r[F.name];
    case 'pts':  return pts;
    case 'fg':   return r[F.fga];
    case 'fgp':  return r[F.fga] ? r[F.fgm]/r[F.fga] : -1;
    case 'efg':  return r[F.fga] ? (r[F.fgm]+0.5*r[F.tpm])/r[F.fga] : -1;
    case 'tp':   return r[F.tpa];
    case 'ft':   return r[F.fta];
    case 'ato':  return r[F.to] ? r[F.ast]/r[F.to] : (r[F.ast] ? 99 : -1);
    default:     return r[F[k]];
  }
}

const fmtPct = x => x < 0 ? '—' : (100*x).toFixed(1);
const fmtAto = r => r[F.to] ? (r[F.ast]/r[F.to]).toFixed(1) : (r[F.ast] ? '∞' : '—');

// stat cells (everything after the label column) for a summary row
function statCells(r, pg) {
  const gp = r[F.gp] || 1;
  const s = pg ? (x => (x/gp).toFixed(1)) : (x => Math.round(x));
  const pts = 2*r[F.fgm] + r[F.tpm] + r[F.ftm];
  return `<td>${r[F.gp]}</td>
    <td>${pg ? (r[F.min]/gp).toFixed(1) : Math.round(r[F.min])}</td>
    <td>${s(pts)}</td>
    <td>${s(r[F.fgm])}/${s(r[F.fga])}</td>
    <td>${fmtPct(tMetric(r,'fgp'))}</td><td>${fmtPct(tMetric(r,'efg'))}</td>
    <td>${s(r[F.tpm])}/${s(r[F.tpa])}</td>
    <td>${s(r[F.ftm])}/${s(r[F.fta])}</td>
    <td>${s(r[F.ast])}</td><td>${s(r[F.past])}</td><td>${s(r[F.to])}</td>
    <td>${fmtAto(r)}</td>
    <td>${s(r[F.reb])}</td><td>${s(r[F.stl])}</td><td>${s(r[F.blk])}</td>`;
}

const STAT_HEADS = ['GP','MIN','PTS','FG','FG%','eFG%','3PT','FT','AST',
                    'pAST','TO','A/TO','REB','STL','BLK'];

const _logCache = {};

async function getLog(teamKey) {
  if (!_logCache[teamKey]) {
    _logCache[teamKey] = fetch(`gamelog_${teamKey}.json`).then(r => r.json());
  }
  return _logCache[teamKey];
}

function ensureModal() {
  if (document.getElementById('playerModal')) return;
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.id = 'playerModal';
  back.innerHTML = `<div class="modal">
    <div class="modal-head">
      <div><h2 id="pmName"></h2><div class="sub" id="pmSub"></div></div>
      <button class="modal-close" id="pmClose" aria-label="Close">✕</button>
    </div>
    <div class="modal-section">Season Stats — totals &amp; per game</div>
    <div class="table-scroll">
      <table class="stats-table" id="pmSeasons"><thead><tr></tr></thead><tbody></tbody></table>
    </div>
    <div class="modal-section">Game Log</div>
    <div class="table-scroll">
      <table class="stats-table" id="pmLog"><thead><tr></tr></thead><tbody></tbody></table>
    </div>
  </div>`;
  document.body.appendChild(back);
  document.getElementById('pmClose').onclick = () => back.classList.remove('open');
  back.onclick = e => { if (e.target === back) back.classList.remove('open'); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') back.classList.remove('open');
  });
}

async function showPlayer(teamKey, name) {
  ensureModal();
  const t = DATA.teams[teamKey];
  document.getElementById('pmName').textContent = name;
  document.getElementById('pmSub').textContent = t.team;

  // season summaries: newest season first, career pair last
  const pairs = [];
  for (const s of t.seasons) {
    if (s === 'all') continue;
    const row = (t.data[s].players || []).find(r => r[0] === name);
    if (row) pairs.push(['Season ' + s, row]);
  }
  const career = (t.data.all.players || []).find(r => r[0] === name);
  if (career) pairs.push(['Career', career]);

  document.querySelector('#pmSeasons thead tr').innerHTML =
    ['Season', ''].concat(STAT_HEADS).map(h =>
      `<th style="cursor:default">${h}</th>`).join('');
  document.querySelector('#pmSeasons tbody').innerHTML = pairs.map(([label, r]) => `
    <tr class="tot-row"><td>${label}</td>
      <td style="text-align:left;color:rgba(0,32,91,0.45)">TOT</td>${statCells(r, false)}</tr>
    <tr class="pg-row"><td></td>
      <td style="text-align:left;color:rgba(0,32,91,0.45)">/G</td>${statCells(r, true)}</tr>
  `).join('') || '<tr><td colspan="17">No season data.</td></tr>';

  const back = document.getElementById('playerModal');
  back.classList.add('open');
  back.scrollTop = 0;

  // game log (lazy)
  document.querySelector('#pmLog thead tr').innerHTML =
    ['Date','S','Opponent','W/L','Score','MIN','PTS','FG','3PT','FT',
     'AST','pAST','TO','REB','STL','BLK'].map(h =>
      `<th style="cursor:default">${h}</th>`).join('');
  document.querySelector('#pmLog tbody').innerHTML =
    '<tr><td colspan="16">Loading…</td></tr>';

  const log = (await getLog(teamKey))[name] || [];
  document.querySelector('#pmLog tbody').innerHTML = log.map(g => {
    const pts = 2*g[GL.fgm] + g[GL.tpm] + g[GL.ftm];
    return `<tr>
      <td>${g[GL.date]}</td><td>${g[GL.season]}</td>
      <td style="text-align:left">${g[GL.opp]}</td>
      <td style="color:${g[GL.wl] === 'W' ? 'inherit' : 'var(--red)'};font-weight:600">${g[GL.wl]}</td>
      <td>${g[GL.score]}</td>
      <td>${g[GL.min].toFixed ? g[GL.min].toFixed(1) : g[GL.min]}</td>
      <td>${pts}</td>
      <td>${g[GL.fgm]}/${g[GL.fga]}</td>
      <td>${g[GL.tpm]}/${g[GL.tpa]}</td>
      <td>${g[GL.ftm]}/${g[GL.fta]}</td>
      <td>${g[GL.ast]}</td><td>${g[GL.past]}</td><td>${g[GL.to]}</td>
      <td>${g[GL.reb]}</td><td>${g[GL.stl]}</td><td>${g[GL.blk]}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="16">No games found.</td></tr>';
}
