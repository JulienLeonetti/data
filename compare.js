// compare.js
// Utilise les stats agrégées par saison depuis le JSON agrégé

const TEAM_STATS_URL = './data/csvjson (1).json';

// Couleurs par équipe (à ajuster si tu veux)
// clés en minuscule
const TEAM_COLORS = {
  arsenal: '#EF0107',
  blackpool: '#000000',              // noir comme tu voulais
  chelsea: '#034694',
  'crystal palace': '#1B458F',
  liverpool: '#C8102E',
  'manchester city': '#6CABDD',
  'manchester united': '#DA291C',
  everton: '#003399',
  'tottenham hotspur': '#132257',
  'newcastle united': '#000000',     // club à dominante noire
  fulham: '#000000',
  'wolverhampton wanderers': '#FDB913',
  'west ham united': '#7A263A',
  'aston villa': '#95BFE5',
  'leicester city': '#003090',
  southampton: '#D71920',
  burnley: '#6C1D45',
  'queens park rangers': '#1B458F',
  norwich: '#00A650',
  swansea: '#000000',
  watford: '#FBEE23',
  brighton: '#0057B8',
  'sheffield united': '#EE2737',
  'huddersfield town': '#0057B8'
};

// Couleurs par défaut si le club n'est pas dans TEAM_COLORS
const DEFAULT_COLORS = ['#4C6FFF', '#4ADE80', '#F97316', '#E11D48'];

// Libellés lisibles pour chaque métrique
const METRIC_LABELS = {
  goals: 'Buts par saison',
  wins: 'Victoires',
  total_pass: 'Passes',
  clean_sheet: 'Clean sheets',
  total_scoring_att: 'Tirs',
  ontarget_scoring_att: 'Tirs cadrés',
  total_tackle: 'Tacles'
};

let teamStats = [];
let seasons = [];
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  const selectA = document.getElementById('teamA');
  const selectB = document.getElementById('teamB');
  const metricSelect = document.getElementById('metric');
  const warningSameTeam = document.getElementById('same-team-warning');

  const chartDom = document.getElementById('comparisonChart');
  chartInstance = echarts.init(chartDom);

  fetch(TEAM_STATS_URL)
    .then(res => res.json())
    .then(data => {
      teamStats = data;

      // Saisons triées
      seasons = Array.from(new Set(teamStats.map(d => d.season))).sort();

      // Noms d’équipes triés
      const teams = Array.from(new Set(teamStats.map(d => d.team))).sort();

      populateSelect(selectA, teams, 'Liverpool');
      populateSelect(selectB, teams, 'Arsenal');

      updateChart();

      selectA.addEventListener('change', () => {
        updateChart();
        handleSameTeamWarning();
      });

      selectB.addEventListener('change', () => {
        updateChart();
        handleSameTeamWarning();
      });

      if (metricSelect) {
        metricSelect.addEventListener('change', () => {
          updateChart();
        });
      }

      function handleSameTeamWarning() {
        if (selectA.value && selectA.value === selectB.value) {
          warningSameTeam.style.display = 'block';
        } else {
          warningSameTeam.style.display = 'none';
        }
      }
    })
    .catch(err => {
      console.error('Erreur de chargement des stats :', err);
      chartInstance.setOption({
        backgroundColor: 'transparent',
        title: {
          text: 'Erreur de chargement des données',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#fff', fontSize: 18 }
        }
      });
    });
});

// ---------- Helpers ----------

// Choisit la couleur du club
function getTeamColor(teamName, idx) {
  const key = teamName.toLowerCase();
  if (TEAM_COLORS[key]) return TEAM_COLORS[key];
  return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
}

// Remplit un <select> avec la liste des équipes
function populateSelect(select, teams, defaultTeam) {
  select.innerHTML = '<option value="">– Choisir une équipe –</option>';

  teams.forEach(team => {
    const opt = document.createElement('option');
    opt.value = team;
    opt.textContent = team;
    if (team === defaultTeam) opt.selected = true;
    select.appendChild(opt);
  });
}

// Construit les données pour une équipe selon la métrique
function buildSeriesForTeam(teamName, color) {
  const metricSelect = document.getElementById('metric');
  const metric = metricSelect ? metricSelect.value : 'goals';

  const data = seasons.map(season => {
    const record = teamStats.find(
      d => d.team === teamName && d.season === season
    );
    if (!record) return null;

    const raw = record[metric];
    const value = raw !== undefined && raw !== null ? Number(raw) : null;
    return isNaN(value) ? null : value;
  });

  return {
    name: teamName,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    showSymbol: true,
    connectNulls: false,
    data,
    lineStyle: {
      width: 3,
      color
    },
    itemStyle: {
      color
    },
    areaStyle: {
      opacity: 0.15,
      color
    }
  };
}

// Met à jour le graphique en fonction des équipes + métrique
function updateChart() {
  if (!chartInstance || !teamStats.length) return;

  const teamA = document.getElementById('teamA').value;
  const teamB = document.getElementById('teamB').value;
  const metricSelect = document.getElementById('metric');
  const metric = metricSelect ? metricSelect.value : 'goals';

  const series = [];
  const legendNames = [];

  if (teamA) {
    const colorA = getTeamColor(teamA, 0);
    series.push(buildSeriesForTeam(teamA, colorA));
    legendNames.push(teamA);
  }

  if (teamB && teamB !== teamA) {
    const colorB = getTeamColor(teamB, 1);
    series.push(buildSeriesForTeam(teamB, colorB));
    legendNames.push(teamB);
  }

  if (!series.length) {
    chartInstance.setOption({
      backgroundColor: 'transparent',
      title: {
        text: 'Sélectionne deux équipes pour démarrer la comparaison',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#fff', fontSize: 16 }
      }
    });
    return;
  }

  const option = {
    backgroundColor: 'transparent',
    animationDuration: 1000,
    animationDurationUpdate: 800,
    animationEasing: 'cubicOut',

    textStyle: {
      color: '#fff'
    },

    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: params => {
        const season = params[0]?.axisValue || '';
        let html = `<strong>${season}</strong><br/>`;
        params.forEach(p => {
          html += `${p.marker} ${p.seriesName} : <strong>${p.data ?? 'N/A'}</strong><br/>`;
        });
        return html;
      }
    },

    legend: {
      data: legendNames,
      top: 70,
      left: 'center',          // légende centrée
      textStyle: { color: '#fff' }
    },

    grid: {
      left: '5%',
      right: '3%',
      top: 110,
      bottom: 40,
      containLabel: true
    },

    xAxis: {
      type: 'category',
      data: seasons,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#fff' } },
      axisLabel: { color: '#fff' },
      axisTick: { show: false }
    },

    yAxis: {
      type: 'value',
      name: METRIC_LABELS[metric] || metric,
      nameTextStyle: { color: '#fff', padding: [0, 0, 4, 0] },
      axisLine: { lineStyle: { color: '#fff' } },
      axisLabel: { color: '#fff' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,.15)' } }
    },

    series
  };

  chartInstance.setOption(option);
}
