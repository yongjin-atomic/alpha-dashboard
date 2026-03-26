// ============================================================
// Mount Alpha Fund - Dashboard Application
// Simple Interest 10% p.a., real-time daily accrual
// ============================================================

const ANNUAL_RATE = 0.10;
const DAILY_RATE = ANNUAL_RATE / 365;
const SECOND_RATE = ANNUAL_RATE / (365 * 24 * 60 * 60);

// --- Investor Configurations ---
const investors = {
  kim: {
    name: '김승주',
    principal: 43,
    startDate: new Date('2023-04-01'),
    withdrawals: [
      { date: new Date('2024-06-30'), amount: 0.07539 },
      { date: new Date('2024-07-30'), amount: 0.15156 },
    ],
  },
  cho: {
    name: '조영은',
    principal: 12,
    startDate: new Date('2023-04-01'),
    withdrawals: [],
  },
};

// --- Generate daily data for an investor (historical, up to end of yesterday) ---
function generateDailyData(config) {
  const { principal, startDate, withdrawals } = config;
  const dailyProfit = principal * DAILY_RATE;
  const data = [];
  let balance = principal;
  let cumulativeProfit = 0;
  let totalWithdrawn = 0;

  const withdrawalMap = {};
  withdrawals.forEach(w => {
    const key = w.date.toISOString().split('T')[0];
    withdrawalMap[key] = w.amount;
  });

  // End of yesterday (historical data boundary)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const current = new Date(startDate);
  // First day: initial deposit, no profit yet
  data.push({
    date: new Date(current),
    balance: principal,
    profit: 0,
    withdrawal: 0,
    cumulativeProfit: 0,
  });

  current.setDate(current.getDate() + 1);

  while (current < todayStart) {
    const dateKey = current.toISOString().split('T')[0];
    const withdrawal = withdrawalMap[dateKey] || 0;

    cumulativeProfit += dailyProfit;
    balance += dailyProfit - withdrawal;
    totalWithdrawn += withdrawal;

    data.push({
      date: new Date(current),
      balance: balance,
      profit: dailyProfit,
      withdrawal: withdrawal,
      cumulativeProfit: cumulativeProfit,
    });

    current.setDate(current.getDate() + 1);
  }

  return {
    data,
    principal,
    totalProfit: cumulativeProfit,
    totalWithdrawn,
    endOfDayBalance: balance,
    dailyProfit,
  };
}

// --- Real-time balance calculation ---
function getLiveBalance(investorKey) {
  const d = investorData[investorKey];
  if (!d) return d;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const secondsToday = (now - todayStart) / 1000;

  // Today's accrued profit so far (per-second granularity)
  const todayProfit = d.principal * SECOND_RATE * secondsToday;
  const liveBalance = d.endOfDayBalance + todayProfit;
  const liveTotalProfit = d.totalProfit + todayProfit;

  return {
    ...d,
    currentBalance: liveBalance,
    liveTotalProfit,
    todayProfit,
    secondsToday,
  };
}

function getLiveCombined() {
  const kim = getLiveBalance('kim');
  const cho = getLiveBalance('cho');
  return {
    principal: kim.principal + cho.principal,
    currentBalance: kim.currentBalance + cho.currentBalance,
    liveTotalProfit: kim.liveTotalProfit + cho.liveTotalProfit,
    totalWithdrawn: kim.totalWithdrawn + cho.totalWithdrawn,
    dailyProfit: kim.dailyProfit + cho.dailyProfit,
    todayProfit: kim.todayProfit + cho.todayProfit,
  };
}

// --- Generate total (combined) historical data ---
function generateTotalData() {
  const kimData = investorData.kim;
  const choData = investorData.cho;
  const combined = [];

  const maxLen = Math.max(kimData.data.length, choData.data.length);
  for (let i = 0; i < maxLen; i++) {
    const k = kimData.data[i] || { balance: 0, profit: 0, withdrawal: 0, cumulativeProfit: 0 };
    const c = choData.data[i] || { balance: 0, profit: 0, withdrawal: 0, cumulativeProfit: 0 };
    const date = kimData.data[i]?.date || choData.data[i]?.date;

    combined.push({
      date,
      balance: k.balance + c.balance,
      profit: k.profit + c.profit,
      withdrawal: k.withdrawal + c.withdrawal,
      cumulativeProfit: k.cumulativeProfit + c.cumulativeProfit,
    });
  }

  return {
    data: combined,
    principal: kimData.principal + choData.principal,
    totalProfit: kimData.totalProfit + choData.totalProfit,
    totalWithdrawn: kimData.totalWithdrawn + choData.totalWithdrawn,
    endOfDayBalance: kimData.endOfDayBalance + choData.endOfDayBalance,
    dailyProfit: kimData.dailyProfit + choData.dailyProfit,
  };
}

// --- Pre-compute historical data ---
const investorData = {
  kim: generateDailyData(investors.kim),
  cho: generateDailyData(investors.cho),
};
investorData.total = generateTotalData();

// --- State ---
let currentInvestor = 'kim';
let currentChartRange = 'all';
let currentTableView = 'monthly';
let balanceChart = null;
let profitChart = null;
let tickerInterval = null;

// --- Initialize ---
function init() {
  switchTab('kim');
  startLiveTicker();
}

// --- Live Ticker: random 1-5s intervals, simulating quant algo execution ---
function startLiveTicker() {
  function tick() {
    updateLiveCards();
    updateLiveTabBalances();
    updateTimestamp();

    // Schedule next tick at random 0.5-3s interval
    const nextDelay = 500 + Math.random() * 2500;
    setTimeout(tick, nextDelay);
  }

  tick();
}

function updateTimestamp() {
  const now = new Date();
  document.getElementById('lastUpdated').textContent =
    now.toLocaleDateString('ko-KR') + ' ' + now.toLocaleTimeString('ko-KR');
}

function updateLiveTabBalances() {
  const kim = getLiveBalance('kim');
  const cho = getLiveBalance('cho');
  const total = getLiveCombined();
  document.getElementById('kimTabBalance').textContent = kim.currentBalance.toFixed(4) + ' BTC';
  document.getElementById('choTabBalance').textContent = cho.currentBalance.toFixed(4) + ' BTC';
  document.getElementById('totalTabBalance').textContent = total.currentBalance.toFixed(4) + ' BTC';
}

// --- Update Summary Cards (live) ---
function updateLiveCards() {
  let live;
  if (currentInvestor === 'total') {
    live = getLiveCombined();
  } else {
    live = getLiveBalance(currentInvestor);
  }

  animateValue('totalBalance', live.currentBalance, 8);
  document.getElementById('principal').textContent = live.principal.toFixed(4);
  animateValue('totalProfit', live.liveTotalProfit, 8, '+');
  document.getElementById('totalWithdrawn').textContent = live.totalWithdrawn.toFixed(5);
  document.getElementById('dailyProfit').textContent = '+' + live.dailyProfit.toFixed(8);

  // Show today's accrued profit + progress bar
  const todayEl = document.getElementById('todayProfit');
  if (todayEl) {
    todayEl.textContent = '+' + live.todayProfit.toFixed(10);
  }
  const barEl = document.getElementById('tickerBar');
  if (barEl) {
    const pct = (live.secondsToday / 86400) * 100;
    barEl.style.width = Math.min(pct, 100) + '%';
  }
}

function animateValue(elementId, value, decimals, prefix = '') {
  const el = document.getElementById(elementId);
  const formatted = prefix + value.toFixed(decimals);

  if (el.textContent !== formatted) {
    el.textContent = formatted;
    el.classList.add('value-flash');
    setTimeout(() => el.classList.remove('value-flash'), 800);
  }
}

// --- Tab Switching ---
function switchTab(investor) {
  currentInvestor = investor;

  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.investor === investor);
  });

  updateLiveCards();
  updateCharts();
  updateTable();
}

// --- Chart Range ---
function setChartRange(range) {
  currentChartRange = range;
  document.querySelectorAll('.chart-controls .chart-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === range.toLowerCase() ||
      (range === 'all' && btn.textContent.trim() === 'All'));
  });
  updateCharts();
}

function getHistoricalData() {
  const key = currentInvestor === 'total' ? 'total' : currentInvestor;
  return investorData[key].data;
}

function getFilteredData() {
  const d = getHistoricalData();
  if (currentChartRange === 'all') return d;

  const now = new Date();
  const startDate = new Date(now);
  switch (currentChartRange) {
    case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
    case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
    case '3m': startDate.setMonth(startDate.getMonth() - 3); break;
    case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
  }
  return d.filter(item => item.date >= startDate);
}

// --- Charts ---
function updateCharts() {
  const filtered = getFilteredData();
  const sampled = downsample(filtered, 500);

  const labels = sampled.map(d => d.date);
  const balances = sampled.map(d => d.balance);

  // Balance Chart
  if (balanceChart) balanceChart.destroy();
  const ctx1 = document.getElementById('balanceChart').getContext('2d');

  const gradient = ctx1.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
  gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

  balanceChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Balance (BTC)',
        data: balances,
        borderColor: '#3b82f6',
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#3b82f6',
        tension: 0.1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a2234',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const d = new Date(items[0].parsed.x);
              return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
            },
            label: (item) => `Balance: ${item.parsed.y.toFixed(6)} BTC`,
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: currentChartRange === '1m' ? 'day' :
                  currentChartRange === '3m' ? 'week' :
                  currentChartRange === '6m' ? 'month' : 'quarter',
            displayFormats: { day: 'MM/dd', week: 'MM/dd', month: 'yyyy-MM', quarter: 'yyyy-MM' },
          },
          grid: { color: 'rgba(30, 41, 59, 0.5)', drawBorder: false },
          ticks: { color: '#64748b', font: { size: 11 }, maxTicksLimit: 12 },
        },
        y: {
          grid: { color: 'rgba(30, 41, 59, 0.5)', drawBorder: false },
          ticks: { color: '#64748b', font: { size: 11 }, callback: v => v.toFixed(2) },
        },
      },
    },
  });

  // Profit Chart (bar - monthly)
  if (profitChart) profitChart.destroy();
  const ctx2 = document.getElementById('profitChart').getContext('2d');
  const monthlyProfits = aggregateMonthly(filtered);

  profitChart = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: monthlyProfits.map(d => d.date),
      datasets: [{
        label: 'Monthly Profit (BTC)',
        data: monthlyProfits.map(d => d.profit),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a2234',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (item) => `Profit: +${item.parsed.y.toFixed(6)} BTC`,
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'month', displayFormats: { month: 'yyyy-MM' } },
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 12 },
        },
        y: {
          grid: { color: 'rgba(30, 41, 59, 0.5)', drawBorder: false },
          ticks: { color: '#64748b', font: { size: 11 }, callback: v => v.toFixed(4) },
        },
      },
    },
  });
}

function downsample(data, maxPoints) {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const result = [];
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }
  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1]);
  }
  return result;
}

function aggregateMonthly(data) {
  const months = {};
  data.forEach(d => {
    const key = d.date.getFullYear() + '-' + String(d.date.getMonth() + 1).padStart(2, '0');
    if (!months[key]) {
      months[key] = { date: new Date(d.date.getFullYear(), d.date.getMonth(), 15), profit: 0 };
    }
    months[key].profit += d.profit;
  });
  return Object.values(months).sort((a, b) => a.date - b.date);
}

// --- Table ---
function setTableView(view) {
  currentTableView = view;
  document.querySelectorAll('.table-controls .chart-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === view);
  });
  updateTable();
}

function updateTable() {
  const d = getHistoricalData();
  const tbody = document.getElementById('tableBody');

  if (currentTableView === 'monthly') {
    renderMonthlyTable(d, tbody);
  } else {
    renderDailyTable(d, tbody);
  }
}

function renderMonthlyTable(data, tbody) {
  const months = {};
  data.forEach(d => {
    const key = d.date.getFullYear() + '-' + String(d.date.getMonth() + 1).padStart(2, '0');
    if (!months[key]) {
      months[key] = { date: key, balance: 0, profit: 0, withdrawal: 0, cumulativeProfit: 0 };
    }
    months[key].balance = d.balance;
    months[key].profit += d.profit;
    months[key].withdrawal += d.withdrawal;
    months[key].cumulativeProfit = d.cumulativeProfit;
  });

  const rows = Object.values(months).sort((a, b) => b.date.localeCompare(a.date));

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="month-row">${r.date}</td>
      <td>${r.balance.toFixed(6)}</td>
      <td class="profit">+${r.profit.toFixed(6)}</td>
      <td class="${r.withdrawal > 0 ? 'withdrawal' : ''}">${r.withdrawal > 0 ? '-' + r.withdrawal.toFixed(5) : '0'}</td>
      <td class="profit">+${r.cumulativeProfit.toFixed(6)}</td>
    </tr>
  `).join('');
}

function renderDailyTable(data, tbody) {
  const recent = data.slice(-90).reverse();

  tbody.innerHTML = recent.map(r => {
    const dateStr = r.date.toISOString().split('T')[0];
    return `
    <tr>
      <td>${dateStr}</td>
      <td>${r.balance.toFixed(6)}</td>
      <td class="profit">+${r.profit.toFixed(8)}</td>
      <td class="${r.withdrawal > 0 ? 'withdrawal' : ''}">${r.withdrawal > 0 ? '-' + r.withdrawal.toFixed(5) : '0'}</td>
      <td class="profit">+${r.cumulativeProfit.toFixed(6)}</td>
    </tr>
  `;
  }).join('');
}

// --- Withdraw Modal ---
function openWithdrawModal() {
  const modal = document.getElementById('withdrawModal');
  modal.classList.add('active');
  goToStep1();

  // Populate receive amounts
  let live;
  if (currentInvestor === 'total') {
    live = getLiveCombined();
  } else {
    live = getLiveBalance(currentInvestor);
  }

  const balance = live.currentBalance;

  document.getElementById('instantReceive').textContent =
    `Current Balance: ${balance.toFixed(6)} BTC — 수령액은 유동성 상황에 따라 결정`;
  document.getElementById('standardReceive').textContent =
    `You receive: ${balance.toFixed(6)} BTC (full amount, 6+ months)`;
}

function closeWithdrawModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('withdrawModal').classList.remove('active');
}

function goToStep1() {
  document.getElementById('withdrawStep1').classList.remove('hidden');
  document.getElementById('withdrawStep2Instant').classList.add('hidden');
  document.getElementById('withdrawStep2Standard').classList.add('hidden');
  document.getElementById('withdrawStep3').classList.add('hidden');
}

function selectWithdrawOption(type) {
  let live;
  if (currentInvestor === 'total') {
    live = getLiveCombined();
  } else {
    live = getLiveBalance(currentInvestor);
  }
  const balance = live.currentBalance;

  document.getElementById('withdrawStep1').classList.add('hidden');

  if (type === 'instant') {
    const estimatedReceive = balance * 0.39;
    document.getElementById('instantCurrentBalance').textContent = balance.toFixed(6) + ' BTC';
    document.getElementById('instantDiscountAmount').textContent = '-' + (balance - estimatedReceive).toFixed(6) + ' BTC';
    document.getElementById('instantFinalAmount').textContent = '~' + estimatedReceive.toFixed(6) + ' BTC';
    document.getElementById('withdrawStep2Instant').classList.remove('hidden');
  } else {
    document.getElementById('standardCurrentBalance').textContent = balance.toFixed(6) + ' BTC';
    document.getElementById('standardFinalAmount').textContent = balance.toFixed(6) + ' BTC';
    document.getElementById('withdrawStep2Standard').classList.remove('hidden');
  }
}

function confirmInstantWithdraw() {
  sendWithdrawEmail('instant');
  showSuccess(
    '즉시 해지 요청 접수',
    '즉시 해지 요청이 접수되었습니다. 현재 유동성 상황에 따라 포지션 청산이 진행되며, 실제 수령 금액은 청산 완료 후 확정됩니다. 운용팀에서 별도로 연락드리겠습니다.'
  );
}

function submitRedemption() {
  sendWithdrawEmail('standard');
  showSuccess(
    '정상 해지 요청 접수',
    '정상 해지 요청이 접수되었습니다. 운용 중인 포지션의 만기 구조에 따라 최소 3~6개월의 처리 기간이 필요하며, 진행 상황은 등록된 이메일로 안내드리겠습니다.'
  );
}

function showSuccess(title, message) {
  document.getElementById('withdrawStep2Instant').classList.add('hidden');
  document.getElementById('withdrawStep2Standard').classList.add('hidden');
  document.getElementById('successTitle').textContent = title;
  document.getElementById('successMessage').textContent = message;
  document.getElementById('withdrawStep3').classList.remove('hidden');
}

function sendWithdrawEmail(type) {
  let live;
  const investorName = currentInvestor === 'total' ? 'Fund Total' :
    currentInvestor === 'kim' ? '김승주' : '조영은';

  if (currentInvestor === 'total') {
    live = getLiveCombined();
  } else {
    live = getLiveBalance(currentInvestor);
  }

  const balance = live.currentBalance;
  const now = new Date().toISOString();

  const subject = encodeURIComponent(
    `[Mount Alpha] ${type === 'instant' ? 'Instant Withdrawal' : 'Standard Redemption'} Request - ${investorName}`
  );

  const body = encodeURIComponent(
    `Fund Withdrawal Request\n` +
    `========================\n\n` +
    `Type: ${type === 'instant' ? '즉시 해지 (유동성 디스카운트 적용)' : '정상 해지 (디스카운트 없음, 3~6개월 소요)'}\n` +
    `Investor: ${investorName}\n` +
    `Current Balance: ${balance.toFixed(8)} BTC\n` +
    `Requested At: ${now}\n\n` +
    `Please process this withdrawal request.\n`
  );

  window.open(`mailto:contact@entropy-trading.com?subject=${subject}&body=${body}`, '_self');
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', init);
