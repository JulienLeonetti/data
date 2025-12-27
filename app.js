/************************
 * Fixtures (semaine en cours) via football-data.org
 ************************/
const API_TOKEN = "fe5c1a50cdb84914bb66f51dde53c6bb"; // ← ton token
const COMP = "PL";
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";

const fmtDay  = new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"2-digit",month:"short"});
const fmtTime = new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:TZ});
const iso = d => d.toISOString().slice(0,10);

function startOfWeek(d=new Date()){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-wd); return x; }
function endOfWeek(d=new Date()){ const x=startOfWeek(d); x.setDate(x.getDate()+6); x.setHours(23,59,59,999); return x; }

function setWeekLabel(a,b){ const el=document.getElementById("week-range"); if(el) el.textContent=`${fmtDay.format(a)} → ${fmtDay.format(b)}`; }
const crest = t => t?.crest || t?.emblem || "";
const niceName = n => ({
  "Manchester City FC":"Man City",
  "Manchester United FC":"Man Utd",
  "Tottenham Hotspur FC":"Spurs",
  "Nottingham Forest FC":"Nott'm Forest",
  "Brighton & Hove Albion FC":"Brighton",
})[n] || n.replace(/ FC$| A\.?F\.?C$| F\.?C\.?$/i,"");

function renderFixtures(matches){
  const root = document.getElementById("fixtures");
  const empty = document.getElementById("fx-empty");
  if(!root) return;

  root.innerHTML = "";
  if(!matches.length){ if(empty) empty.hidden=false; return; }
  if(empty) empty.hidden = true;

  let current = "", list;
  for(const m of matches){
    const dt = new Date(m.utcDate);
    const dayKey = dt.toISOString().slice(0,10);

    if(dayKey !== current){
      current = dayKey;
      const day = document.createElement("div");
      day.className = "fx-day"; day.textContent = fmtDay.format(dt);
      root.appendChild(day);

      list = document.createElement("div");
      list.className = "fx-list";
      root.appendChild(list);
    }

    const row = document.createElement("div");
    row.className = "fx-item";

    const home = document.createElement("div");
    home.className = "fx-team home";
    home.innerHTML = `
      <img class="fx-logo" src="${crest(m.homeTeam)}" alt="${m.homeTeam.name}"
        onerror="this.style.display='none'">
      <span>${niceName(m.homeTeam.shortName || m.homeTeam.name)}</span>
    `;

    const mid = document.createElement("div");
    mid.className = "fx-kick";
    let text;
    if (m.status === "FINISHED" || m.score?.fullTime?.home != null){
      const h = m.score.fullTime.home ?? "-";
      const a = m.score.fullTime.away ?? "-";
      text = `${h}:${a}`;
    } else {
      text = fmtTime.format(dt);
    }
    mid.textContent = text;

    const away = document.createElement("div");
    away.className = "fx-team away";
    away.innerHTML = `
      <span>${niceName(m.awayTeam.shortName || m.awayTeam.name)}</span>
      <img class="fx-logo" src="${crest(m.awayTeam)}" alt="${m.awayTeam.name}"
        onerror="this.style.display='none'">
    `;

    row.append(home, mid, away);
    list.appendChild(row);
    row.insertAdjacentHTML("afterend","<div class='fx-sep'></div>");
  }
  const seps = root.querySelectorAll(".fx-sep"); if(seps.length) seps[seps.length-1].remove();
}

async function loadWeek(){
  const from = startOfWeek(), to = endOfWeek();
  setWeekLabel(from, to);
  try{
    const url = `https://api.football-data.org/v4/competitions/${COMP}/matches?dateFrom=${iso(from)}&dateTo=${iso(to)}`;
    const res = await fetch(url, { headers:{ "X-Auth-Token": API_TOKEN }});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const data = await res.json();
    const matches = (data.matches||[])
      .filter(m => m.status !== "POSTPONED")
      .sort((a,b)=> new Date(a.utcDate) - new Date(b.utcDate));
    renderFixtures(matches);
  }catch(e){
    const empty = document.getElementById("fx-empty");
    if(empty) empty.hidden=false;
  }
}
loadWeek().catch(()=>{});

/* Reload à minuit pour mettre à jour la semaine automatiquement */
(function atMidnight(){
  const now = new Date(), next = new Date();
  next.setHours(24,0,0,0);
  setTimeout(()=>location.reload(), next-now);
})();

/************************
 * CLASSEMENT (depuis tes JSON) — GLOBAL / DOMICILE / EXTÉRIEUR
 ************************/
const FILE_RESULTS = 'data/csvjson.json';       // match par match
const FILE_STATS   = 'data/csvjson (1).json';   // stats par équipe/saison

/* Logos – clés = noms présents dans tes données */
const TEAM_LOGOS = {
  "Liverpool":"https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
  "Arsenal":"https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
  "Tottenham Hotspur":"https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",
  "Manchester City":"https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  "Manchester United":"https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
  "Chelsea":"https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
  "Newcastle United":"https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg",

  "Everton":"logo/everton.png",
  "Crystal Palace":"logo/crystal-palace.png",
  "West Ham United":"logo/west-ham.png",
  "Fulham":"logo/fulham.png",
  "Wolverhampton Wanderers":"logo/wolves.png",
  "Brighton and Hove Albion":"logo/brighton.png",
  "Brighton & Hove Albion":"logo/brighton.png",
  "Burnley":"logo/burnley.png",
  "Sheffield United":"logo/sheffield.png",
  "Leeds United":"logo/leeds.png",
  "Nottingham Forest":"logo/forest.png",
  "Southampton":"logo/southampton.png",
  "Portsmouth":"logo/portsmouth.png",
  "Sunderland":"logo/sunderland.png",
  "Stoke City":"logo/stoke-city.png",
  "Swansea City":"logo/swansea.png",
  "Wigan Athletic":"logo/wigan.png",
  "Blackpool":"logo/blackpool.png",
  "Hull City":"logo/hull-city.png",
  "Reading":"logo/reading.png",
  "Bolton Wanderers":"logo/bolton.png",
  "Birmingham City":"logo/birmingham.png",
  "Cardiff City":"logo/cardiff.png",
  "Queens Park Rangers":"logo/qpr.png",
  "West Bromwich Albion":"logo/west-brom.png",
  "Ipswich Town":"logo/ipswich.png",
  "Leicester City":"logo/leicester.png",
  "Aston Villa":"logo/aston-villa.png",

  "Huddersfield Town":"logo/huddersfield.png",
  "Blackburn Rovers":"logo/blackburn.png",
  "Middlesbrough":"logo/middlesbrough.png",
  "Norwich City":"logo/norwich.png",
  "Derby County":"logo/derby.png",
  "Charlton Athletic":"logo/charlton.png",
  "Watford":"logo/watford.png",
  "AFC Bournemouth":"logo/bournemouth.png"
};
const DEFAULT_LOGO = "";

/* Helpers communs */
const $ = s => document.querySelector(s);

const normSeason = s => {
  if (!s) return null;
  s = String(s).trim();
  const m = s.match(/(\d{4})\D+(\d{4})/);
  if (m) return `${m[1]}–${m[2]}`;
  if (/^\d{4}$/.test(s)) return `${s}–${(+s+1)}`;
  return s.replace('/', '–').replace('-', '–');
};

function addTeam(bucket, season, team){
  if(!bucket[season]) bucket[season] = {};
  if(!bucket[season][team]){
    bucket[season][team] = { team, played:0, wins:0, draws:0, losses:0, gf:0, ga:0, gd:0, pts:0 };
  }
}

function toArrayTable(seasonMap){
  return Object.values(seasonMap)
    .sort((a,b)=> b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team))
    .map((t,i)=> ({pos:i+1, ...t}));
}

/* Construction depuis les résultats match-par-match
   scope = "global" | "home" | "away" */
function buildFromResultsScoped(results, scope="global"){
  const seasons = {};
  for(const r of results){
    const season = normSeason(r.season || r.Season || r.SEASON);
    const home   = r.home_team || r.HomeTeam || r.Hometeam || r.home || r.Home;
    const away   = r.away_team || r.AwayTeam || r.Awayteam || r.away || r.Away;
    const hg     = Number(r.home_goals ?? r.FTHG ?? r.home_score ?? r.HomeGoals ?? r.HG);
    const ag     = Number(r.away_goals ?? r.FTAG ?? r.away_score ?? r.AwayGoals ?? r.AG);
    if(!season || !home || !away || Number.isNaN(hg) || Number.isNaN(ag)) continue;

    if(scope === "global"){
      // comptabilise les deux équipes
      addTeam(seasons, season, home); addTeam(seasons, season, away);
      const H = seasons[season][home], A = seasons[season][away];
      H.played++; A.played++;
      H.gf+=hg; H.ga+=ag; H.gd=H.gf-H.ga;
      A.gf+=ag; A.ga+=hg; A.gd=A.gf-A.ga;
      if(hg>ag){ H.wins++; H.pts+=3; A.losses++; }
      else if(hg<ag){ A.wins++; A.pts+=3; H.losses++; }
      else { H.draws++; A.draws++; H.pts++; A.pts++; }
    } else if(scope === "home"){
      // uniquement la performance à domicile (pour l’équipe à domicile)
      addTeam(seasons, season, home);
      const H = seasons[season][home];
      H.played++;
      H.gf+=hg; H.ga+=ag; H.gd=H.gf-H.ga;
      if(hg>ag){ H.wins++; H.pts+=3; }
      else if(hg<ag){ H.losses++; }
      else { H.draws++; H.pts++; }
    } else if(scope === "away"){
      // uniquement la performance à l’extérieur (pour l’équipe à l’extérieur)
      addTeam(seasons, season, away);
      const A = seasons[season][away];
      A.played++;
      A.gf+=ag; A.ga+=hg; A.gd=A.gf-A.ga;
      if(ag>hg){ A.wins++; A.pts+=3; }
      else if(ag<hg){ A.losses++; }
      else { A.draws++; A.pts++; }
    }
  }
  const out={}; for(const s of Object.keys(seasons)) out[s]=toArrayTable(seasons[s]); return out;
}

/* Construction depuis stats agrégées (si ton second JSON ne contient PAS home/away distinct,
   on ne peut générer que "global" avec cette source) */
function buildFromStatsGlobal(stats){
  const seasons={};
  for(const s of stats){
    const season = normSeason(s.season || s.Season);
    const team   = s.team || s.Team;
    if(!season || !team) continue;
    const wins   = +s.wins   || +s.Wins   || 0;
    const losses = +s.losses || +s.Losses || 0;
    const played = +s.played || +s.Played || 38;
    const draws  = Math.max(0, played - wins - losses);
    const gf     = +s.goals  || +s.Goals  || 0;
    const ga     = +s.goals_against || +s.GA || 0;
    const gd     = gf - ga;
    const pts    = wins*3 + draws;
    if(!seasons[season]) seasons[season]={};
    seasons[season][team]={ team, played, wins, draws, losses, gf, ga, gd, pts };
  }
  const out={}; for(const s of Object.keys(seasons)) out[s]=toArrayTable(seasons[s]); return out;
}

/* Rendu générique d’un tableau dans un <tbody> donné */
function renderSeasonTable(table, tbodyEl){
  if(!tbodyEl) return;
  if (!table || !table.length){
    tbodyEl.innerHTML = `<tr><td colspan="10" style="text-align:center;opacity:.8;padding:20px">Aucune donnée trouvée.</td></tr>`;
    return;
  }
  const rows = table.map(t=>{
    const tr = document.createElement('tr');

    const tdPos = document.createElement('td'); tdPos.textContent = t.pos;

    const tdTeam = document.createElement('td'); tdTeam.className='team';
    const img = document.createElement('img'); img.className='badge'; img.alt=t.team; img.src = TEAM_LOGOS[t.team] || DEFAULT_LOGO;
    img.onerror = ()=>{ img.style.display='none'; };
    const name = document.createElement('span'); name.className='name'; name.textContent=t.team;
    tdTeam.append(img, name);

    tr.append(
      tdPos, tdTeam,
      cell(t.played), cell(t.wins), cell(t.draws), cell(t.losses),
      cell(t.gf), cell(t.ga), cell(t.gd), cell(t.pts)
    );
    return tr;
  });
  tbodyEl.replaceChildren(...rows);

  function cell(v){ const c=document.createElement('td'); c.textContent=v; return c; }
}

/* ==== INIT CLASSEMENT UNIFIÉ (1 tableau + switch de portée) ==== */
async function initStandingsUnified(){
    const tbody = document.querySelector('#league-table tbody');
    const seasonSelect = document.querySelector('#season-select');
    const scopeButtons = Array.from(document.querySelectorAll('.scope-btn'));
    if(!tbody || !seasonSelect || !scopeButtons.length) return;
  
    let currentScope = 'global';
    let bySeasonGlobal = {}, bySeasonHome = {}, bySeasonAway = {};
  
    try{
      const [r1, r2] = await Promise.all([fetch(FILE_RESULTS), fetch(FILE_STATS)]);
      let results = [], stats = [];
      if(r1.ok) results = await r1.json();
      if(r2.ok) stats   = await r2.json();
  
      // Construits les 3 variantes
      bySeasonGlobal = buildFromResultsScoped(results, "global");
      if(!Object.keys(bySeasonGlobal).length && stats?.length){
        bySeasonGlobal = buildFromStatsGlobal(stats); // fallback si pas de matches
      }
      bySeasonHome = buildFromResultsScoped(results, "home");
      bySeasonAway = buildFromResultsScoped(results, "away");
  
      // Saisons (on se base sur global)
      const seasons = Object.keys(bySeasonGlobal)
        .map(normSeason).filter(Boolean)
        .sort((a,b)=> a.localeCompare(b,'en',{numeric:true}));
  
      if(!seasons.length){
        renderSeasonTable([], tbody);
        return;
      }
  
      // Remplit le select saison
      seasonSelect.innerHTML = seasons.map(s=>`<option value="${s}">${s}</option>`).join('');
      seasonSelect.value = seasons.at(-1);
  
      function getMap(scope){
        if(scope === 'home') return bySeasonHome;
        if(scope === 'away') return bySeasonAway;
        return bySeasonGlobal;
      }
      function render(){
        const map = getMap(currentScope);
        const season = seasonSelect.value;
        renderSeasonTable(map[season] || [], tbody);
      }
  
      // Listeners
      seasonSelect.addEventListener('change', render);
      scopeButtons.forEach(btn=>{
        btn.addEventListener('click', ()=>{
          if(btn.dataset.scope === currentScope) return;
          currentScope = btn.dataset.scope;
          scopeButtons.forEach(b=>{
            const active = b === btn;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          render();
        });
      });
  
      // Premier rendu
      render();
    }catch(e){
      console.error(e);
      renderSeasonTable([], tbody);
    }
  }
  initStandingsUnified();
  