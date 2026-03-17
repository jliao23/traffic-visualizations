import { useEffect, useRef } from "react";

const nagelHTML = `<div class="nagel-schreckenberg-layout mb-5">
  <div class="control-panel p-3 mb-3">
    <p class="mb-2" style="font-weight:600; color: hsl(210,20%,85%); font-size:0.95rem;">Interactive Traffic Simulation</p>
    <div class="alert alert-info py-3 px-4 mb-3" style="font-size: 0.9rem;">
      <strong>HOW TO USE</strong>
      <ol class="mb-0 mt-2" style="padding-left: 1.2rem; font-size: 0.9rem;">
        <li>Click "Start" to begin the simulation</li>
        <li>Adjust density to see how traffic density affects flow and jam formation</li>
        <li>Watch for phantom jams: Traffic waves that appear spontaneously due to random braking</li>
      </ol>
    </div>
    <div class="row g-3 mb-3">
      <div class="col-md-4">
        <label for="ns-density-slider" class="form-label">
          <strong>Traffic density:</strong> <span id="ns-density-value">0.15</span>
        </label>
        <input id="ns-density-slider" class="form-range" type="range" min="5" max="90" step="1" value="15" />
        <small class="text-muted">Proportion of road occupied by cars</small>
      </div>
      <div class="col-md-4">
        <label for="ns-vmax-slider" class="form-label">
          <strong>Max speed <em>v</em><sub>max</sub>:</strong> <span id="ns-vmax-value">1</span>
        </label>
        <input id="ns-vmax-slider" class="form-range" type="range" min="0.25" max="1.5" step="0.25" value="1" />
        <small class="text-muted">Maximum velocity cars can reach</small>
      </div>
      <div class="col-md-4">
        <label for="ns-p-slider" class="form-label">
          <strong>Random brake probability <em>p</em>:</strong> <span id="ns-p-value">0.20</span>
        </label>
        <input id="ns-p-slider" class="form-range" type="range" min="0" max="50" step="1" value="20" />
        <small class="text-muted">Likelihood of random deceleration</small>
      </div>
    </div>
    <div class="d-flex flex-wrap align-items-center gap-3 mt-3">
      <button type="button" class="btn btn-primary btn-lg" id="ns-start-btn">Start</button>
      <button type="button" class="btn btn-outline-secondary btn-lg" id="ns-reset-btn">Reset</button>
      <div class="ns-readout small">
        <span class="text-muted">Density:</span> <span id="ns-density-live">—</span>
        &nbsp;&nbsp;
        <span class="text-muted">Throughput (cars/min):</span> <span id="ns-throughput-live">—</span>
      </div>
    </div>
  </div>
  <div class="chart-wrap p-4 mb-4 ns-highway-wrap">
    <div class="bt-road-label mb-2">Highway Simulation — Live View</div>
    <svg id="ns-highway-svg" width="100%" height="140" viewBox="0 0 900 140"></svg>
  </div>
</div>`;

declare const d3: any;

const NagelSchreckenberg = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    if (typeof d3 === "undefined") return;
    initialized.current = true;

    // Run the simulation script
    const script = document.createElement("script");
    script.textContent = NAGEL_JS;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: nagelHTML }} />
  );
};

export default NagelSchreckenberg;

// Inline the JS
const NAGEL_JS = `(function nagelSchreckenbergModule() {
  const svg = document.getElementById("ns-highway-svg");
  const densitySlider = document.getElementById("ns-density-slider");
  const vmaxSlider = document.getElementById("ns-vmax-slider");
  const pSlider = document.getElementById("ns-p-slider");
  const startBtn = document.getElementById("ns-start-btn");
  const resetBtn = document.getElementById("ns-reset-btn");
  if (!svg || !densitySlider || !vmaxSlider || !pSlider || !startBtn || !resetBtn || typeof d3 === "undefined") return;

  const ROAD_LENGTH = 120;
  const VIEW_WIDTH = 900;
  const VIEW_HEIGHT = 140;
  const SPEED_SCALE = 15;
  const IDM_A = 3.0;
  const IDM_B = 8.0;
  const IDM_S0 = 0.2;
  const IDM_T = 0.2;
  const IDM_DELTA = 4;
  const SLOW_TO_START = 0.6;
  const SPEED_SPREAD = 0.50;
  let nextCarId = 0;
  const state = { numLanes: 1, density: 0.15, vMax: 1, p: 0.2, running: false, animationId: null, lanes: [], throughputCount: 0, simTime: 0, lastFrameTime: 0 };
  const SPAWN_RATE_MAX = 12;
  const SPAWN_MIN_GAP = 2.0;

  function velocityColor(v, v0) {
    if (v0 <= 0) return "#ef4444";
    const ratio = v / v0;
    if (ratio <= 0.01) return "#ef4444";
    if (ratio <= 0.5) return "#eab308";
    return "#22c55e";
  }
  function getParams() {
    const vMaxRaw = Number(vmaxSlider.value);
    return { numLanes: 1, density: Number(densitySlider.value) / 100, vMax: Math.max(0.25, vMaxRaw), p: Number(pSlider.value) / 100 };
  }
  function desiredSpeed() { return getParams().vMax * SPEED_SCALE; }
  function initLanes(numLanes) { const lanes = []; for (let i = 0; i < numLanes; i++) lanes.push([]); return lanes; }
  function trySpawn(laneCars, v0Base, density, dt) {
    const rate = density * SPAWN_RATE_MAX * dt;
    if (Math.random() > rate) return;
    const firstCar = laneCars.length > 0 ? laneCars[0] : null;
    if (firstCar && firstCar.pos < SPAWN_MIN_GAP) return;
    const v0Factor = 1.0 + (Math.random() * 2 - 1) * SPEED_SPREAD;
    const vel = v0Base * v0Factor * (0.6 + Math.random() * 0.4);
    laneCars.unshift({ id: nextCarId++, pos: 0, velocity: vel, v0Factor, stopTimer: 0 });
  }
  function despawn(laneCars) {
    let removed = 0;
    for (let i = laneCars.length - 1; i >= 0; i--) { if (laneCars[i].pos >= ROAD_LENGTH) { laneCars.splice(i, 1); removed++; } }
    return removed;
  }
  function idmAccel(v, deltaV, gap, v0) {
    const sStar = IDM_S0 + Math.max(0, v * IDM_T + (v * deltaV) / (2 * Math.sqrt(IDM_A * IDM_B)));
    const aFree = IDM_A * (1 - Math.pow(v / Math.max(v0, 0.01), IDM_DELTA));
    const aInt = -IDM_A * Math.pow(sStar / Math.max(gap, 0.01), 2);
    return aFree + aInt;
  }
  function update(dt) {
    const v0Base = desiredSpeed();
    const { p, density } = getParams();
    let flowThisFrame = 0;
    for (const laneCars of state.lanes) {
      trySpawn(laneCars, v0Base, density, dt);
      const n = laneCars.length;
      if (n === 0) continue;
      laneCars.sort((a, b) => a.pos - b.pos);
      const accels = new Array(n);
      for (let i = 0; i < n; i++) {
        const car = laneCars[i];
        const carV0 = v0Base * car.v0Factor;
        let gap, deltaV;
        if (i < n - 1) { const next = laneCars[i + 1]; gap = next.pos - car.pos - 1.0; deltaV = car.velocity - next.velocity; }
        else { gap = ROAD_LENGTH; deltaV = 0; }
        if (gap < 0.01) gap = 0.01;
        let a = idmAccel(car.velocity, deltaV, gap, carV0);
        if (car.velocity < 0.1) { car.stopTimer += dt; if (car.stopTimer < SLOW_TO_START) a = Math.min(a, 0); } else { car.stopTimer = 0; }
        if (Math.random() < p * dt * 12) a -= IDM_B * (0.8 + Math.random() * 1.2);
        if (car.velocity > carV0 * 0.5 && Math.random() < p * dt * 6) a -= IDM_B * 0.4;
        accels[i] = a;
      }
      for (let i = 0; i < n; i++) {
        const car = laneCars[i];
        const carV0 = v0Base * car.v0Factor;
        car.velocity = Math.max(0, Math.min(carV0, car.velocity + accels[i] * dt));
        car.pos += car.velocity * dt;
      }
      flowThisFrame += despawn(laneCars);
    }
    state.throughputCount += flowThisFrame;
    state.simTime += dt;
  }
  function countCars() { let n = 0; for (const laneCars of state.lanes) n += laneCars.length; return n; }
  function draw() {
    const totalCells = state.lanes.length * ROAD_LENGTH;
    const numCars = countCars();
    const densityLive = totalCells > 0 ? (numCars / totalCells).toFixed(3) : "0";
    const throughputAvg = state.simTime > 0 ? ((state.throughputCount / state.simTime) * 60).toFixed(0) : "—";
    document.getElementById("ns-density-live").textContent = densityLive;
    document.getElementById("ns-throughput-live").textContent = throughputAvg;
    const margin = { top: 16, right: 16, bottom: 16, left: 16 };
    const width = VIEW_WIDTH - margin.left - margin.right;
    const height = VIEW_HEIGHT - margin.top - margin.bottom;
    const laneHeight = height / state.lanes.length;
    const cellWidth = width / ROAD_LENGTH;
    const g = d3.select("#ns-highway-svg").selectChild("g");
    if (g.empty()) return;
    const carsG = g.selectChild("g.ns-cars");
    const v0 = desiredSpeed();
    const carData = [];
    state.lanes.forEach((laneCars, laneIndex) => {
      laneCars.forEach((car) => {
        const x = margin.left + (car.pos + 0.5) * cellWidth;
        const y = margin.top + (laneIndex + 0.5) * laneHeight;
        carData.push({ x, y, velocity: car.velocity, id: car.id, v0 });
      });
    });
    carsG.selectAll("circle").data(carData, (d) => d.id).join("circle")
      .attr("class", "ns-car-dot").attr("r", Math.min(20, cellWidth * 0.85, laneHeight * 0.48))
      .attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("fill", (d) => velocityColor(d.velocity, d.v0));
  }
  function buildSvg() {
    d3.select("#ns-highway-svg").selectAll("*").remove();
    const margin = { top: 16, right: 16, bottom: 16, left: 16 };
    const width = VIEW_WIDTH - margin.left - margin.right;
    const height = VIEW_HEIGHT - margin.top - margin.bottom;
    const laneHeight = height / state.numLanes;
    const g = d3.select("#ns-highway-svg").append("g").attr("transform", "translate(0,0)");
    const laneG = g.append("g").attr("class", "ns-lanes");
    for (let lane = 0; lane < state.numLanes; lane++) {
      const y = margin.top + lane * laneHeight;
      laneG.append("rect").attr("class", "ns-lane-bg").attr("x", margin.left).attr("y", y)
        .attr("width", width).attr("height", laneHeight).attr("fill", lane % 2 === 0 ? "#1e293b" : "#172032");
    }
    g.append("g").attr("class", "ns-cars");
  }
  function tick(timestamp) {
    if (!state.running) return;
    if (state.lastFrameTime === 0) state.lastFrameTime = timestamp;
    const dt = Math.min((timestamp - state.lastFrameTime) / 1000, 0.05);
    state.lastFrameTime = timestamp;
    if (dt > 0) update(dt);
    draw();
    state.animationId = requestAnimationFrame(tick);
  }
  function start() { if (state.running) return; state.running = true; state.throughputCount = 0; state.simTime = 0; state.lastFrameTime = 0; startBtn.textContent = "Pause"; state.animationId = requestAnimationFrame(tick); }
  function pause() { state.running = false; if (state.animationId != null) { cancelAnimationFrame(state.animationId); state.animationId = null; } startBtn.textContent = "Start"; }
  function reset() { pause(); const params = getParams(); state.numLanes = params.numLanes; state.density = params.density; state.vMax = params.vMax; state.p = params.p; state.lanes = initLanes(state.numLanes); state.throughputCount = 0; state.simTime = 0; state.lastFrameTime = 0; buildSvg(); draw(); }
  function updateReadouts() {
    document.getElementById("ns-density-value").textContent = (Number(densitySlider.value) / 100).toFixed(2);
    document.getElementById("ns-vmax-value").textContent = Number(vmaxSlider.value);
    document.getElementById("ns-p-value").textContent = (Number(pSlider.value) / 100).toFixed(2);
  }
  densitySlider.addEventListener("input", () => updateReadouts());
  vmaxSlider.addEventListener("input", () => updateReadouts());
  pSlider.addEventListener("input", () => updateReadouts());
  startBtn.addEventListener("click", () => { if (state.running) pause(); else start(); });
  resetBtn.addEventListener("click", reset);
  (function init() { updateReadouts(); const params = getParams(); state.numLanes = params.numLanes; state.density = params.density; state.vMax = params.vMax; state.p = params.p; state.lanes = initLanes(state.numLanes); buildSvg(); draw(); })();
})();`;
