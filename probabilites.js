// probabilites.js
// Duel "chances de gagner" : club + saison vs club + saison

const TEAM_STATS_URL = './data/csvjson (1).json';

// Couleurs principales des clubs
const TEAM_COLORS = {
  // Big 6
  "Liverpool": "#C8102E",
  "Manchester City": "#6CABDD",
  "Manchester United": "#DA291C",
  "Chelsea": "#034694",
  "Arsenal": "#EF0107",
  "Tottenham Hotspur": "#132257",
  "Spurs": "#132257",

  // Clubs actuels / récents
  "Newcastle United": "#241F20",
  "Newcastle": "#241F20",

  "Everton": "#003399",

  "Brighton": "#0057B8",
  "Brighton and Hove Albion": "#0057B8",

  "Leicester City": "#003090",
  "Leicester": "#003090",

  "Crystal Palace": "#1B458F",

  "West Ham United": "#7A263A",
  "West Ham": "#7A263A",

  "Fulham": "#000000",

  "Wolverhampton Wanderers": "#FDB913",
  "Wolves": "#FDB913",

  "Burnley": "#6C1D45",

  "Sheffield United": "#EE2737",
  "Sheffield": "#EE2737",

  "Southampton": "#D71920",

  "Nottingham Forest": "#E53233",
  "Forest": "#E53233",

  "Aston Villa": "#670E36",

  "Bournemouth": "#DA291C",

  // Historiques PL / Championship
  "Portsmouth": "#0057B8",
  "Sunderland": "#E03A3E",
  "Stoke City": "#E03A3E",
  "Swansea City": "#000000",
  "Swansea": "#000000",

  "Wigan Athletic": "#005DAA",
  "Wigan": "#005DAA",

  "Blackpool": "#FF5F00",

  "Hull City": "#FF8F00",
  "Hull": "#FF8F00",

  "Reading": "#0036A7",

  "Bolton Wanderers": "#1C2C5B",
  "Bolton": "#1C2C5B",

  "Birmingham City": "#0057B8",
  "Birmingham": "#0057B8",

  "Cardiff City": "#0070B5",
  "Cardiff": "#0070B5",

  "Queens Park Rangers": "#1B3E90",
  "QPR": "#1B3E90",

  "West Bromwich Albion": "#122F67",
  "West Brom": "#122F67",

  "Blackburn Rovers": "#0054A6",
  "Blackburn": "#0054A6",

  "Huddersfield Town": "#0E63AD",
  "Huddersfield": "#0E63AD",

  "Derby County": "#000000",
  "Derby": "#000000",

  "Charlton Athletic": "#E41B17",
  "Charlton": "#E41B17",

  "Norwich City": "#00A650",
  "Norwich": "#00A650",

  "Watford": "#FBEE23",

  "Middlesbrough": "#CE2029",

  "Ipswich Town": "#003A88",
  "Ipswich": "#003A88"
};

let rows = [];
let seasons = [];
let seasonWinRates = {}; // { "team|season": { winRate, wins } }

document.addEventListener('DOMContentLoaded', () => {
  const selectTeamA = document.getElementById('duelTeamA');
  const selectTeamB = document.getElementById('duelTeamB');
  const selectSeasonA = document.getElementById('duelSeasonA');
  const selectSeasonB = document.getElementById('duelSeasonB');

  const resultBox  = document.getElementById('duel-result');
  const warningBox = document.getElementById('duel-warning');

  const chartDom = document.getElementById('duelChart');
  const chart    = echarts.init(chartDom);

  fetch(TEAM_STATS_URL)
    .then(res => res.json())
    .then(data => {
      rows = data;

      // Saisons & équipes disponibles
      seasons = Array.from(new Set(rows.map(r => r.season))).sort();
      const teams = Array.from(new Set(rows.map(r => r.team))).sort();

      // winRate par (team, season)
      seasonWinRates = buildSeasonWinRates(rows);

      // Remplir les selects
      populateSelect(selectTeamA, teams, 'Liverpool');
      populateSelect(selectTeamB, teams, 'Blackburn Rovers');

      populateSelect(selectSeasonA, seasons, '2014-2015');
      populateSelect(selectSeasonB, seasons, '2006-2007');

      // Premier rendu
      updateDuel(chart, resultBox, warningBox);

      // Listeners
      [selectTeamA, selectTeamB, selectSeasonA, selectSeasonB].forEach(sel => {
        sel.addEventListener('change', () => updateDuel(chart, resultBox, warningBox));
      });
    })
    .catch(err => {
      console.error('Erreur chargement stats :', err);
      chart.setOption(emptyOption());
      warningBox.style.display = 'block';
      warningBox.textContent = 'Erreur de chargement des données.';
    });
});

/* --------- Helpers de données --------- */

function buildSeasonWinRates(rows) {
  const dict = {};
  rows.forEach(row => {
    const team   = row.team;
    const season = row.season;
    const wins   = Number(row.wins) || 0;

    const key = `${team}|${season}`;
    dict[key] = {
      wins,
      season,
      winRate: wins / 38   // 38 matches par saison
    };
  });
  return dict;
}

function populateSelect(select, values, defaultValue) {
  select.innerHTML = '<option value="">– Choisir –</option>';
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    if (v === defaultValue) opt.selected = true;
    select.appendChild(opt);
  });
}

/* --------- Mise à jour du duel --------- */

function updateDuel(chart, resultBox, warningBox) {
  const teamA    = document.getElementById('duelTeamA').value;
  const teamB    = document.getElementById('duelTeamB').value;
  const seasonA  = document.getElementById('duelSeasonA').value;
  const seasonB  = document.getElementById('duelSeasonB').value;

  // Reset messages
  warningBox.style.display = 'none';
  warningBox.innerHTML     = '';
  resultBox.innerHTML      = '';

  // Si tout n’est pas choisi → graph vide + petit message
  if (!teamA || !teamB || !seasonA || !seasonB) {
    chart.setOption(emptyOption());
    warningBox.style.display = 'block';
    warningBox.textContent   = 'Sélectionne deux équipes et deux saisons pour lancer le duel.';
    return;
  }

  const keyA  = `${teamA}|${seasonA}`;
  const keyB  = `${teamB}|${seasonB}`;
  const dataA = seasonWinRates[keyA];
  const dataB = seasonWinRates[keyB];

  const labelA = `${teamA} (${seasonA})`;
  const labelB = `${teamB} (${seasonB})`;

  // ---------- CAS 1 : données manquantes ----------
  if (!dataA || !dataB) {
    chart.setOption(noDataOption([labelA, labelB]));

    warningBox.style.display = 'block';

    if (!dataA && !dataB) {
      warningBox.innerHTML =
        `Impossible de calculer les probabilités : ` +
        `<strong>${labelA}</strong> et <strong>${labelB}</strong> ` +
        `ne figurent pas dans les données. Ces clubs n’étaient probablement pas en Premier League à ce moment-là.`;
    } else if (!dataA) {
      warningBox.innerHTML =
        `Impossible de calculer les probabilités : <strong>${labelA}</strong> ` +
        `ne figure pas dans les données. Ce club n’était probablement pas en Premier League à ce moment-là.`;
    } else {
      warningBox.innerHTML =
        `Impossible de calculer les probabilités : <strong>${labelB}</strong> ` +
        `ne figure pas dans les données. Ce club n’était probablement pas en Premier League à ce moment-là.`;
    }
    return;
  }

  // ---------- CAS 2 : données OK ----------
  let pA, pB;

  if (teamA === teamB && seasonA === seasonB) {
    pA = pB = 50;
    warningBox.style.display = 'block';
    warningBox.textContent =
      'Tu as sélectionné deux fois la même équipe sur la même saison : les probabilités sont donc 50% / 50%.';
  } else {
    const rA = dataA.winRate;
    const rB = dataB.winRate;
    const sum = rA + rB;
    if (sum === 0) {
      pA = pB = 50;
    } else {
      pA = (rA / sum) * 100;
      pB = (rB / sum) * 100;
    }
  }

  pA = Number(pA.toFixed(1));
  pB = Number(pB.toFixed(1));

  // 🎨 couleurs dynamiques selon le club
  const colorA = TEAM_COLORS[teamA] || '#4ade80'; // fallback vert
  const colorB = TEAM_COLORS[teamB] || '#f97316'; // fallback orange

  const option = {
    backgroundColor: 'transparent',
    animationDuration: 800,
    animationEasing: 'cubicOut',
    grid: {
        left: '6%',
        right: '8%',
        top: 40,
        bottom: 75,     // un peu plus de place pour le nom de l’axe
        containLabel: true
      },
      
    textStyle: { color: '#fff' },

    xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: 'Probabilité de victoire (%)',
        nameLocation: 'center',      // 👈 centre le texte
        nameGap: 35,                 // espace entre l’axe et le texte
        nameTextStyle: { color: '#fff', padding: [0, 0, 4, 0] },
        axisLine:   { lineStyle: { color: '#fff' } },
        axisLabel:  { color: '#fff' },
        splitLine:  { lineStyle: { color: 'rgba(255,255,255,.15)' } }
      },
      

    yAxis: {
      type: 'category',
      data: [labelA, labelB],
      axisLine:  { lineStyle: { color: '#fff' } },
      axisLabel: { color: '#fff' }
    },

    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        const p = params[0];
        return `<strong>${p.name}</strong><br/>Chances estimées : <strong>${p.value}%</strong>`;
      }
    },

    series: [{
      type: 'bar',
      data: [pA, pB],
      barWidth: 28,
      itemStyle: {
        borderRadius: [8, 8, 8, 8],
        color: params => (params.dataIndex === 0 ? colorA : colorB)
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c} %',
        color: '#fff',
        fontWeight: 600
      }
    }]
  };

  chart.setOption(option);

  // Texte de résultat
  if (teamA === teamB && seasonA === seasonB) {
    resultBox.innerHTML =
      `En choisissant deux fois <strong>${labelA}</strong>, on obtient logiquement ` +
      `<strong>50% / 50%</strong>.`;
  } else {
    const winnerIsA  = pA > pB;
    const winnerLabel = winnerIsA ? labelA : labelB;
    const loserLabel  = winnerIsA ? labelB : labelA;
    const winnerProb  = winnerIsA ? pA : pB;
    const loserProb   = winnerIsA ? pB : pA;

    resultBox.innerHTML =
      `<strong>${winnerLabel}</strong> a environ <strong>${winnerProb}%</strong> ` +
      `de chances de gagner contre <strong>${loserLabel}</strong> ` +
      `(contre <strong>${loserProb}%</strong> pour l’adversaire).`;
  }
}

/* --------- Options de graphes "vides" --------- */

function emptyOption() {
  return {
    backgroundColor: 'transparent',
    xAxis: { show: false },
    yAxis: { show: false },
    series: []
  };
}


function noDataOption(labels) {
  return {
    backgroundColor: 'transparent',
    animation: false,
    grid: {
      left: '5%',
      right: '6%',
      top: 40,
      bottom: 60,
      containLabel: true
    },
    textStyle: { color: '#fff' },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine:  { lineStyle: { color: '#fff' } },
      axisLabel: { color: '#fff' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,.15)' } }
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLine:  { lineStyle: { color: '#fff' } },
      axisLabel: { color: '#fff' }
    },
    series: [{
      type: 'bar',
      data: [null, null],
      barWidth: 28
    }]
  };
}
