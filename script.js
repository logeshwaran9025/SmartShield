const state = {
  workerName: "Rajesh Kumar",
  workerInitials: "RK",
  platform: "zomato",
  zone: "mumbai-central",
  avgOrders: 25,
  vehicle: "bike",
  selectedPlan: "standard",
  policyActive: false,
  currentView: "worker",
  activePage: "w-dashboard",
  chartsInitialized: {},
  incidentTriggered: false
};


const planRates = {
  basic:    { rate: 150, weeklyMax: 1500,  premium: 29 },
  standard: { rate: 175, weeklyMax: 3500,  premium: 49 },
  premium:  { rate: 220, weeklyMax: 7000,  premium: 79 }
};

const disruptionMultipliers = {
  rain:   1.0,
  flood:  1.25,
  curfew: 1.0,
  heat:   1.1
};



function goStep(step) {
  if (step === 2) {
    const name = document.getElementById("reg-name").value.trim();
    if (!name) { showToast("⚠️ Please enter your name"); return; }
    state.workerName = name;
    state.workerInitials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
    state.platform = document.getElementById("reg-platform").value;
    state.zone = document.getElementById("reg-zone").value;
    state.avgOrders = parseInt(document.getElementById("reg-orders").value);
    state.vehicle = document.getElementById("reg-vehicle").value;

    hide("onboard-step-1");
    show("onboard-step-2");
    runRiskComputation();
  }
  if (step === 3) {
    hide("onboard-step-2");
    show("onboard-step-3");
  }
}

function runRiskComputation() {
  const steps = document.querySelectorAll(".cs");
  let i = 0;
  const interval = setInterval(() => {
    if (i > 0) steps[i-1].classList.replace("active","done");
    if (i < steps.length) {
      steps[i].classList.add("active");
      i++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        hide("risk-computing");
        
        let score = 50;
        if (state.zone.includes("mumbai")) score += 15;
        if (state.vehicle === "bike") score += 8;
        if (state.avgOrders >= 25) score += 5;
        score = Math.min(score + Math.floor(Math.random()*10), 95);
        document.getElementById("ring-score").textContent = score;

       
        const plan = planRates.standard;
        document.getElementById("pb-amount").textContent = "₹" + plan.premium;
        document.getElementById("pb-cover").textContent = "₹" + plan.weeklyMax.toLocaleString("en-IN");

        show("risk-result");
        show("step2-next");
        document.getElementById("risk-result").classList.remove("hidden");
        document.getElementById("step2-next").classList.remove("hidden");
      }, 400);
    }
  }, 550);
}

function selectPlan(el, plan) {
  document.querySelectorAll(".plan-opt").forEach(p => p.classList.remove("selected"));
  el.classList.add("selected");
  state.selectedPlan = plan;
}

function activatePolicy() {
  state.policyActive = true;
 
  document.getElementById("screen-onboard").classList.remove("active");
  document.getElementById("screen-app").style.display = "flex";
  document.getElementById("screen-app").style.flexDirection = "column";
  setTimeout(() => {
    document.getElementById("screen-app").classList.add("active");
  }, 50);


  document.getElementById("worker-name-display").textContent = state.workerName.split(" ")[0];
  document.getElementById("nav-avatar").textContent = state.workerInitials;
  document.getElementById("upi-id").textContent = state.workerName.toLowerCase().replace(/\s+/,".")+".@upi";

  const plan = planRates[state.selectedPlan];
  document.getElementById("kpi-plan-display").textContent =
    state.selectedPlan.charAt(0).toUpperCase() + state.selectedPlan.slice(1);
  document.getElementById("kpi-protected").textContent = "₹" + plan.weeklyMax.toLocaleString("en-IN");
  document.getElementById("ph-plan-name").textContent =
    state.selectedPlan.charAt(0).toUpperCase() + state.selectedPlan.slice(1) + " Shield";
  document.getElementById("ph-price").innerHTML = "₹" + plan.premium + " <span>/ week</span>";

  showToast("🛡️ GigShield activated! Your income is now protected.");
  initAllCharts();
}



function switchView(view) {
  state.currentView = view;
  document.getElementById("btn-worker").classList.toggle("active", view === "worker");
  document.getElementById("btn-admin").classList.toggle("active", view === "admin");

  document.querySelector(".worker-nav").classList.toggle("hidden", view !== "worker");
  document.querySelector(".admin-nav").classList.toggle("hidden", view !== "admin");

  if (view === "worker") showPage("w-dashboard");
  else showPage("a-dashboard");
}

function showPage(pageId) {

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".snav-item").forEach(i => i.classList.remove("active"));

  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  const navItem = document.querySelector(`.snav-item[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add("active");

  state.activePage = pageId;

  setTimeout(() => initChartForPage(pageId), 50);
}



function triggerDisruption() {
  const alert = document.getElementById("disruption-alert");
  alert.classList.remove("hidden");
  state.incidentTriggered = true;
  showToast("🌧️ Heavy rain alert triggered! Auto-claim initiated...");

  setTimeout(() => {
    showToast("✅ Claim #GS-C-0046 approved! ₹700 credited via UPI in 3.9s");
    document.getElementById("kpi-claims-count").textContent =
      parseInt(document.getElementById("kpi-claims-count").textContent) + 1;
  }, 3000);
}

function runSimulation() {
  const type = document.getElementById("sim-type").value;
  const hours = parseInt(document.getElementById("sim-duration").value);
  const plan = planRates[state.selectedPlan];
  const mult = disruptionMultipliers[type] || 1;
  const payout = Math.min(Math.round(plan.rate * hours * mult), plan.weeklyMax);

  const labels = {
    rain:   "Rain >25mm/hr detected via IMD API",
    flood:  "Flash flood Level 2 confirmed via NDMA",
    curfew: "Zone curfew order validated via municipal API",
    heat:   "Heat wave 43°C confirmed via IMD"
  };

  document.getElementById("sf-trigger-txt").textContent = labels[type];
  document.getElementById("sf-amount-txt").textContent =
    `Payout: ₹${payout.toLocaleString("en-IN")} approved automatically`;

  const result = document.getElementById("sim-result");
  result.classList.remove("hidden");
  showToast(`💸 Auto-claim processed! ₹${payout.toLocaleString("en-IN")} → UPI in 4s`);
}

function rejectClaim(btn) {
  const row = btn.closest("tr");
  const statusCell = row.cells[row.cells.length - 2];
  statusCell.innerHTML = '<span class="badge-flag">Rejected</span>';
  btn.closest("td").innerHTML = "—";
  showToast("🚫 Claim rejected — fraud detected");
}

function reviewClaim(btn) {
  const row = btn.closest("tr");
  const cells = row.cells;
  const statusCell = cells[cells.length - 2];
  statusCell.innerHTML = '<span class="badge-paid">Paid</span>';
  btn.closest("td").innerHTML = "—";
  showToast("✅ Claim manually approved and payout initiated");
}

function upgradePlan() {
  state.selectedPlan = "premium";
  document.getElementById("ph-plan-name").textContent = "Premium Shield";
  document.getElementById("ph-price").innerHTML = "₹79 <span>/ week</span>";
  document.getElementById("kpi-plan-display").textContent = "Premium";
  document.getElementById("kpi-protected").textContent = "₹7,000";
  showToast("⬆️ Upgraded to Premium Shield! Heat wave & AQI coverage unlocked.");
}



function loadChartJS(cb) {
  if (window.Chart) { cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js";
  s.onload = () => {
    
    Chart.defaults.animation = false;
    Chart.defaults.animations.colors = false;
    Chart.defaults.animations.x = false;
    Chart.defaults.transitions.active.animation.duration = 0;
    cb();
  };
  document.head.appendChild(s);
}

function initAllCharts() {
  loadChartJS(() => {
    initEarningsChart();
    initForecastChart();
    initRiskChart();
    initAdminCharts();
    initFraudChart();
    initTrendCharts();
  });
}

function initChartForPage(pageId) {
  if (!window.Chart) return;
  const map = {
    "w-dashboard": ["earningsChart"],
    "w-weather":   ["forecastChart"],
    "w-policy":    ["riskChart"],
    "a-dashboard": ["adminRevenueChart","disruptionPieChart","predictiveChart"],
    "a-fraud":     ["fraudChart"],
    "a-analytics": ["trendChart","planPieChart"]
  };
 
}

const chartDefaults = {
  responsive: false,         
  maintainAspectRatio: false,
  animation: false,
  animations: false,
  transitions: { active: { animation: { duration: 0 } } },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor:"#1e293b", titleColor:"#f1f5f9", bodyColor:"#94a3b8", borderColor:"#334155", borderWidth:1, padding:10 }
  },
  scales: {
    x: { grid:{ color:"rgba(0,0,0,0.04)" }, ticks:{ color:"#94a3b8", font:{ size:11 } } },
    y: { grid:{ color:"rgba(0,0,0,0.04)" }, ticks:{ color:"#94a3b8", font:{ size:11 } } }
  }
};


function sizeCanvas(id, height) {
  const el = document.getElementById(id);
  if (!el) return null;
  const parent = el.parentElement;
  el.width  = parent.clientWidth  || 500;
  el.height = height || 200;
  return el;
}

function initEarningsChart() {
  const ctx = sizeCanvas("earningsChart", 180);
  if (!ctx || state.chartsInitialized.earnings) return;
  state.chartsInitialized.earnings = true;
  new Chart(ctx, {
    type:"bar",
    data:{
      labels:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      datasets:[
        { label:"Normal Earnings", data:[620,580,700,0,0,800,750], backgroundColor:"rgba(255,107,53,0.7)", borderRadius:6 },
        { label:"Covered by GigShield", data:[0,0,0,680,700,0,0], backgroundColor:"rgba(34,197,94,0.7)", borderRadius:6 }
      ]
    },
    options:{ ...chartDefaults, plugins:{ ...chartDefaults.plugins, legend:{ display:true, labels:{ color:"#475569", font:{ size:11 } } } } }
  });
}

function initForecastChart() {
  const ctx = sizeCanvas("forecastChart", 220);
  if (!ctx || state.chartsInitialized.forecast) return;
  state.chartsInitialized.forecast = true;
  new Chart(ctx, {
    type:"line",
    data:{
      labels:["Today","Fri","Sat","Sun","Mon","Tue","Wed"],
      datasets:[
        { label:"Rain Probability (%)", data:[75,40,20,15,80,85,70], borderColor:"#3b82f6", backgroundColor:"rgba(59,130,246,0.1)", tension:0.4, fill:true, pointBackgroundColor:"#3b82f6" },
        { label:"Heat Index", data:[34,36,38,37,35,34,36], borderColor:"#f59e0b", backgroundColor:"rgba(245,158,11,0.08)", tension:0.4, fill:true, pointBackgroundColor:"#f59e0b" }
      ]
    },
    options:{ ...chartDefaults, plugins:{ ...chartDefaults.plugins, legend:{ display:false } } }
  });
}

function initRiskChart() {
  const ctx = sizeCanvas("riskChart", 160);
  if (!ctx || state.chartsInitialized.risk) return;
  state.chartsInitialized.risk = true;
  new Chart(ctx, {
    type:"line",
    data:{
      labels:["Feb W1","Feb W2","Feb W3","Feb W4","Mar W1","Mar W2","Mar W3"],
      datasets:[{ label:"Risk Score", data:[58,62,67,71,68,72,74], borderColor:"#FF6B35", backgroundColor:"rgba(255,107,53,0.08)", tension:0.4, fill:true, pointBackgroundColor:"#FF6B35" }]
    },
    options:{
      ...chartDefaults,
      scales:{ x:{ grid:{ color:"rgba(0,0,0,0.04)" }, ticks:{ color:"#94a3b8", font:{ size:10 } } }, y:{ grid:{ color:"rgba(0,0,0,0.04)" }, ticks:{ color:"#94a3b8", font:{ size:10 } }, min:40, max:100 } }
    }
  });
}

function initAdminCharts() {
  const ctx1 = sizeCanvas("adminRevenueChart", 200);
  if (ctx1 && !state.chartsInitialized.adminRevenue) {
    state.chartsInitialized.adminRevenue = true;
    new Chart(ctx1, {
      type:"bar",
      data:{
        labels:["Oct","Nov","Dec","Jan","Feb","Mar"],
        datasets:[
          { label:"Premiums Collected", data:[185000,210000,198000,235000,248000,238000], backgroundColor:"rgba(255,107,53,0.75)", borderRadius:5 },
          { label:"Claims Paid Out", data:[110000,135000,145000,148000,160000,164000], backgroundColor:"rgba(59,130,246,0.65)", borderRadius:5 }
        ]
      },
      options:{ ...chartDefaults, plugins:{ ...chartDefaults.plugins, legend:{ display:true, labels:{ color:"#475569", font:{ size:11 } } } } }
    });
  }

  const ctx2 = sizeCanvas("disruptionPieChart", 200);
  if (ctx2 && !state.chartsInitialized.pie) {
    state.chartsInitialized.pie = true;
    new Chart(ctx2, {
      type:"doughnut",
      data:{
        labels:["Heavy Rain","Flooding","Curfew/Strike","Heat Wave","High Wind"],
        datasets:[{ data:[52,24,14,7,3], backgroundColor:["#3b82f6","#0ea5e9","#f59e0b","#ef4444","#8b5cf6"], borderWidth:0, hoverOffset:6 }]
      },
      options:{ responsive:false, animation:false, maintainAspectRatio:false, plugins:{ legend:{ display:true, position:"right", labels:{ color:"#475569", font:{ size:11 }, padding:12, boxWidth:12 } } } }
    });
  }

  const ctx3 = sizeCanvas("predictiveChart", 160);
  if (ctx3 && !state.chartsInitialized.predict) {
    state.chartsInitialized.predict = true;
    new Chart(ctx3, {
      type:"bar",
      data:{
        labels:["Today","Fri","Sat","Sun","Mon","Tue","Wed"],
        datasets:[
          { label:"Predicted Claims Volume", data:[120,80,45,30,340,380,260], backgroundColor:["#f59e0b","#3b82f6","#3b82f6","#3b82f6","#ef4444","#ef4444","#f59e0b"], borderRadius:5 }
        ]
      },
      options:{
        ...chartDefaults,
        scales:{ x:{ grid:{ color:"rgba(0,0,0,0.04)" }, ticks:{ color:"#94a3b8", font:{ size:11 } } }, y:{ grid:{ color:"rgba(0,0,0,0.04)" }, ticks:{ color:"#94a3b8", font:{ size:11 } }, beginAtZero:true } }
      }
    });
  }
}

function initFraudChart() {
  const ctx = sizeCanvas("fraudChart", 160);
  if (!ctx || state.chartsInitialized.fraud) return;
  state.chartsInitialized.fraud = true;
  new Chart(ctx, {
    type:"bar",
    data:{
      labels:["0.0–0.1","0.1–0.2","0.2–0.3","0.3–0.4","0.4–0.5","0.5–0.6","0.6–0.7","0.7–0.8","0.8–0.9","0.9–1.0"],
      datasets:[{
        label:"# of Claims",
        data:[1820,980,340,120,65,32,14,9,5,3],
        backgroundColor(ctx){ const v = ctx.dataIndex; if(v<4)return"rgba(34,197,94,0.7)";if(v<7)return"rgba(245,158,11,0.7)";return"rgba(239,68,68,0.7)"; },
        borderRadius:5
      }]
    },
    options:{
      ...chartDefaults,
      plugins:{ ...chartDefaults.plugins, legend:{ display:false } }
    }
  });
}

function initTrendCharts() {
  const ctx1 = sizeCanvas("trendChart", 200);
  if (ctx1 && !state.chartsInitialized.trend) {
    state.chartsInitialized.trend = true;
    new Chart(ctx1, {
      type:"line",
      data:{
        labels:["Oct","Nov","Dec","Jan","Feb","Mar"],
        datasets:[
          { label:"Premiums", data:[185,210,198,235,248,238], borderColor:"#FF6B35", backgroundColor:"rgba(255,107,53,0.08)", tension:0.4, fill:true, pointBackgroundColor:"#FF6B35" },
          { label:"Payouts", data:[110,135,145,148,160,164], borderColor:"#22c55e", backgroundColor:"rgba(34,197,94,0.08)", tension:0.4, fill:true, pointBackgroundColor:"#22c55e" }
        ]
      },
      options:{ ...chartDefaults, plugins:{ ...chartDefaults.plugins, legend:{ display:true, labels:{ color:"#475569", font:{ size:11 } } } } }
    });
  }

  const ctx2 = sizeCanvas("planPieChart", 200);
  if (ctx2 && !state.chartsInitialized.planPie) {
    state.chartsInitialized.planPie = true;
    new Chart(ctx2, {
      type:"doughnut",
      data:{
        labels:["Basic (₹29)","Standard (₹49)","Premium (₹79)"],
        datasets:[{ data:[22,58,20], backgroundColor:["#22c55e","#FF6B35","#8b5cf6"], borderWidth:0, hoverOffset:6 }]
      },
      options:{ responsive:false, animation:false, maintainAspectRatio:false, plugins:{ legend:{ display:true, position:"right", labels:{ color:"#475569", font:{ size:11 }, padding:12, boxWidth:12 } } } }
    });
  }
}


function show(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove("hidden"); el.style.display = ""; }
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}

function startLiveTicker() {
  setInterval(() => {
    if (state.currentView === "admin" && state.activePage === "a-dashboard") {
      const els = document.querySelectorAll(".kpi-val");
      
    }
  }, 5000);
}


document.addEventListener("DOMContentLoaded", () => {
  startLiveTicker();

  
  document.getElementById("reg-name")?.addEventListener("keydown", e => {
    if (e.key === "Enter") goStep(2);
  });
});
