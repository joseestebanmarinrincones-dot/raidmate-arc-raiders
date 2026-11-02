import { icon } from "./icons.js";

const GRID = 128;
const MAX_ZOOM = 4;
const HEAT_STOPS = [
  [0.0, [20, 45, 55, 0]],
  [0.18, [35, 190, 180, 35]],
  [0.42, [91, 224, 194, 95]],
  [0.62, [255, 209, 102, 150]],
  [0.8, [255, 140, 66, 200]],
  [1.0, [255, 77, 77, 235]],
];

const SPAWN_OVERRIDES = {
  "queen-reactor": {
    maps: ["dam", "blue-gate"],
    boostTypes: ["arc:queen", "arc:harvester"],
    areas: ["ARC", "Mechanical"],
  },
  "matriarch-reactor": {
    maps: ["dam", "spaceport", "blue-gate", "stella-montis"],
    boostTypes: ["arc:matriarch"],
    areas: ["ARC", "Mechanical"],
  },
  "frigate-inductor": {
    maps: ["pendola-pass", "riven-tides"],
    boostTypes: ["events:frigate_cargo", "containers:raider_cache", "containers:security_breach"],
    areas: ["ARC", "Technological", "Raider"],
  },
  "elephant-obelisk": {
    boostTypes: ["events:ship_model", "containers:raider_cache"],
    areas: ["Commercial", "Residential", "Old World"],
  },
  "lances-mixtape-5th-edition": {
    boostTypes: ["containers:locker", "containers:bag", "containers:base_container"],
    areas: ["Commercial", "Residential"],
  },
  "sirena-dorata-ship-model": {
    maps: ["riven-tides", "pendola-pass"],
    boostTypes: ["events:ship_model"],
    areas: ["Commercial", "Residential", "Old World"],
  },
  "leviathans-crown-ship-model": {
    maps: ["riven-tides", "pendola-pass"],
    boostTypes: ["events:ship_model"],
    areas: ["Commercial", "Residential", "Old World"],
  },
  "looting-mk-3-survivor-blueprint": {
    boostTypes: ["containers:raider_cache", "containers:security_breach", "containers:weapon_case"],
    areas: ["Raider", "Security", "Weapon"],
  },
  "dolabra-blueprint": {
    maps: ["dam", "buried-city", "spaceport", "blue-gate"],
    boostTypes: ["events:assessor", "containers:raider_cache"],
    areas: ["ARC", "Raider"],
  },
};

const TYPE_LABELS = {
  "locked_room": "Sala con llave",
  "extraction": "Extracción",
  "hatch": "Hatch",
  "field_depot": "Depósito de campo",
  "raider_camp": "Campamento raider",
  "breach_room": "Sala de brecha",
  "field_crate": "Caja de campo",
  "event:ship_model": "Modelo de nave",
  "event:frigate_cargo": "Carga de fragata",
  "event:assessor": "Assessor",
  "event:harvester": "Harvester",
  "arc:matriarch": "Matriarch",
  "arc:queen": "Queen",
  "arc:harvester": "Harvester",
  "arc:bastion": "Bastion",
  "button": "Botón",
  "supply_station": "Estación de suministros",
  "fuel-cell": "Celda de combustible",
};

const LABEL_KINDS = new Set([
  "locked_room",
  "extraction",
  "hatch",
  "field_depot",
  "raider_camp",
  "breach_room",
  "field_crate",
  "event:ship_model",
  "event:frigate_cargo",
  "event:assessor",
  "event:harvester",
  "arc:matriarch",
  "arc:queen",
  "arc:harvester",
  "arc:bastion",
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function colorAt(t) {
  for (let i = 1; i < HEAT_STOPS.length; i += 1) {
    const [stop, color] = HEAT_STOPS[i];
    const [prevStop, prevColor] = HEAT_STOPS[i - 1];
    if (t <= stop) {
      const local = (t - prevStop) / Math.max(0.0001, stop - prevStop);
      return prevColor.map((channel, index) => Math.round(channel + (color[index] - channel) * local));
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1];
}

function kernel() {
  return [1, 4, 7, 4, 1];
}

function blurGrid(grid) {
  const src = grid.slice();
  const k = [1, 2, 1];
  const temp = new Float32Array(GRID * GRID);
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      let value = 0;
      let total = 0;
      for (let offset = -1; offset <= 1; offset += 1) {
        const xx = x + offset;
        if (xx < 0 || xx >= GRID) continue;
        const weight = k[offset + 1];
        value += src[y * GRID + xx] * weight;
        total += weight;
      }
      temp[y * GRID + x] = value / total;
    }
  }
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      let value = 0;
      let total = 0;
      for (let offset = -1; offset <= 1; offset += 1) {
        const yy = y + offset;
        if (yy < 0 || yy >= GRID) continue;
        const weight = k[offset + 1];
        value += temp[yy * GRID + x] * weight;
        total += weight;
      }
      grid[y * GRID + x] = value / total;
    }
  }
  return grid;
}

export class HeatmapView {
  constructor(root, options = {}) {
    this.root = root;
    this.maps = options.maps || [];
    this.mapsData = options.mapsData || {};
    this.item = null;
    this.mapId = null;
    this.scores = new Map();
    this.analysis = null;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.drag = null;
    this.resizeObserver = null;
    this.onMapSelected = options.onMapSelected || (() => {});
    this.initialMapId = options.initialMapId || "dam";
    this.lastRenderKey = "";
  }

  setMapsData(mapsData) {
    this.mapsData = mapsData || {};
    if (this.item) this.setItem(this.item);
  }

  setItem(item, options = {}) {
    this.item = item;
    if (!item) {
      this.root.innerHTML = "";
      return;
    }
    const itemMaps = this.allowedMaps(item);
    const preferred = options.mapId || this.mapId || this.initialMapId;
    const mapExists = preferred && this.mapsData[preferred];
    if (!mapExists || (itemMaps.length && !itemMaps.includes(preferred))) {
      this.mapId = itemMaps[0] || Object.keys(this.mapsData)[0] || "dam";
    } else {
      this.mapId = preferred;
    }
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.computeScores();
    this.render();
  }

  setMap(mapId) {
    if (!this.mapsData[mapId]) return;
    this.mapId = mapId;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.render();
    this.onMapSelected(mapId);
  }

  allowedMaps(item) {
    const override = SPAWN_OVERRIDES[item?.id];
    if (override?.maps) return override.maps;
    if (Array.isArray(item?.maps) && item.maps.length) return item.maps;
    return this.maps.map((map) => map.id);
  }

  itemAreas(item) {
    const override = SPAWN_OVERRIDES[item?.id];
    if (override?.areas) return override.areas;
    if (Array.isArray(item?.areas) && item.areas.length) return item.areas;
    return [];
  }

  itemAreaMask(item, mapData) {
    const areas = this.itemAreas(item);
    const index = new Map(mapData.areas.map((area, i) => [area, i]));
    let mask = 0;
    for (const area of areas) {
      if (index.has(area)) mask |= 1 << index.get(area);
    }
    return mask;
  }

  boostTypes(item) {
    return SPAWN_OVERRIDES[item?.id]?.boostTypes || [];
  }

  pointWeight(item, mapData, point) {
    const type = mapData.types[point[2]] || "";
    const base = mapData.weights[point[2]] || 1;
    const boostTypes = this.boostTypes(item);
    let factor = 1;
    if (boostTypes.includes(type)) factor += 1.8;
    if (item.type === "Key") factor += point[4] ? 0.7 : 0;
    if (item.type === "Blueprint") {
      if (type.includes("raider_cache") || type.includes("security_breach") || type.includes("weapon_case")) factor += 0.9;
    }
    if (item.type === "Trinket" && type.includes("events:ship_model")) factor += 1.5;
    if (item.type === "Nature" && type.includes("nature:")) factor += 1;
    if (this.itemAreas(item).includes("ARC") && type.startsWith("arc:")) factor += 0.8;
    return base * factor;
  }

  analyzeMap(item, mapData) {
    const allowed = this.allowedMaps(item);
    if (allowed.length && !allowed.includes(mapData.id)) {
      return { score: 0, allowed: false, grid: null, max: 0, points: [], labels: [] };
    }
    const mask = this.itemAreaMask(item, mapData);
    const grid = new Float32Array(GRID * GRID);
    const relevant = [];
    let rawScore = 0;
    const ks = kernel();
    for (const point of mapData.points) {
      const areaMatch = mask === 0 ? true : (point[3] & mask) !== 0;
      if (!areaMatch) continue;
      const weight = this.pointWeight(item, mapData, point);
      if (weight <= 0) continue;
      relevant.push(point);
      rawScore += weight;
      const x = clamp(point[0] / 100, 0, 0.99999) * GRID;
      const y = clamp(point[1] / 100, 0, 0.99999) * GRID;
      const gx = Math.floor(x);
      const gy = Math.floor(y);
      for (let ky = 0; ky < 5; ky += 1) {
        for (let kx = 0; kx < 5; kx += 1) {
          const xx = gx + kx - 2;
          const yy = gy + ky - 2;
          if (xx < 0 || xx >= GRID || yy < 0 || yy >= GRID) continue;
          grid[yy * GRID + xx] += weight * ks[kx] * ks[ky];
        }
      }
    }
    blurGrid(grid);
    let max = 0;
    for (let i = 0; i < grid.length; i += 1) {
      if (grid[i] > max) max = grid[i];
    }
    const itemAreas = this.itemAreas(item);
    const labels = (mapData.labels || [])
      .filter((label) => {
        if (!LABEL_KINDS.has(label.kind)) return false;
        if (label.kind.startsWith("arc:") && !itemAreas.includes("ARC")) return false;
        if (label.kind === "event:assessor" && !itemAreas.includes("ARC") && !itemAreas.includes("Research")) {
          return false;
        }
        if (label.kind === "event:frigate_cargo" && !itemAreas.includes("ARC")) return false;
        return true;
      })
      .map((label) => {
        const gx = clamp(Math.floor((label.x / 100) * GRID), 0, GRID - 1);
        const gy = clamp(Math.floor((label.y / 100) * GRID), 0, GRID - 1);
        const intensity = max > 0 ? grid[gy * GRID + gx] / max : 0;
        return { ...label, intensity };
      })
      .filter((label) => label.intensity > 0.08)
      .sort((a, b) => b.intensity - a.intensity);
    return { score: rawScore, allowed: true, grid, max, points: relevant, labels };
  }

  computeScores() {
    this.scores.clear();
    let top = 0;
    for (const map of this.maps) {
      const mapData = this.mapsData[map.id];
      if (!mapData) continue;
      const analysis = this.analyzeMap(this.item, mapData);
      this.scores.set(map.id, analysis);
      top = Math.max(top, analysis.score);
    }
    for (const analysis of this.scores.values()) {
      analysis.relative = top > 0 ? Math.round((analysis.score / top) * 100) : 0;
    }
  }

  labelName(name) {
    return String(name || "").replace(/\s{2,}/g, " ").trim();
  }

  render() {
    if (!this.item) {
      this.root.innerHTML = `<div class="hm-empty">Selecciona un objeto para ver su mapa de calor.</div>`;
      return;
    }
    const mapData = this.mapsData[this.mapId];
    if (!mapData) {
      this.root.innerHTML = `<div class="hm-empty">${icon("info")} Cargando datos del mapa…</div>`;
      return;
    }
    const analysis = this.scores.get(this.mapId) || this.analyzeMap(this.item, mapData);
    this.analysis = analysis;
    const allowed = this.allowedMaps(this.item);
    const mapTabs = this.maps
      .map((map) => {
        const mapAnalysis = this.scores.get(map.id);
        const isAllowed = !allowed.length || allowed.includes(map.id);
        const score = mapAnalysis?.relative ?? 0;
        return `<button class="hm-map-tab ${map.id === this.mapId ? "is-active" : ""} ${isAllowed ? "" : "is-disabled"}" data-hm-map="${map.id}" ${isAllowed ? "" : "disabled"} title="${isAllowed ? `${map.name}: índice ${score}` : "Este objeto no aparece en este mapa"}">
          <span>${map.code}</span>
          <b>${isAllowed ? score : "—"}</b>
        </button>`;
      })
      .join("");

    const ranked = this.maps
      .map((map) => {
        const mapAnalysis = this.scores.get(map.id);
        return { map, analysis: mapAnalysis };
      })
      .filter((entry) => entry.analysis)
      .sort((a, b) => (b.analysis.relative || 0) - (a.analysis.relative || 0));

    const topLabels = this.dedupeLabels(analysis.labels || []).slice(0, 6);
    const labelsHtml = topLabels
      .map(
        (label, index) => `<div class="hm-label ${index < 3 ? "is-strong" : ""}" style="left:${label.x}%;top:${label.y}%">
          <span class="hm-label-dot"></span>
          <span class="hm-label-copy">
            <b>${this.escape(this.labelName(label.name))}</b>
            <small>${Math.round(label.intensity * 100)}% · ${TYPE_LABELS[label.kind] || "Punto de interés"}</small>
          </span>
        </div>`,
      )
      .join("");

    const siteRows = topLabels
      .map(
        (label) => `<div class="hm-site-row">
          <div class="hm-site-copy"><span>${this.escape(this.labelName(label.name))}</span><small>${TYPE_LABELS[label.kind] || "POI"}</small></div>
          <div class="hm-site-meter"><i style="width:${Math.max(4, Math.round(label.intensity * 100))}%"></i></div>
          <strong>${Math.round(label.intensity * 100)}</strong>
        </div>`,
      )
      .join("");

    const rankingRows = ranked
      .map(({ map, analysis: mapAnalysis }) => {
        const isAllowed = !allowed.length || allowed.includes(map.id);
        return `<button class="hm-rank-row ${map.id === this.mapId ? "is-active" : ""} ${isAllowed ? "" : "is-disabled"}" data-hm-map="${map.id}" ${isAllowed ? "" : "disabled"}>
          <span class="hm-rank-code">${map.code}</span>
          <span class="hm-rank-main"><b>${map.name}</b><span class="hm-rank-bar"><i style="width:${Math.max(2, mapAnalysis.relative || 0)}%"></i></span></span>
          <strong>${isAllowed ? mapAnalysis.relative || 0 : "—"}</strong>
        </button>`;
      })
      .join("");

    this.root.innerHTML = `
      <div class="hm">
        <div class="hm-map-tabs" aria-label="Mapa del heatmap">${mapTabs}</div>
        <div class="hm-body">
          <div class="hm-visual">
            <div class="hm-stage-wrap" data-hm-wrap tabindex="0" style="aspect-ratio:${mapData.width}/${mapData.height}" aria-label="Mapa de calor interactivo. Usa la rueda para hacer zoom y arrastra para mover.">
              <div class="hm-stage" data-hm-stage>
                <img src="${mapData.image}" alt="Mapa de ${mapData.name}" draggable="false">
                <canvas class="hm-context" data-hm-context></canvas>
                <canvas class="hm-heat" data-hm-heat></canvas>
                <div class="hm-labels" data-hm-labels>${labelsHtml}</div>
              </div>
              <div class="hm-scanline"></div>
              <div class="hm-zoom-controls">
                <button class="hm-zoom-btn" data-hm-zoom="in" title="Acercar">${icon("plus")}</button>
                <span data-hm-zoom-label>1.0×</span>
                <button class="hm-zoom-btn" data-hm-zoom="out" title="Alejar">${icon("minus")}</button>
                <button class="hm-zoom-btn" data-hm-zoom="reset" title="Restablecer">${icon("maximize")}</button>
              </div>
              <div class="hm-legend"><span>Baja</span><i></i><span>Alta</span></div>
              <div class="hm-map-tag">${mapData.name} · esquema sobre mapa real</div>
            </div>
            <div class="hm-note">${icon("info")} El calor muestra contenedores compatibles con el tipo de loot y la zona. No garantiza un spawn concreto del objeto.</div>
          </div>
          <aside class="hm-side">
            <div class="hm-side-head"><span>Índice por mapa</span><small>relativo</small></div>
            <div class="hm-ranking">${rankingRows}</div>
            <div class="hm-side-head hm-side-head-top"><span>Mejores sitios</span><small>${topLabels.length} POIs</small></div>
            <div class="hm-sites">${siteRows || `<div class="hm-no-sites">Sin puntos etiquetados para este objeto.</div>`}</div>
          </aside>
        </div>
        <div class="hm-source">Mapa: MetaForge · ${analysis.points.length} contenedores compatibles en ${mapData.name}.</div>
      </div>`;

    this.bindStage();
    this.draw(mapData, analysis);
  }

  dedupeLabels(labels) {
    const output = [];
    for (const label of labels) {
      const duplicate = output.some(
        (other) =>
          other.name === label.name ||
          Math.hypot(other.x - label.x, other.y - label.y) < 2.5,
      );
      if (!duplicate) output.push(label);
    }
    return output;
  }

  bindStage() {
    const root = this.root;
    const wrap = root.querySelector("[data-hm-wrap]");
    if (!wrap) return;
    const setZoom = (nextScale, clientX, clientY) => {
      const rect = wrap.getBoundingClientRect();
      const px = clientX == null ? rect.width / 2 : clientX - rect.left;
      const py = clientY == null ? rect.height / 2 : clientY - rect.top;
      const oldScale = this.zoom;
      const scale = clamp(nextScale, 1, MAX_ZOOM);
      if (scale === oldScale) return;
      this.panX = px - ((px - this.panX) * scale) / oldScale;
      this.panY = py - ((py - this.panY) * scale) / oldScale;
      this.zoom = scale;
      this.applyTransform(wrap);
    };

    wrap.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.12 : 0.89;
        setZoom(this.zoom * factor, event.clientX, event.clientY);
      },
      { passive: false },
    );

    wrap.addEventListener("dblclick", () => {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.applyTransform(wrap);
    });

    wrap.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button, .hm-zoom-controls, .hm-legend")) return;
      this.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: this.panX,
        panY: this.panY,
      };
      wrap.setPointerCapture(event.pointerId);
      wrap.classList.add("is-dragging");
    });

    wrap.addEventListener("pointermove", (event) => {
      if (!this.drag || this.drag.pointerId !== event.pointerId) return;
      this.panX = this.drag.panX + (event.clientX - this.drag.startX);
      this.panY = this.drag.panY + (event.clientY - this.drag.startY);
      this.applyTransform(wrap);
    });

    const endDrag = (event) => {
      if (!this.drag || this.drag.pointerId !== event.pointerId) return;
      this.drag = null;
      wrap.classList.remove("is-dragging");
    };
    wrap.addEventListener("pointerup", endDrag);
    wrap.addEventListener("pointercancel", endDrag);

    for (const button of root.querySelectorAll("[data-hm-zoom]")) {
      button.addEventListener("click", () => {
        const action = button.dataset.hmZoom;
        if (action === "reset") {
          this.zoom = 1;
          this.panX = 0;
          this.panY = 0;
          this.applyTransform(wrap);
        } else {
          const factor = action === "in" ? 1.25 : 0.8;
          setZoom(this.zoom * factor);
        }
      });
    }

    for (const button of root.querySelectorAll("[data-hm-map]")) {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        this.setMap(button.dataset.hmMap);
      });
    }

    this.applyTransform(wrap);
  }

  applyTransform(wrap = this.root.querySelector("[data-hm-wrap]")) {
    if (!wrap) return;
    const stage = wrap.querySelector("[data-hm-stage]");
    if (!stage) return;
    const maxX = (this.zoom - 1) * wrap.clientWidth;
    const maxY = (this.zoom - 1) * wrap.clientHeight;
    this.panX = clamp(this.panX, -maxX, 0);
    this.panY = clamp(this.panY, -maxY, 0);
    stage.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    const label = wrap.querySelector("[data-hm-zoom-label]");
    if (label) label.textContent = `${this.zoom.toFixed(1)}×`;
  }

  draw(mapData, analysis) {
    const wrap = this.root.querySelector("[data-hm-wrap]");
    if (!wrap) return;
    const image = wrap.querySelector("img");
    const contextCanvas = wrap.querySelector("[data-hm-context]");
    const heatCanvas = wrap.querySelector("[data-hm-heat]");
    if (!image || !contextCanvas || !heatCanvas) return;

    const width = 1400;
    const height = Math.round((width * mapData.height) / mapData.width);
    for (const canvas of [contextCanvas, heatCanvas]) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = contextCanvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    // Faint marker field for context.
    ctx.fillStyle = "rgba(225, 244, 250, 0.22)";
    for (const point of mapData.points) {
      const x = (point[0] / 100) * width;
      const y = (point[1] / 100) * height;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    // Relevant markers in a brighter tone.
    ctx.fillStyle = "rgba(255, 222, 170, 0.7)";
    for (const point of analysis.points) {
      const x = (point[0] / 100) * width;
      const y = (point[1] / 100) * height;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    const heatCtx = heatCanvas.getContext("2d");
    heatCtx.clearRect(0, 0, width, height);
    if (!analysis.grid || analysis.max <= 0) return;
    const gridCanvas = document.createElement("canvas");
    gridCanvas.width = GRID;
    gridCanvas.height = GRID;
    const gridCtx = gridCanvas.getContext("2d");
    const imageData = gridCtx.createImageData(GRID, GRID);
    const max = analysis.max;
    const pixels = imageData.data;
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const value = analysis.grid[y * GRID + x] / max;
        const t = Math.pow(clamp(value, 0, 1), 0.55);
        const [r, g, b, a] = colorAt(t);
        const index = (y * GRID + x) * 4;
        pixels[index] = r;
        pixels[index + 1] = g;
        pixels[index + 2] = b;
        pixels[index + 3] = a;
      }
    }
    gridCtx.putImageData(imageData, 0, 0);
    heatCtx.imageSmoothingEnabled = true;
    heatCtx.globalAlpha = 0.92;
    heatCtx.drawImage(gridCanvas, 0, 0, width, height);
    heatCtx.globalAlpha = 1;
  }

  escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
