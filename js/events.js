export const EVENT_INFO = {
  "Night Raid": {
    tier: "major",
    es: "Incursión nocturna",
    description: "Oscuridad, más ARC y mejor botín. Lleva linterna y cuidado con las extracciones.",
  },
  "ARC Frigate": {
    tier: "major",
    es: "Fragata ARC",
    description: "Una fragata ARC sobre el mapa. Endgame vertical con botín de alto valor.",
  },
  "Electromagnetic Storm": {
    tier: "major",
    es: "Tormenta electromagnética",
    description: "Rayos que hacen daño, menos extracciones y loot de mayor valor.",
  },
  "Hurricane": {
    tier: "major",
    es: "Huracán",
    description: "Viento y lluvia que reducen visibilidad y enmascaran el sonido.",
  },
  "Close Scrutiny": {
    tier: "major",
    es: "Escrutinio cercano",
    description: "Más drones de vigilancia y refuerzos ARC. Assessors con matrices y planos.",
  },
  "Cold Snap": {
    tier: "major",
    es: "Ola de frío",
    description: "Frío extremo. Busca refugio y aprovecha los recursos de invierno.",
  },
  "Hidden Bunker": {
    tier: "major",
    es: "Búnker oculto",
    description: "Activa antenas y abre el búnker del Spaceport. Mucho PvP en los cuellos de botella.",
  },
  "Locked Gate": {
    tier: "major",
    es: "Puerta bloqueada",
    description: "Consigue tarjetas de seguridad en Blue Gate para abrir la puerta y saquearla.",
  },
  "Matriarch": {
    tier: "minor",
    es: "Matriarca",
    description: "Jefa ARC pesada. Necesita munición pesada, explosivos y coordinación.",
  },
  "Harvester": {
    tier: "minor",
    es: "Cosechadora",
    description: "Estructura ARC con una Reina. Ciclos de fuego y botín legendario en el interior.",
  },
  "Prospecting Probes": {
    tier: "minor",
    es: "Sondas de prospección",
    description: "Sondas ARC que caen en oleadas. Buenos Motion Cores y Circuitry.",
  },
  "Uncovered Caches": {
    tier: "minor",
    es: "Alijos al descubierto",
    description: "Alijos enterrados que explotan si tardas. Revísalos rápido.",
  },
  "Bird City": {
    tier: "minor",
    es: "Ciudad de pájaros",
    description: "Densidad extrema de ARC. Mucho riesgo y mucho loot.",
  },
  "Lush Blooms": {
    tier: "minor",
    es: "Floración",
    description: "Más naturaleza y cestas de comida. Ideal para Scrappy.",
  },
  "Launch Tower Loot": {
    tier: "minor",
    es: "Botín de la torre de lanzamiento",
    description: "Activa generadores y sube a las torres del Spaceport para cajas de alto valor.",
  },
  "Beachcombing": {
    tier: "minor",
    es: "Peinando la playa",
    description: "Usa el Dockmaster's Detector en Riven Tides para desenterrar alijos.",
  },
  "Redirection": {
    tier: "minor",
    es: "Redirección",
    description: "Desvía la carga de la Cosechadora en Pendola Pass. Atrae ARC y raiders.",
  },
  "Husk Graveyard": {
    tier: "minor",
    es: "Cementerio de cascos",
    description: "Cascos ARC por el mapa. Materiales valiosos y ruido que atrae compañía.",
  },
};

export const EVENT_ORDER = Object.keys(EVENT_INFO);

export function normalizeEvents(payload) {
  const source = Array.isArray(payload?.events) ? payload.events : Array.isArray(payload?.data) ? payload.data : [];
  return source
    .map((entry, index) => {
      const isTuple = Array.isArray(entry);
      const name = isTuple ? entry[0] : entry?.name;
      const mapName = isTuple ? entry[1] : entry?.map;
      const start = isTuple ? entry[2] : entry?.startTime;
      const end = isTuple ? entry[3] : entry?.endTime;
      return {
        id: `${name}-${mapName}-${start}-${index}`,
        name,
        mapName,
        start: Number(start),
        end: Number(end),
        info: EVENT_INFO[name] || {
          tier: "minor",
          es: name,
          description: "Condición especial del mapa.",
        },
      };
    })
    .filter((event) => Number.isFinite(event.start) && Number.isFinite(event.end) && event.end > event.start)
    .sort((a, b) => a.start - b.start);
}

export function activeEvents(events, now = Date.now()) {
  return events.filter((event) => event.start <= now && event.end > now);
}

export function upcomingEvents(events, now = Date.now(), limit = 50) {
  return events.filter((event) => event.start > now).sort((a, b) => a.start - b.start).slice(0, limit);
}

export function eventsForMap(events, mapName) {
  return events.filter((event) => event.mapName === mapName);
}

export function getMapEventState(events, mapName, now = Date.now()) {
  const mapEvents = eventsForMap(events, mapName);
  const active = mapEvents.find((event) => event.start <= now && event.end > now) || null;
  const upcoming = mapEvents.filter((event) => event.start > now).sort((a, b) => a.start - b.start);
  const next = upcoming[0] || null;
  const after = upcoming[1] || null;
  const previous = mapEvents.filter((event) => event.end <= now).sort((a, b) => b.end - a.end)[0] || null;
  const gapToNext = next ? Math.max(0, next.start - (active ? active.end : now)) : null;
  const interval = next && after ? after.start - next.start : null;
  return {
    active,
    next,
    after,
    previous,
    upcoming,
    gapToNext,
    interval,
    mapEvents,
  };
}

export function formatCountdown(ms, { short = false } = {}) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return short ? `${minutes}m` : `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

export function formatTime(ms, locale = "es-ES") {
  if (!ms) return "—";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function formatDateTime(ms, locale = "es-ES") {
  if (!ms) return "—";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function countdownLabel(start, end, now = Date.now()) {
  if (start <= now && end > now) return `Termina en ${formatCountdown(end - now)}`;
  if (start > now) return `Empieza en ${formatCountdown(start - now)}`;
  return "Finalizado";
}

export function eventStateLabel(start, end, now = Date.now()) {
  if (start <= now && end > now) return "ACTIVO";
  if (start > now) return "PRÓXIMO";
  return "FINALIZADO";
}

export function eventTierLabel(tier) {
  return tier === "major" ? "Mayor" : "Menor";
}

export function eventTypeInitials(name) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
