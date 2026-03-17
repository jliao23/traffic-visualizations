import { useEffect, useRef } from "react";

const laneReductionHTML = `<div class="lane-reduction-layout mb-5">
  <div class="control-panel p-3 mb-3">
    <p class="mb-2" style="font-weight:600; color: hsl(210,20%,85%); font-size:0.95rem;">Interactive Traffic Simulation</p>
    <div class="alert alert-info py-3 px-4 mb-3" style="font-size: 0.9rem;">
      <strong>HOW TO USE</strong>
      <ol class="mb-0 mt-2" style="padding-left: 1.2rem; font-size: 0.9rem;">
        <li>Click "Start" and cars will begin entering from the left</li>
        <li>Adjust the "Closed lanes" slider to create a bottleneck</li>
        <li>Watch the realistic flow: Traffic slows down but keeps moving. Notice cars creeping forward while waiting and merge ripple effects!</li>
      </ol>
      <div class="mt-3" style="border-top: 1px solid hsla(220,14%,25%,0.5); padding-top:0.75rem;">
        <strong>Car Colors:</strong>
        <div class="d-flex flex-wrap gap-3 mt-2" style="font-size: 0.85rem;">
          <div class="d-flex align-items-center gap-2">
            <div style="width:20px;height:16px;background:#3b82f6;border:1px solid #334155;border-radius:2px;"></div><span>Normal flow</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div style="width:20px;height:16px;background:#ef4444;border:1px solid #334155;border-radius:2px;"></div><span>Waiting to merge</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div style="width:20px;height:16px;background:#f59e0b;border:1px solid #334155;border-radius:2px;"></div><span>Merging</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div style="width:20px;height:16px;background:#eab308;border:1px solid #334155;border-radius:2px;"></div><span>Recently merged</span>
          </div>
        </div>
      </div>
    </div>
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label for="lr-lanes-slider" class="form-label"><strong>Total lanes:</strong> <span id="lr-lanes-value">4</span></label>
        <input id="lr-lanes-slider" class="form-range" type="range" min="2" max="5" step="1" value="4" />
      </div>
      <div class="col-md-6">
        <label for="lr-bottleneck-lanes-slider" class="form-label"><strong>Closed lanes:</strong> <span id="lr-bottleneck-lanes-value">1</span></label>
        <input id="lr-bottleneck-lanes-slider" class="form-range" type="range" min="0" max="3" step="1" value="1" />
      </div>
    </div>
    <div class="d-flex flex-wrap align-items-center gap-3 mt-3">
      <button type="button" class="btn btn-primary btn-lg" id="lr-start-btn">Start</button>
      <button type="button" class="btn btn-outline-secondary btn-lg" id="lr-reset-btn">Reset</button>
    </div>
  </div>
  <div class="chart-wrap p-4 mb-4 lr-highway-wrap">
    <div class="bt-road-label mb-2">Lane Reduction Simulation — Live View</div>
    <svg id="lr-highway-svg" width="100%" height="320" viewBox="0 0 1000 320"></svg>
    <div class="bt-speed-indicator mb-3">
      <span class="bt-speed-label">Avg Speed</span>
      <div class="bt-speed-bar"><div class="bt-speed-fill" id="lr-speedFill" style="width:0%"></div></div>
      <span id="lr-speedVal">--</span>
    </div>
    <div class="bt-stats-grid mb-4">
      <div class="bt-stat-card"><div class="bt-stat-val" id="lr-statCars">0</div><div class="bt-stat-label">cars on road</div></div>
      <div class="bt-stat-card"><div class="bt-stat-val" id="lr-statThroughput">0</div><div class="bt-stat-label">throughput (cars/min)</div></div>
    </div>
  </div>
</div>`;

declare const d3: any;

const LaneReduction = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (typeof d3 === "undefined") return;
    initialized.current = true;

    const script = document.createElement("script");
    script.textContent = LANE_REDUCTION_JS;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: laneReductionHTML }} />;
};

export default LaneReduction;

const LANE_REDUCTION_JS = `(function turbulenceLaneReduction() {
  const svg = d3.select("#lr-highway-svg");
  const startBtn = document.getElementById("lr-start-btn");
  const resetBtn = document.getElementById("lr-reset-btn");
  const lanesSlider = document.getElementById("lr-lanes-slider");
  const bottleneckLanesSlider = document.getElementById("lr-bottleneck-lanes-slider");
  if (!svg.node() || !startBtn || !resetBtn) return;

  const ROAD_LENGTH = 1000;
  const FRAME_DELAY = 16;
  const SPAWN_INTERVAL = 50;
  const BASE_SPEED = 5.0;
  const CREEP_SPEED = 0.8;
  const MERGE_SLOWDOWN_SPEED = 2.5;
  const MERGE_SLOWDOWN_DURATION = 2000;

  const state = { numLanes: 4, bottleneckLanes: 3, running: false, cars: [], nextCarId: 0, lastSpawnTime: 0, throughputCount: 0, throughputStartTime: null, carsPassed: new Set() };

  function spawnCar() {
    const lane = Math.floor(Math.random() * state.numLanes);
    const spaceAtEntrance = state.cars.every(car => Math.floor(car.lane + 0.5) !== lane || car.x > 100);
    if (spaceAtEntrance) {
      state.cars.push({ x: 0, lane, targetLane: lane, speed: BASE_SPEED, id: state.nextCarId++, waiting: false, merging: false, recentlyMerged: false, mergeTimer: 0 });
    }
  }

  function canMerge(car, targetLane, allCars) {
    const gapBehindNeeded = 80, gapAheadNeeded = 60, gapSideNeeded = 40;
    for (const other of allCars) {
      if (other.id === car.id) continue;
      const otherLane = Math.floor(other.lane + 0.5);
      if (Math.abs(otherLane - targetLane) < 0.5) {
        const distance = other.x - car.x;
        if (distance < 0 && Math.abs(distance) < gapBehindNeeded) return false;
        if (distance > 0 && distance < gapAheadNeeded) return false;
        if (Math.abs(distance) < gapSideNeeded) return false;
      }
    }
    return true;
  }

  function getCarAhead(car, allCars) {
    const myLane = Math.floor(car.lane + 0.5);
    let closestCar = null, closestDist = Infinity;
    for (const other of allCars) {
      if (other.id === car.id) continue;
      const otherLane = Math.floor(other.lane + 0.5);
      if (otherLane !== myLane) continue;
      const dist = other.x - car.x;
      if (dist > 0 && dist < closestDist && dist < 150) { closestCar = other; closestDist = dist; }
    }
    return { car: closestCar, distance: closestDist };
  }

  function updateCars() {
    const bottleneckX = ROAD_LENGTH * 0.6;
    const now = Date.now();
    if (state.running && now - state.lastSpawnTime > SPAWN_INTERVAL) { spawnCar(); state.lastSpawnTime = now; }

    for (const car of state.cars) {
      if (car.recentlyMerged && car.mergeTimer > 0) { car.mergeTimer -= FRAME_DELAY; if (car.mergeTimer <= 0) { car.recentlyMerged = false; car.mergeTimer = 0; } }
      car.speed = BASE_SPEED;
      if (car.recentlyMerged) car.speed = MERGE_SLOWDOWN_SPEED;
      const distToBottleneck = bottleneckX - car.x;
      const nearBottleneck = distToBottleneck < 350 && distToBottleneck > -100;
      const beforeBottleneck = car.x < bottleneckX + 100;
      const currentLane = Math.floor(car.lane + 0.5);
      const inClosedLane = beforeBottleneck && currentLane >= state.bottleneckLanes;
      const { car: carAhead, distance: distAhead } = getCarAhead(car, state.cars);

      if (car.merging) {
        const mergeComplete = Math.abs(car.lane - car.targetLane) < 0.15;
        if (mergeComplete) { car.lane = car.targetLane; car.merging = false; car.waiting = false; car.recentlyMerged = true; car.mergeTimer = MERGE_SLOWDOWN_DURATION; }
      } else if (inClosedLane) {
        car.targetLane = currentLane - 1;
        if (nearBottleneck) { const hasSpace = canMerge(car, car.targetLane, state.cars); if (hasSpace) { car.merging = true; car.waiting = false; } else { car.waiting = true; car.merging = false; } }
        else { car.waiting = true; car.merging = false; }
      } else { car.targetLane = currentLane; car.waiting = false; car.merging = false; }

      if (car.merging) { const laneDiff = car.targetLane - car.lane; car.lane += laneDiff * 0.08; }

      const tooClose = carAhead && distAhead < 80;
      const blockedByBarrier = inClosedLane && distToBottleneck < 120 && distToBottleneck > 0;
      const waitingAtBottleneck = car.waiting && distToBottleneck < 150 && distToBottleneck > 0;

      if (tooClose || blockedByBarrier) { car.speed = 0; }
      else if (waitingAtBottleneck) { car.speed = CREEP_SPEED; car.x += CREEP_SPEED; }
      else { const oldX = car.x; car.x += car.speed; if (oldX < bottleneckX && car.x >= bottleneckX && !state.carsPassed.has(car.id)) { state.carsPassed.add(car.id); state.throughputCount++; } }
    }

    state.cars = state.cars.filter(car => car.x <= ROAD_LENGTH);
    updateThroughput();
    updateStatsDisplay();
  }

  function updateThroughput() {
    if (!state.throughputStartTime) state.throughputStartTime = Date.now();
    const elapsedSeconds = (Date.now() - state.throughputStartTime) / 1000;
    if (elapsedSeconds > 30) { state.throughputCount = 0; state.throughputStartTime = Date.now(); state.carsPassed.clear(); }
  }

  function updateStatsDisplay() {
    const layout = startBtn.closest(".lane-reduction-layout");
    if (!layout) return;
    const statCarsEl = layout.querySelector("#lr-statCars");
    const statThroughputEl = layout.querySelector("#lr-statThroughput");
    const speedFillEl = layout.querySelector("#lr-speedFill");
    const speedValEl = layout.querySelector("#lr-speedVal");
    const carCount = state.cars.length;
    if (statCarsEl) statCarsEl.textContent = carCount;
    const avgSpeedRaw = carCount > 0 ? state.cars.reduce((s, c) => s + c.speed, 0) / carCount : 0;
    const avgSpeedDisplay = carCount > 0 ? Math.round(avgSpeedRaw * 6) : "--";
    const speedPct = carCount > 0 ? Math.min(100, (avgSpeedRaw * 6 / 30) * 100) : 0;
    const GREEN = "#3dd68c", YELLOW = "#eab308", RED = "#ef4444";
    const speedColor = carCount > 0 ? (avgSpeedDisplay > 20 ? GREEN : avgSpeedDisplay > 12 ? YELLOW : RED) : "#334155";
    if (speedValEl) speedValEl.textContent = avgSpeedDisplay === "--" ? "--" : avgSpeedDisplay + " km/h";
    if (speedFillEl) { speedFillEl.style.width = speedPct + "%"; speedFillEl.style.background = speedColor; }
    let throughputVal = "0";
    if (state.throughputStartTime) { const el = (Date.now() - state.throughputStartTime) / 1000; if (el >= 0.5) throughputVal = String(Math.round(state.throughputCount * 60 / el)); }
    if (statThroughputEl) statThroughputEl.textContent = throughputVal;
  }

  function draw() {
    svg.selectAll("*").remove();
    const width = 1000, height = 320;
    const margin = { top: 40, right: 40, bottom: 40, left: 120 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const laneHeight = plotHeight / state.numLanes;
    const g = svg.append("g");
    for (let i = 0; i < state.numLanes; i++) {
      g.append("rect").attr("x", margin.left).attr("y", margin.top + i * laneHeight).attr("width", plotWidth).attr("height", laneHeight)
        .attr("fill", i % 2 === 0 ? "#1e293b" : "#172032").attr("stroke", "#334155");
      g.append("text").attr("x", margin.left - 10).attr("y", margin.top + (i + 0.5) * laneHeight).attr("text-anchor", "end").attr("font-size", "14px").attr("fill", "#64748b").text("Lane " + (i + 1));
    }
    const bottleneckX = margin.left + plotWidth * 0.6;
    const isBottleneckActive = state.bottleneckLanes < state.numLanes;
    if (isBottleneckActive) {
      g.append("rect").attr("x", bottleneckX - 40).attr("y", margin.top + state.bottleneckLanes * laneHeight).attr("width", 80).attr("height", (state.numLanes - state.bottleneckLanes) * laneHeight).attr("fill", "#fbbf24").attr("stroke", "#f59e0b").attr("stroke-width", 3).attr("opacity", 0.7);
      g.append("text").attr("x", bottleneckX).attr("y", margin.top + (state.bottleneckLanes + (state.numLanes - state.bottleneckLanes) / 2) * laneHeight).attr("text-anchor", "middle").attr("font-size", "16px").attr("font-weight", "bold").attr("fill", "#92400e").text("🚧 CLOSED");
    }
    for (const car of state.cars) {
      const carX = margin.left + (car.x / ROAD_LENGTH) * plotWidth;
      const carY = margin.top + car.lane * laneHeight + laneHeight / 2;
      let color;
      if (car.recentlyMerged) color = "#eab308";
      else if (car.waiting) color = "#ef4444";
      else if (car.merging) color = "#f59e0b";
      else color = "#3b82f6";
      g.append("rect").attr("x", carX - 25).attr("y", carY - 20).attr("width", 50).attr("height", 40).attr("rx", 4).attr("fill", color).attr("stroke", "#0f172a").attr("stroke-width", 2);
    }
    updateStatsDisplay();
  }

  let lastTime = 0;
  function tick(currentTime) {
    if (!state.running) return;
    if (currentTime - lastTime > FRAME_DELAY) { updateCars(); draw(); lastTime = currentTime; }
    requestAnimationFrame(tick);
  }

  function start() {
    if (state.running) { state.running = false; startBtn.textContent = "Start"; }
    else { state.running = true; startBtn.textContent = "Pause"; state.throughputCount = 0; state.throughputStartTime = Date.now(); state.carsPassed.clear(); state.lastSpawnTime = Date.now(); lastTime = 0; requestAnimationFrame(tick); }
  }
  function reset() { state.running = false; startBtn.textContent = "Start"; state.numLanes = Number(lanesSlider.value); state.bottleneckLanes = state.numLanes - Number(bottleneckLanesSlider.value); state.cars = []; state.nextCarId = 0; state.throughputCount = 0; state.throughputStartTime = null; state.carsPassed.clear(); draw(); }

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  lanesSlider.addEventListener("input", () => {
    const newNumLanes = Number(lanesSlider.value);
    document.getElementById("lr-lanes-value").textContent = newNumLanes;
    state.numLanes = newNumLanes;
    const maxClosed = Math.max(0, newNumLanes - 1);
    bottleneckLanesSlider.max = maxClosed;
    if (Number(bottleneckLanesSlider.value) > maxClosed) bottleneckLanesSlider.value = maxClosed;
    document.getElementById("lr-bottleneck-lanes-value").textContent = bottleneckLanesSlider.value;
    const closedLanes = Number(bottleneckLanesSlider.value);
    state.bottleneckLanes = state.numLanes - closedLanes;
    state.cars.forEach(car => { const cl = Math.floor(car.lane + 0.5); if (cl >= newNumLanes) { car.lane = newNumLanes - 1; car.targetLane = newNumLanes - 1; car.waiting = false; car.merging = false; } });
    draw();
  });
  bottleneckLanesSlider.addEventListener("input", () => {
    document.getElementById("lr-bottleneck-lanes-value").textContent = bottleneckLanesSlider.value;
    state.bottleneckLanes = state.numLanes - Number(bottleneckLanesSlider.value);
    draw();
  });
  bottleneckLanesSlider.max = Math.max(0, Number(lanesSlider.value) - 1);
  draw();
})();`;
