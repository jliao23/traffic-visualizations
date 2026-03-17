import { useEffect, useRef } from "react";

const busTrafficHTML = `<div class="bus-traffic-layout mb-5">
  <div class="control-panel p-3 mb-3">
    <p class="mb-2" style="font-weight:600; color: hsl(210,20%,85%); font-size:0.95rem;">Interactive Traffic Simulation</p>
    <div class="alert alert-info py-3 px-4 mb-3" style="font-size: 0.9rem;">
      <strong>HOW TO USE</strong>
      <ol class="mb-0 mt-2" style="padding-left: 1.2rem; font-size: 0.9rem;">
        <li>Adjust sliders to change % commuters by bus, bus frequency, capacity, and total commuters</li>
        <li>Toggle "Dedicated Bus Lane" to introduce buses and their designated lane</li>
        <li>Watch how road space per person changes as more people ride buses</li>
      </ol>
    </div>
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label for="busRider" class="form-label">% Commuters by Bus: <span id="busRiderLabel">20%</span></label>
        <input id="busRider" class="form-range" type="range" min="0" max="90" value="20" step="5" />
      </div>
      <div class="col-md-6">
        <label for="busFreq" class="form-label">Bus Frequency: <span id="busFreqLabel">Every 30s</span></label>
        <input id="busFreq" class="form-range" type="range" min="1" max="5" value="2" step="1" />
      </div>
      <div class="col-md-6">
        <label for="busCap" class="form-label">Bus Capacity: <span id="busCapLabel">40 riders</span></label>
        <input id="busCap" class="form-range" type="range" min="20" max="80" value="40" step="10" />
      </div>
      <div class="col-md-6">
        <label for="totalCommuters" class="form-label">Total Commuters: <span id="totalCommutersLabel">200</span></label>
        <input id="totalCommuters" class="form-range" type="range" min="50" max="400" value="200" step="50" />
      </div>
    </div>
    <div class="form-check form-switch mb-3">
      <input class="form-check-input" type="checkbox" id="busLaneToggle" checked />
      <label class="form-check-label" for="busLaneToggle">Dedicated Bus Lane <span class="bus-lane-badge visible" id="busLaneBadge">ACTIVE</span></label>
    </div>
    <div class="bt-insight-box" id="insightBox">Adjust the sliders to see how the road changes. Try sending <strong>60%+ of commuters to buses</strong> and watch what happens to road space per person.</div>
  </div>
  <div class="chart-wrap p-4 mb-4 bt-chart-wrap">
    <div class="bt-road-label mb-2">Road Simulation — Live View</div>
    <div class="bt-road-wrapper mb-3"><canvas id="roadCanvas" height="220"></canvas></div>
    <div class="bt-speed-indicator mb-3">
      <span class="bt-speed-label">Avg Speed</span>
      <div class="bt-speed-bar"><div class="bt-speed-fill" id="speedFill" style="width:80%"></div></div>
      <span id="speedVal">--</span>
    </div>
    <div class="bt-stats-grid mb-4">
      <div class="bt-stat-card"><div class="bt-stat-val" id="statVehicles">--</div><div class="bt-stat-label">vehicles on road</div></div>
      <div class="bt-stat-card"><div class="bt-stat-val bt-stat-people" id="statPeople">--</div><div class="bt-stat-label">people being moved</div></div>
      <div class="bt-stat-card bt-stat-highlight"><div class="bt-stat-val bt-stat-accent" id="statRoadPerPerson">--</div><div class="bt-stat-label">road-meters per person</div></div>
      <div class="bt-stat-card"><div class="bt-stat-val bt-stat-bus" id="statBuses">--</div><div class="bt-stat-label">buses active</div></div>
    </div>
    <div class="bt-efficiency-section mb-4">
      <div class="bt-eff-title">Road Space Per Person</div>
      <div class="bt-eff-subtitle text-muted mb-3">How many meters of road does each person consume?</div>
      <div class="bt-eff-row mb-2">
        <div class="bt-eff-icon bt-eff-car">Car</div>
        <div class="bt-eff-bar-wrap">
          <div class="bt-eff-bar-label d-flex justify-content-between small text-muted mb-1"><span>Car (1 person avg)</span><span id="carEffLabel">-- m</span></div>
          <div class="bt-eff-bar-track"><div class="bt-eff-bar-fill bt-eff-car-fill" id="carEffBar" style="width:0%"></div></div>
        </div>
      </div>
      <div class="bt-eff-row mb-2">
        <div class="bt-eff-icon bt-eff-bus">Bus</div>
        <div class="bt-eff-bar-wrap">
          <div class="bt-eff-bar-label d-flex justify-content-between small text-muted mb-1"><span>Bus (avg occupancy)</span><span id="busEffLabel">-- m</span></div>
          <div class="bt-eff-bar-track"><div class="bt-eff-bar-fill bt-eff-bus-fill" id="busEffBar" style="width:0%"></div></div>
        </div>
      </div>
    </div>
    <div class="bt-people-section mb-4">
      <div class="bt-people-title small text-muted mb-2">Every dot = 1 commuter · How are they traveling?</div>
      <div class="bt-people-grid" id="peopleGrid"></div>
      <div class="bt-people-legend d-flex gap-3 mt-2 small text-muted">
        <span><span class="bt-legend-dot bt-legend-car"></span> by car</span>
        <span><span class="bt-legend-dot bt-legend-bus"></span> by bus</span>
      </div>
    </div>
  </div>
</div>`;

const BusTrafficSim = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const script = document.createElement("script");
      script.textContent = BUS_JS;
      document.body.appendChild(script);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: busTrafficHTML }} />;
};

export default BusTrafficSim;

const BUS_JS = `(function busTrafficSimModule() {
  const canvas = document.getElementById("roadCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const ROAD_BG = "#1e293b";
  const LANE_DIVIDER = "#334155";
  const ROAD_EDGE = "#475569";
  const VEHICLE_SHADOW = "rgba(0,0,0,0.3)";
  const BUS_LANE_HIGHLIGHT = "rgba(255,107,53,0.12)";
  const BUS_LANE_LABEL = "#ea580c";
  const WINDOW_TINT = "rgba(0,0,0,0.35)";
  const BUS_OCCUPANCY_TEXT = "#e2e8f0";
  const CAR_COLOR = "#4a9eff";
  const BUS_COLOR = "#ff6b35";
  const GREEN = "#3dd68c";
  const YELLOW = "#eab308";
  const RED = "#ef4444";

  const CAR_LEN = 18, BUS_LEN = 42;
  const CAR_OCC = 1.5;
  const CAR_GAP = 28, BUS_GAP = 50;
  const ROAD_TOTAL = 700;

  let busRiderPct = 0.2, busFreq = 2, busCap = 40, busLaneOn = true, totalCommuters = 200;
  let vehicles = [], lastBusSpawn = {}, t = 0;

  function getNumLanes() { return 3; }
  function makeVehicle(type, lane, x) {
    const isBus = type === "bus";
    return { type, lane, x: x !== undefined ? x : -CAR_LEN, speed: isBus ? (1.2 + Math.random() * 0.4) : (2.2 + Math.random() * 1.0), baseSpeed: isBus ? 1.4 : 2.6, len: isBus ? BUS_LEN : CAR_LEN, gap: isBus ? BUS_GAP : CAR_GAP, color: isBus ? BUS_COLOR : "hsl(" + (210 + Math.random() * 30) + "," + (60 + Math.random() * 20) + "%," + (45 + Math.random() * 15) + "%)", active: true };
  }
  function initVehicles() {
    vehicles = []; lastBusSpawn = {};
    const numLanes = getNumLanes();
    const numCars = Math.round(totalCommuters * (1 - busRiderPct) / 1.5 / numLanes);
    for (let lane = 0; lane < numLanes; lane++) {
      if (busLaneOn && lane === 0) continue;
      for (let i = 0; i < Math.min(numCars, 12); i++) {
        const x = 40 + i * (CAR_LEN + CAR_GAP) * 1.5 + Math.random() * 20;
        if (x < ROAD_TOTAL - 30) vehicles.push(makeVehicle("car", lane, x));
      }
    }
  }
  function spawnLogic() {
    const numLanes = getNumLanes();
    const numCarLanes = busLaneOn ? numLanes - 1 : numLanes;
    const targetCars = Math.round(totalCommuters * (1 - busRiderPct) / 1.5 / numCarLanes);
    const targetBuses = Math.round((totalCommuters * busRiderPct) / busCap * (busFreq * 0.5));
    for (let lane = busLaneOn ? 1 : 0; lane < numLanes; lane++) {
      const laneCars = vehicles.filter(v => v.lane === lane && v.active && v.type === "car");
      if (laneCars.length < targetCars) {
        const firstCar = vehicles.filter(v => v.lane === lane && v.active).sort((a, b) => a.x - b.x)[0];
        if (!firstCar || firstCar.x > CAR_LEN + CAR_GAP) vehicles.push(makeVehicle("car", lane));
      }
    }
    const busLane = busLaneOn ? 0 : Math.floor(numLanes / 2);
    const busesOnLane = vehicles.filter(v => v.lane === busLane && v.type === "bus" && v.active);
    const spawnInterval = Math.max(80, 180 / busFreq);
    if (!lastBusSpawn[busLane] || t - lastBusSpawn[busLane] > spawnInterval) {
      if (busesOnLane.length < Math.max(1, targetBuses)) {
        const firstVeh = vehicles.filter(v => v.lane === busLane && v.active).sort((a, b) => a.x - b.x)[0];
        if (!firstVeh || firstVeh.x > BUS_LEN + BUS_GAP + 10) { vehicles.push(makeVehicle("bus", busLane)); lastBusSpawn[busLane] = t; }
      }
    }
  }
  function updateVehicles() {
    const numLanes = getNumLanes();
    const byLane = {};
    for (let i = 0; i < numLanes; i++) byLane[i] = [];
    vehicles.filter(v => v.active).forEach(v => byLane[v.lane].push(v));
    for (let i = 0; i < numLanes; i++) byLane[i].sort((a, b) => a.x - b.x);
    vehicles.forEach(v => {
      if (!v.active) return;
      const ahead = byLane[v.lane].find(u => u !== v && u.x > v.x);
      let targetSpeed = v.baseSpeed;
      if (ahead) { const gap = ahead.x - (v.x + v.len); const minGap = v.gap; if (gap < minGap) { targetSpeed = Math.max(0, ahead.speed * (gap / minGap)); if (ahead.type === "bus" && !busLaneOn) targetSpeed *= 0.6; } }
      v.speed += (targetSpeed - v.speed) * 0.15;
      v.x += v.speed;
      if (v.x > ROAD_TOTAL + 60) v.active = false;
    });
    vehicles = vehicles.filter(v => v.active);
  }
  function drawRoad() {
    const W = canvas.width, H = canvas.height;
    const numLanes = getNumLanes();
    const laneH = Math.floor(H / numLanes);
    const scaleX = W / ROAD_TOTAL;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = ROAD_BG; ctx.fillRect(0, 0, W, H);
    if (busLaneOn) { ctx.fillStyle = BUS_LANE_HIGHLIGHT; ctx.fillRect(0, 0, W, laneH); ctx.fillStyle = BUS_LANE_LABEL; ctx.font = "9px system-ui, sans-serif"; ctx.fillText("BUS ONLY", 8, laneH / 2 + 4); }
    ctx.strokeStyle = LANE_DIVIDER; ctx.lineWidth = 1; ctx.setLineDash([20, 14]);
    for (let i = 1; i < numLanes; i++) { ctx.beginPath(); ctx.moveTo(0, i * laneH); ctx.lineTo(W, i * laneH); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.strokeStyle = ROAD_EDGE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(W, 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H - 1); ctx.lineTo(W, H - 1); ctx.stroke();
    vehicles.forEach(v => {
      if (!v.active) return;
      const vx = v.x * scaleX, vw = v.len * scaleX, vy = v.lane * laneH + laneH * 0.15, vh = laneH * 0.7;
      const isBus = v.type === "bus";
      const cx = vx + vw / 2, cy = vy + vh / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2); ctx.translate(-vw / 2, -vh / 2);
      ctx.fillStyle = VEHICLE_SHADOW; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(2, 3, vw, vh, 3); else ctx.rect(2, 3, vw, vh); ctx.fill();
      ctx.fillStyle = v.color; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(0, 0, vw, vh, isBus ? 3 : 4); else ctx.rect(0, 0, vw, vh); ctx.fill();
      ctx.fillStyle = WINDOW_TINT;
      if (isBus) { const winW = 5 * scaleX, winH = vh * 0.45, winY = vh * 0.15; for (let wi = 0; wi < 5; wi++) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect((4 + wi * 7.5) * scaleX, winY, winW, winH, 1); else ctx.rect((4 + wi * 7.5) * scaleX, winY, winW, winH); ctx.fill(); } }
      else { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(vw * 0.25, vh * 0.15, vw * 0.5, vh * 0.45, 1); else ctx.rect(vw * 0.25, vh * 0.15, vw * 0.5, vh * 0.45); ctx.fill(); }
      ctx.restore();
      if (isBus) { const occupancy = Math.min(busCap, Math.round(busCap * (0.5 + Math.random() * 0.0001))); ctx.fillStyle = BUS_OCCUPANCY_TEXT; ctx.font = Math.max(7, laneH * 0.22) + "px system-ui, sans-serif"; ctx.fillText(occupancy + "", vx + vw * 0.35, vy + vh * 0.75); }
    });
  }
  function updateStats() {
    const activeVehicles = vehicles.filter(v => v.active);
    const buses = activeVehicles.filter(v => v.type === "bus");
    const cars = activeVehicles.filter(v => v.type === "car");
    const numBuses = buses.length, numCars = cars.length, totalVehicles = numBuses + numCars;
    const peopleByCar = Math.round(numCars * CAR_OCC);
    const peopleByBus = Math.round(numBuses * busCap * 0.75);
    const totalPeople = peopleByCar + peopleByBus;
    const roadLength = ROAD_TOTAL;
    const roadPerPerson = totalPeople > 0 ? (roadLength / totalPeople).toFixed(1) : "--";
    const carRoadTotal = numCars * (CAR_LEN + CAR_GAP);
    const busRoadTotal = numBuses * (BUS_LEN + BUS_GAP);
    const carMPerPerson = peopleByCar > 0 ? (carRoadTotal / peopleByCar).toFixed(1) : "--";
    const busMPerPerson = peopleByBus > 0 ? (busRoadTotal / peopleByBus).toFixed(1) : "--";
    const avgSpeed = activeVehicles.length > 0 ? (activeVehicles.reduce((s, v) => s + v.speed, 0) / activeVehicles.length * 10).toFixed(0) : "--";
    const speedPct = Math.min(100, (avgSpeed / 30) * 100);
    const speedColor = avgSpeed > 20 ? GREEN : avgSpeed > 12 ? YELLOW : RED;
    const el = (id) => document.getElementById(id);
    if (el("statVehicles")) el("statVehicles").textContent = totalVehicles;
    if (el("statPeople")) el("statPeople").textContent = totalPeople;
    if (el("statRoadPerPerson")) el("statRoadPerPerson").textContent = roadPerPerson + "m";
    if (el("statBuses")) el("statBuses").textContent = numBuses;
    if (el("speedVal")) el("speedVal").textContent = avgSpeed + " km/h";
    if (el("speedFill")) { el("speedFill").style.width = speedPct + "%"; el("speedFill").style.background = speedColor; }
    const maxBar = 50;
    const carPct = Math.min(100, (parseFloat(carMPerPerson) / maxBar) * 100);
    const busPct = Math.min(100, (parseFloat(busMPerPerson) / maxBar) * 100);
    if (el("carEffBar")) el("carEffBar").style.width = carPct + "%";
    if (el("busEffBar")) el("busEffBar").style.width = busPct + "%";
    if (el("carEffLabel")) el("carEffLabel").textContent = carMPerPerson + "m";
    if (el("busEffLabel")) el("busEffLabel").textContent = busMPerPerson + "m";
    if (el("peopleGrid")) {
      const total = Math.min(200, totalCommuters);
      const busCount = Math.round(total * busRiderPct);
      let html = "";
      for (let i = 0; i < total; i++) { const c = i < busCount ? BUS_COLOR : CAR_COLOR; html += '<div class="person-dot" style="background:' + c + '"></div>'; }
      el("peopleGrid").innerHTML = html;
    }
    if (el("insightBox")) {
      if (busRiderPct >= 0.6 && busLaneOn) el("insightBox").innerHTML = '<strong>Notice:</strong> Even though buses slow down individual cars, the road is now moving <strong>' + totalPeople + '</strong> people with far <strong>less road per person (' + roadPerPerson + 'm)</strong>.';
      else if (busRiderPct == 0 || !busLaneOn) el("insightBox").innerHTML = '<strong>All cars:</strong> ' + numCars + ' vehicles with around 1 person each. Each person consumes ~<strong>' + carMPerPerson + 'm</strong> of road space.';
      else el("insightBox").innerHTML = 'Adjust the sliders to see how the road changes. Try sending <strong>60%+ of commuters to buses</strong> and watch what happens to road space per person.';
    }
  }
  const busRiderEl = document.getElementById("busRider");
  const busFreqEl = document.getElementById("busFreq");
  const busCapEl = document.getElementById("busCap");
  const busLaneToggleEl = document.getElementById("busLaneToggle");
  const totalCommutersEl = document.getElementById("totalCommuters");
  if (busRiderEl) busRiderEl.addEventListener("input", (e) => { busRiderPct = e.target.value / 100; const lbl = document.getElementById("busRiderLabel"); if (lbl) lbl.textContent = e.target.value + "%"; initVehicles(); });
  if (busFreqEl) busFreqEl.addEventListener("input", (e) => { busFreq = parseInt(e.target.value, 10); const labels = ["Every 60s","Every 45s","Every 30s","Every 15s","Every 8s"]; const lbl = document.getElementById("busFreqLabel"); if (lbl) lbl.textContent = labels[busFreq - 1]; });
  if (busCapEl) busCapEl.addEventListener("input", (e) => { busCap = parseInt(e.target.value, 10); const capLbl = document.getElementById("busCapLabel"); if (capLbl) capLbl.textContent = e.target.value + " riders"; });
  if (busLaneToggleEl) busLaneToggleEl.addEventListener("change", (e) => { busLaneOn = e.target.checked; const badge = document.getElementById("busLaneBadge"); if (badge) badge.classList.toggle("visible", busLaneOn); initVehicles(); });
  if (totalCommutersEl) totalCommutersEl.addEventListener("input", (e) => { totalCommuters = parseInt(e.target.value, 10); const lbl = document.getElementById("totalCommutersLabel"); if (lbl) lbl.textContent = e.target.value; initVehicles(); });
  function resizeCanvas() { const wrapper = canvas.parentElement; if (!wrapper) return; canvas.width = wrapper.clientWidth; canvas.height = 220; }
  function loop() { t++; spawnLogic(); updateVehicles(); drawRoad(); if (t % 6 === 0) updateStats(); requestAnimationFrame(loop); }
  resizeCanvas(); window.addEventListener("resize", resizeCanvas); initVehicles(); loop();
})();`;
