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
  chartsInitialized: {}, // We store the actual Chart objects here now
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

// --- NAVIGATION & ONBOARDING ---

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
    initAllCharts(); // Initialize after app is visible
  }, 50);

  document.getElementById("worker-name-display").textContent = state.workerName.split(" ")[0];
  document.getElementById("nav-avatar").textContent = state.workerInitials;
  document.getElementById("upi-id").textContent = state.workerName.toLowerCase().replace(/\s+/,".")+"@upi";

  const plan = planRates[state.selectedPlan];
  document.getElementById("kpi-plan-display").textContent = state.selectedPlan.charAt(0).toUpperCase() + state.selectedPlan.slice(1);
  document.getElementById("kpi-protected").textContent = "₹" + plan.weeklyMax.toLocaleString("en-IN");
  document.getElementById("ph-plan-name").textContent = state.selectedPlan.charAt(0).toUpperCase() + state.selectedPlan.slice(1) + " Shield";
  document.getElementById("ph-price").innerHTML = "₹" + plan.premium + " <span>/ week</span>";

  showToast("🛡️ GigShield activated!");
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

// --- SIMULATIONS ---

function triggerDisruption() {
  const alert = document.getElementById("disruption-alert");
  alert.classList.remove("hidden");
  state.incidentTriggered = true;
  showToast("🌧️ Heavy rain alert! Auto-claim initiated...");
  setTimeout(() => {
    showToast("✅ Claim approved! ₹700 credited via UPI");
    const count = document.getElementById("kpi-claims-count");
    count.textContent = parseInt(count.textContent) + 1;
  }, 3000);
}

function runSimulation() {
  const type = document.getElementById("sim-type").value;
  const hours = parseInt(document.getElementById("sim-duration").value);
  const plan = planRates[state.selectedPlan];
  const payout = Math.min(Math.round(plan.rate * hours * (disruptionMultipliers[type] || 1)), plan.weeklyMax);
  document.getElementById("sf-amount-txt").textContent = `Payout: ₹${payout.toLocaleString("en-IN")} approved`;
  show("sim-result");
  showToast(`💸 Auto-claim processed! ₹${payout} → UPI`);
}

// --- CHART LOGIC (THE FIXES ARE HERE) ---

function initChartForPage(pageId) {
    if (!window.Chart) return;
    // We only refresh charts if they are currently visible to save performance
    if (pageId === "w-dashboard") initEarningsChart();
    if (pageId === "w-weather") initForecastChart();
    if (pageId === "w-policy") initRiskChart();
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { 
    x: { grid: { display: false }, ticks: { color: "#94a3b8" } }, 
    y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { color: "#94a3b8" } } 
  }
};

// Helper: Destroy existing chart before making a new one to prevent stacking
function cleanChart(id) {
    if (state.chartsInitialized[id]) {
        state.chartsInitialized[id].destroy();
    }
}

function initEarningsChart() {
  const ctx = document.getElementById("earningsChart");
  if (!ctx) return;
  cleanChart('earnings');
  state.chartsInitialized['earnings'] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        { label: "Normal", data: [620, 580, 700, 0, 0, 800, 750], backgroundColor: "rgba(255,107,53,0.7)", borderRadius: 6 },
        { label: "Shield", data: [0, 0, 0, 680, 700, 0, 0], backgroundColor: "rgba(34,197,94,0.7)", borderRadius: 6 }
      ]
    },
    options: { ...chartDefaults, plugins: { legend: { display: true } } }
  });
}

function initForecastChart() {
  const ctx = document.getElementById("forecastChart");
  if (!ctx) return;
  cleanChart('forecast');
  state.chartsInitialized['forecast'] = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Today", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"],
      datasets: [{ label: "Rain %", data: [75, 40, 20, 15, 80, 85, 70], borderColor: "#3b82f6", tension: 0.4, fill: true }]
    },
    options: chartDefaults
  });
}

function initRiskChart() {
  const ctx = document.getElementById("riskChart");
  if (!ctx) return;
  cleanChart('risk');
  state.chartsInitialized['risk'] = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
      datasets: [{ data: [58, 62, 67, 71, 68, 72, 74], borderColor: "#FF6B35", tension: 0.4 }]
    },
    options: { ...chartDefaults, scales: { y: { min: 40, max: 100 } } }
  });
}

// --- LIVE TICKER (FIXED TO STOP INCREASING INFINITELY) ---

function startLiveTicker() {
  setInterval(() => {
    // We only update the chart if the user is currently looking at the dashboard
    if (state.activePage === "w-dashboard" && state.chartsInitialized['earnings']) {
        const chart = state.chartsInitialized['earnings'];
        const newValue = Math.floor(Math.random() * 100) + 600;
        
        // 1. Add new data
        chart.data.labels.push("Live");
        chart.data.datasets[0].data.push(newValue);

        // 2. THE CRITICAL FIX: Keep only the last 7 items
        // This prevents the chart from "increasing" horizontally forever
        if (chart.data.labels.length > 7) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
            // If there's a second dataset (Shield), shift that too to keep them aligned
            if (chart.data.datasets[1]) chart.data.datasets[1].data.shift();
        }

        chart.update('none'); // Update without heavy animation for performance
    }
  }, 4000); // Updates every 4 seconds
}

// --- UTILS ---

function show(id) { document.getElementById(id)?.classList.remove("hidden"); }
function hide(id) { document.getElementById(id)?.classList.add("hidden"); }

function showToast(msg) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function initAllCharts() {
  if (!window.Chart) {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js";
    s.onload = () => { initEarningsChart(); initForecastChart(); initRiskChart(); startLiveTicker(); };
    document.head.appendChild(s);
  } else {
    initEarningsChart(); startLiveTicker();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Navigation for enter key
  document.getElementById("reg-name")?.addEventListener("keydown", e => { if (e.key === "Enter") goStep(2); });
});
