import { icon } from "./icons.js";
import {
  EVENT_INFO,
  activeEvents,
  countdownLabel,
  eventStateLabel,
  eventTierLabel,
  eventsForMap,
  formatCountdown,
  formatDateTime,
  formatTime,
  getMapEventState,
  normalizeEvents,
  upcomingEvents,
} from "./events.js";
import { HeatmapView } from "./heatmap.js";

const APP_VERSION = "1.0.0";
const REPO_URL = "https://github.com/joseestebanmarinrincones-dot/raidmate-arc-raiders";
const RAW_VERSION_URL = `${REPO_URL.replace("github.com", "raw.githubusercontent.com")}/main/version.json`;
const STORAGE_KEY = "raidmate:v1";
const DEFAULT_DURATION = 30 * 60;

const MAPS = [
  {
    id: "dam",
    name: "Dam Battlegrounds",
    code: "DAM",
    eventName: "Dam",
    risk: 2,
    riskLabel: "Baja",
    difficulty: 2,
    unlock: "Sin requisito",
    duration: "30 min",
    intro: "El mapa de inicio: céntrico, legible y perfecto para encadenar contenedores sin cruzar medio mapa.",
    focus: ["Electrónica", "Armas", "Oficinas"],
    keyItem: "Dam Control Tower Key",
    keyItemId: "dam-control-center-tower-key",
    eventHint: "Night Raid · Hurricane",
    tips: [
      "Control Tower y Research & Administration concentran el mejor loot del centro; entra por un lateral y no te quedes en la escalera.",
      "Power Generation Complex tiene una extracción muy cerca: úsala para cerrar la ruta sin volver al centro.",
      "Hydroponic Dome es buena parada de materiales, pero el ruido de las cúpulas atrae ARC. Revisa antes de abrir.",
    ],
    route: [
      { id: "control-tower", name: "Control Tower", tag: "Llave", tone: "key", time: "3–5 min", loot: "Cajas de armas · Electrónica", note: "Sube a la torre y revisa la sala con llave. Suele haber armas y componentes electrónicos." },
      { id: "research-admin", name: "Research & Administration", tag: "Alto valor", tone: "high", time: "4–6 min", loot: "Oficinas · Componentes", note: "Dos edificios centrales con escritorios y armarios. Busca procesadores, cables y piezas." },
      { id: "power-generation", name: "Power Generation Complex", tag: "Industrial", tone: "industrial", time: "3–5 min", loot: "Baterías · Mecánica", note: "Zona industrial con baterías y piezas mecánicas. Extracción cercana para salir rápido." },
      { id: "hydroponic-dome", name: "Hydroponic Dome Complex", tag: "Naturaleza", tone: "nature", time: "3–4 min", loot: "Cultivos · Baterías", note: "Buena parada si necesitas naturaleza o baterías industriales. Revisa las cúpulas laterales." },
      { id: "testing-annex", name: "Testing Annex", tag: "Militar", tone: "military", time: "3–5 min", loot: "Armas · Munición", note: "Equipo táctico y munición. Zona caliente: no entres sin una vía de escape clara." },
    ],
    targetIds: [
      "dam-control-center-tower-key",
      "advanced-electrical-components",
      "processor",
      "queen-reactor",
      "matriarch-reactor",
      "advanced-arc-powercell",
      "bastion-part",
    ],
  },
  {
    id: "spaceport",
    name: "Spaceport",
    code: "SPA",
    eventName: "Spaceport",
    risk: 3,
    riskLabel: "Media",
    difficulty: 3,
    unlock: "12 raids",
    duration: "30 min",
    intro: "Hangares y torres verticales. Buen loot militar, pero los pasillos abiertos castigan cualquier rotación.",
    focus: ["Lockers", "Munición", "Componentes"],
    keyItem: "Spaceport Control Tower Key",
    keyItemId: "spaceport-ground-control-key",
    eventHint: "Harvester · Hidden Bunker",
    tips: [
      "Arrival Building tiene el cluster de contenedores más grande del mapa. Revisa mostradores y maletas.",
      "Container Storage y las Launch Towers se conectan por pasarelas; evita cruzar el hangar abierto si hay fuego.",
      "Control Tower A6 necesita llave. Si no la llevas, no gastes tiempo subiendo.",
    ],
    route: [
      { id: "arrival", name: "Arrival Building", tag: "Contenedores", tone: "high", time: "5–7 min", loot: "Maletas · Mostradores", note: "El mejor cluster de contenedores del mapa. Revisa la planta baja y las salas de espera." },
      { id: "container-storage", name: "Container Storage", tag: "Industrial", tone: "industrial", time: "4–6 min", loot: "Cajas · Componentes", note: "Almacén con cajas industriales y equipo. Cuidado con los pasillos estrechos." },
      { id: "launch-towers", name: "Launch Towers", tag: "Alto valor", tone: "high", time: "5–7 min", loot: "Armas · Módulos", note: "Zona vertical con cajas de armas y módulos. Sube por un lado y baja por el otro." },
      { id: "trench-tower", name: "South Trench Tower", tag: "Seguridad", tone: "security", time: "3–5 min", loot: "Lockers · Equipo militar", note: "Lockers y suministros militares. Es un buen desvío si vienes de Container Storage." },
      { id: "control-tower-a6", name: "Control Tower A6", tag: "Llave", tone: "key", time: "3–5 min", loot: "Sala superior · Armamento", note: "La llave abre la sala superior. Si la tienes, es una de las paradas más rentables." },
    ],
    targetIds: [
      "advanced-mechanical-components",
      "processor",
      "bastion-part",
      "matriarch-reactor",
      "advanced-arc-powercell",
      "spaceport-ground-control-key",
      "complex-gun-parts",
    ],
  },
  {
    id: "buried-city",
    name: "Buried City",
    code: "BUR",
    eventName: "Buried City",
    risk: 3,
    riskLabel: "Media",
    difficulty: 3,
    unlock: "8 raids",
    duration: "30 min",
    intro: "Ruinas urbanas con mucho residencial y zonas médicas. Ideal para trinkets, suministros y misiones de Shani.",
    focus: ["Trinkets", "Médico", "Residencial"],
    keyItem: "Buried City Town Hall Key",
    keyItemId: "buried-city-town-hall-key",
    eventHint: "Night Raid · Bird City",
    tips: [
      "Piazza Arbusto y Piazza Roma tienen muchos contenedores residenciales; revisa balcones y coches.",
      "Town Hall necesita llave y suele compensar. Si no la llevas, salta directo al hospital.",
      "Hospital es la mejor parada médica, pero también uno de los puntos de PvP más habituales.",
    ],
    route: [
      { id: "piazza-arbusto", name: "Piazza Arbusto", tag: "Residencial", tone: "residential", time: "4–6 min", loot: "Trinkets · Comida", note: "Cluster de contenedores residenciales. Revisa calles, balcones y vehículos." },
      { id: "town-hall", name: "Town Hall", tag: "Llave", tone: "key", time: "4–6 min", loot: "Oficinas · Alto valor", note: "La Buried City Town Hall Key abre una de las salas más rentables del mapa." },
      { id: "space-travel", name: "Space Travel", tag: "Residencial", tone: "residential", time: "3–5 min", loot: "Maletas · Trinkets", note: "Agencia de viajes con mostradores y maletas. Buen sitio para trinkets ligeros." },
      { id: "hospital", name: "Hospital", tag: "Médico", tone: "medical", time: "4–6 min", loot: "Antiséptico · Suministros", note: "La mejor parada médica. Busca antisépticos, jeringas y equipo de curación." },
      { id: "research", name: "Research", tag: "Componentes", tone: "tech", time: "3–5 min", loot: "Electrónica · Investigación", note: "Oficinas de investigación con componentes y material tecnológico." },
    ],
    targetIds: [
      "buried-city-town-hall-key",
      "antiseptic",
      "advanced-electrical-components",
      "elephant-obelisk",
      "lances-mixtape-5th-edition",
      "advanced-camera",
    ],
  },
  {
    id: "blue-gate",
    name: "The Blue Gate",
    code: "GATE",
    eventName: "Blue Gate",
    risk: 4,
    riskLabel: "Alta",
    difficulty: 4,
    unlock: "18 raids",
    duration: "30 min",
    intro: "Complejo industrial con túneles y almacenes. Densidad alta, extracciones peligrosas y mucho PvP en los cuellos de botella.",
    focus: ["Industrial", "Lockers", "Túneles"],
    keyItem: "Blue Gate Confiscation Room Key",
    keyItemId: "blue-gate-confiscation-room-key",
    eventHint: "Locked Gate · Night Raid",
    tips: [
      "Security Wing y Village tienen cinco contenedores cada uno; elige uno como ruta principal y el otro como cierre.",
      "Warehouse Complex es la mejor zona de vehículos y piezas industriales. Revisa los pasillos entre estanterías.",
      "Los túneles conectan Maintenance Wing con el resto del complejo. Deja siempre una salida alternativa.",
    ],
    route: [
      { id: "security-wing", name: "Security Wing", tag: "Alto valor", tone: "high", time: "5–7 min", loot: "Lockers · Seguridad", note: "Uno de los mejores clusters de contenedores del mapa. Revisa taquillas y salas de control." },
      { id: "warehouse-complex", name: "Warehouse Complex", tag: "Industrial", tone: "industrial", time: "5–7 min", loot: "Vehículos · Piezas", note: "Industrial con muchos vehículos. Buen lugar para piezas mecánicas y material de crafting." },
      { id: "maintenance-wing", name: "Maintenance Wing", tag: "Túneles", tone: "tech", time: "4–6 min", loot: "Lockers · Herramientas", note: "Pasillos técnicos y salas de mantenimiento. Conecta con seguridad y con la zona industrial." },
      { id: "village", name: "Village", tag: "Residencial", tone: "residential", time: "4–6 min", loot: "Trinkets · Suministros", note: "Casas y comercios con loot residencial. Buen contraste después de tanta industria." },
      { id: "pilgrims-peak", name: "Pilgrim's Peak", tag: "Alto valor", tone: "high", time: "3–5 min", loot: "Comunicaciones · Cajas", note: "Zona elevada con cajas y equipo de comunicaciones. Expuesta: vigila el horizonte." },
    ],
    targetIds: [
      "blue-gate-confiscation-room-key",
      "blue-gate-communication-tower-key",
      "rusted-gear",
      "advanced-mechanical-components",
      "queen-reactor",
      "dolabra-blueprint",
      "looting-mk-3-survivor-blueprint",
    ],
  },
  {
    id: "stella-montis",
    name: "Stella Montis",
    code: "STE",
    eventName: "Stella Montis",
    risk: 4,
    riskLabel: "Alta",
    difficulty: 4,
    unlock: "24 raids",
    duration: "30 min",
    intro: "Laboratorio vertical y CQC. Botín raro, pero cada pasillo es una emboscada y las pasarelas son cuellos de botella.",
    focus: ["Médico", "Investigación", "CQC"],
    keyItem: "Stella Montis Archives Key",
    keyItemId: "stella-montis-archives-key",
    eventHint: "Night Raid · Matriarch",
    tips: [
      "Security Bridge y Central Corridor son la entrada natural. No corras por las pasarelas: son el punto de emboscada más obvio.",
      "Medical Research y Assembly Workshops concentran el mejor loot técnico y médico. Revisa taquillas y paneles.",
      "El Seed Vault es una parada de alto valor, pero suele estar contestada. Entra con un plan de salida.",
    ],
    route: [
      { id: "security-bridge", name: "Security Bridge", tag: "Contenedores", tone: "high", time: "4–6 min", loot: "Lockers · Seguridad", note: "Tres contenedores y buena visibilidad de la entrada. Revisa antes de adentrarte." },
      { id: "medical-research", name: "Medical Research", tag: "Médico", tone: "medical", time: "4–6 min", loot: "Antiséptico · Químicos", note: "Laboratorios médicos con suministros y productos químicos. Muy útil para el banco médico." },
      { id: "assembly-workshops", name: "Assembly Workshops", tag: "Componentes", tone: "tech", time: "4–6 min", loot: "Piezas · Electrónica", note: "Talleres de ensamblaje y electrónica. Busca componentes avanzados y planos." },
      { id: "cultural-archives", name: "Cultural Archives", tag: "Alto valor", tone: "high", time: "3–5 min", loot: "Archivos · Trinkets", note: "Archivos y vitrinas. Es una buena parada de trinkets y objetos de investigación." },
      { id: "seed-vault", name: "Seed Vault", tag: "Alto valor", tone: "key", time: "3–5 min", loot: "Semillas · Botín raro", note: "Cámara de semillas con botín raro. Si está abierta, merece la pena el riesgo." },
    ],
    targetIds: [
      "aphelion-rifle",
      "matriarch-reactor",
      "looting-mk-3-survivor-blueprint",
      "antiseptic",
      "assorted-seeds",
      "arc-data-module",
      "stella-montis-archives-key",
    ],
  },
  {
    id: "riven-tides",
    name: "Riven Tides",
    code: "RIV",
    eventName: "Riven Tides",
    risk: 5,
    riskLabel: "Extrema",
    difficulty: 5,
    unlock: "20 raids",
    duration: "30 min",
    intro: "Costa y puerto con el mapa más duro. Trae un kit que puedas perder, prioriza el bolsillo seguro y elige extracción antes de entrar.",
    focus: ["Costa", "Hotel", "Trinkets"],
    keyItem: "Riven Tides Secure Storage Keycard",
    keyItemId: "riven-tides-secure-storage-keycard",
    eventHint: "Beachcombing · Night Raid",
    tips: [
      "Stacking Yard es el mejor cluster de contenedores, pero el puzzle de los cuatro botones te deja expuesto. Resuélvelo rápido o vuelve más tarde.",
      "Hotel Panorama Azzurro es vertical y muy contestado. Las plantas altas suelen tener el mejor loot y las peores salidas.",
      "Solo hay cinco return points: decide la extracción antes de entrar a la zona del puerto.",
    ],
    route: [
      { id: "stacking-yard", name: "Stacking Yard", tag: "Puzzle", tone: "puzzle", time: "5–8 min", loot: "5 contenedores · Salas", note: "Pulsa los cuatro botones para abrir las salas de loot. No te quedes en el patio abierto." },
      { id: "hotel-panorama", name: "Hotel Panorama Azzurro", tag: "Alto valor", tone: "high", time: "5–7 min", loot: "Habitaciones · Trinkets", note: "Hotel de varias plantas. Revisa habitaciones, cajas fuertes y las zonas comunes." },
      { id: "port-authority", name: "Port Authority Building", tag: "Oficinas", tone: "tech", time: "4–6 min", loot: "Oficinas · Componentes", note: "Edificio portuario con oficinas y documentación. Buen lugar para componentes y trinkets." },
      { id: "exodus-port", name: "Exodus Port", tag: "Industrial", tone: "industrial", time: "4–6 min", loot: "Dockyard · Materiales", note: "Muelle industrial con cajas y material pesado. Zona abierta y peligrosa." },
      { id: "customs-house", name: "Customs House", tag: "Opcional", tone: "optional", time: "2–4 min", loot: "Aduana · Rápido", note: "Parada rápida si estás cerca de la extracción. No merece un desvío largo." },
    ],
    targetIds: [
      "frigate-inductor",
      "sirena-dorata-ship-model",
      "leviathans-crown-ship-model",
      "elephant-obelisk",
      "advanced-electrical-components",
      "arc-data-module",
      "dockmasters-detector",
    ],
  },
  {
    id: "pendola-pass",
    name: "Pendola Pass",
    code: "PEN",
    eventName: "Pendola Pass",
    risk: 3,
    riskLabel: "Media",
    difficulty: 3,
    unlock: "25 raids",
    duration: "30 min",
    intro: "Pueblo alpino y observatorio. Rutas largas, verticalidad y el ARC Frigate. El mapa más nuevo del Rust Belt.",
    focus: ["Pueblo", "Observatorio", "Fragata"],
    keyItem: "Pendola Pass Observatory Key",
    keyItemId: "pendola-pass-observatory-key",
    eventHint: "Flash Freeze · ARC Frigate",
    tips: [
      "Old Town tiene el cluster de contenedores más grande del mapa. Es la parada obligatoria si quieres densidad.",
      "Electrical Substation y Almatera Village son buenas paradas intermedias; no cruces el valle abierto sin mirar el cielo.",
      "El observatorio necesita llave y el Frigate puede aparecer. Si vas justo de tiempo, prioriza Old Town y sal.",
    ],
    route: [
      { id: "old-town", name: "Old Town", tag: "Contenedores", tone: "high", time: "6–8 min", loot: "6 contenedores · Pueblo", note: "El cluster más grande del mapa. Revisa calles, locales y edificios del centro." },
      { id: "electrical-substation", name: "Electrical Substation", tag: "Industrial", tone: "industrial", time: "3–5 min", loot: "Electrónica · Cajas", note: "Subestación eléctrica con componentes y cajas. Buen punto si buscas material técnico." },
      { id: "almatera-village", name: "Almatera Village", tag: "Residencial", tone: "residential", time: "3–5 min", loot: "Casas · Suministros", note: "Casas del pueblo con loot residencial. Revisa cocinas y armarios." },
      { id: "observatory", name: "Cielo Sereno Observatory", tag: "Llave", tone: "key", time: "4–6 min", loot: "Sala alta · Raro", note: "La llave del observatorio abre una sala de alto valor. Es la parada más vertical del mapa." },
      { id: "railyard", name: "Railyard", tag: "Evento", tone: "event", time: "3–5 min", loot: "Tren · Cajas extra", note: "Durante ciertas condiciones aparecen contenedores extra en el tren. Revisa antes de ir al observatorio." },
    ],
    targetIds: [
      "frigate-inductor",
      "pendola-pass-observatory-key",
      "emperor-gateway-conduit",
      "advanced-mechanical-components",
      "sirena-dorata-ship-model",
      "assorted-seeds",
    ],
  },
];

const MAP_BY_ID = new Map(MAPS.map((map) => [map.id, map]));
const MAP_BY_EVENT_NAME = new Map(MAPS.map((map) => [map.eventName, map]));
const RARITY_LABEL = {
  Legendary: "Legendario",
  Epic: "Épico",
  Rare: "Raro",
  Uncommon: "Poco común",
  Common: "Común",
  Amplified: "Amplificado",
};
const RARITY_ORDER = { Legendary: 6, Amplified: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
const CATEGORY_LABEL = {
  Weapon: "Arma",
  Recyclable: "Reciclable",
  Trinket: "Trofeo",
  Blueprint: "Plano",
  "Quick Use": "Uso rápido",
  "Topside Material": "Material de superficie",
  "Refined Material": "Material refinado",
  "Basic Material": "Material básico",
  Key: "Llave",
  Modification: "Modificación",
  Augment: "Aumento",
  Shield: "Escudo",
  Ammunition: "Munición",
  Nature: "Naturaleza",
  "Research Item": "Investigación",
  Misc: "Misceláneo",
  Material: "Material",
  "Quest Item": "Objeto de misión",
};
const RARITY_CLASS = {
  Legendary: "legendary",
  Epic: "epic",
  Rare: "rare",
  Uncommon: "uncommon",
  Common: "common",
  Amplified: "amplified",
};
const REGION_LABEL = {
  europe: "Europa",
  "north-america": "Norteamérica",
  brazil: "Sudamérica",
  "east-asia": "Asia",
  oceania: "Oceanía",
};
const POPULAR_IDS = [
  "elephant-obelisk",
  "advanced-electrical-components",
  "queen-reactor",
  "frigate-inductor",
  "matriarch-reactor",
  "looting-mk-3-survivor-blueprint",
  "aphelion-rifle",
  "blue-gate-confiscation-room-key",
  "lances-mixtape-5th-edition",
];
const DEFAULT_STATE = {
  tab: "raid",
  mapId: "dam",
  region: "europe",
  hotkey: { code: "KeyH", key: "h", label: "H" },
  notes: {},
  routeDone: {},
  lootDone: {},
  timer: { duration: DEFAULT_DURATION, remaining: DEFAULT_DURATION, running: false, endsAt: null },
  intel: { itemId: "elephant-obelisk", mapId: "dam", query: "" },
};

const data = {
  items: [],
  itemsById: new Map(),
  mapsData: {},
  mapsLoaded: false,
  events: {},
  liveServer: false,
  meta: null,
  version: null,
};

const dom = {};
let state = loadState();
let timerInterval = null;
let uiInterval = null;
let eventsRefreshInterval = null;
let notesSaveTimer = null;
let toastTimer = null;
let heatmapView = null;
let captureHotkey = false;
let hotkeyCaptureHandler = null;
let eventSignature = "";
let mapDataPromise = null;
let previousFocus = null;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheDom();
  hydrateStaticIcons();
  bindStaticEvents();
  renderTopbar();
  try {
    await detectLiveServer();
    await loadCoreData();
    await loadRegionEvents(state.region, { force: true });
    renderAll();
    restoreTabFromHash();
    initTimer();
    startUiClock();
    loadVersionInfo();
    hideLoading();
  } catch (error) {
    console.error(error);
    showLoadingError(error);
  }
}

function hydrateStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = icon(element.dataset.icon);
  });
}

function cacheDom() {
  dom.loading = document.querySelector("#loadingScreen");
  dom.loadingText = document.querySelector("#loadingText");
  dom.loadingError = document.querySelector("#loadingError");
  dom.retryButton = document.querySelector("#retryLoad");
  dom.topbar = document.querySelector(".topbar");
  dom.tabButtons = [...document.querySelectorAll("[data-tab]")];
  dom.views = {
    raid: document.querySelector("#view-raid"),
    intel: document.querySelector("#view-intel"),
    events: document.querySelector("#view-events"),
  };
  dom.regionSelect = document.querySelector("#regionSelect");
  dom.settingsRegion = document.querySelector("#settingsRegion");
  dom.mapList = document.querySelector("#mapList");
  dom.hero = document.querySelector("#mapHero");
  dom.routeList = document.querySelector("#routeList");
  dom.routeCounter = document.querySelector("#routeCounter");
  dom.routeMeter = document.querySelector("#routeMeterFill");
  dom.timerPanel = document.querySelector("#timerPanel");
  dom.timerDisplay = document.querySelector("#timerDisplay");
  dom.timerStatus = document.querySelector("#timerStatus");
  dom.timerLabel = document.querySelector("#timerLabel");
  dom.timerSub = document.querySelector("#timerSub");
  dom.timerExfil = document.querySelector("#timerExfil");
  dom.timerRing = document.querySelector("#timerRingProgress");
  dom.timerToggle = document.querySelector("#timerToggle");
  dom.timerReset = document.querySelector("#timerReset");
  dom.newRaidButton = document.querySelector("#newRaidButton");
  dom.lootList = document.querySelector("#lootList");
  dom.lootCounter = document.querySelector("#lootCounter");
  dom.lootReset = document.querySelector("#lootReset");
  dom.notesInput = document.querySelector("#notesInput");
  dom.notesState = document.querySelector("#notesState");
  dom.notesCount = document.querySelector("#notesCount");
  dom.eventPanel = document.querySelector("#raidEventPanel");
  dom.mapIntel = document.querySelector("#mapIntel");
  dom.copyPlan = document.querySelector("#copyPlanButton");
  dom.settingsButton = document.querySelector("#settingsButton");
  dom.settingsModal = document.querySelector("#settingsModal");
  dom.shortcutsModal = document.querySelector("#shortcutsModal");
  dom.toast = document.querySelector("#toast");
  dom.updateBanner = document.querySelector("#updateBanner");
  dom.intelSearch = document.querySelector("#itemSearch");
  dom.itemCount = document.querySelector("#itemCount");
  dom.itemResults = document.querySelector("#itemResults");
  dom.popularChips = document.querySelector("#popularChips");
  dom.itemDetail = document.querySelector("#itemDetail");
  dom.eventsView = document.querySelector("#view-events");
  dom.eventsBody = document.querySelector("#eventsBody");
  dom.eventsUpdated = document.querySelector("#eventsUpdated");
  dom.eventsRefresh = document.querySelector("#eventsRefresh");
  dom.settingsRefresh = document.querySelector("#settingsRefresh");
  dom.liveStatus = document.querySelector("#liveStatus");
  dom.hotkeyCapture = document.querySelector("#hotkeyCapture");
  dom.hotkeyReset = document.querySelector("#hotkeyReset");
  dom.clearData = document.querySelector("#clearData");
  dom.versionLabel = document.querySelector("#versionLabel");
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

function loadState() {
  const base = {
    ...DEFAULT_STATE,
    notes: {},
    routeDone: {},
    lootDone: {},
    timer: { ...DEFAULT_STATE.timer },
    intel: { ...DEFAULT_STATE.intel },
    hotkey: { ...DEFAULT_STATE.hotkey },
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    const merged = {
      ...base,
      ...saved,
      notes: { ...base.notes, ...(saved.notes || {}) },
      routeDone: { ...base.routeDone, ...(saved.routeDone || {}) },
      lootDone: { ...base.lootDone, ...(saved.lootDone || {}) },
      timer: { ...base.timer, ...(saved.timer || {}) },
      intel: { ...base.intel, ...(saved.intel || {}) },
      hotkey: { ...base.hotkey, ...(saved.hotkey || {}) },
    };
    if (!MAP_BY_ID.has(merged.mapId)) merged.mapId = "dam";
    if (!REGION_LABEL[merged.region]) merged.region = "europe";
    if (!["raid", "intel", "events"].includes(merged.tab)) merged.tab = "raid";
    if (!Number.isFinite(merged.timer.duration) || merged.timer.duration <= 0) merged.timer.duration = DEFAULT_DURATION;
    if (!Number.isFinite(merged.timer.remaining)) merged.timer.remaining = merged.timer.duration;
    if (merged.timer.running && !merged.timer.endsAt) merged.timer.running = false;
    for (const map of MAPS) {
      if (!Array.isArray(merged.routeDone[map.id])) merged.routeDone[map.id] = [];
      merged.routeDone[map.id] = merged.routeDone[map.id].filter((stepId) => map.route.some((step) => step.id === stepId));
    }
    return merged;
  } catch {
    return base;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    setNotesStatus("No se pudo guardar", true);
  }
}

function routeDone(mapId = state.mapId) {
  return state.routeDone[mapId] || [];
}

function routeFor(mapId = state.mapId) {
  return MAP_BY_ID.get(mapId)?.route || [];
}

function activeStep(mapId = state.mapId) {
  const done = new Set(routeDone(mapId));
  return routeFor(mapId).find((step) => !done.has(step.id)) || null;
}

function currentMap() {
  return MAP_BY_ID.get(state.mapId) || MAPS[0];
}

function currentEvents() {
  return data.events[state.region]?.events || [];
}

function currentEventsPayload() {
  return data.events[state.region] || null;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function fetchJson(path, options = {}) {
  const response = await fetch(path, { cache: "no-cache", ...options });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

async function detectLiveServer() {
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  if (!localHost) {
    data.liveServer = false;
  } else {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("no server");
      const payload = await response.json();
      data.liveServer = Boolean(payload?.ok);
    } catch {
      data.liveServer = false;
    }
  }
  if (dom.liveStatus) {
    dom.liveStatus.innerHTML = data.liveServer
      ? `<span class="status-dot is-live"></span> Servidor local: eventos y mercado en vivo`
      : `<span class="status-dot"></span> Modo estático: datos actualizados por GitHub Actions`;
  }
}

async function loadCoreData() {
  try {
    const [items, meta] = await Promise.all([fetchJson("data/items.json"), fetchJson("data/meta.json").catch(() => null)]);
    data.items = Array.isArray(items) ? items : [];
    data.itemsById = new Map(data.items.map((item) => [item.id, item]));
    data.meta = meta;
    dom.loadingText.textContent = "Cargando mapas y eventos…";
  } catch (error) {
    showLoadingError(error);
    throw error;
  }
}

async function loadRegionEvents(region, { force = false } = {}) {
  const cacheKey = region;
  const existing = data.events[cacheKey];
  if (!force && existing && Date.now() - existing.loadedAt < 4 * 60 * 1000) return existing;
  let payload = null;
  let live = false;
  if (data.liveServer) {
    try {
      const response = await fetch(`/api/events?region=${encodeURIComponent(region)}`, { cache: "no-store" });
      if (response.ok) {
        payload = await response.json();
        live = true;
      }
    } catch {
      payload = null;
    }
  }
  if (!payload) {
    try {
      payload = await fetchJson(`data/events/${region}.json`, { cache: "no-store" });
    } catch {
      payload = { region, events: [], fetchedAt: null };
    }
  }
  const events = normalizeEvents(payload);
  data.events[cacheKey] = {
    events,
    fetchedAt: payload.fetchedAt || null,
    loadedAt: Date.now(),
    live,
    raw: payload,
  };
  if (state.region === region) {
    const signature = eventStateSignature(events);
    if (signature !== eventSignature) {
      eventSignature = signature;
      if (state.tab === "events") renderEventsView();
      else renderEventMini();
    }
  }
  return data.events[cacheKey];
}

async function ensureMapsData() {
  if (data.mapsLoaded) return data.mapsData;
  if (mapDataPromise) return mapDataPromise;
  mapDataPromise = Promise.all(
    MAPS.map(async (map) => {
      const payload = await fetchJson(`data/maps/${map.id}.json`);
      data.mapsData[map.id] = payload;
      return payload;
    }),
  )
    .then(() => {
      data.mapsLoaded = true;
      return data.mapsData;
    })
    .catch((error) => {
      mapDataPromise = null;
      throw error;
    });
  return mapDataPromise;
}

async function loadVersionInfo() {
  let bundled = null;
  let remote = null;
  try {
    bundled = await fetchJson("version.json", { cache: "no-store" });
  } catch {
    bundled = null;
  }
  try {
    const response = await fetch(RAW_VERSION_URL, { cache: "no-store" });
    if (response.ok) remote = await response.json();
  } catch {
    remote = null;
  }
  data.version = bundled;
  if (bundled && dom.versionLabel) dom.versionLabel.textContent = `v${bundled.version} · ${bundled.released || ""}`;
  const remoteVersion = remote?.version;
  if (remoteVersion && compareVersions(remoteVersion, APP_VERSION) > 0) {
    dom.updateBanner.hidden = false;
    dom.updateBanner.innerHTML = `
      <span>${icon("download")} Nueva versión disponible: <strong>v${escape(remoteVersion)}</strong></span>
      <a class="button button-small" href="${REPO_URL}/releases/latest" target="_blank" rel="noopener">Actualizar</a>
      <button class="icon-button" data-dismiss-update aria-label="Cerrar aviso">${icon("close")}</button>`;
    dom.updateBanner.querySelector("[data-dismiss-update]")?.addEventListener("click", () => {
      dom.updateBanner.hidden = true;
    });
  }
}

function compareVersions(a, b) {
  const pa = String(a).split(".").map((part) => Number(part) || 0);
  const pb = String(b).split(".").map((part) => Number(part) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

async function refreshCurrentData() {
  showToast("Actualizando eventos…");
  if (data.liveServer) await detectLiveServer();
  await loadRegionEvents(state.region, { force: true });
  renderEventMini();
  if (state.tab === "events") renderEventsView();
  showToast("Eventos actualizados");
}

// ---------------------------------------------------------------------------
// Static events
// ---------------------------------------------------------------------------

function bindStaticEvents() {
  for (const button of dom.tabButtons) {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  }
  dom.regionSelect?.addEventListener("change", () => changeRegion(dom.regionSelect.value));
  dom.settingsRegion?.addEventListener("change", () => changeRegion(dom.settingsRegion.value));
  dom.mapList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-id]");
    if (!button) return;
    selectMap(button.dataset.mapId);
  });
  dom.routeList?.addEventListener("change", (event) => {
    const input = event.target.closest("input[type=checkbox]");
    if (!input) return;
    const step = input.closest("[data-step-id]")?.dataset.stepId;
    if (step) toggleRouteStep(step, input.checked);
  });
  dom.routeList?.addEventListener("click", (event) => {
    if (event.target.closest("input,label")) return;
    const step = event.target.closest("[data-step-id]")?.dataset.stepId;
    if (step) {
      const done = new Set(routeDone());
      toggleRouteStep(step, !done.has(step));
    }
  });
  dom.lootList?.addEventListener("change", (event) => {
    const input = event.target.closest("input[type=checkbox]");
    if (!input) return;
    toggleLoot(input.dataset.itemId, input.checked);
  });
  dom.lootList?.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-item]");
    if (open) {
      event.preventDefault();
      openItem(open.dataset.openItem);
    }
  });
  dom.mapIntel?.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-item]");
    if (open) {
      event.preventDefault();
      openItem(open.dataset.openItem);
    }
  });
  dom.hero?.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-item]");
    if (open) {
      event.preventDefault();
      openItem(open.dataset.openItem);
    }
    const goEvents = event.target.closest("[data-go-events]");
    if (goEvents) switchTab("events");
  });
  dom.eventPanel?.addEventListener("click", (event) => {
    if (event.target.closest("[data-go-events]")) switchTab("events");
    const item = event.target.closest("[data-open-item]");
    if (item) openItem(item.dataset.openItem);
  });
  dom.itemResults?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-item-id]");
    if (row) selectItem(row.dataset.itemId);
  });
  dom.popularChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-item-id]");
    if (button) selectItem(button.dataset.itemId);
  });
  dom.intelSearch?.addEventListener("input", () => {
    state.intel.query = dom.intelSearch.value;
    saveState();
    renderItemResults();
  });
  dom.settingsButton?.addEventListener("click", () => openModal("settings"));
  dom.copyPlan?.addEventListener("click", copyPlanToClipboard);
  dom.timerToggle?.addEventListener("click", toggleTimer);
  dom.timerReset?.addEventListener("click", resetTimer);
  dom.newRaidButton?.addEventListener("click", newRaid);
  dom.lootReset?.addEventListener("click", resetLoot);
  dom.notesInput?.addEventListener("input", onNotesInput);
  dom.eventsRefresh?.addEventListener("click", refreshCurrentData);
  dom.settingsRefresh?.addEventListener("click", refreshCurrentData);
  dom.hotkeyCapture?.addEventListener("click", startHotkeyCapture);
  dom.hotkeyReset?.addEventListener("click", resetHotkey);
  renderHotkeyCapture();
  dom.clearData?.addEventListener("click", clearLocalData);
  dom.retryButton?.addEventListener("click", () => location.reload());
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModals);
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModals();
    });
  });
  document.querySelector("[data-open-shortcuts]")?.addEventListener("click", () => openModal("shortcuts"));
  document.querySelectorAll("[data-go-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.goTab));
  });
  document.querySelector("#resetRouteButton")?.addEventListener("click", resetRoute);
  document.querySelector("#routePanel")?.addEventListener("click", (event) => {
    if (event.target.closest("[data-go-events]")) switchTab("events");
  });
  document.addEventListener("keydown", onGlobalKeydown);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateCountdowns();
      if (Date.now() - (data.events[state.region]?.loadedAt || 0) > 5 * 60 * 1000) {
        loadRegionEvents(state.region, { force: true }).then(() => {
          renderEventMini();
          if (state.tab === "events") renderEventsView();
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderAll() {
  renderTopbar();
  renderMapList();
  renderRaidView();
  renderEventsView();
  if (state.tab === "intel") renderIntelView();
  applyTabVisibility();
}

function renderTopbar() {
  for (const button of dom.tabButtons) {
    const active = button.dataset.tab === state.tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  }
  if (dom.regionSelect) dom.regionSelect.value = state.region;
  if (dom.settingsRegion) dom.settingsRegion.value = state.region;
  updateHotkeyLabels();
}

function applyTabVisibility() {
  for (const [tab, view] of Object.entries(dom.views)) {
    if (!view) continue;
    const active = tab === state.tab;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  }
  document.body.dataset.tab = state.tab;
  document.querySelector(".app-layout")?.classList.toggle("is-intel", state.tab === "intel");
  document.querySelector(".app-layout")?.classList.toggle("is-events", state.tab === "events");
}

function renderMapList() {
  if (!dom.mapList) return;
  dom.mapList.innerHTML = MAPS.map((map) => {
    const done = routeDone(map.id).length;
    const total = map.route.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const active = map.id === state.mapId;
    return `<button class="map-card ${active ? "is-active" : ""}" data-map-id="${map.id}" aria-current="${active ? "true" : "false"}">
      <span class="map-code">${map.code}</span>
      <span class="map-card-copy">
        <span class="map-card-top"><b>${map.name}</b><em class="risk-text risk-${map.risk}">${map.riskLabel}</em></span>
        <span class="map-card-sub">${map.unlock} · ${done}/${total} paradas</span>
        <span class="map-mini-meter"><i style="width:${pct}%"></i></span>
      </span>
      ${icon("chevron")}
    </button>`;
  }).join("");
}

function renderRaidView() {
  renderHero();
  renderRoute();
  renderTimer();
  renderLootPriorities();
  renderNotes();
  renderEventMini();
  renderMapIntel();
  updateUpcomingEventBadges();
}

function renderHero() {
  if (!dom.hero) return;
  const map = currentMap();
  const done = routeDone().length;
  const total = map.route.length;
  const targets = mapTargets(map.id);
  const targetDone = targets.filter((item) => state.lootDone[item.id]).length;
  const eventState = getSelectedMapEventState();
  const eventLine = eventState.active
    ? `<span class="event-live-dot"></span> ${escape(eventState.active.name)} activo`
    : eventState.next
      ? `Próximo: ${escape(eventState.next.name)} · ${formatCountdown(eventState.next.start - Date.now())}`
      : "Eventos sin datos";
  dom.hero.style.setProperty("--hero-image", `url("assets/maps/${map.id}.webp")`);
  dom.hero.innerHTML = `
    <span class="hero-watermark">${map.code}</span>
    <div class="hero-content">
      <div class="hero-kicker"><span class="hero-signal"></span> ZONA ACTIVA <span class="kicker-sep">/</span> ${map.duration}</div>
      <h1>${map.name}</h1>
      <p class="hero-intro">${map.intro}</p>
      <div class="hero-tags">
        <span class="risk-badge risk-${map.risk}"><i></i> Riesgo ${map.riskLabel}</span>
        <span class="hero-tag">Dificultad ${map.difficulty}/5</span>
        <span class="hero-tag">${map.unlock}</span>
        <span class="hero-tag hero-event-tag" data-go-events>${eventLine}</span>
      </div>
      <div class="hero-chips">
        <span class="hero-chip">${icon("crosshair")} ${map.focus.join(" · ")}</span>
        <span class="hero-chip">${icon("key")} <button class="inline-link" data-open-item="${map.keyItemId}">${map.keyItem}</button></span>
        <span class="hero-chip">${icon("spark")} ${map.eventHint}</span>
      </div>
    </div>
    <div class="hero-stats">
      <div class="hero-stat"><strong data-hero-route>${done}/${total}</strong><span>Paradas</span></div>
      <div class="hero-stat"><strong data-hero-loot>${targetDone}/${targets.length}</strong><span>Objetivos</span></div>
      <div class="hero-stat hero-stat-time"><strong data-hero-timer>${formatTimer(displayRemaining())}</strong><span>Timer</span></div>
    </div>`;
}

function renderRoute() {
  if (!dom.routeList) return;
  const map = currentMap();
  const done = new Set(routeDone());
  const active = activeStep();
  const total = map.route.length;
  const pct = total ? Math.round((done.size / total) * 100) : 0;
  dom.routeCounter.textContent = `${done.size} / ${total}`;
  dom.routeMeter.style.width = `${pct}%`;
  dom.routeList.innerHTML = map.route
    .map((step, index) => {
      const isDone = done.has(step.id);
      const isActive = active?.id === step.id && !isDone;
      return `<li class="route-step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}" data-step-id="${step.id}">
        <div class="route-marker"><span>${String(index + 1).padStart(2, "0")}</span></div>
        <div class="route-body">
          <div class="route-title-row">
            <h3>${escape(step.name)}</h3>
            <span class="tag tag-${step.tone}">${escape(step.tag)}</span>
            ${isActive ? `<span class="now-badge">AHORA</span>` : ""}
          </div>
          <p>${escape(step.note)}</p>
          <div class="route-meta"><span>${icon("clock")} ${escape(step.time)}</span><span>${icon("box")} ${escape(step.loot)}</span></div>
        </div>
        <label class="route-check" title="Marcar ${escape(step.name)}">
          <input type="checkbox" ${isDone ? "checked" : ""} aria-label="Marcar ${escape(step.name)} como saqueada">
          <span class="route-checkmark">${icon("check")}</span>
        </label>
      </li>`;
    })
    .join("");
  const hint = document.querySelector("[data-hotkey-hint]");
  if (hint) hint.textContent = `Marcar parada actual y avanzar (${state.hotkey.label})`;
  updateHeroStats();
}

function renderTimer() {
  if (!dom.timerPanel) return;
  const remaining = displayRemaining();
  const duration = state.timer.duration || DEFAULT_DURATION;
  const ratio = Math.max(0, Math.min(1, remaining / duration));
  const circumference = 2 * Math.PI * 76;
  dom.timerDisplay.textContent = formatTimer(remaining);
  dom.timerRing.style.strokeDasharray = `${circumference}`;
  dom.timerRing.style.strokeDashoffset = `${circumference * (1 - ratio)}`;
  const running = state.timer.running && remaining > 0;
  dom.timerPanel.classList.toggle("is-running", running);
  dom.timerPanel.classList.toggle("is-warning", remaining > 60 && remaining <= 300);
  dom.timerPanel.classList.toggle("is-critical", remaining <= 60 && remaining > 0);
  dom.timerPanel.classList.toggle("is-done", remaining <= 0);
  dom.timerStatus.textContent = remaining <= 0 ? "EXFIL" : running ? "EN CURSO" : remaining < duration ? "PAUSA" : "LISTO";
  dom.timerLabel.textContent = remaining <= 0 ? "Raid finalizada" : running ? "Tiempo restante" : "30 min de raid";
  dom.timerSub.textContent = remaining <= 0 ? "Busca extracción" : running ? "Reloj activo" : "Sin iniciar";
  dom.timerExfil.textContent = remaining <= 0 ? "Fuera de tiempo" : `Quedan ${formatCountdown(remaining * 1000, { short: true })}`;
  dom.timerToggle.innerHTML = running
    ? `${icon("pause")} Pausar`
    : remaining <= 0
      ? `${icon("reset")} Reiniciar`
      : remaining < duration
        ? `${icon("play")} Reanudar`
        : `${icon("play")} Iniciar`;
  dom.timerToggle.classList.toggle("is-pause", running);
  dom.newRaidButton.disabled = false;
  const heroTimer = document.querySelector("[data-hero-timer]");
  if (heroTimer) heroTimer.textContent = formatTimer(remaining);
  updateTitle();
}

function renderLootPriorities() {
  if (!dom.lootList) return;
  const map = currentMap();
  const targets = mapTargets(map.id);
  const done = targets.filter((item) => state.lootDone[item.id]).length;
  dom.lootCounter.textContent = `${done}/${targets.length}`;
  if (!targets.length) {
    dom.lootList.innerHTML = `<div class="empty-state small">${icon("box")} Cargando objetivos…</div>`;
    return;
  }
  dom.lootList.innerHTML = targets
    .map((item) => {
      const isDone = Boolean(state.lootDone[item.id]);
      return `<label class="loot-item rarity-${RARITY_CLASS[item.rarity] || "common"} ${isDone ? "is-done" : ""}">
        <input type="checkbox" data-item-id="${item.id}" ${isDone ? "checked" : ""}>
        <span class="loot-check">${icon("check")}</span>
        ${itemIcon(item, "small")}
        <span class="loot-main">
          <span class="loot-name-row"><b>${escape(item.name)}</b><em class="rarity rarity-${RARITY_CLASS[item.rarity] || "common"}">${RARITY_LABEL[item.rarity] || item.rarity}</em></span>
          <span class="loot-meta">${CATEGORY_LABEL[item.type] || item.type}${item.market > 0 ? ` · ${formatNumber(item.market)} semillas` : item.value != null ? ` · ${formatNumber(item.value)} coins` : ""}</span>
        </span>
        <span class="loot-value">${item.market > 0 ? `${formatCompact(item.market)}<small>semillas</small>` : item.value != null ? `${formatCompact(item.value)}<small>coins</small>` : `<small>—</small>`}</span>
      </label>`;
    })
    .join("");
  updateHeroStats();
}

function renderNotes() {
  if (!dom.notesInput) return;
  const notes = state.notes[state.mapId] || "";
  dom.notesInput.value = notes;
  dom.notesCount.textContent = `${notes.length} / 2000`;
  setNotesStatus("Guardado");
}

function renderMapIntel() {
  if (!dom.mapIntel) return;
  const map = currentMap();
  dom.mapIntel.innerHTML = `
    <div class="panel-heading compact">
      <div><span class="eyebrow">Intel del mapa</span><h2>Antes de entrar</h2></div>
      <span class="panel-side-note">${icon("compass")} ${map.duration}</span>
    </div>
    <div class="intel-grid">
      ${map.tips.map((tip, index) => `<article class="intel-card"><span class="intel-number">0${index + 1}</span><p>${escape(tip)}</p></article>`).join("")}
    </div>
    <div class="intel-bottom">
      <button class="intel-link" data-open-item="${map.keyItemId}">${icon("key")} <span>Llave clave</span><b>${escape(map.keyItem)}</b>${icon("chevron")}</button>
      <span class="intel-credit">Datos de mapas: MetaForge · ubicaciones orientativas</span>
    </div>`;
}

function renderEventMini() {
  if (!dom.eventPanel) return;
  const map = currentMap();
  const stateForMap = getSelectedMapEventState();
  const region = REGION_LABEL[state.region] || state.region;
  const payload = currentEventsPayload();
  const now = Date.now();
  const active = stateForMap.active;
  const next = stateForMap.next;
  const after = stateForMap.after;
  const upcoming = stateForMap.upcoming.slice(0, 3);
  const eventSignatureHtml = active
    ? `<div class="event-now is-active">
        <span class="event-now-icon">${icon("spark")}</span>
        <div class="event-now-copy"><span class="eyebrow">Activo ahora · ${eventTierLabel(active.info.tier)}</span><h3>${escape(active.name)} <em>${escape(active.info.es)}</em></h3><p>${escape(active.info.description)}</p></div>
        <div class="event-now-time"><b data-countdown-end="${active.end}">${formatCountdown(active.end - now)}</b><span>para terminar</span></div>
      </div>`
    : `<div class="event-now is-standard">
        <span class="event-now-icon">${icon("compass")}</span>
        <div class="event-now-copy"><span class="eyebrow">Ahora mismo</span><h3>Patrulla estándar</h3><p>Sin evento especial en ${map.name}. El loot base sigue disponible.</p></div>
        <div class="event-now-time">${next ? `<b data-countdown-start="${next.start}">${formatCountdown(next.start - now)}</b><span>al siguiente</span>` : `<b>—</b><span>sin datos</span>`}</div>
      </div>`;
  dom.eventPanel.innerHTML = `
    <div class="panel-heading compact">
      <div><span class="eyebrow">Condiciones · ${region}</span><h2>Eventos del mapa</h2></div>
      <button class="text-button" data-go-events>Calendario ${icon("chevron")}</button>
    </div>
    ${eventSignatureHtml}
    <div class="event-upcoming-list">
      ${upcoming
        .map(
          (event) => `<div class="event-upcoming-row">
            <span class="event-tier event-tier-${event.info.tier}">${eventTierLabel(event.info.tier)}</span>
            <span class="event-upcoming-name"><b>${escape(event.name)}</b><small>${formatTime(event.start)} – ${formatTime(event.end)}</small></span>
            <span class="event-upcoming-time"><b data-countdown-start="${event.start}">${formatCountdown(event.start - now)}</b><small>${active ? `tras ${escape(active.name)}` : "próximo"}</small></span>
          </div>`,
        )
        .join("") || `<div class="event-no-more">No hay más eventos programados para este mapa en la ventana actual.</div>`}
    </div>
    <div class="event-rotation-bar">
      <span>${icon("refresh")} Rotación cada 60 min</span>
      <span>${icon("timer")} Duración ~60 min</span>
      <span class="event-updated">${payload?.live ? "Live" : "Snapshot"} · ${payload?.fetchedAt ? formatRelative(payload.fetchedAt) : "sin datos"}</span>
    </div>
    ${eventStaleHtml()}`;
}

function renderEventsView() {
  if (!dom.eventsBody) return;
  const region = state.region;
  const payload = currentEventsPayload();
  const events = currentEvents();
  const now = Date.now();
  const allActive = activeEvents(events, now);
  const upcoming = upcomingEvents(events, now, 24);
  const selected = currentMap();
  const selectedState = getSelectedMapEventState();
  const mapRows = MAPS.map((map) => {
    const mapState = getMapEventState(events, map.eventName, now);
    return { map, state: mapState };
  });
  const activeCards = MAPS.map((map) => {
    const mapState = getMapEventState(events, map.eventName, now);
    return `<article class="event-map-card ${map.id === state.mapId ? "is-current-map" : ""} ${mapState.active ? "has-event" : ""}" data-event-map="${map.id}">
      <div class="event-map-card-head"><span class="map-code small">${map.code}</span><b>${map.name}</b>${mapState.active ? `<span class="event-live-pill">LIVE</span>` : ""}</div>
      ${mapState.active
        ? `<h4>${escape(mapState.active.name)}</h4><p>${escape(mapState.active.info.description)}</p><div class="event-map-card-time"><span data-countdown-end="${mapState.active.end}">${formatCountdown(mapState.active.end - now)}</span><small>restante</small></div>`
        : `<h4>Patrulla estándar</h4><p>${mapState.next ? `Próximo: ${escape(mapState.next.name)}` : "Sin próximo evento en la ventana."}</p><div class="event-map-card-time">${mapState.next ? `<span data-countdown-start="${mapState.next.start}">${formatCountdown(mapState.next.start - now)}</span><small>al siguiente</small>` : `<span>—</span><small>sin datos</small>`}</div>`}
    </article>`;
  }).join("");
  const upcomingRows = upcoming
    .slice(0, 16)
    .map(
      (event) => `<div class="event-agenda-row">
        <span class="event-agenda-map">${escape(MAP_BY_EVENT_NAME.get(event.mapName)?.code || event.mapName)}</span>
        <span class="event-agenda-name"><b>${escape(event.name)}</b><small>${escape(event.mapName)} · ${escape(event.info.es)}</small></span>
        <span class="event-agenda-time"><b data-countdown-start="${event.start}">${formatCountdown(event.start - now)}</b><small>${formatTime(event.start)} – ${formatTime(event.end)}</small></span>
      </div>`,
    )
    .join("");
  const selectedUpcoming = selectedState.upcoming.slice(0, 5);
  dom.eventsBody.innerHTML = `
    <div class="events-hero panel">
      <div class="events-hero-copy">
        <span class="eyebrow">Rotación global · ${REGION_LABEL[region] || region}</span>
        <h1>Calendario de eventos</h1>
        <p>Cada mapa tiene su propia rotación. Los eventos suelen empezar en punto, duran alrededor de una hora y las horas sin evento son <b>Patrulla estándar</b>.</p>
      </div>
      <div class="events-hero-stats">
        <div><strong>${allActive.length}</strong><span>activos ahora</span></div>
        <div><strong>${upcoming.length}</strong><span>próximos</span></div>
        <div><strong>60m</strong><span>intervalo base</span></div>
      </div>
      <div class="events-hero-meta">
        <span>${icon("globe")} ${REGION_LABEL[region] || region}</span>
        <span>${icon("refresh")} ${payload?.live ? "Datos en vivo" : "Actualizado por GitHub Actions"} ${payload?.fetchedAt ? `· ${formatRelative(payload.fetchedAt)}` : ""}</span>
        <button class="text-button" data-refresh-events>${icon("refresh")} Actualizar</button>
      </div>
    </div>
    ${eventStaleHtml()}
    <section class="panel events-current-panel">
      <div class="panel-heading compact"><div><span class="eyebrow">Ahora mismo</span><h2>Estado por mapa</h2></div><span class="panel-side-note">${icon("timer")} ${formatTime(now)} local</span></div>
      <div class="event-map-grid">${activeCards}</div>
    </section>
    <div class="events-two-col">
      <section class="panel">
        <div class="panel-heading compact"><div><span class="eyebrow">Tu mapa</span><h2>${selected.name}</h2></div><button class="text-button" data-go-tab="raid">Volver al plan ${icon("chevron")}</button></div>
        <div class="event-selected-current ${selectedState.active ? "is-active" : ""}">
          <span class="event-selected-icon">${selectedState.active ? icon("spark") : icon("compass")}</span>
          <div>
            <span class="eyebrow">${selectedState.active ? "Evento activo" : "Patrulla estándar"}</span>
            <h3>${selectedState.active ? escape(selectedState.active.name) : "Sin condición especial"}</h3>
            <p>${selectedState.active ? escape(selectedState.active.info.description) : "Aprovecha para hacer una ruta limpia o esperar al siguiente evento."}</p>
          </div>
          ${selectedState.active ? `<div class="event-selected-countdown"><b data-countdown-end="${selectedState.active.end}">${formatCountdown(selectedState.active.end - now)}</b><span>restante</span></div>` : selectedState.next ? `<div class="event-selected-countdown"><b data-countdown-start="${selectedState.next.start}">${formatCountdown(selectedState.next.start - now)}</b><span>al próximo</span></div>` : ""}
        </div>
        <div class="event-selected-stats">
          <div><span>Próximo</span><b>${selectedState.next ? escape(selectedState.next.name) : "—"}</b><small>${selectedState.next ? `${formatTime(selectedState.next.start)} · ${formatCountdown(selectedState.next.start - now)}` : "sin datos"}</small></div>
          <div><span>Después</span><b>${selectedState.after ? escape(selectedState.after.name) : "—"}</b><small>${selectedState.after ? `${formatTime(selectedState.after.start)} · ${formatCountdown(selectedState.after.start - now)}` : "sin datos"}</small></div>
          <div><span>Intervalo</span><b>${selectedState.interval ? formatCountdown(selectedState.interval) : "—"}</b><small>entre los dos próximos</small></div>
        </div>
        <div class="event-selected-upcoming">
          ${selectedUpcoming
            .map(
              (event) => `<div class="event-upcoming-row"><span class="event-tier event-tier-${event.info.tier}">${eventTierLabel(event.info.tier)}</span><span class="event-upcoming-name"><b>${escape(event.name)}</b><small>${formatTime(event.start)} – ${formatTime(event.end)}</small></span><span class="event-upcoming-time"><b data-countdown-start="${event.start}">${formatCountdown(event.start - now)}</b><small>empieza</small></span></div>`,
            )
            .join("") || `<div class="event-no-more">Sin próximos eventos en la ventana actual.</div>`}
        </div>
      </section>
      <section class="panel">
        <div class="panel-heading compact"><div><span class="eyebrow">Todos los mapas</span><h2>Próximos eventos</h2></div><span class="panel-side-note">${upcoming.length} en agenda</span></div>
        <div class="event-agenda">${upcomingRows || `<div class="empty-state small">No hay eventos próximos en los datos actuales.</div>`}</div>
      </section>
    </div>
    <section class="panel">
      <div class="panel-heading compact"><div><span class="eyebrow">Intervalos por mapa</span><h2>Rotación y tiempo entre eventos</h2></div><span class="panel-side-note">hora local</span></div>
      <div class="event-rotation-table">
        <div class="event-rotation-head"><span>Mapa</span><span>Ahora</span><span>Próximo</span><span>Empieza</span><span>Siguiente gap</span></div>
        ${mapRows
          .map(({ map, state: mapState }) => `<div class="event-rotation-row ${map.id === state.mapId ? "is-selected" : ""}">
            <span class="event-rotation-map"><b>${map.code}</b> ${map.name}</span>
            <span>${mapState.active ? `<em class="event-live-pill">${escape(mapState.active.name)}</em>` : `<em class="muted">Patrulla</em>`}</span>
            <span>${mapState.next ? escape(mapState.next.name) : "—"}</span>
            <span>${mapState.next ? `${formatTime(mapState.next.start)} · ${formatCountdown(mapState.next.start - now)}` : "—"}</span>
            <span>${mapState.interval ? formatCountdown(mapState.interval) : "—"}</span>
          </div>`)
          .join("")}
      </div>
    </section>
    <section class="panel events-guide-panel">
      <div class="panel-heading compact"><div><span class="eyebrow">Referencia</span><h2>Qué aporta cada evento</h2></div><span class="panel-side-note">resumen rápido</span></div>
      <div class="events-guide-grid">
        ${Object.entries(EVENT_INFO)
          .map(
            ([name, info]) => `<article class="event-guide-card"><span class="event-tier event-tier-${info.tier}">${eventTierLabel(info.tier)}</span><h3>${escape(name)}</h3><small>${escape(info.es)}</small><p>${escape(info.description)}</p></article>`,
          )
          .join("")}
      </div>
    </section>`;
  dom.eventsBody.querySelector("[data-refresh-events]")?.addEventListener("click", refreshCurrentData);
  dom.eventsBody.querySelectorAll("[data-go-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.goTab));
  });
  dom.eventsBody.querySelectorAll("[data-event-map]").forEach((card) => {
    card.addEventListener("click", () => {
      selectMap(card.dataset.eventMap);
      switchTab("raid");
    });
  });
  if (dom.eventsUpdated) dom.eventsUpdated.textContent = payload?.fetchedAt ? formatRelative(payload.fetchedAt) : "";
}

function renderIntelView() {
  renderTopbar();
  if (dom.intelSearch) dom.intelSearch.value = state.intel.query || "";
  renderPopularChips();
  renderItemResults();
  renderItemDetail();
  ensureMapsData()
    .then(() => {
      if (state.tab === "intel" && !heatmapView) renderItemDetail();
    })
    .catch(() => {
      if (dom.itemDetail) {
        const mount = dom.itemDetail.querySelector("#heatmapRoot");
        if (mount) mount.innerHTML = `<div class="empty-state small">No se pudieron cargar los mapas.</div>`;
      }
    });
}

function renderPopularChips() {
  if (!dom.popularChips) return;
  dom.popularChips.innerHTML = POPULAR_IDS.map((id) => {
    const item = data.itemsById.get(id);
    if (!item) return "";
    return `<button class="popular-chip" data-item-id="${id}">${escape(item.name)}</button>`;
  }).join("");
}

function renderItemResults() {
  if (!dom.itemResults) return;
  const query = normalizeText(state.intel.query || "").trim();
  let results = [];
  if (!query) {
    const curated = POPULAR_IDS.map((id) => data.itemsById.get(id)).filter(Boolean);
    const curatedIds = new Set(curated.map((item) => item.id));
    const rest = data.items
      .filter((item) => {
        if (curatedIds.has(item.id)) return false;
        if (item.rarity === "Amplified" || item.name.includes("Amplified")) return false;
        if (item.type === "Weapon" && item.name.includes("(")) return false;
        return true;
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0) || (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0));
    results = [...curated, ...rest].slice(0, 30);
  } else {
    results = data.items
      .map((item) => ({ item, score: searchScore(item, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || (b.item.value || 0) - (a.item.value || 0))
      .slice(0, 35)
      .map((entry) => entry.item);
  }
  if (dom.itemCount) dom.itemCount.textContent = query ? `${results.length} coincidencias` : `${results.length} destacados`;
  if (!results.length) {
    dom.itemResults.innerHTML = `<div class="empty-state small">${icon("search")} No hay objetos que coincidan. Prueba con el nombre en inglés o cambia la búsqueda.</div>`;
    return;
  }
  dom.itemResults.innerHTML = results
    .map((item) => {
      const active = item.id === state.intel.itemId;
      const market = item.market > 0 ? `${formatCompact(item.market)} <small>semillas</small>` : item.value != null ? `${formatCompact(item.value)} <small>coins</small>` : "";
      return `<button class="item-result ${active ? "is-active" : ""}" data-item-id="${item.id}">
        ${itemIcon(item, "tiny")}
        <span class="item-result-copy"><span class="item-result-name">${escape(item.name)}</span><span class="item-result-meta"><em class="rarity rarity-${RARITY_CLASS[item.rarity] || "common"}">${RARITY_LABEL[item.rarity] || item.rarity}</em> · ${CATEGORY_LABEL[item.type] || item.type}</span></span>
        <span class="item-result-value">${market}</span>
      </button>`;
    })
    .join("");
}

function renderItemDetail() {
  if (!dom.itemDetail) return;
  const item = data.itemsById.get(state.intel.itemId);
  if (!item) {
    dom.itemDetail.innerHTML = `<div class="empty-state">${icon("items")} Busca un objeto para ver rareza, valor, categoría y mapa de calor.</div>`;
    heatmapView = null;
    return;
  }
  heatmapView = null;
  const market = item.market;
  const marketText = market > 0 ? `${formatNumber(market)} <small>semillas</small>` : market === 0 ? `Sin trades <small>24 h</small>` : `Sin dato <small>mercado</small>`;
  const valuePerKg = item.value != null && item.weight ? item.value / item.weight : null;
  const mapNames = item.maps?.length ? item.maps.map((id) => MAP_BY_ID.get(id)?.name || id).join(", ") : "Cualquier mapa";
  const marketAt = item.marketAt ? formatRelative(item.marketAt) : null;
  const marketNote = market > 0 ? `MetaForge · ${marketAt || "dato comunitario"}` : market === 0 ? "Sin trades en 24 h" : "sin dato de mercado";
  dom.itemDetail.innerHTML = `
    <div class="item-detail-head">
      ${itemIcon(item, "large")}
      <div class="item-detail-title">
        <span class="eyebrow">${CATEGORY_LABEL[item.type] || item.type} · ${RARITY_LABEL[item.rarity] || item.rarity}</span>
        <h1>${escape(item.name)}</h1>
        <p>${escape(item.description || "Sin descripción disponible.")}</p>
        <div class="item-detail-tags">
          <span class="rarity rarity-${RARITY_CLASS[item.rarity] || "common"}">${RARITY_LABEL[item.rarity] || item.rarity}</span>
          <span class="item-tag">${escape(item.type)}</span>
          ${item.areas?.length ? `<span class="item-tag">${item.areas.map(escape).join(" · ")}</span>` : ""}
        </div>
      </div>
      <div class="item-detail-actions">
        <a class="button button-ghost button-small" href="https://metaforge.app/arc-raiders/database/item/${encodeURIComponent(item.id)}" target="_blank" rel="noopener">MetaForge ${icon("external")}</a>
        <button class="button button-ghost button-small" data-copy-item="${item.id}">${icon("copy")} Copiar</button>
      </div>
    </div>
    <div class="item-stat-grid">
      <div class="item-stat"><span>Comerciante</span><strong id="itemVendorValue">${item.value != null ? `${formatNumber(item.value)} <small>coins</small>` : "—"}</strong><small>venta en tienda</small></div>
      <div class="item-stat item-stat-market"><span>Mercado</span><strong id="itemMarketValue">${marketText}</strong><small id="itemMarketNote">${marketNote}</small></div>
      <div class="item-stat"><span>Valor / kg</span><strong>${valuePerKg != null ? `${formatNumber(Math.round(valuePerKg))} <small>c/kg</small>` : "—"}</strong><small>${item.weight != null ? `${item.weight} kg` : "peso desconocido"}</small></div>
      <div class="item-stat"><span>Stack</span><strong>${item.stack ?? "—"}</strong><small>unidades</small></div>
      <div class="item-stat item-stat-wide"><span>Zonas de loot</span><strong>${item.areas?.length ? item.areas.map(escape).join(" · ") : "Sin clasificar"}</strong><small>${mapNames}</small></div>
    </div>
    <div class="item-market-note">${icon("info")} <span>El mercado comunitario de MetaForge se negocia en <b>semillas</b>; el valor del comerciante son <b>coins</b> del juego. No hay una casa de subastas oficial. Los datos se actualizan periódicamente y pueden quedar desfasados.</span></div>
    <div class="heatmap-shell">
      <div class="heatmap-shell-head">
        <div><span class="eyebrow">Mapa de calor</span><h2>Dónde suele aparecer</h2><p>Contenedores compatibles con el tipo de loot y la zona. Haz zoom con la rueda o los botones y arrastra para mover.</p></div>
        <div class="heatmap-legend"><span class="legend-chip"><i class="heat-dot"></i> índice de aparición</span><span class="legend-chip">${icon("maximize")} zoom + arrastre</span></div>
      </div>
      <div id="heatmapRoot">${data.mapsLoaded ? "" : `<div class="hm-loading">${icon("layers")} Cargando mapas…</div>`}</div>
    </div>`;
  const copyButton = dom.itemDetail.querySelector("[data-copy-item]");
  if (copyButton) copyButton.addEventListener("click", () => copyItem(item));
  if (data.mapsLoaded) {
    mountHeatmap(item);
  } else {
    ensureMapsData()
      .then(() => {
        if (!heatmapView && state.tab === "intel" && state.intel.itemId === item.id) {
          const mount = dom.itemDetail.querySelector("#heatmapRoot");
          if (mount) mountHeatmap(item);
        }
      })
      .catch(() => {
        const mount = dom.itemDetail.querySelector("#heatmapRoot");
        if (mount) mount.innerHTML = `<div class="empty-state small">No se pudieron cargar los mapas.</div>`;
      });
  }
  if (data.liveServer && (item.market == null || !item.marketAt || Date.now() - item.marketAt > 6 * 60 * 60 * 1000)) {
    fetchMarketForItem(item);
  }
}

function mountHeatmap(item) {
  const mount = dom.itemDetail.querySelector("#heatmapRoot");
  if (!mount) return;
  heatmapView = new HeatmapView(mount, {
    maps: MAPS,
    mapsData: data.mapsData,
    initialMapId: state.intel.mapId || state.mapId,
    onMapSelected: (mapId) => {
      state.intel.mapId = mapId;
      saveState();
    },
  });
  heatmapView.setItem(item, { mapId: state.intel.mapId || state.mapId });
}

async function fetchMarketForItem(item) {
  if (!data.liveServer) return;
  try {
    const response = await fetch(`/api/market?item=${encodeURIComponent(item.id)}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload?.seeds == null) return;
    item.market = payload.seeds;
    item.marketAt = Date.now();
    const valueEl = document.querySelector("#itemMarketValue");
    const noteEl = document.querySelector("#itemMarketNote");
    if (valueEl) {
      valueEl.innerHTML =
        item.market > 0 ? `${formatNumber(item.market)} <small>semillas</small>` : `Sin trades <small>24 h</small>`;
    }
    if (noteEl) noteEl.textContent = "MetaForge · mercado en vivo";
    if (state.tab === "raid") renderLootPriorities();
  } catch {
    // Silent fallback: the static snapshot remains visible.
  }
}

// ---------------------------------------------------------------------------
// Events helpers
// ---------------------------------------------------------------------------

function eventStateSignature(events = currentEvents()) {
  const now = Date.now();
  const active = events
    .filter((event) => event.start <= now && event.end > now)
    .map((event) => event.id)
    .sort()
    .join(",");
  const next = events
    .filter((event) => event.start > now)
    .sort((a, b) => a.start - b.start)
    .slice(0, 10)
    .map((event) => event.id)
    .join(",");
  return `${active}||${next}`;
}

function getSelectedMapEventState() {
  const map = currentMap();
  return getMapEventState(currentEvents(), map.eventName, Date.now());
}

function eventStaleHtml() {
  const payload = currentEventsPayload();
  if (!payload?.fetchedAt) return "";
  const age = Date.now() - payload.fetchedAt;
  if (payload.live || age < 2 * 60 * 60 * 1000) return "";
  return `<div class="stale-note">${icon("info")} El calendario tiene más de 2 h. La versión web se actualiza cada hora; si estás en local, pulsa Actualizar o reinicia el servidor.</div>`;
}

function updateUpcomingEventBadges() {
  // The hero event tag is rendered with a static countdown; the global clock
  // replaces it via data attribute when available.
  const heroTag = dom.hero?.querySelector(".hero-event-tag");
  const event = getSelectedMapEventState();
  if (!heroTag) return;
  if (event.active) {
    heroTag.innerHTML = `<span class="event-live-dot"></span> ${escape(event.active.name)} activo`;
  } else if (event.next) {
    heroTag.innerHTML = `Próximo: ${escape(event.next.name)} · <span data-countdown-start="${event.next.start}">${formatCountdown(event.next.start - Date.now())}</span>`;
  }
}

// ---------------------------------------------------------------------------
// Navigation and map
// ---------------------------------------------------------------------------

function selectMap(mapId) {
  if (!MAP_BY_ID.has(mapId) || state.mapId === mapId) return;
  state.mapId = mapId;
  state.intel.mapId = mapId;
  saveState();
  renderMapList();
  renderRaidView();
  if (state.tab === "intel") {
    heatmapView?.setMap(mapId);
  }
  if (window.innerWidth < 900) {
    dom.hero?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function changeRegion(region) {
  if (!REGION_LABEL[region]) return;
  state.region = region;
  saveState();
  if (dom.regionSelect) dom.regionSelect.value = region;
  if (dom.settingsRegion) dom.settingsRegion.value = region;
  renderEventMini();
  if (state.tab === "events") renderEventsView();
  loadRegionEvents(region, { force: true }).then(() => {
    renderEventMini();
    if (state.tab === "events") renderEventsView();
  });
}

function switchTab(tab) {
  if (!["raid", "intel", "events"].includes(tab)) return;
  state.tab = tab;
  saveState();
  renderTopbar();
  applyTabVisibility();
  history.replaceState(null, "", `#${tab}`);
  if (tab === "intel") {
    renderIntelView();
  } else if (tab === "events") {
    renderEventsView();
  } else {
    renderRaidView();
  }
  updateTitle();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function restoreTabFromHash() {
  const tab = location.hash.replace("#", "");
  if (["raid", "intel", "events"].includes(tab)) {
    switchTab(tab);
  } else {
    applyTabVisibility();
  }
}

// ---------------------------------------------------------------------------
// Route & loot
// ---------------------------------------------------------------------------

function toggleRouteStep(stepId, checked) {
  const mapId = state.mapId;
  const map = MAP_BY_ID.get(mapId);
  if (!map?.route.some((step) => step.id === stepId)) return;
  const set = new Set(routeDone(mapId));
  if (checked) set.add(stepId);
  else set.delete(stepId);
  state.routeDone[mapId] = [...set];
  saveState();
  renderRoute();
  renderMapList();
  renderHero();
  if (checked) {
    const step = map.route.find((entry) => entry.id === stepId);
    if (set.size === map.route.length) {
      showToast(`Ruta completada en ${map.name}. Ahora asegura la extracción.`, "success");
    } else {
      showToast(`${step.name} marcada.`);
    }
  }
}

function markActiveStep() {
  if (state.tab !== "raid") {
    switchTab("raid");
    setTimeout(markActiveStep, 180);
    return;
  }
  const step = activeStep();
  if (!step) {
    showToast("Ruta completada. Reinicia la ruta para otra raid.");
    return;
  }
  toggleRouteStep(step.id, true);
}

function resetRoute() {
  const map = currentMap();
  if (!routeDone().length) return;
  if (!window.confirm(`¿Reiniciar las ${routeDone().length} paradas marcadas en ${map.name}?`)) return;
  state.routeDone[state.mapId] = [];
  saveState();
  renderRoute();
  renderMapList();
  renderHero();
  showToast("Ruta reiniciada.");
}

function toggleLoot(itemId, checked) {
  if (!itemId) return;
  if (checked) state.lootDone[itemId] = true;
  else delete state.lootDone[itemId];
  saveState();
  const row = dom.lootList?.querySelector(`input[data-item-id="${CSS.escape(itemId)}"]`)?.closest(".loot-item");
  row?.classList.toggle("is-done", checked);
  updateLootCounters();
  renderHero();
}

function resetLoot() {
  const count = Object.keys(state.lootDone).length;
  if (!count) return;
  if (!window.confirm(`¿Desmarcar los ${count} objetivos de loot?`)) return;
  state.lootDone = {};
  saveState();
  renderLootPriorities();
  renderHero();
  showToast("Objetivos reiniciados.");
}

function updateLootCounters() {
  const targets = mapTargets(state.mapId);
  const done = targets.filter((item) => state.lootDone[item.id]).length;
  if (dom.lootCounter) dom.lootCounter.textContent = `${done}/${targets.length}`;
  updateHeroStats();
}

function updateHeroStats() {
  const map = currentMap();
  const targetDone = mapTargets(map.id).filter((item) => state.lootDone[item.id]).length;
  const heroRoute = document.querySelector("[data-hero-route]");
  const heroLoot = document.querySelector("[data-hero-loot]");
  if (heroRoute) heroRoute.textContent = `${routeDone().length}/${map.route.length}`;
  if (heroLoot) heroLoot.textContent = `${targetDone}/${mapTargets(map.id).length}`;
  const heroTimer = document.querySelector("[data-hero-timer]");
  if (heroTimer) heroTimer.textContent = formatTimer(displayRemaining());
}

function mapTargets(mapId) {
  const map = MAP_BY_ID.get(mapId);
  if (!map) return [];
  const selected = [];
  const seen = new Set();
  for (const id of map.targetIds) {
    const item = data.itemsById.get(id);
    if (item && !seen.has(id)) {
      selected.push(item);
      seen.add(id);
    }
  }
  const fallback = data.items
    .filter((item) => !seen.has(item.id) && (!item.maps?.length || item.maps.includes(mapId)))
    .sort((a, b) => (b.value || 0) - (a.value || 0) || (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0));
  for (const item of fallback) {
    if (selected.length >= 8) break;
    selected.push(item);
    seen.add(item.id);
  }
  return selected.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

function onNotesInput() {
  const value = dom.notesInput.value.slice(0, 2000);
  state.notes[state.mapId] = value;
  dom.notesCount.textContent = `${value.length} / 2000`;
  setNotesStatus("Guardando…");
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(() => {
    saveState();
    setNotesStatus("Guardado");
  }, 350);
}

function setNotesStatus(text, isError = false) {
  if (!dom.notesState) return;
  dom.notesState.textContent = text;
  dom.notesState.classList.toggle("is-error", isError);
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

function displayRemaining() {
  if (!state.timer.running) return Math.max(0, state.timer.remaining);
  return Math.max(0, Math.ceil((state.timer.endsAt - Date.now()) / 1000));
}

function initTimer() {
  if (state.timer.running) {
    if (!state.timer.endsAt || state.timer.endsAt <= Date.now()) {
      state.timer.running = false;
      state.timer.remaining = 0;
      state.timer.endsAt = null;
      saveState();
    } else {
      startTimerLoop();
    }
  }
  renderTimer();
}

function startTimerLoop() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!state.timer.running) return;
    const remaining = displayRemaining();
    if (remaining <= 0) {
      state.timer.running = false;
      state.timer.remaining = 0;
      state.timer.endsAt = null;
      saveState();
      renderTimer();
      showToast("Tiempo de raid agotado. Busca extracción.", "warning");
      return;
    }
    renderTimer();
  }, 500);
}

function toggleTimer() {
  if (state.timer.running) {
    state.timer.remaining = displayRemaining();
    state.timer.running = false;
    state.timer.endsAt = null;
    saveState();
    clearInterval(timerInterval);
    renderTimer();
    showToast("Timer en pausa.");
    return;
  }
  if (state.timer.remaining <= 0) {
    state.timer.remaining = state.timer.duration;
  }
  state.timer.running = true;
  state.timer.endsAt = Date.now() + state.timer.remaining * 1000;
  saveState();
  startTimerLoop();
  renderTimer();
  showToast("Raid iniciada. ¡A por el loot!");
}

function resetTimer() {
  state.timer.running = false;
  state.timer.remaining = state.timer.duration;
  state.timer.endsAt = null;
  clearInterval(timerInterval);
  saveState();
  renderTimer();
  showToast("Timer reiniciado a 30:00.");
}

function newRaid() {
  if (!window.confirm("Esto reinicia el timer, la ruta de este mapa y todos los objetivos marcados. ¿Continuar?")) return;
  state.timer.running = false;
  state.timer.remaining = state.timer.duration;
  state.timer.endsAt = null;
  state.routeDone[state.mapId] = [];
  state.lootDone = {};
  saveState();
  clearInterval(timerInterval);
  renderRaidView();
  renderMapList();
  showToast("Nueva raid preparada. Pulsa Iniciar cuando entres.");
}

function formatTimer(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function updateTitle() {
  const map = currentMap();
  if (state.timer.running) {
    document.title = `${formatTimer(displayRemaining())} · ${map.code} · RaidMate`;
  } else if (state.tab === "intel") {
    document.title = "Objetos · RaidMate";
  } else if (state.tab === "events") {
    document.title = "Eventos · RaidMate";
  } else {
    document.title = "RaidMate · Compañero de loot para ARC Raiders";
  }
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function copyPlanToClipboard() {
  const map = currentMap();
  const done = new Set(routeDone());
  const targets = mapTargets(map.id);
  const event = getSelectedMapEventState();
  const lines = [
    "RAIDMATE — Plan de raid",
    `Mapa: ${map.name} (${map.difficulty}/5 · riesgo ${map.riskLabel})`,
    `Región: ${REGION_LABEL[state.region] || state.region}`,
    event.active ? `Evento: ${event.active.name} activo` : event.next ? `Próximo evento: ${event.next.name} (${formatCountdown(event.next.start - Date.now())})` : "Evento: sin datos",
    "",
    "RUTA:",
    ...map.route.map((step) => `${done.has(step.id) ? "[x]" : "[ ]"} ${step.name} — ${step.loot}`),
    "",
    "OBJETIVOS:",
    ...targets.map((item) => `${state.lootDone[item.id] ? "[x]" : "[ ]"} ${item.name}${item.market > 0 ? ` · ${item.market} semillas` : item.value != null ? ` · ${item.value} coins` : ""}`),
    "",
    `Timer: ${formatTimer(displayRemaining())}`,
    "Generado con RaidMate · no interactúa con el juego",
  ];
  const ok = await copyText(lines.join("\n"));
  showToast(ok ? "Plan copiado al portapapeles." : "No se pudo copiar el plan.", ok ? "success" : "error");
}

async function copyItem(item) {
  const text = `${item.name}\nRareza: ${RARITY_LABEL[item.rarity] || item.rarity}\nCategoría: ${CATEGORY_LABEL[item.type] || item.type}\nComerciante: ${item.value ?? "—"} coins\nMercado: ${item.market > 0 ? `${item.market} semillas` : "sin trades"}\nZonas: ${item.areas?.join(", ") || "—"}\n${item.description || ""}`;
  const ok = await copyText(text);
  showToast(ok ? "Objeto copiado." : "No se pudo copiar.", ok ? "success" : "error");
}

// ---------------------------------------------------------------------------
// Modals and settings
// ---------------------------------------------------------------------------

function openModal(name) {
  previousFocus = document.activeElement;
  const modal = name === "settings" ? dom.settingsModal : dom.shortcutsModal;
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  if (name === "settings") renderHotkeyCapture();
  requestAnimationFrame(() => modal.querySelector(".modal")?.classList.add("is-open"));
  const focusTarget = modal.querySelector("[data-close-modal], button, input");
  focusTarget?.focus();
}

function closeModals() {
  for (const modal of [dom.settingsModal, dom.shortcutsModal]) {
    if (!modal || modal.hidden) continue;
    modal.hidden = true;
    modal.querySelector(".modal")?.classList.remove("is-open");
  }
  document.body.classList.remove("modal-open");
  captureHotkey = false;
  renderHotkeyCapture();
  previousFocus?.focus?.();
}

function startHotkeyCapture() {
  captureHotkey = true;
  renderHotkeyCapture();
  dom.hotkeyCapture.focus();
}

function renderHotkeyCapture() {
  if (!dom.hotkeyCapture) return;
  dom.hotkeyCapture.classList.toggle("is-capturing", captureHotkey);
  dom.hotkeyCapture.querySelector("strong").textContent = captureHotkey ? "Pulsa una tecla…" : state.hotkey.label;
  dom.hotkeyCapture.querySelector("span").textContent = captureHotkey ? "Esc para cancelar" : "Haz clic y pulsa la tecla que quieras usar";
}

function resetHotkey() {
  state.hotkey = { code: "KeyH", key: "h", label: "H" };
  saveState();
  renderHotkeyCapture();
  updateHotkeyLabels();
  showToast("Hotkey restablecida a H.");
}

function updateHotkeyLabels() {
  document.querySelectorAll("[data-hotkey-label]").forEach((element) => {
    element.textContent = state.hotkey.label;
  });
  const hint = document.querySelector("[data-hotkey-hint]");
  if (hint) hint.textContent = `Marcar parada actual y avanzar (${state.hotkey.label})`;
}

function captureHotkeyKey(event) {
  if (!captureHotkey) return false;
  event.preventDefault();
  event.stopPropagation();
  if (event.key === "Escape") {
    captureHotkey = false;
    renderHotkeyCapture();
    return true;
  }
  if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(event.key)) {
    showToast("Esa tecla está reservada. Prueba otra.", "warning");
    return true;
  }
  const label = hotkeyLabel(event);
  state.hotkey = { code: event.code, key: event.key, label };
  captureHotkey = false;
  saveState();
  renderHotkeyCapture();
  updateHotkeyLabels();
  showToast(`Hotkey configurada: ${label}.`);
  return true;
}

function hotkeyLabel(event) {
  if (event.key === " ") return "Espacio";
  if (event.key === "ArrowUp") return "↑";
  if (event.key === "ArrowDown") return "↓";
  if (event.key === "ArrowLeft") return "←";
  if (event.key === "ArrowRight") return "→";
  if (event.key === "Escape") return "Esc";
  if (event.key === "PageUp") return "PgUp";
  if (event.key === "PageDown") return "PgDn";
  if (event.key.length === 1) return event.key.toUpperCase();
  return event.key;
}

async function clearLocalData() {
  if (!window.confirm("¿Borrar ruta, notas, timer, hotkey y objetivos guardados en este navegador?")) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  } catch {
    showToast("No se pudo borrar el progreso.", "error");
  }
}

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

function onGlobalKeydown(event) {
  if (captureHotkeyKey(event)) return;
  if (event.key === "Escape") {
    if (!dom.settingsModal?.hidden || !dom.shortcutsModal?.hidden) {
      closeModals();
      event.preventDefault();
      return;
    }
  }
  if (!dom.settingsModal?.hidden || !dom.shortcutsModal?.hidden) return;
  const target = event.target;
  const isTyping =
    target instanceof HTMLElement &&
    (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
  if (isTyping) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.repeat) return;

  if (matchesHotkey(event)) {
    event.preventDefault();
    markActiveStep();
    return;
  }
  if (event.key === "/") {
    event.preventDefault();
    switchTab("intel");
    setTimeout(() => dom.intelSearch?.focus(), 60);
    return;
  }
  if (event.key === "?") {
    event.preventDefault();
    openModal("shortcuts");
    return;
  }
  if (event.key === " " && state.tab === "raid") {
    event.preventDefault();
    toggleTimer();
    return;
  }
  if (/^[1-7]$/.test(event.key) && state.tab === "raid") {
    event.preventDefault();
    const map = MAPS[Number(event.key) - 1];
    if (map) selectMap(map.id);
  }
}

function matchesHotkey(event) {
  if (!state.hotkey) return false;
  if (state.hotkey.code && event.code) return event.code === state.hotkey.code;
  return event.key.toLowerCase() === String(state.hotkey.key || "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

function startUiClock() {
  clearInterval(uiInterval);
  uiInterval = setInterval(() => {
    updateCountdowns();
    if (state.tab === "raid") {
      const heroTimer = document.querySelector("[data-hero-timer]");
      if (heroTimer) heroTimer.textContent = formatTimer(displayRemaining());
    }
    const signature = eventStateSignature(currentEvents());
    if (signature && signature !== eventSignature) {
      eventSignature = signature;
      renderEventMini();
      if (state.tab === "events") renderEventsView();
    }
  }, 1000);
  clearInterval(eventsRefreshInterval);
  eventsRefreshInterval = setInterval(() => {
    if (document.hidden) return;
    loadRegionEvents(state.region, { force: true })
      .then(() => {
        renderEventMini();
        if (state.tab === "events") renderEventsView();
      })
      .catch(() => {});
  }, 5 * 60 * 1000);
}

function updateCountdowns() {
  const now = Date.now();
  document.querySelectorAll("[data-countdown-start]").forEach((el) => {
    const start = Number(el.dataset.countdownStart);
    if (!Number.isFinite(start)) return;
    el.textContent = formatCountdown(start - now);
  });
  document.querySelectorAll("[data-countdown-end]").forEach((el) => {
    const end = Number(el.dataset.countdownEnd);
    if (!Number.isFinite(end)) return;
    el.textContent = formatCountdown(end - now);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Number(value));
}

function formatCompact(value) {
  if (value == null) return "—";
  const number = Number(value);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  return String(number);
}

function formatRelative(ms) {
  if (!ms) return "sin fecha";
  const diff = Date.now() - Number(ms);
  if (diff < 60 * 1000) return "hace unos segundos";
  if (diff < 60 * 60 * 1000) return `hace ${Math.floor(diff / 60000)} min`;
  if (diff < 24 * 60 * 60 * 1000) return `hace ${Math.floor(diff / 3600000)} h`;
  return new Date(Number(ms)).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function searchScore(item, query) {
  const name = normalizeText(item.name);
  const type = normalizeText(item.type);
  const category = normalizeText(CATEGORY_LABEL[item.type] || item.type);
  const rarity = normalizeText(item.rarity);
  if (name === query) return 200;
  if (name.startsWith(query)) return 150;
  if (name.includes(query)) return 100;
  if (type.includes(query) || category.includes(query)) return 45;
  if (rarity.includes(query)) return 30;
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((word) => name.includes(word))) return 70;
  return 0;
}

function itemIcon(item, size = "medium") {
  const initials = item.name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return `<span class="item-icon item-icon-${size}"><span class="item-icon-fallback">${escape(initials)}</span>${item.icon ? `<img src="${escape(item.icon)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}</span>`;
}

function selectItem(itemId) {
  if (!data.itemsById.has(itemId)) return;
  state.intel.itemId = itemId;
  state.intel.mapId = state.intel.mapId || state.mapId;
  saveState();
  renderItemResults();
  renderItemDetail();
  if (window.innerWidth < 900) {
    dom.itemDetail?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function openItem(itemId) {
  if (!data.itemsById.has(itemId)) return;
  state.intel.itemId = itemId;
  state.intel.query = "";
  saveState();
  switchTab("intel");
  if (dom.intelSearch) dom.intelSearch.value = "";
}

function showToast(message, type = "") {
  if (!dom.toast) return;
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.className = `toast is-visible ${type ? `is-${type}` : ""}`;
  toastTimer = setTimeout(() => {
    dom.toast.className = "toast";
  }, 3200);
}

function hideLoading() {
  if (!dom.loading) return;
  dom.loading.classList.add("is-hidden");
  setTimeout(() => {
    dom.loading.hidden = true;
  }, 450);
}

function showLoadingError(error) {
  if (!dom.loadingError) return;
  dom.loadingError.hidden = false;
  dom.loadingError.textContent = `No se pudieron cargar los datos (${error.message}). Abre la app con start.bat o desde GitHub Pages.`;
  if (dom.retryButton) dom.retryButton.hidden = false;
  if (dom.loading) dom.loading.classList.add("has-error");
}

function escape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
