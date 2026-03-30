(function() {
  'use strict';

  const LICENSE_URL = 'https://raw.githubusercontent.com/Awq1337/Bot/main/license.json';
  const NICK_SELECTOR = '.name a';
  const SECRET_KEY = '***';
  const LOG_WEBHOOK_URL = '***';
 
  window.botWlaczony = false;
  window.farmWlaczony = false;
  window.silkaWlaczona = false;
  window.koszaryWlaczony = false;
  window.przestepstwaWlaczony = false;

  let aktualniePracuje = false;
  let runUntilTs = 0;
  let autoRefreshTimer = null;
  let autoRefreshPoller = null;
  let currentTargetIndex = 0;
 
  const WORKER = "***";
  let KS_enabled = false;
  let KS_reason = "";
 
  const DEFAULTS = { energiaMin: 27, odwagaMin: 25, lvlMax: 30, victimsType: "not-active-gang", delayMs: 1500, runtimeHours: 0, useDiax: false, farmHops: 150, farmBarley: 300, farmShipMask: 0, farmPlaneMask: 0, farmCheckMines:  false, farmCheckFields: false, statStrength: true, statSpeed: true, statDefense: true, prioStrength: 1, prioSpeed: 2, prioDefense: 3, gymEnergyMin: 50, gymAwakeMin: 150, barracksEnergiaMin: 30, barracksAwakeMin: 150, prioGuard: 1, prioFighters: 2, Guards: true, Fighters: true, przestepstwaMinOdwaga: 20, przestepstwaTyp: "i1", autoRefreshEnabled: false, autoRefreshTime: 10, autoCollectLaundry: false, autoCheckJobMarket: false, attackBlacklist: "", attackWhitelist: "", botAction: "attack", notificationsEnabled: true,};
  let PROGI = { ...DEFAULTS };

  const PRZESTEPSTWA_MAPA = {
    "i1": "Zgasić latarnię",
    "i2": "Kremowy łup",
    "i3": "Leśna przekąska",
    "i4": "Obrzydliwy gwizd",
    "i5": "Strzelanie do mew",
    "i6": "Trofejowy strzał",
    "i7": "Kradzież wózka",
    "i8": "Tarasowy skok na torebkę",
    "i9": "Plecak zniknął",
    "i10": "Zrzucić rowerzystę",
    "i11": "Zasadzka na deskę",
    "i12": "Balonowa kradzież",
    "i13": "Porwanie psa",
    "i14": "Rozciąć namiot",
    "i15": "Portfel dżentelmena",
    "i16": "Okradźć rowerzystę",
    "i17": "Niespodziewany sierpowy",
    "i18": "Skok na aktówkę",
    "i19": "Kradzież dziecięcego roweru",
    "i20": "Jeleń do zamrażarki"
  };
 
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  const wait  = (ms = 0) => sleep(ms + Math.max(0, Number(PROGI?.delayMs || 0)));
 
  async function gmGet(key, def) {
    try { const v = await GM_getValue(key); return (v === undefined ? def : v); }
    catch { return def; }
  }
  async function gmSet(key, val) {
    try { await GM_setValue(key, val); } catch {}
  }
 
  async function fetchConfig() {
    const r = await fetch(`${WORKER}/config`, { cache: "no-store" });
    if (!r.ok) throw new Error("config failed");
    return r.json();
  }
  function isActive(cfg) {
    return cfg.enabled && (!cfg.expiresAt || Date.now() < Date.parse(cfg.expiresAt));
  }
  async function refreshFlag() {
    try {
      const cfg = await fetchConfig();
      const enabled = isActive(cfg);
      await gmSet("appEnabled", enabled);
      await gmSet("disableReason", enabled ? "" : (cfg.message || "Dostęp wyłączony."));
      KS_enabled = enabled;
      KS_reason = enabled ? "" : (cfg.message || "Dostęp wyłączony.");
      console.log("[KS] enabled:", enabled, "reason:", KS_reason);
    } catch (e) {
      await gmSet("appEnabled", false);
      await gmSet("disableReason", "Brak łączności z serwerem.");
      KS_enabled = false;
      KS_reason = "Brak łączności z serwerem.";
      console.warn("[KS] błąd/Offline:", e);
    }
  }
  async function readFlag() {
    KS_enabled = !!(await gmGet("appEnabled", false));
    KS_reason = await gmGet("disableReason", "");
    if (!KS_enabled) console.warn("⛔ Bot wyłączony:", KS_reason || "(brak powodu)");
  }
 
  async function loadSettings() {
    const energiaMin = Number(gmCast(await GM_getValue("energiaMin", DEFAULTS.energiaMin)));
    const odwagaMin  = Number(gmCast(await GM_getValue("odwagaMin",  DEFAULTS.odwagaMin)));
    const lvlMax     = Number(gmCast(await GM_getValue("lvlMax",     DEFAULTS.lvlMax)));
    const victimsType= String(gmCast(await GM_getValue("victimsType",DEFAULTS.victimsType)));
    const delayMs    = Number(gmCast(await GM_getValue("delayMs",    DEFAULTS.delayMs)));
    const runtimeH    = Number(gmCast(await GM_getValue("runtimeHours",DEFAULTS.runtimeHours)));
    const useDiax  = !!(await GM_getValue("useDiax", DEFAULTS.useDiax));
    const farmHops   = Number(gmCast(await GM_getValue("farmHops",   DEFAULTS.farmHops)));
    const farmBarley = Number(gmCast(await GM_getValue("farmBarley", DEFAULTS.farmBarley)));
    const farmShipMask  = Number(gmCast(await GM_getValue("farmShipMask",  DEFAULTS.farmShipMask)));
    const farmPlaneMask = Number(gmCast(await GM_getValue("farmPlaneMask", DEFAULTS.farmPlaneMask)));
    const farmCheckMines  = !!(await GM_getValue("farmCheckMines",  DEFAULTS.farmCheckMines));
    const farmCheckFields = !!(await GM_getValue("farmCheckFields", DEFAULTS.farmCheckFields));
    const gymEnergyMin = Number(gmCast(await GM_getValue("gymEnergyMin", DEFAULTS.gymEnergyMin)));
    const gymAwakeMin  = Number(gmCast(await GM_getValue("gymAwakeMin",  DEFAULTS.gymAwakeMin)));
    const barracksEnergiaMin = Number(gmCast(await GM_getValue("barracksEnergiaMin", DEFAULTS.barracksEnergiaMin)));
    const barracksAwakeMin   = Number(gmCast(await GM_getValue("barracksAwakeMin",   DEFAULTS.barracksAwakeMin)));
    const Guards             = !!(await GM_getValue("Guards",   DEFAULTS.Guards));
    const Fighters           = !!(await GM_getValue("Fighters", DEFAULTS.Fighters));
    const prioGuard          = Number(gmCast(await GM_getValue("prioGuard",    DEFAULTS.prioGuard)));
    const prioFighters       = Number(gmCast(await GM_getValue("prioFighters", DEFAULTS.prioFighters)));
    const przestepstwaMinOdwaga = Number(gmCast(await GM_getValue("przestepstwaMinOdwaga", DEFAULTS.przestepstwaMinOdwaga)));
    const przestepstwaTyp = String(gmCast(await GM_getValue("przestepstwaTyp", DEFAULTS.przestepstwaTyp)));
    const autoRefreshEnabled = !!(await GM_getValue("autoRefreshEnabled", DEFAULTS.autoRefreshEnabled));
    const autoRefreshTime = Number(gmCast(await GM_getValue("autoRefreshTime", DEFAULTS.autoRefreshTime)));
    const autoCollectLaundry = !!(await GM_getValue("autoCollectLaundry", DEFAULTS.autoCollectLaundry));
    const autoCheckJobMarket = !!(await GM_getValue("autoCheckJobMarket", DEFAULTS.autoCheckJobMarket));
    const attackBlacklist = String(gmCast(await GM_getValue("attackBlacklist", DEFAULTS.attackBlacklist)));
    const attackWhitelist = String(gmCast(await GM_getValue("attackWhitelist", DEFAULTS.attackWhitelist)));
    const botAction       = String(gmCast(await GM_getValue("botAction",       DEFAULTS.botAction)));
    const notificationsEnabled = !!(await GM_getValue("notificationsEnabled", DEFAULTS.notificationsEnabled));

 
    PROGI.energiaMin  = Number.isFinite(+energiaMin) ? +energiaMin : DEFAULTS.energiaMin;
    PROGI.odwagaMin   = Number.isFinite(+odwagaMin)  ? +odwagaMin  : DEFAULTS.odwagaMin;
    PROGI.lvlMax      = Number.isFinite(+lvlMax)     ? +lvlMax     : DEFAULTS.lvlMax;
    PROGI.victimsType = victimsType || DEFAULTS.victimsType;
    PROGI.delayMs     = Number.isFinite(+delayMs)    ? +delayMs    : DEFAULTS.delayMs;
    PROGI.runtimeHours= Math.max(0, Math.min(12, Number.isFinite(+runtimeH) ? +runtimeH : DEFAULTS.runtimeHours));
    PROGI.useDiax      = !!useDiax;
    PROGI.farmHops   = Number.isFinite(+farmHops)   ? +farmHops   : DEFAULTS.farmHops;
    PROGI.farmBarley = Number.isFinite(+farmBarley) ? +farmBarley : DEFAULTS.farmBarley;
    PROGI.farmShipMask  = Number.isFinite(farmShipMask)  ? farmShipMask  : DEFAULTS.farmShipMask;
    PROGI.farmPlaneMask = Number.isFinite(farmPlaneMask) ? farmPlaneMask : DEFAULTS.farmPlaneMask;
    PROGI.farmCheckMines  = farmCheckMines;
    PROGI.farmCheckFields = farmCheckFields;
    PROGI.statStrength = !!(await GM_getValue("statStrength", DEFAULTS.statStrength));
    PROGI.statSpeed    = !!(await GM_getValue("statSpeed",    DEFAULTS.statSpeed));
    PROGI.statDefense  = !!(await GM_getValue("statDefense",  DEFAULTS.statDefense));
    PROGI.prioStrength = Number(await GM_getValue("prioStrength", DEFAULTS.prioStrength)) || 1;
    PROGI.prioSpeed    = Number(await GM_getValue("prioSpeed",    DEFAULTS.prioSpeed)) || 2;
    PROGI.prioDefense  = Number(await GM_getValue("prioDefense",  DEFAULTS.prioDefense)) || 3;
    PROGI.gymEnergyMin = Number.isFinite(+gymEnergyMin) ? +gymEnergyMin : DEFAULTS.gymEnergyMin;
    PROGI.gymAwakeMin  = Number.isFinite(+gymAwakeMin)  ? +gymAwakeMin  : DEFAULTS.gymAwakeMin;
    PROGI.barracksEnergiaMin = Number.isFinite(+barracksEnergiaMin) ? +barracksEnergiaMin : DEFAULTS.barracksEnergiaMin;
    PROGI.barracksAwakeMin   = Number.isFinite(+barracksAwakeMin)   ? +barracksAwakeMin   : DEFAULTS.barracksAwakeMin;
    PROGI.Guards             = !!Guards;
    PROGI.Fighters           = !!Fighters;
    PROGI.prioGuard     = (Number(prioGuard) === 2) ? 2 : 1;
    PROGI.prioFighters  = (Number(prioFighters) === 2) ? 2 : 1;
    if (PROGI.Guards && PROGI.Fighters && PROGI.prioGuard === PROGI.prioFighters) {
      PROGI.prioFighters = (PROGI.prioGuard === 1) ? 2 : 1;
    }
    PROGI.przestepstwaMinOdwaga = Number.isFinite(+przestepstwaMinOdwaga) ? +przestepstwaMinOdwaga : DEFAULTS.przestepstwaMinOdwaga;
    PROGI.przestepstwaTyp = przestepstwaTyp || DEFAULTS.przestepstwaTyp;
    PROGI.autoRefreshEnabled = autoRefreshEnabled;
    PROGI.autoRefreshTime = Number.isFinite(+autoRefreshTime) ? +autoRefreshTime : DEFAULTS.autoRefreshTime;
    PROGI.autoCollectLaundry = autoCollectLaundry;
    PROGI.autoCheckJobMarket = autoCheckJobMarket;
    PROGI.attackBlacklist = attackBlacklist;
    PROGI.attackWhitelist = attackWhitelist;
    PROGI.botAction       = botAction;
    PROGI.notificationsEnabled = notificationsEnabled;
 
    runUntilTs = Number(gmCast(await GM_getValue("runUntil", 0))) || 0;
 
    console.log("⚙️ Załadowane progi:", PROGI);
  }
 
  function gmCast(v) { return (v === undefined || v === null) ? "" : v; }
  async function saveSettings(newVals) {
    Object.assign(PROGI, newVals);
    await GM_setValue("energiaMin",          PROGI.energiaMin);
    await GM_setValue("odwagaMin",           PROGI.odwagaMin);
    await GM_setValue("lvlMax",              PROGI.lvlMax);
    await GM_setValue("victimsType",         PROGI.victimsType);
    await GM_setValue("delayMs",             PROGI.delayMs);
    await GM_setValue("runtimeHours",        PROGI.runtimeHours);
    await GM_setValue("useDiax",             !!PROGI.useDiax);
    await GM_setValue("farmHops",            PROGI.farmHops);
    await GM_setValue("farmBarley",          PROGI.farmBarley);
    await GM_setValue("farmShipMask",  PROGI.farmShipMask);
    await GM_setValue("farmPlaneMask", PROGI.farmPlaneMask);
    await GM_setValue("farmCheckMines",  !!PROGI.farmCheckMines);
    await GM_setValue("farmCheckFields", !!PROGI.farmCheckFields);
    await GM_setValue("statStrength", !!PROGI.statStrength);
    await GM_setValue("statSpeed",    !!PROGI.statSpeed);
    await GM_setValue("statDefense",  !!PROGI.statDefense);
    await GM_setValue("prioStrength", PROGI.prioStrength);
    await GM_setValue("prioSpeed",    PROGI.prioSpeed);
    await GM_setValue("prioDefense",  PROGI.prioDefense);
    await GM_setValue("gymEnergyMin", PROGI.gymEnergyMin);
    await GM_setValue("gymAwakeMin",  PROGI.gymAwakeMin);
    await GM_setValue("barracksEnergiaMin", PROGI.barracksEnergiaMin);
    await GM_setValue("barracksAwakeMin",  PROGI.barracksAwakeMin);
    await GM_setValue("Guards",             !!PROGI.Guards);
    await GM_setValue("Fighters",           !!PROGI.Fighters);
    await GM_setValue("prioGuard",          PROGI.prioGuard);
    await GM_setValue("prioFighters",       PROGI.prioFighters);
    await GM_setValue("przestepstwaMinOdwaga", PROGI.przestepstwaMinOdwaga);
    await GM_setValue("przestepstwaTyp", PROGI.przestepstwaTyp);
    await GM_setValue("autoRefreshEnabled", !!PROGI.autoRefreshEnabled);
    await GM_setValue("autoRefreshTime", PROGI.autoRefreshTime);
    await GM_setValue("autoCollectLaundry", !!PROGI.autoCollectLaundry);
    await GM_setValue("autoCheckJobMarket", !!PROGI.autoCheckJobMarket);
    await GM_setValue("attackBlacklist", PROGI.attackBlacklist);
    await GM_setValue("attackWhitelist", PROGI.attackWhitelist);
    await GM_setValue("botAction",       PROGI.botAction);
    await GM_setValue("notificationsEnabled", PROGI.notificationsEnabled);

    console.log("💾 Zapisano progi:", PROGI);
 
    if (window.botWlaczony && PROGI.runtimeHours > 0) {
      runUntilTs = Date.now() + PROGI.runtimeHours * 3600 * 1000;
      await GM_setValue("runUntil", runUntilTs);
      console.log("⏱️ Nowy limit pracy do:", new Date(runUntilTs).toLocaleString());
    } else if (PROGI.runtimeHours === 0) {
      runUntilTs = 0;
      await GM_setValue("runUntil", 0);
      console.log("♾️ Limit wyłączony");
    }
    setupAutoRefresh();
  }
 
//====HELPERY===
 function validateBarracksPrioritiesLive({ enable, prio }, { selGuard, selFighters }, saveBtn, hintEl) {
  [selGuard, selFighters].forEach(s => s && (s.style.boxShadow = ""));

  const enabled = [];
  if (enable.guards)   enabled.push('guards');
  if (enable.fighters) enabled.push('fighters');

  let hasDup = false;
  if (enabled.length > 1) {
    const pG = Number(prio.guard);
    const pF = Number(prio.fighters);
    if (pG === pF && (pG === 1 || pG === 2)) {
      hasDup = true;
      if (selGuard)    selGuard.style.boxShadow    = "0 0 0 2px rgba(220,40,60,.6)";
      if (selFighters) selFighters.style.boxShadow = "0 0 0 2px rgba(220,40,60,.6)";
    }
  }

  if (hintEl){
    hintEl.textContent = hasDup
      ? "Priorytety 1–2 muszą być unikalne dla włączonych typów."
      : "OK – priorytety ustawione poprawnie.";
    hintEl.style.color = hasDup ? "#ffb3bf" : "#93a0c0";
  }
  if (saveBtn) saveBtn.disabled = !!hasDup;
  return !hasDup;
}

function getWhitelist() {
    const rawList = PROGI.attackWhitelist || "";
    return rawList
        .split(/[\n,]+/) // Dzieli po przecinku lub nowej linii
        .map(id => id.trim()) 
        .filter(id => id.length > 0); // Usuwa puste wpisy
}

/**
 * Wyświetla eleganckie powiadomienie w prawym dolnym rogu.
 * @param {string} msg - Treść wiadomości.
 * @param {string} type - Typ: 'farm', 'bot', 'info'.
 */
function showToast(msg, type = 'info') {
    if (PROGI && PROGI.notificationsEnabled === false) return;

    let container = document.querySelector('.mp-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'mp-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `mp-toast mp-toast-${type}`;
    toast.innerHTML = `<div class="mp-toast-icon"></div><span>${msg}</span>`;
    
    container.appendChild(toast);

    // Animacja wlotu
    requestAnimationFrame(() => toast.classList.add('is-show'));

    // Usunięcie po 4 sekundach
    setTimeout(() => {
        toast.classList.remove('is-show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

/**
 * Uniwersalna funkcja do pobierania dowolnych atrybutów z serwera.
 * @param {Array} listaAtrybutow - Tablica nazw, np. ['money', 'level', 'exp']
 */
async function GetAttributes(listaAtrybutow) {
    if (!listaAtrybutow || !Array.isArray(listaAtrybutow)) {
        console.warn("⚠️ GetAttributes: Musisz podać tablicę atrybutów!");
        return null;
    }

    const url = new URL('https://s3.polskamafia.pl/user/attributes');
    
    listaAtrybutow.forEach(attr => url.searchParams.append('attributes[]', attr));

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        });

        if (!response.ok) throw new Error(`Błąd: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error("❌ Błąd w GetAttributes:", error);
        return null;
    }
}

function normalizeBarracksPriorities({ enable, prio }) {
  if (enable.guards && enable.fighters && prio.guard === prio.fighters) {
    prio.fighters = (prio.guard === 1) ? 2 : 1;
  }
  prio.guard     = (prio.guard === 2) ? 2 : 1;
  prio.fighters  = (prio.fighters === 2) ? 2 : 1;
  return prio;
}

function validatePrioritiesLive({ enable, prio }, { selStr, selSpd, selDef }, saveBtn, hintEl){
  const enabled = Object.entries(enable).filter(([,on]) => on).map(([k]) => k);
  const byVal = new Map();
  for (const key of enabled) {
    const p = prio[key];
    if (!byVal.has(p)) byVal.set(p, []);
    byVal.get(p).push(key);
  }
 
  [selStr, selSpd, selDef].forEach(s => s.style.boxShadow = "");
 
  let hasDup = false;
  for (const [p, keys] of byVal.entries()) {
    if (keys.length > 1) {
      hasDup = true;
      for (const k of keys) {
        const el = k === "strength" ? selStr : k === "speed" ? selSpd : selDef;
        el.style.boxShadow = "0 0 0 2px rgba(220,40,60,.6)";
      }
    }
  }
 
  if (hintEl){
    hintEl.textContent = hasDup
      ? "Priorytety 1–3 muszą być unikalne dla włączonych statystyk."
      : "OK – priorytety ustawione poprawnie.";
    hintEl.style.color = hasDup ? "#ffb3bf" : "#93a0c0";
  }
  if (saveBtn) saveBtn.disabled = !!hasDup;
  return !hasDup;
}
 
function normalizeUniquePriorities({ enable, prio }){
  const enabled = Object.entries(enable).filter(([,on]) => on).map(([k]) => k);
  const used = new Set();
  for (const k of enabled) {
    const p = Number(prio[k]);
    if (p>=1 && p<=3 && !used.has(p)) used.add(p);
  }
  for (const k of enabled) {
    let p = Number(prio[k]);
    if (!(p>=1 && p<=3) || byDuplicate(k,p)) {
      for (let cand=1; cand<=3; cand++){
        if (!used.has(cand)) { prio[k]=cand; used.add(cand); break; }
      }
    }
  }
  function byDuplicate(key, p){
    return [...enabled].some(k=>k!==key && Number(prio[k])===p);
  }
  return prio;
}

// Blacklista przy atakach
let _blacklistCache = null;
let _blacklistCacheSource = "";

// Funkcja parsuje string z PROGI na tablicę nicków
function getBlacklist() {
    const rawList = PROGI.attackBlacklist || "";
    if (rawList === _blacklistCacheSource && _blacklistCache) {
        return _blacklistCache;
    }

    _blacklistCacheSource = rawList;
    _blacklistCache = rawList
        .split(/[\n,]+/)
        .map(nick => nick.trim().toLowerCase())
        .filter(nick => nick.length > 0); 
   
    console.log("🛡️ Czarna lista graczy zaktualizowana:", _blacklistCache);
    return _blacklistCache;
}

// Funkcja sprawdza, czy dany nick jest na liście
function isBlacklisted(nick) {
    const list = getBlacklist();
    if (list.length === 0) return false; 
    return list.includes(nick.trim().toLowerCase());
}
 
function isVehicleEnabled(type, slot) {
  const mask = (type === 'ship') ? (PROGI.farmShipMask | 0) : (PROGI.farmPlaneMask | 0);
  const bit  = 1 << (slot - 1);
  return (mask & bit) !== 0;
}
 
function fireClick(el) {
  try {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  } catch (e) {
    if (typeof el.click === 'function') el.click();
  }
}
 
// ====================== MAPA BUDYNKÓW (ps -> path/sl) ======================
function _norm(s){
  return String(s||"")
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').trim();
}
 
// dopasowanie nazw po data-tooltip (PL + luzem)
function _matchBuilding(key, label){
  const t = String(label || '').toLocaleLowerCase('pl');
  switch (key) {
    case 'burdel':                return /burdel|bordel/.test(t);
    case 'marihuana':             return /(gospod|farm|upraw).*marihuan|weed|konop/.test(t);
    case 'amfa':                  return /(labor|lab).*amf/.test(t);             
    case 'browar':                return /browar|brewery/.test(t);
    case 'whisky':                return /(destyl|distill).*(whisk|whisky)/.test(t);
    case 'silownia':              return /\bsi(?:ł|l)ownia\b/.test(t) || /\bgym\b/.test(t);
    case 'koszary':               return /\bkoszar|barracks|army\b/i.test(t);
    case 'bank':                  return /\bbank\b/i.test(t);
    case 'gieldaPracy':         return /gie(?:ł|l)da\s*pracy|jobs/i.test(t);
    default: return false;
  }
}
 
// znajdź (ps -> path) dla potrzebnych budynków
function scanBuildings({log=false} = {}){
  const wantedKeys = ['burdel','marihuana','amfa','browar','whisky', 'silownia', 'koszary', 'bank', 'gieldaPracy'];
  const res = Object.create(null);
 
  // wszystkie "kafelki" budynków na mapie
  const nodes = document.querySelectorAll('div.b-l.b-i[data-ps]');
  nodes.forEach(el => {
    const label = el.getAttribute('data-tooltip') || el.textContent || '';
    const ps    = el.getAttribute('data-ps');
    if (!ps) return;
 
    // sprawdź, czy to któryś z poszukiwanych
    for (const k of wantedKeys) {
      if (res[k]) continue;
      if (_matchBuilding(k, label)) {
        const path = document.querySelector(`path[data-sl="${ps}"]`);
        res[k] = { ps: Number(ps), el, path, label };
        if (log) console.log(`✅ ${k}: ps=${ps} | label="${label}"`, {el, path});
      }
    }
  });
  window._mp_buildings = res;
  return res;
}
 
// kliknij w budynek po kluczu (użyje path[data-sl])
function clickBuilding(key){
  const map = window._mp_buildings || scanBuildings();
  const item = map[key];
  if (!item) { console.warn(`❌ Nie znaleziono budynku: ${key}`); return false; }
  const target = item.path || item.el;
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  console.log(`🗺️ Klik: ${key} (ps=${item.ps})`);
  return true;
}
 
const _lastRefillAt = { energy: 0, nerve: 0, awake: 0, hp: 0 };
const REFILL_COOLDOWN_MS = 2000;

async function clickRefill(type) {
  const url = `https://s3.polskamafia.pl/user/attribute/fill/${type}`;
  
  // Pobranie aktualnego tokenu CSRF
  const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                document.querySelector('input[name="_token"]')?.value;

  if (!token) {
      console.error(`❌ Refill ${type}: Brak tokena CSRF.`);
      return false;
  }

  console.log(`💎 Próba uzupełnienia ${type} przez API...`);

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'X-CSRF-TOKEN': token,
              'X-Requested-With': 'XMLHttpRequest',
              'Accept': 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ _token: token }).toString(),
          credentials: 'same-origin'
      });

      if (response.ok) {
          const data = await response.json();
          console.log(`✅ Refill ${type}: Sukces!`, data.message || "");
          return true;
      } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`⏳ Refill ${type} odrzucony (Status: ${response.status}). Może brakować diamentów?`, errorData);
          return false;
      }
  } catch (err) {
      console.error(`❌ Błąd sieci podczas refillu ${type}:`, err);
      return false;
  }
}

async function tryRefill(type) {
  if (!PROGI.useDiax) return false;
  const now = Date.now();
  if (now - (_lastRefillAt[type] || 0) < REFILL_COOLDOWN_MS) return false;
  const ok = await clickRefill(type);
  if (ok) _lastRefillAt[type] = now;
  return ok;
}

function zamknijOknoModalne() {
  var selectors = [
    '.close-js',
    '.js-close-modal',
    '.modal-box .close-js',
  ];

  var el = null;
  for (var i = 0; i < selectors.length; i++) {
    var s = selectors[i];
    el = document.querySelector(s);
    if (el) break;
  }

  if (!el) {
    var icon = document.querySelector('.icon.ui-close, .modal-box .icon.ui-close');
    if (icon) {
      var prev = icon.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('close-js')) {
        el = prev;
      }
      if (!el && icon.parentElement) {
        var inParent = icon.parentElement.querySelector('.close-js');
        if (inParent) el = inParent;
      }
      if (!el && typeof icon.closest === 'function') {
        var scope = icon.closest('.box-h, .box-x, .box-ins, .modal-box');
        if (scope) {
          var inScope = scope.querySelector('.close-js');
          if (inScope) el = inScope;
        }
      }
      if (!el) el = icon;
    }
  }

  if (el) {
    fireClick(el);
    try {
      var nameHint = (el.className || el.id || el.tagName || '').toString();
      if (typeof GM_log === 'function') GM_log('❎ Zamknięto okno modalne: ' + nameHint);
      else console.log('❎ Zamknięto okno modalne:', nameHint);
    } catch (_) {}
    return true;
  }

  try {
    var evt = new KeyboardEvent('keydown', {
      key: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true
    });
    document.dispatchEvent(evt);
  } catch (e) {
    var legacyEvt = document.createEvent('KeyboardEvent');
    legacyEvt.initEvent('keydown', true, true);
    document.dispatchEvent(legacyEvt);
  }
  if (typeof GM_log === 'function') GM_log('⚠️ Nie znaleziono przycisku zamykania – wysłano Escape.');
  else console.warn('⚠️ Nie znaleziono przycisku zamykania – wysłano Escape.');
  return false;
}
 
async function getUnavailableStatus() {
    try {
        const response = await fetch('https://s3.polskamafia.pl/user/minute-refresh', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Błąd pobierania statusu API");

        const data = await response.json();

        if (data.disabledHtml && data.disabledHtml.includes("Obecnie przebywasz")) {
            
            const timeMatch = data.disabledHtml.match(/id=hospitalPrisonTimeLeft>(\d+)/);
            const seconds = timeMatch ? parseInt(timeMatch[1], 10) : 0;

            return { 
                blocked: true, 
                reason: "prison-hospital", 
                secondsLeft: seconds,
                rawText: "Postać zablokowana (szpital/więzienie)"
            };
        }

        const hp = data.attributes?.hp ?? 100;
        if (hp <= 0) {
            return { 
                blocked: true, 
                reason: "no-lives",
                rawText: "Brak punktów życia (HP: 0)"
            };
        }

        return { blocked: false, reason: null };

    } catch (error) {
        console.error("❌ Błąd podczas sprawdzania statusu API:", error);
        return { blocked: true, reason: "api-error" };
    }
}

function logAttempt(nick, hash, isAllowed) {
    if (!LOG_WEBHOOK_URL || !LOG_WEBHOOK_URL.includes('discord.com')) {
        return; 
    }

    const status = isAllowed ? "Licencja OK" : "ODRZUCONY";
    const color = isAllowed ? 3066993 : 15158332;

    const payload = {
        username: "Logger Bota",
        embeds: [
            {
                title: "Próba uruchomienia bota",
                color: color,
                fields: [
                    { name: "Status", value: status, inline: true },
                    { name: "Użytkownik", value: nick, inline: true },
                    { 
                        name: "Hasz (do wklejenia w license.json)", 
                        value: `\`${hash}\``,
                        inline: false 
                    } 
                ],
                timestamp: new Date().toISOString()
            }
        ]
    };
    try {
        GM_xmlhttpRequest({
            method: "POST",
            url: LOG_WEBHOOK_URL,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(payload),
        });
    } catch (e) {
        console.error("Błąd GM_xmlhttpRequest przy wysyłaniu loga", e);
    }
}
 
function syncBotBtnUI() {
  const btn = document.getElementById("pm-bot-btn");
  if (!btn) return;
  btn.innerText = `BOT: ${window.botWlaczony ? "ON" : "OFF"}`;
  btn.style.backgroundColor = window.botWlaczony ? "#8be58b" : "#bfa5f2";
  btn.style.color = window.botWlaczony ? "#044a04" : "#2b1e4b";
  btn.style.borderColor = window.botWlaczony ? "#1e8f1e" : "#6d55ab";
}

async function checkAutoStop() {
  if (!window.botWlaczony) return;
  if (runUntilTs > 0 && Date.now() >= runUntilTs) {
    window.botWlaczony = false;
    await GM_setValue("botEnabled", false);
    runUntilTs = 0;
    await GM_setValue("runUntil", 0);
    syncBotBtnUI();
    console.warn("⏰ Minął zadany czas działania – bot został automatycznie wyłączony.");
    try { alert("⏰ Czas działania minął – bot wyłączony."); } catch (_) {}
  }
}

async function Main() {
  await checkAutoStop();
  if (aktualniePracuje || !KS_enabled) return;
  aktualniePracuje = true;
  try {
    //1 BOT
    if (window.botWlaczony) {
      const status = await getUnavailableStatus();
      if (status.blocked) {
        console.log(`⛔ Wstrzymuję sekwencję – powód: ${status.reason}.`);
        aktualniePracuje = false;
        return;
      }

      let stats = await GetAttributes(['energy', 'nerve', 'awake']);

      // Logika refillowania (Diaxy)
      if (PROGI.useDiax) {
        let didRefill = false;
        if (stats.energy <= PROGI.energiaMin) didRefill = await tryRefill("energy") || didRefill;
        if (stats.nerve <= PROGI.odwagaMin) didRefill = await tryRefill("nerve") || didRefill;
        if (stats.awake <= 100) didRefill = await tryRefill("awake") || didRefill;
        if (didRefill) {
            await wait(600);
            stats = await GetAttributes(['energy', 'nerve', 'awake']);
        }
      }

      if (stats.energy > PROGI.energiaMin && stats.nerve > PROGI.odwagaMin && stats.awake > 100) {
        console.log("⚡ Szukam ofiary (API)...");
        let targets = [];

        if (PROGI.victimsType === "selected") {
          const whitelist = getWhitelist();
          if (whitelist.length === 0) {
            console.warn("⚠️ Tryb Wybrani aktywny, ale lista ID jest pusta!");
            targets = [];
          } else {
              targets = whitelist.map(id => ({ id: id, nick: `Gracz ID: ${id}` }));
          }
        } else {
            try {
                const searchUrl = `https://s3.polskamafia.pl/search/playersAbleToAttack?victimsType=${PROGI.victimsType}`;
                const searchRes = await fetch(searchUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                const searchData = await searchRes.json();
                const parser = new DOMParser();
                const doc = parser.parseFromString(searchData.html, 'text/html');
                const graczeRaw = Array.from(doc.querySelectorAll('.result-user-i.box-ins')).reverse();

                for (let gracz of graczeRaw) {
                    const nameLink = gracz.querySelector('.name a');
                    const nick = nameLink?.textContent.trim();
                    const lvl = parseInt((gracz.querySelector('.level, .w-level')?.textContent || '').replace(/\D/g, ''));
                    const profileId = (nameLink?.getAttribute('data-modal') || "").split('/').pop();

                    if (lvl < PROGI.lvlMax && !isBlacklisted(nick)) {
                        targets.push({ id: profileId, nick: nick });
                    }
                }
            } catch (err) {
                console.error("❌ Błąd wyszukiwarki:", err);
            }
        }
        if (targets.length > 0) {
          let checkedInThisTurn = 0;
          let actionExecuted = false;

          while (checkedInThisTurn < targets.length && !actionExecuted) {
            if (currentTargetIndex >= targets.length) {
              currentTargetIndex = 0;
            }

            const cel = targets[currentTargetIndex];
            const celId = cel.id;
            const celNick = cel.nick;
            const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                          document.querySelector('input[name="_token"]')?.value;

            let actionPath = "attack";
            let actionMethod = "POST";

            if (PROGI.botAction === "steal") {
              actionPath = "steal";
              actionMethod = "GET";
            } else if (PROGI.botAction === "bank") {
              actionPath = "bankAttack";
              actionMethod = "GET";
            }

            console.log(`🎯 Cel [${currentTargetIndex + 1}/${targets.length}]: ${celNick} | Akcja: ${actionPath}`);

            try {
              const sceneRes = await fetch(`https://s3.polskamafia.pl/attack-scene/${celId}`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
                body: new URLSearchParams({ _token: token }).toString()
              });
                
              const sceneText = await sceneRes.text();
              const captchaMatch = sceneText.match(/const\s+correctVal\s*=\s*["'](\d+)["']/);
                
              if (captchaMatch && captchaMatch[1]) {
                const captchaVal = captchaMatch[1];
                await fetch('https://s3.polskamafia.pl/checkCaptcha', {
                  method: 'POST',
                  headers: {
                      'X-CSRF-TOKEN': token,
                      'X-Requested-With': 'XMLHttpRequest',
                      'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  body: new URLSearchParams({ captcha: captchaVal }).toString()
                });
                await wait(400); 
              }

                const fetchOptions = {
                    method: actionMethod,
                    headers: {
                        'X-CSRF-TOKEN': token,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                };

                if (actionMethod === "POST") {
                    fetchOptions.body = new URLSearchParams({ _token: token }).toString();
                    fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }

                const finalRes = await fetch(`https://s3.polskamafia.pl/${actionPath}/${celId}`, fetchOptions);

                if (finalRes.status === 200) {
                    console.log(`✅ Sukces (200). Cel zaatakowany.`);
                    showToast(`BOT - ${actionPath.toUpperCase()} na ${celNick}`, 'ok');
                    
                    currentTargetIndex++;
                    actionExecuted = true;

                    const randomSleep = Math.floor(Math.random() * 2001) + 4000;
                    console.log(`⏳ Sukces: Losowa przerwa ${(randomSleep / 1000).toFixed(1)}s.`);
                    await sleep(randomSleep);
                } else {
                    console.warn(`⏭️ Status ${finalRes.status} dla ${celNick}. Szukam kolejnego dostępnego...`);
                    showToast(`BOT - Brak możliwości ${actionPath.toUpperCase()} na: ${celNick}`, 'error');
                    
                    currentTargetIndex++;
                    checkedInThisTurn++; 
                }

            } catch (err) {
                console.error("❌ Błąd bota:", err);
                currentTargetIndex++;
                checkedInThisTurn++;
            }
          }
        } else {
            console.log("🔍 Brak celów.");
        }
      } else {
          console.log("⚡ Czekam na regenerację energii/odwagi...");
      }
  }
    //2 FARM
    if (window.farmWlaczony) {
      const targets = collectTargets({ log: false });
 
      const mines  = PROGI.farmCheckMines  ? Array.from({length:6},  (_,i)=>`kopalnia${29+i}`) : [];
      const fields = PROGI.farmCheckFields ? Array.from({length:20}, (_,i)=>`pole${35+i}`)     : [];
      const ships  = Array.from({length:9}, (_,i)=>i+1).filter(i => isVehicleEnabled('ship',  i)).map(i => `ship-${i}`);
      const planes = Array.from({length:9}, (_,i)=>i+1).filter(i => isVehicleEnabled('plane', i)).map(i => `plane-${i}`);
      const kolejnosc = ['burdel', 'bank', 'gieldaPracy', ...ships, ...planes, 'whisky','browar','amfa','marihuana', ...mines, ...fields ];
 
      for (const key of kolejnosc) {
        const item = targets[key];
        if (!item) { console.log(`❌ Nie znaleziono: ${key}`); continue; }
 
        const el = item.el || item.path || item;
        let aktywny = !!(el?.classList?.contains('bounceAnim') || el?.querySelector?.('.bounceAnim'));

        if (key === 'gieldaPracy' && PROGI.autoCheckJobMarket) {
          aktywny = true;
        }
        
        if (item.type === 'field') {
          const energiaValue = parseInt(document.querySelector('.value.renew-energy')?.textContent) || 0;
          aktywny = (item.timeLeft === "0" && energiaValue > 7);
        }
 
        const nazwa = prettyName(key, item);
        if (!aktywny) {
          console.log(`⏳ ${nazwa} jeszcze nie gotowy`);
          continue;
        }
 
        console.log(`✅ ${nazwa} jest gotowy`);
 
        try {
          if (item.type === 'building') {
            if (typeof budynki[key] === 'function') {
              await budynki[key](item);
            } else {
              clickBuilding(key);
              await wait(300);
              zamknijOknoModalne();
            }
          } else if (item.type === 'ship') {
            if (typeof budynki[key] === 'function') await budynki[key](item);
            else await vehicleHandlers.ship(item);
          } else if (item.type === 'plane') {
            if (typeof budynki[key] === 'function') await budynki[key](item);
            else await vehicleHandlers.plane(item);
          } else if (item.type === 'field') {
            if (typeof budynki[key] === 'function') await budynki[key](item);
            else await fieldHandler(item.slot);
          } else if (item.type === 'mine') {
            if (typeof budynki[key] === 'function') await budynki[key](item);
            else await mineHandler(item.slot);
          }
          console.log(`✅ ${nazwa} zakończony pomyślnie`);
          await wait(1500);
        } catch (err) {
          console.error(`❌ Błąd w obsłudze ${nazwa}:`, err);
          await wait(1500);
        }
      }
    }
 
    if (window.silkaWlaczona) {
      const stats = await GetAttributes(['energy', 'awake']);

      if (stats && stats.energy >= PROGI.gymEnergyMin && stats.awake >= PROGI.gymAwakeMin) {
          console.log("🏋️ Warunki spełnione – odpalam trening siłowni (API).");

          // 1. Zbuduj kolejność statystyk wg ustawień i priorytetów
          const statMap = [
              { key: "strength", on: !!PROGI.statStrength, prio: PROGI.prioStrength },
              { key: "speed",    on: !!PROGI.statSpeed,    prio: PROGI.prioSpeed },
              { key: "defense",  on: !!PROGI.statDefense,  prio: PROGI.prioDefense },
          ].filter(s => s.on).sort((a, b) => a.prio - b.prio).map(s => s.key);

          if (statMap.length === 0) {
              console.log("ℹ️ Brak włączonych statystyk do trenowania.");
          } else {
              // 2. Pobranie tokenu CSRF
              const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                            document.querySelector('input[name="_token"]')?.value;

              if (!token) {
                  console.error('❌ Siłownia: Brak tokena CSRF. Przerwanie.');
              } else {
                  // 3. Iteracja po statystykach zgodnie z priorytetem
                  for (const statystyka of statMap) {
                      console.log(`💪 Trenuję: ${statystyka} (API)...`);

                      try {
                          const response = await fetch(`https://s3.polskamafia.pl/map/building/gym/${statystyka}`, {
                              method: 'POST',
                              headers: {
                                  'Content-Type': 'application/x-www-form-urlencoded',
                                  'X-CSRF-TOKEN': token,
                                  'X-Requested-With': 'XMLHttpRequest',
                                  'Accept': 'application/json'
                              },
                              body: new URLSearchParams({
                                  trainType: statystyka,
                                  turbo: 0,
                                  _token: token
                              }).toString(),
                              credentials: 'same-origin'
                          });

                          if (response.ok) {
                              const data = await response.json();
                              console.log(`✅ Siłownia: Trening ${statystyka} zakończony.`, data);
                              showToast(`SIŁOWNIA - Trening ${statystyka} zakończony.`, 'ok');
                          } else {
                              const errorData = await response.json().catch(() => ({}));
                              console.warn(`⏳ Serwer odrzucił trening ${statystyka} (Status: ${response.status}). Być może brak energii lub awake.`);
                          }
                          await wait(800);

                      } catch (err) {
                          console.error(`❌ Błąd sieci podczas treningu siłowni (${statystyka}):`, err);
                      }
                  }
              }
          }
      } else {
          console.log("⚡ Energia lub szczęście poniżej progów – siłownia pominięta.");
      }
  }

    if (window.koszaryWlaczony) {
      const stats = await GetAttributes(['energy', 'awake']);
      if (stats && stats.energy >= PROGI.barracksEnergiaMin && stats.awake >= PROGI.barracksAwakeMin) {
          console.log("🛡️ Warunki spełnione – odpalam koszary (API).");

          const items = [];
          if (PROGI.Guards)   items.push({ type: 'guards',   prio: Number(PROGI.prioGuard)    || 1 });
          if (PROGI.Fighters) items.push({ type: 'warriors', prio: Number(PROGI.prioFighters) || 2 });
          
          items.sort((a, b) => a.prio - b.prio);

          const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                        document.querySelector('input[name="_token"]')?.value;

          if (!token) {
              console.error('❌ Koszary: Brak tokena CSRF. Przerwanie.');
          } else {
              for (const it of items) {
                  const label = it.type === 'guards' ? 'Strażnicy' : 'Bojownicy';
                  const actionSuffix = it.type === 'guards' ? 'army_guards' : 'army_warriors';
                  
                  console.log(`⚔️ Trenuję: ${label} (API)...`);

                  try {
                      const response = await fetch(`https://s3.polskamafia.pl/map/building/army/${actionSuffix}`, {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/x-www-form-urlencoded',
                              'X-CSRF-TOKEN': token,
                              'X-Requested-With': 'XMLHttpRequest',
                              'Accept': 'application/json'
                          },
                          body: new URLSearchParams({
                              trainType: it.type,
                              turbo: 0,
                              _token: token
                          }).toString(),
                          credentials: 'same-origin'
                      });

                      if (response.ok) {
                          const data = await response.json();
                          console.log(`✅ Koszary: ${label} przeszkoleni.`, data);
                          showToast(`KOSZARY - ${label} przeszkoleni.`, 'ok');
                      } else {
                          const errorData = await response.json().catch(() => ({}));
                          console.warn(`⏳ Serwer odrzucił trening ${label} (Status: ${response.status}). Być może brak surowców lub czasu.`);
                      }

                      await wait(800);

                  } catch (err) {
                      console.error(`❌ Błąd sieci podczas treningu w koszarach (${label}):`, err);
                  }
              }
          }
      } else {
          console.log("⚡ Energia lub awake poniżej progów – koszary pominięte.");
      }
  }

    if (window.przestepstwaWlaczony) {
      const stats = await GetAttributes(['nerve']);
      if (!stats || stats.nerve < PROGI.przestepstwaMinOdwaga) {
          console.log("📉 Za mało odwagi na przestępstwa – pomijam.");
      } else {
          const crimeId = PROGI.przestepstwaTyp;
          const crimeName = PRZESTEPSTWA_MAPA[crimeId] || `Nieznane (${crimeId})`;
          const actionId = crimeId.replace('i', '');

          const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                        document.querySelector('input[name="_token"]')?.value;

          if (!token) {
              console.error(`❌ Przestępstwa: Brak tokena CSRF. Nie można wykonać ${crimeName}`);
          } else {
              console.log(`👮 Wykonuję przestępstwo (API): ${crimeName}`);

              try {
                  const response = await fetch(`https://s3.polskamafia.pl/map/building/crimes/${actionId}`, {
                      method: 'POST',
                      headers: {
                          'X-CSRF-TOKEN': token,
                          'X-Requested-With': 'XMLHttpRequest',
                          'Accept': 'application/json',
                          'Content-Type': 'application/json'
                      },
                      credentials: 'same-origin'
                  });

                  if (response.ok) {
                      const data = await response.json();
                      console.log(`✅ Sukces: ${crimeName} wykonane.`, data);
                      showToast(`PRZESTEPSTWA - ${crimeName} wykonane.`, 'ok');
                  } else {
                      const errorData = await response.json().catch(() => ({}));
                      console.warn(`⏳ Serwer odrzucił przestępstwo ${crimeName} (Status: ${response.status}). Prawdopodobnie jeszcze niegotowe.`);
                  }
                  await wait(1000); 

              } catch (err) {
                  console.error(`❌ Błąd sieci przy wykonywaniu przestępstwa (${crimeName}):`, err);
              }
          }
      }
  }
  } finally {
    aktualniePracuje = false;
  }
}
 
// Logika statków
async function shipHandler(slot) {
  console.log(`⛵ Statek #${slot} – start sekwencji API...`);

  const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                document.querySelector('input[name="_token"]')?.value;

  if (!token) {
      console.error(`❌ Statek #${slot}: Brak tokena CSRF.`);
      return;
  }

  // Pomocnicza funkcja do wyciągania liczb z tekstu (np. "3459 gr." -> 3459)
  const parseNumber = (str) => {
    if (!str) return 0;
    const cleanStr = str.replace(/\s+/g, '').replace(/\D/g, '');
    return parseInt(cleanStr || "0", 10);
  };

  try {
      // --- KROK 1: Odebranie kasy (GET) ---
      console.log(`💰 Statek #${slot}: Odbieranie zysków...`);
      await fetch(`https://s3.polskamafia.pl/map/boat/${slot}/collect`, {
          method: 'GET',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      await wait(1000);

      // --- KROK 2: Pobranie danych o statku i towarach (Jeden request GET) ---
      console.log(`📏 Sprawdzanie pojemności i towarów statku #${slot}...`);
      const boatRes = await fetch(`https://s3.polskamafia.pl/map/boat/${slot}`, {
          method: 'GET',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const boatHtml = await boatRes.text();
      const boatDoc = new DOMParser().parseFromString(boatHtml, 'text/html');

      // 2a. Wyciąganie pojemności
      const capacityMatch = boatHtml.match(/Pojemność:\s*(\d+)\s*l/i);
      const boatCapacity = capacityMatch ? parseInt(capacityMatch[1], 10) : 0;

      if (boatCapacity <= 0) {
          console.warn(`⚠️ Statek #${slot}: Nie udało się ustalić pojemności.`);
          return;
      }

      // 2b. Wyciąganie ilości towarów z widoku statku
      const methText = boatDoc.querySelector('.static-inv[data-id="meth"] strong')?.textContent;
      const mariText = boatDoc.querySelector('.static-inv[data-id="marijuana"] strong')?.textContent;

      const methAmount = parseNumber(methText);
      const mariAmount = parseNumber(mariText);
      
      console.log(`🚢 Statystyki statku: Pojemność: ${boatCapacity}l | 💊 Amfa: ${methAmount}g | 🌿 Maria: ${mariAmount}g`);

      // --- KROK 3: Logika wyboru towaru ---
      const drugType = methAmount > 0 ? "meth" : "marijuana";
      const stockAmount = drugType === "meth" ? methAmount : mariAmount;
      const sendAmount = Math.min(boatCapacity, stockAmount);

      if (sendAmount <= 0) {
            console.log(`⏳ Statek #${slot}: Brak wybranego towaru (${drugType}) do wysyłki.`);
            return;
      }

      console.log(`🚛 Wybrano towar: ${drugType}. Ilość do wysyłki: ${sendAmount} (z ${stockAmount} dostępnych).`);

      // --- KROK 4: Wysyłka (POST) ---
      const sendRes = await fetch(`https://s3.polskamafia.pl/map/boat/${slot}/send`, {
          method: 'POST',
          headers: {
              'X-CSRF-TOKEN': token,
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
              drugType: drugType,
              amount: boatCapacity,
              _token: token
          }).toString()
      });

      if (sendRes.ok) {
          console.log(`✅ Statek #${slot}: Wypłynął z ładunkiem (${drugType}: ${boatCapacity}).`);
          showToast(`FARM - Statek #${slot} wysłany (${drugType})`, 'ok');
      } else {
          console.error(`❌ Statek #${slot}: Błąd wysyłki (Status: ${sendRes.status}).`);
      }

  } catch (err) {
      console.error(`❌ Błąd krytyczny w module Statek #${slot} (API):`, err.message);
  }
}
 
//logika samoloty
async function planeHandler(slot) {
  console.log(`✈️ Samolot #${slot} – start sekwencji API...`);

  const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                document.querySelector('input[name="_token"]')?.value;

  if (!token) {
      console.error(`❌ Samolot #${slot}: Brak tokena CSRF.`);
      return;
  }

  // Pomocniczy parser liczb (np. "178 l." -> 178)
  const parseNumber = (str) => {
    if (!str) return 0;
    const cleanStr = str.replace(/\s+/g, '').replace(/\D/g, '');
    return parseInt(cleanStr || "0", 10);
  };

  try {
      // --- KROK 1: Odebranie kasy (GET) ---
      console.log(`💰 Samolot #${slot}: Odbieranie zysków...`);
      // Zakładamy analogiczny endpoint do statków dla spójności API
      await fetch(`https://s3.polskamafia.pl/map/plane/${slot}/collect`, {
          method: 'GET',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      await wait(1000);

      // --- KROK 2: Pobranie danych o samolocie i towarach (Jeden request GET) ---
      console.log(`📏 Sprawdzanie pojemności i towarów samolotu #${slot}...`);
      const planeRes = await fetch(`https://s3.polskamafia.pl/map/plane/${slot}`, {
          method: 'GET',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      
      // Pobieramy jako tekst, aby uniknąć błędów parsowania
      const planeHtml = await planeRes.text();
      const planeDoc = new DOMParser().parseFromString(planeHtml, 'text/html');

      // 2a. Wyciąganie pojemności z HTML
      const capacityMatch = planeHtml.match(/Pojemność:\s*(\d+)\s*l/i);
      const planeCapacity = capacityMatch ? parseInt(capacityMatch[1], 10) : 0;

      if (planeCapacity <= 0) {
          console.warn(`⚠️ Samolot #${slot}: Nie udało się ustalić pojemności.`);
          return;
      }

      // 2b. Wyciąganie ilości towarów (Whisky i Piwo) z widoku samolotu
      const whiskyText = planeDoc.querySelector('.static-inv[data-id="whisky"] strong')?.textContent;
      const beerText = planeDoc.querySelector('.static-inv[data-id="beer"] strong')?.textContent;

      const whiskyAmount = parseNumber(whiskyText);
      const beerAmount = parseNumber(beerText);
      
      console.log(`✈️ Statystyki: Pojemność: ${planeCapacity}l | 🥃 Whisky: ${whiskyAmount}l | 🍺 Piwo: ${beerAmount}l`);

      // --- KROK 3: Logika wyboru towaru i ilości ---
      // Logika: jeśli whisky > 0 wysyłamy whisky, w przeciwnym razie piwo
      const drugType = whiskyAmount > 0 ? "whisky" : "beer";
      const availableAmount = drugType === "whisky" ? whiskyAmount : beerAmount;

      // Ilość do wysyłki: mniejsza z wartości (pojemność vs stan magazynowy)
      const sendAmount = Math.min(planeCapacity, availableAmount);

      if (sendAmount <= 0) {
          console.log(`⏳ Samolot #${slot}: Brak towaru (${drugType}) do wysyłki.`);
          return;
      }

      console.log(`🛫 Przygotowanie: ${drugType}, ilość: ${sendAmount}. Wysyłka...`);

      // --- KROK 4: Wysyłka (POST) ---
      const sendRes = await fetch(`https://s3.polskamafia.pl/map/plane/${slot}/send`, {
          method: 'POST',
          headers: {
              'X-CSRF-TOKEN': token,
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
              drugType: drugType,
              amount: sendAmount,
              _token: token
          }).toString()
      });

      // Obsługa odpowiedzi - serwer może zwrócić pusty string przy sukcesie
      const responseText = await sendRes.text();
      if (sendRes.ok || responseText.trim() === "") {
          console.log(`✅ Samolot #${slot}: Wystartował (${drugType}: ${sendAmount}).`);
          showToast(`FARM - Samolot #${slot} Wystartował (${drugType})`, 'ok');
      } else {
          console.error(`❌ Samolot #${slot}: Błąd wysyłki (Status: ${sendRes.status}).`);
      }

  } catch (err) {
      console.error(`❌ Błąd krytyczny w module Samolot #${slot} (API):`, err.message);
  }
}
 
// logika pola 
async function fieldHandler(slot) {
    if (PROGI && PROGI.farmCheckFields === false) {
        console.log("🌾 Pola wyłączone w ustawieniach – pomijam.");
        return { skipped: true };
    }

    // Pobranie statystyk energii
    const stats = await GetAttributes(['energy']);
    if (!stats || stats.energy <= 7) {
        console.log(`⚡ Za mało energii (${stats?.energy || 0}), pomijam pole ${slot}.`);
        return;
    }

    console.log(`🌾 Pole (slot-${slot}) – startuję (API)...`);
    const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                  document.querySelector('input[name="_token"]')?.value;

    if (!token) {
        console.error(`❌ Pole ${slot}: Brak tokena CSRF. Przerwanie.`);
        return;
    }

    try {
        // --- KROK 1: Zbiór plonów (Harvest) ---
        console.log(`🚜 Zbieranie plonów z pola ${slot}...`);
        const harvestRes = await fetch(`https://s3.polskamafia.pl/map/farm/harvest/${slot}`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ _token: token }).toString(),
            credentials: 'same-origin'
        });

        if (harvestRes.ok) {
            console.log(`✅ Pole ${slot}: Plony zebrane.`);
            showToast(`FARM - Pole ${slot}: Plony zebrane.`, 'ok');
        } else {
            const errData = await harvestRes.json().catch(() => ({}));
            console.warn(`⏳ Pole ${slot}: Harvest odrzucony (Status: ${harvestRes.status}). Może puste?`);
        }

        await wait(1000);

        // --- KROK 2: Sadzenie (Plant) ---
        console.log(`🌱 Sadzenie na polu ${slot}...`);
        const plantRes = await fetch(`https://s3.polskamafia.pl/map/farm/plant/${slot}`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ _token: token }).toString(),
            credentials: 'same-origin'
        });

        if (plantRes.ok) {
            console.log(`✅ Pole ${slot}: Nowe rośliny zasiane.`);
            showToast(`FARM - Pole ${slot}: Nowe rośliny zasiane.`, 'ok');
        } else {
            console.warn(`⏳ Pole ${slot}: Plant odrzucony (Status: ${plantRes.status}).`);
        }

        await wait(500);

    } catch (err) {
        console.error(`❌ Błąd API pola-${slot}:`, err.message);
    }
}
 
 
//logika kopalnie
async function mineHandler(slot) {
	if (PROGI && PROGI.farmCheckMines === false) {
		console.log("⛏️ Kopalnie wyłączone w ustawieniach – pomijam.");
		return { skipped: true };
	}
	
	console.log(`⛏️ Kopalnia (slot-${slot}) gotowa – wykonuję akcję (czysty API)...`);

	const token = document.querySelector('meta[name="csrf-token"]')?.content ||
				document.querySelector('input[name="_token"]')?.value;

	if (!token) {
		console.error('❌ Kopalnia: Brak tokena CSRF. Przerwanie.');
		return;
	}

	// --- FUNKCJA POMOCNICZA DLA ZADAŃ PATCH Z ELASTYCZNĄ OBSŁUGĄ ODPOWIEDZI ---
	async function sendMinePatch(action) {
		const url = `https://s3.polskamafia.pl/map/mine/${action}/${slot}`;
		const isCollect = action === 'collect';
		const name = isCollect ? 'Zbieranie Diamentów' : 'Start Kopania';

		try {
			const response = await fetch(url, {
				method: 'PATCH',
				headers: {
					'Accept': 'application/json', 
					'X-CSRF-TOKEN': token,
					'X-Requested-With': 'XMLHttpRequest',
					'Content-Type': 'application/json',
				},
				credentials: 'same-origin'
			});

			// Spróbuj odczytać JSON (dla Collect)
			if (response.headers.get("content-type")?.includes("application/json")) {
				const data = await response.json();

				if (!response.ok) {
					if (data && data.message && (isCollect ? /not ready/i : /not ready|already working/i).test(data.message)) {
						console.log(`⏳ Kopalnia ${slot} (${name}): Oczekiwanie / Już pracuje (msg: ${data.message})`);
					} else {
						console.error(`❌ Kopalnia ${slot} (${name}): Błąd API (${response.status}):`, data);
					}
					return false;
				}

				console.log(`✅ Kopalnia ${slot} (${name}): Sukces (JSON)!`, data);
				return true;
			} 
			
			// Jeśli serwer zwrócił inny typ (prawdopodobnie HTML)
			else {
				// Jeśli status jest 200/204, zakładamy sukces, nawet jeśli otrzymaliśmy HTML.
				if (response.ok || response.status === 204) {
					console.log(`✅ Kopalnia ${slot} (${name}): Sukces (Status ${response.status}). HTML pominięty.`);
          showToast("FARM - Kopalnia: produkcja rozpoczęta", 'ok');
					return true;
				} else {
					// W przypadku błędu (np. 403, 500) odczytujemy tekst błędu (HTML)
					const errorText = await response.text();
					console.error(`❌ Kopalnia ${slot} (${name}): Błąd API (${response.status}). Nieoczekiwany HTML:`, errorText.substring(0, 100) + '...');
					return false;
				}
			}

		} catch (error) {
			console.error(`❌ Błąd sieci/fetch (${name}) dla kopalni ${slot}:`, error);
			return false;
		}
	}
	// --- KROK 1: Odbierz Diamenty ---
	await sendMinePatch('collect');
	await wait(1000); 
	// --- KROK 2: Uruchom ponowne kopanie ---
	await sendMinePatch('start');
}
 
 
// Nazwy „ładne” do logów / UI
const nazwaBud = {
  marihuana: 'Gospodarstwo Marihuany',
  amfa:      'Laboratorium Amfy',
  browar:    'Browar',
  whisky:    'Destylarnia Whisky',
  burdel:    'Burdel',
  silownia:  'Siłownia',
  koszary:   'Koszary',
  bank:      'Bank (Pranie)',
  gieldaPracy: 'Giełda Pracy',
};
 
// 2) Domyślne akcje dla pojazdów
const vehicleHandlers = {
  async ship({ el, slot }) {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(300);
    (document.querySelector('a.collectResources, a.btn.btn-secondary.btn-sm.collect, a.loadShip') || {}).click?.();
    await wait(150);
    (document.querySelector('a.sendShip, a.startTransport, a.btn.btn-secondary.btn-sm.start') || {}).click?.();
    await wait(150);
    zamknijOknoModalne();
  },
  async plane({ el, slot }) {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(300);
    (document.querySelector('a.collectPlane, a.btn.btn-secondary.btn-sm.collect') || {}).click?.();
    await wait(150);
    (document.querySelector('a.sendPlane, a.startFlight, a.btn.btn-secondary.btn-sm.start') || {}).click?.();
    await wait(150);
    zamknijOknoModalne();
  }
};
 
// 3) Zbiór celów do obejścia w jednej pętli
function collectTargets({ log=false } = {}) {
  const map = Object.create(null);
 
  // — budynki po nazwach 
  const found = scanBuildings({ log });
  for (const k of Object.keys(found)) {
    map[k] = { type: 'building', ...found[k] }; 
  }
 
  // — kopalnie w stałych slotach 29..34
  for (let i = 29; i <= 34; i++) {
    const tile = document.querySelector(`div.b-l.b-i[data-ps='${i}']`);
    const path = document.querySelector(`path[data-sl='${i}']`);
    const el = tile || path;           
    if (el) map[`kopalnia${i}`] = { type: 'mine', el, tile, path, slot: i, label: `kopalnia ${i}` };
  }
 
  // — POLA 35..54 
  for (let i = 35; i <= 54; i++) {
    const slotDiv  = document.querySelector(`.slot-${i}`);
    if (!slotDiv) continue;
 
    const timeLeft = slotDiv.getAttribute("time-left") || "";
    const path     = document.querySelector(`path[data-sl='${i}']`);
 
    map[`pole${i}`] = {
      type: 'field',
      el: slotDiv,     
      path,           
      slot: i,
      timeLeft
    };
  }
 
  // — statki i samoloty
  for (let i = 1; i <= 9; i++) {
    const ship = document.querySelector(`div.ship.ship-${i}`);
    if (ship) map[`ship-${i}`] = { type:'ship', el: ship, slot: i };
 
    const plane =
      document.querySelector(`div.plane.plane-${i}`) ||
      document.querySelector(`div.airplane.plane-${i}`);
    if (plane) map[`plane-${i}`] = { type:'plane', el: plane, slot: i };
  }
  return map;
}
 
// 4) Nazwa do logu
function prettyName(key, item) {
  if (item?.type === 'building') return nazwaBud[key] || item.label || key;
  if (item?.type === 'ship')     return `Statek #${item.slot}`;
  if (item?.type === 'plane')    return `Samolot #${item.slot}`;
  if (item?.type === 'mine')     return `Kopalnia #${item.slot}`;
  return key;
}
 
// === FARM: Konfiguracja budynków ===
const budynki = {
  marihuana: async function () {
    const BUILDING_ID = 27; // ID przypisane na twardo do Gospodarstwa Marihuany
    console.log(`🌿 Gospodarstwo Marihuany (ID: ${BUILDING_ID}) – start sekwencji API…`);
    
    const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                  document.querySelector('input[name="_token"]')?.value;

    if (!token) {
        console.error("❌ Marihuana: Brak tokena CSRF.");
        return;
    }

    try {
        // --- KROK 1: Pobranie ID zbioru z widoku budynku 27 ---
        const buildingRes = await fetch(`https://s3.polskamafia.pl/map/building/show/${BUILDING_ID}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const buildingHtml = await buildingRes.text();
        
        const harvestMatch = buildingHtml.match(/action="\/map\/building\/agriculture\/harvest\/(\d+)"/);
        
        if (harvestMatch && harvestMatch[1]) {
            const harvestId = harvestMatch[1];
            console.log(`🚜 Zbieranie marihuany (Harvest ID: ${harvestId})...`);

            // --- KROK 2: Wysyłanie DELETE dla konkretnego zbioru ---
            await fetch(`https://s3.polskamafia.pl/map/building/agriculture/harvest/${harvestId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ _token: token }).toString()
            });
            console.log("✅ Plon zebrany.");
            await wait(1200);
        } else {
            console.log("⏳ Brak marihuany gotowej do zebrania.");
        }

        // --- KROK 3: Pobranie aktualnej ilości nasion do zakupu z budynku 27 ---
        const refreshRes = await fetch(`https://s3.polskamafia.pl/map/building/show/${BUILDING_ID}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const refreshHtml = await refreshRes.text();
        
        const amountMatch = refreshHtml.match(/name="amount".*value="(\d+)"/);
        
        // Jeśli znaleziono wartość, kupujemy. Jeśli nie - skipujemy do sadzenia.
        if (amountMatch && amountMatch[1]) {
            const seedsAmount = amountMatch[1];
            console.log(`🛒 Kupowanie nasion: ${seedsAmount} szt. (API POST)`);

            const buyRes = await fetch('https://s3.polskamafia.pl/map/building/agriculture/buy-potseeds', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ 
                    amount: seedsAmount,
                    _token: token 
                }).toString()
            });

            if (buyRes.ok) {
                console.log("✅ Nasiona zakupione.");
                await wait(1000);
            } else {
                console.warn("⚠️ Błąd podczas zakupu nasion, ale próbuję sadzić...");
            }
        } else {
            console.log("⏭️ Nie znaleziono sugerowanej ilości nasion - pomijam zakup i idę do sadzenia.");
        }

        // --- KROK 4: Zasadzenie ---
        console.log("🌱 Zasadzanie (API POST)...");
        await fetch('https://s3.polskamafia.pl/map/building/agriculture/plant-land', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ _token: token }).toString()
        });
        console.log("✅ Operacja zasadzania zakończona.");
        showToast("FARM - Marihuana: produkcja rozpoczęta", 'ok');

    } catch (err) {
        console.error("❌ Błąd krytyczny w module Gospodarstwo Marihuany (API):", err.message);
    }
  },
 
  whisky: async function () {
    const BUILDING_ID = 24;
    console.log(`🥃 Destylarnia Whisky (ID: ${BUILDING_ID}) – start sekwencji API…`);
    
    const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                  document.querySelector('input[name="_token"]')?.value;

    if (!token) {
        console.error("❌ Whisky: Brak tokena CSRF.");
        return;
    }

    try {
        // --- KROK 1: Pobranie ID zbioru z widoku budynku 24 ---
        const buildingRes = await fetch(`https://s3.polskamafia.pl/map/building/show/${BUILDING_ID}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const buildingHtml = await buildingRes.text();
        
        const harvestMatch = buildingHtml.match(/action="\/map\/building\/whiskydistillery\/harvest\/(\d+)"/);
        
        if (harvestMatch && harvestMatch[1]) {
            const harvestId = harvestMatch[1];
            console.log(`🚜 Odbieranie whisky (Harvest ID: ${harvestId})...`);

            // --- KROK 2: Wysyłanie DELETE dla konkretnego zbioru ---
            await fetch(`https://s3.polskamafia.pl/map/building/whiskydistillery/harvest/${harvestId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ _token: token }).toString()
            });
            console.log("✅ Whisky odebrana.");
            await wait(1200);
        } else {
            console.log("⏳ Brak whisky gotowej do odbioru.");
        }

        // --- KROK 3: Pobranie aktualnej ilości pszenicy do zakupu ---
        const refreshRes = await fetch(`https://s3.polskamafia.pl/map/building/show/${BUILDING_ID}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const refreshHtml = await refreshRes.text();
        
        const amountMatch = refreshHtml.match(/name="amount".*value="(\d+)"/);
        
        // Jeśli znaleziono wartość, wykonujemy zakup. Jeśli nie - skipujemy do produkcji.
        if (amountMatch && amountMatch[1]) {
            const wheatAmount = amountMatch[1];
            console.log(`🛒 Kupowanie pszenicy: ${wheatAmount} szt. (API POST)`);

            const buyRes = await fetch('https://s3.polskamafia.pl/map/building/whiskydistillery/buyWheat', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ 
                    amount: wheatAmount,
                    ingredient: 'wheat'
                }).toString()
            });

            if (buyRes.ok) {
                console.log("✅ Pszenica zakupiona.");
                await wait(1000);
            } else {
                console.warn("⚠️ Błąd podczas zakupu pszenicy, ale próbuję produkować...");
            }
        } else {
            console.log("⏭️ Nie znaleziono sugerowanej ilości pszenicy - pomijam zakup i idę do produkcji.");
        }

        // --- KROK 4: Rozpoczęcie produkcji Whisky ---
        console.log("🏭 Rozpoczynanie produkcji (API POST)...");
        const produceRes = await fetch('https://s3.polskamafia.pl/map/building/whiskydistillery/makewhisky', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ _token: token }).toString()
        });

        if (produceRes.ok) {
            console.log("✅ Produkcja whisky została uruchomiona.");
            showToast("FARM - Whisky: produkcja rozpoczęta", 'ok');
        } else {
            console.warn("❌ Nie udało się uruchomić produkcji.");
        }

    } catch (err) {
        console.error("❌ Błąd krytyczny w module Destylarnia Whisky (API):", err.message);
    }
  },
 
  amfa: async function () {
    const BUILDING_ID = 21;
    console.log(`⚗️ Laboratorium Amfy (ID: ${BUILDING_ID}) – start sekwencji API…`);
    
    const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                  document.querySelector('input[name="_token"]')?.value;

    if (!token) {
        console.error("❌ Amfa: Brak tokena CSRF.");
        return;
    }

    try {
        // --- KROK 1: Podgląd budynku i pobranie ID zbioru (GET) ---
        const buildingRes = await fetch(`https://s3.polskamafia.pl/map/building/show/${BUILDING_ID}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const buildingHtml = await buildingRes.text();
        
        const collectMatch = buildingHtml.match(/action="\/map\/building\/methlab\/collect\/(\d+)"/);
        
        if (collectMatch && collectMatch[1]) {
            const collectId = collectMatch[1];
            console.log(`🚜 Zbieranie gotowej amfy (Collect ID: ${collectId})...`);

            // --- KROK 2: Wysyłanie DELETE dla zbioru ---
            await fetch(`https://s3.polskamafia.pl/map/building/methlab/collect/${collectId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ _token: token }).toString()
            });
            console.log("✅ Amfetamina odebrana.");
            await wait(1200);
        } else {
            console.log("⏳ Brak amfetaminy do odebrania.");
        }

        // --- KROK 3: Sprawdzenie wymaganej ilości tabletek (GET) ---
        const refreshRes = await fetch(`https://s3.polskamafia.pl/map/building/show/${BUILDING_ID}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const refreshHtml = await refreshRes.text();
        
        const amountMatch = refreshHtml.match(/name="amount".*value="(\d+)"/);
        
        // Jeśli znaleziono wartość, kupujemy. Jeśli nie - omijamy ten krok.
        if (amountMatch && amountMatch[1]) {
            const pillsAmount = amountMatch[1];
            console.log(`🛒 Kupowanie tabletek: ${pillsAmount} szt. (API POST)`);

            // --- KROK 4: Kupowanie tabletek (POST) ---
            const buyRes = await fetch('https://s3.polskamafia.pl/map/building/methlab/buy-coldpills', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ 
                    amount: pillsAmount,
                    _token: token 
                }).toString()
            });

            if (buyRes.ok) {
                console.log("✅ Tabletki zakupione.");
                await wait(1000);
            } else {
                console.warn("⚠️ Błąd podczas zakupu tabletek, próbuję przejść do produkcji...");
            }
        } else {
            console.log("⏭️ Nie znaleziono sugerowanej ilości tabletek - omijam zakup.");
        }

        // --- KROK 5: Rozpoczęcie produkcji (POST) ---
        console.log("🏭 Rozpoczynanie produkcji (boil) (API POST)...");
        const boilRes = await fetch('https://s3.polskamafia.pl/map/building/methlab/boil', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ _token: token }).toString()
        });

        if (boilRes.ok) {
            console.log("✅ Produkcja amfy została uruchomiona.");
            showToast("FARM - Amfetamina: produkcja rozpoczęta", 'ok');
        } else {
            console.warn("❌ Nie udało się uruchomić produkcji.");
        }

    } catch (err) {
        console.error("❌ Błąd krytyczny w module Laboratorium Amfy (API):", err.message);
    }
  },
 
  browar: async function () {
    const BUILDING_ID = 29;
    console.log(`🍺 Browar (ID: ${BUILDING_ID}) – start sekwencji API…`);
    
    const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                  document.querySelector('input[name="_token"]')?.value;

    if (!token) {
        console.error("❌ Browar: Brak tokena CSRF.");
        return;
    }

    try {
        // --- KROK 1: Podgląd budynku i pobranie ID zbioru (GET) ---
        const buildingRes = await fetch(`https://s3.polskamafia.pl/map/building/show/${BUILDING_ID}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const buildingHtml = await buildingRes.text();
        
        const harvestMatch = buildingHtml.match(/action="\/map\/building\/beerbrewery\/harvest\/(\d+)"/);
        
        if (harvestMatch && harvestMatch[1]) {
            const harvestId = harvestMatch[1];
            console.log(`🚜 Zbieranie piwa (Harvest ID: ${harvestId})...`);

            // --- KROK 2: Wysyłanie DELETE dla zbioru ---
            await fetch(`https://s3.polskamafia.pl/map/building/beerbrewery/harvest/${harvestId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ _token: token }).toString()
            });
            console.log("✅ Piwo zebrane.");
            await wait(1200);
        } else {
            console.log("⏳ Brak piwa gotowego do zebrania.");
        }

        // --- KROK 3: Kupowanie składników (POST) ---
        const hopsAmount = Number(PROGI.farmHops ?? DEFAULTS.farmHops);
        const barleyAmount = Number(PROGI.farmBarley ?? DEFAULTS.farmBarley);

        console.log(`🛒 Kupowanie składników: Chmiel (${hopsAmount}), Jęczmień (${barleyAmount})`);

        // Zakup Chmielu (Hops)
        const hopsRes = await fetch('https://s3.polskamafia.pl/map/building/beerbrewery/buyHops', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ 
                amount: hopsAmount,
                ingredient: 'hops',
                _token: token 
            }).toString()
        });

        if (hopsRes.ok) console.log("✅ Chmiel zakupiony.");
        await wait(1000);

        // Zakup Jęczmienia (Barley)
        const barleyRes = await fetch('https://s3.polskamafia.pl/map/building/beerbrewery/buyBarley', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ 
                amount: barleyAmount,
                ingredient: 'barley',
                _token: token 
            }).toString()
        });

        if (barleyRes.ok) console.log("✅ Jęczmień zakupiony.");
        await wait(1000);

        // --- KROK 4: Rozpoczęcie produkcji (POST) ---
        console.log("🏭 Rozpoczynanie produkcji piwa (boilBeer)...");
        const boilRes = await fetch('https://s3.polskamafia.pl/map/building/beerbrewery/boilBeer', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ _token: token }).toString()
        });

        if (boilRes.ok) {
            console.log("✅ Warzenie piwa zostało rozpoczęte.");
            showToast("FARM - Browar: produkcja rozpoczęta", 'ok');
        } else {
            console.warn("❌ Nie udało się rozpocząć produkcji piwa.");
        }

    } catch (err) {
        console.error("❌ Błąd krytyczny w module Browar (API):", err.message);
    }
  },
 
  burdel: async function (ctx) {
    console.log(`💃 ${nazwaBud.burdel} (ps=${ctx.ps}) – start sekwencji API…`);
    
    const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                  document.querySelector('input[name="_token"]')?.value;

    if (!token) {
        console.error("❌ Burdel: Brak tokena CSRF.");
        return;
    }

    try {
        // --- KROK 1: Odebranie kasy (GET) ---
        console.log("💰 Próba odebrania pieniędzy przez API...");
        const finishRes = await fetch('https://s3.polskamafia.pl/map/building/brothel/finishWork', {
            method: 'GET',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });

        if (finishRes.ok) {
            const data = await finishRes.json();
            console.log("✅ Pieniądze odebrane.", data.message || "");
        } else {
            console.warn(`⏳ FinishWork odrzucony (Status: ${finishRes.status}). Może praca jeszcze trwa?`);
        }

        await wait(1000);

        // --- KROK 2: Start roboty (GET) ---
        console.log("🚀 Wysyłanie do pracy przez API...");
        const startRes = await fetch('https://s3.polskamafia.pl/map/building/brothel/startWork', {
            method: 'GET',
            headers: {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });

        const startText = await startRes.text();
        
        if (startRes.ok || startText.trim() === "") {
            console.log("✅ Praca rozpoczęta pomyślnie (API).");
            showToast("FARM - Burdel: produkcja rozpoczęta", 'ok');
        } else {
            console.warn("⚠️ Serwer zwrócił odpowiedź, która może oznaczać błąd lub brak gotowości.");
        }

    } catch (err) {
        console.error("❌ Błąd krytyczny w module Burdel (API):", err.message);
    }
  },

  bank: async function (ctx) {
    if (!PROGI.autoCollectLaundry) {
      console.log("🏦 Pranie pieniędzy wyłączone w Dodatkach, pomijam.");
      return;
    }

    console.log(`🏦 ${nazwaBud.bank} (ps=${ctx.ps}) – start akcji (API)...`);
  
    const getToken = () => document.querySelector('meta[name="csrf-token"]')?.content ||
                       document.querySelector('input[name="_token"]')?.value;

    const token = getToken();

    if (!token) {
      console.error('❌ Bank: Brak tokena CSRF. Przerwanie.');
      return;
    }

    const url = 'https://s3.polskamafia.pl/map/building/bank/collectLaunderedMoney';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', 
          'Accept': 'application/json, text/plain, */*',
          'X-CSRF-TOKEN': token,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: new URLSearchParams({
          _token: token
        }).toString(),
        credentials: 'same-origin'
      });

      const data = await response.json();

      if (!response.ok) {
        if (data && data.message && /not ready/i.test(data.message)) {
          console.log("⏳ Bank (Pranie): Pieniądze nie są jeszcze gotowe do odbioru.");
        } else {
          console.error(`❌ Bank (Pranie): Błąd API (${response.status}):`, data);
        }
      } else {
        console.log('✅ Bank (Pranie): Odebrano pieniądze pomyślnie! Odpowiedź serwera:', data);
        showToast("FARM - Bank: pieniądze odebrane", 'ok');
      }

    } catch (err) {
      console.error("❌ Błąd sieci/fetch w logice Banku:", err);
    }
    await wait(1000);
  },


	gieldaPracy: async function (ctx) {
		if (!PROGI.autoCheckJobMarket) {
			console.log("👷 Giełda Pracy wyłączona w Farm, pomijam całą sekwencję (Wynagrodzenie + Dzienny Prezent/Skrzynka).");
			return;
		}
	
		console.log(`👷 ${nazwaBud.gieldaPracy} – start sekwencji: Wynagrodzenie, Skrzynka, Prezent.`);
		
		const getToken = () => document.querySelector('meta[name="csrf-token"]')?.content ||
					document.querySelector('input[name="_token"]')?.value;

		const token = getToken();

		if (!token) {
			console.error('❌ Giełda Pracy/Dzienny Odbiór: Brak tokena CSRF. Przerwanie.');
			return;
		}


		// --- A. Odbiór Wynagrodzenia (oryginalna akcja Giełdy Pracy) ---
		try {
			const url = 'https://s3.polskamafia.pl/map/building/mafiahouse/collectSalary';
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'X-CSRF-TOKEN': token,
					'X-Requested-With': 'XMLHttpRequest',
				},
				credentials: 'same-origin'
			});

			const data = await response.json();
			
			if (!response.ok) {
				if (data && data.message && /not ready/i.test(data.message)) {
					console.log("⏳ Wynagrodzenie: Nie gotowe do odbioru.");
				} else {
					console.error(`❌ Wynagrodzenie: Błąd HTTP ${response.status}:`, data);
				}
			} else {
				console.log('✅ Wynagrodzenie: Odebrane pomyślnie.', data);
        showToast("FARM - Giełda pracy: dniówka odebrana", 'ok');
			}
		} catch (err) {
			console.error('❌ Błąd w logice Odbiór Wynagrodzenia (fetch):', err);
		}

		await wait(500);


		// --- B. Odbiór Codziennej Skrzynki (Daily Chest) ---
		try {
			const url = 'https://s3.polskamafia.pl/daily-chest';
			
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept': 'application/json',
					'X-CSRF-TOKEN': token,
					'X-Requested-With': 'XMLHttpRequest',
				},
				body: new URLSearchParams({
					_token: token
				}).toString(),
				credentials: 'same-origin'
			});

			const data = await response.json();
			
			if (!response.ok) {
				if (data && data.message && /not available/i.test(data.message)) {
					console.log("⏳ Codzienna Skrzynka: Jeszcze niedostępna.");
				} else {
					console.error(`❌ Codzienna Skrzynka: Błąd HTTP ${response.status}:`, data);
				}
			} else {
				console.log('🎉 Codzienna Skrzynka: Odebrana pomyślnie!', data);
        showToast("FARM - Skrzynka: Codzienna skrzynka odebrana", 'ok');
			}
		} catch (error) {
			console.error('❌ Błąd w logice Odbiór Skrzynki (fetch):', error);
		}

		await wait(500); 


		// --- C. Odbiór Dziennego Prezentu (Daily Gift) ---
		try {
			const url = 'https://s3.polskamafia.pl/daily-gift';
			
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept': 'application/json',
					'X-CSRF-TOKEN': token,
					'X-Requested-With': 'XMLHttpRequest',
				},
				body: new URLSearchParams({
					_token: token
				}).toString(),
				credentials: 'same-origin'
			});

			const data = await response.json();
			
			if (!response.ok) {
				if (data && data.message && /not available/i.test(data.message)) {
					console.log("⏳ Dzienny Prezent: Jeszcze niedostępny.");
				} else {
					console.error(`❌ Dzienny Prezent: Błąd HTTP ${response.status}:`, data);
				}
			} else {
				console.log('🎁 Dzienny Prezent: Odebrany pomyślnie!', data);
        showToast("FARM - Diaxy: Codzienna diaxy odebrane", 'ok');
			}
		} catch (error) {
			console.error('❌ Błąd w logice Odbiór Prezentu (fetch):', error);
		}
	},
 
  "kopalnia29": async function kopalnia29(ctx) {
  await mineHandler(29);
  },
 
  "kopalnia30": async function kopalnia30(ctx) {
    await mineHandler(30);
  },
 
  "kopalnia31": async function kopalnia31(ctx) {
    await mineHandler(31);
  },
 
  "kopalnia32": async function kopalnia32(ctx) {
    await mineHandler(32);
  },
 
  "kopalnia33": async function kopalnia33(ctx) {
    await mineHandler(33);
  },
 
  "kopalnia34": async function kopalnia34(ctx) {
    await mineHandler(34);
  },
 
  "ship-1": async function lodka1(ctx) {
    await shipHandler(1);
  },
 
  "ship-2": async function lodka2(ctx) {
    await shipHandler(2);
  },
 
  "ship-3": async function lodka3(ctx) {
    await shipHandler(3);
  },
 
  "ship-4": async function lodka4(ctx) {
    await shipHandler(4);
  },
 
  "ship-5": async function lodka5(ctx) {
    await shipHandler(5);
  },
 
  "ship-6": async function lodka6(ctx) {
    await shipHandler(6);
  },
 
  "ship-7": async function lodka7(ctx) {
    await shipHandler(7);
  },
 
  "ship-8": async function lodka8(ctx) {
    await shipHandler(8);
  },
 
  "ship-9": async function lodka9(ctx) {
    await shipHandler(9);
  },
 
  "plane-1": async function samolot1(ctx) {
    await planeHandler(1);
  },
 
  "plane-2": async function samolot2(ctx) {
    await planeHandler(2);
  },
 
  "plane-3": async function samolot3(ctx) {
    await planeHandler(3);
  },
 
  "plane-4": async function samolot4(ctx) {
    await planeHandler(4);
  },
 
  "plane-5": async function samolot5(ctx) {
    await planeHandler(5);
  },
 
  "plane-6": async function samolot6(ctx) {
    await planeHandler(6);
  },
 
  "plane-7": async function samolot7(ctx) {
    await planeHandler(7);
  },
 
  "plane-8": async function samolot8(ctx) {
    await planeHandler(8);
  },
 
  "plane-9": async function samolot9(ctx) {
    await planeHandler(9);
  },
};

// 2) HUD
function initHUD() {
    // — kontener
    const hud = document.createElement('div');
    hud.className = 'mp-hud';
    hud.innerHTML = `
      <div class="mp-grab" title="Przeciągnij" aria-label="Przeciągnij" role="button">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <!-- strzałka w górę -->
          <path d="M12 3 L12 9 M12 3 L9 6 M12 3 L15 6"/>
          <!-- strzałka w prawo -->
          <path d="M21 12 L15 12 M21 12 L18 9 M21 12 L18 15"/>
          <!-- strzałka w dół -->
          <path d="M12 21 L12 15 M12 21 L9 18 M12 21 L15 18"/>
          <!-- strzałka w lewo -->
          <path d="M3 12 L9 12 M3 12 L6 9 M3 12 L6 15"/>
          <!-- kropka w środku -->
          <circle cx="12" cy="12" r="1.2"/>
        </svg>
      </div>
      <button type="button" class="mp-btn mp-orient" title="Orientacja">↕</button>
      <button type="button" class="mp-btn mp-settings" title="Ustawienia">⚙</button>
      <div class="mp-sep" aria-hidden="true"></div>
      <button type="button" class="mp-btn mp-bot" title="BOT">B</button>
      <button type="button" class="mp-btn mp-farm" title="FARM">F</button>
      <button type="button" class="mp-btn mp-gym" title="SIŁKA">S</button>
      <button type="button" class="mp-btn mp-barracks" title="KOSZARY">K</button>
      <button type="button" class="mp-btn mp-przestepstwa" title="PRZESTĘPSTWA">P</button>
    `;
    document.body.appendChild(hud);
    

    // — panel ustawień (dropdown)
    const panel = document.createElement('div');
    panel.className = 'mp-panel';
    panel.innerHTML = `
      <!-- pasek zakładek -->
      <div class="mp-tabs" role="tablist" aria-label="Ustawienia bota">
        <div class="mp-tab is-active"  data-tab="bot"     role="tab" aria-selected="true"  tabindex="0">Bot</div>
        <div class="mp-tab"            data-tab="farm" role="tab" aria-selected="false" tabindex="-1">Farm</div>
        <div class="mp-tab"            data-tab="silka" role="tab" aria-selected="false" tabindex="-1">Siłownia</div>
        <div class="mp-tab"            data-tab="barracks" role="tab" aria-selected="false" tabindex="-1">Koszary</div>
        <div class="mp-tab"             data-tab="przestepstwa" role="tab" aria-selected="false" tabindex="-1">Przestępstwa</div>
        <div class="mp-tab"            data-tab="extra"   role="tab" aria-selected="false" tabindex="-1">Dodatki</div>
      </div>

      <!-- przewijana część -->
      <div class="mp-scroll">

        <!-- Zakładka: Bot (Twoje aktualne ustawienia) -->
        <div class="mp-group is-active" data-tab="bot">
          <div class="mp-caption">Ustawienia: Bot</div>
          <div class="mp-row" style="color:#93a0c0">
            Bot automatycznie atakuje graczy.
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Min energia</span>
              <div class="mp-help" data-tip="Minimalny poziom energii, aby bot zadziałał.">?</div>
            </div>
            <input id="inp-energia" type="number" min="0" class="mp-input"/>
          </div>

          <div class="mp-row">
            <div class="mp-label">
              <span>Min odwaga</span>
              <div class="mp-help" data-tip="Minimalna odwaga wymagana do akcji.">?</div>
            </div>
            <input id="inp-odwaga" type="number" min="0" class="mp-input"/>
          </div>

          <div class="mp-row">
            <div class="mp-label">
              <span>Max lvl przeciwnika</span>
              <div class="mp-help" data-tip="Górny limit poziomu celu.">?</div>
            </div>
            <input id="inp-lvl" type="number" min="1" class="mp-input"/>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Akcja bota</span>
              <div class="mp-help" data-tip="Wybierz, co bot ma robić na celu. Tylko jedna akcja może być aktywna.">?</div>
            </div>
            <div class="mp-matrix" style="grid-template-columns:88px repeat(3, 80px)">
              <div class="mx-head"></div>
              <div class="mx-head">Atak</div>
              <div class="mx-head">Kradzież</div>
              <div class="mx-head no-br">Bank</div>
              <div class="mx-label no-bb">Włączone</div>
              <label class="mx-cell no-bb"><input id="chk-bot-atk" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-bb"><input id="chk-bot-stl" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-br no-bb"><input id="chk-bot-bnk" type="checkbox" class="mx-check"></label>
            </div>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Kogo atakować</span>
              <div class="mp-help" data-tip="Filtr ofiar w wyszukiwarce.">?</div>
            </div>
            <select id="sel-victimsType" class="mp-select">
              <option value="all">Wszyscy gracze</option>
              <option value="not-active">Nieaktywni gracze</option>
              <option value="not-active-gang">Nieaktywni członkowie gangu</option>
              <option value="active-gang">Aktywni członkowie gangu</option>
              <option value="enemies">Twoi wrogowie</option>
              <option value="selected">Wybrani gracze (po ID)</option>
            </select>
          </div>

          <div class="mp-row">
            <div class="mp-label">
              <span>Globalne opóźnienie (ms)</span>
              <div class="mp-help" data-tip="Dodawane do każdego oczekiwania (nie dotyczy stałych).">?</div>
            </div>
            <input id="inp-delay" type="number" min="0" class="mp-input"/>
          </div>

          <div class="mp-row">
            <div class="mp-label">
              <span>Czas działania (h)</span>
              <div class="mp-help" data-tip="0 = bez limitu; 1–12 = auto-stop po tylu godzinach.">?</div>
            </div>
            <input id="inp-runtime" type="number" min="0" max="12" class="mp-input"/>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Korzystanie z diaxów</span>
              <div class="mp-help" data-tip="Pozwól używać diaxów.">?</div>
            </div>
            <div class="mp-label">
                <label class="mx-inline">
                  <input id="chk-diax"  type="checkbox" class="mx-check">
                </label>
            </div>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Czarna lista (nick_1,nick_2)</span>
              <div class="mp-help" data-tip="Gracze, którzy nie będą atakowani. Oddziel nicki przecinkiem lub nową linią.">?</div>
            </div>
            <textarea id="inp-attack-blacklist" class="mp-textarea"></textarea>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Wybrani (id_1,id_2)</span>
              <div class="mp-help" data-tip="Lista ID graczy do atakowania.">?</div>
            </div>
            <textarea id="inp-attack-whitelist" class="mp-textarea"></textarea>
          </div>
        </div>

        <div class="mp-group" data-tab="farm">
          <div class="mp-caption">Ustawienia: Farm</div>
          <div class="mp-row" style="color:#93a0c0">
            Farm zbiera automatycznie surowce i wysyła je statkami/samolotami.
          </div>
          <div class="mp-row">
            <div class="mp-label" style="justify-content:space-between">
              <span>Obsługiwane statki / samoloty</span>
              <div class="mp-help" data-tip="Zaznacz sloty (1–9), które skrypt ma obsługiwać. Niezaznaczone są pomijane.">?</div>
            </div>

            <div class="mp-matrix" id="mx-vehicles">
              <!-- wiersz nagłówków -->
              <div class="mx-head">wł/wył</div>
              <div class="mx-head">1</div><div class="mx-head">2</div><div class="mx-head">3</div>
              <div class="mx-head">4</div><div class="mx-head">5</div><div class="mx-head">6</div>
              <div class="mx-head">7</div><div class="mx-head">8</div><div class="mx-head no-br">9</div>

              <!-- wiersz STATKI -->
              <div class="mx-label">statki</div>
              <label class="mx-cell"><input id="cb-ship-1"  type="checkbox" class="mx-check"></label>
              <label class="mx-cell"><input id="cb-ship-2"  type="checkbox" class="mx-check"></label>
              <label class="mx-cell"><input id="cb-ship-3"  type="checkbox" class="mx-check"></label>
              <label class="mx-cell"><input id="cb-ship-4"  type="checkbox" class="mx-check"></label>
              <label class="mx-cell"><input id="cb-ship-5"  type="checkbox" class="mx-check"></label>
              <label class="mx-cell"><input id="cb-ship-6"  type="checkbox" class="mx-check"></label>
              <label class="mx-cell"><input id="cb-ship-7"  type="checkbox" class="mx-check"></label>
              <label class="mx-cell"><input id="cb-ship-8"  type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-br"><input id="cb-ship-9"  type="checkbox" class="mx-check"></label>

              <!-- wiersz SAMOLOTY -->
              <div class="mx-label no-bb">samoloty</div>
              <label class="mx-cell no-bb"><input id="cb-plane-1" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-bb"><input id="cb-plane-2" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-bb"><input id="cb-plane-3" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-bb"><input id="cb-plane-4" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-bb"><input id="cb-plane-5" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-bb"><input id="cb-plane-6" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-bb"><input id="cb-plane-7" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-bb"><input id="cb-plane-8" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-br no-bb"><input id="cb-plane-9" type="checkbox" class="mx-check"></label>
            </div>
          </div>
          <!-- Włączniki: kopalnie / pola -->
          <div class="mp-row">
            <div class="mp-label">
              <span>Sprawdzaj kopalnie</span>
              <div class="mp-help" data-tip="Pozwól skryptowi kopać diamenty">?</div>
            </div>
            <div class="mp-label">
                <label class="mx-inline">
                  <input id="chk-farm-mines"  type="checkbox" class="mx-check">
                </label>
            </div>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Sprawdzaj pola</span>
              <div class="mp-help" data-tip="Pozwól zbierać i sadzić plony.">?</div>
            </div>
            <div class="mp-label">
                <label class="mx-inline">
                  <input id="chk-farm-fields"  type="checkbox" class="mx-check">
                </label>
            </div>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Sprawdzaj pralnie pieniędzy</span>
              <div class="mp-help" data-tip="Automatycznie odbiera pieniądze z banku po wypraniu.">?</div>
            </div>
            <div class="mp-label">
              <label class="mx-inline">
                <input id="chk-auto-collect-laundry" type="checkbox" class="mx-check">
              </label>
            </div>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Sprawdzaj giełdę pracy oraz codzienne nagrody</span>
              <div class="mp-help" data-tip="Automatycznie odbiera wynagrodzenie z giełdy pracy oraz dzienne nagrody.">?</div>
            </div>
            <div class="mp-label">
              <label class="mx-inline">
                <input id="chk-farm-jobmarket" type="checkbox" class="mx-check">
              </label>
            </div>
          </div>
          <div class="mp-row">
            <div class="mp-label">
              <span>Ile kupić chmielu</span>
              <div class="mp-help" data-tip="Ilość chmielu kupowana za każdym razem, gdy skrypt odwiedzi Browar.">?</div>
            </div>
            <input id="inp-farm-hops" type="number" min="0" class="mp-input" />
          </div>

          <div class="mp-row">
            <div class="mp-label">
              <span>Ile kupić jęczmienia</span>
              <div class="mp-help" data-tip="Ilość jęczmienia kupowana za każdym razem, gdy skrypt odwiedzi Browar.">?</div>
            </div>
            <input id="inp-farm-barley" type="number" min="0" class="mp-input" />
          </div>
        </div>

        <!-- Zakładka: silka -->
        <div class="mp-group" data-tab="silka">
          <div class="mp-caption">Ustawienia: Siłownia</div>
          <div class="mp-row" style="margin-top:14px">
            <div class="mp-row" style="color:#93a0c0">
              Priorytety ulepszania statystyk.
            </div>
            <div class="mp-row">
              <div class="mp-label" style="justify-content:space-between">
                <span>Aktywuj siłownię od energii (≥)</span>
                <div class="mp-help" data-tip="Minimalna wartość energii do trenowania.">?</div>
              </div>
              <input id="inp-gym-energy" type="number" min="0" class="mp-input" />
            </div>

            <div class="mp-row">
              <div class="mp-label" style="justify-content:space-between">
                <span>Aktywuj siłownię od szczęścia (≥)</span>
                <div class="mp-help" data-tip="Minimalna wartość szczęścia do trenowania.">?</div>
              </div>
              <input id="inp-gym-awake" type="number" min="0" class="mp-input" />
            </div>
            <div class="mp-row">
              <div class="mp-label" style="justify-content:space-between">
                <span>Statystyki do ulepszania</span>
                <div class="mp-help" data-tip="Zaznacz, które statystyki bot ma ulepszać i ustaw priorytet.">?</div>
              </div>

              <div class="mp-matrix" id="mx-stats" style="grid-template-columns:88px repeat(3, 80px)">
                <!-- Nagłówki -->
                <div class="mx-head"></div>
                <div class="mx-head">Siła</div>
                <div class="mx-head">Szybkość</div>
                <div class="mx-head no-br">Obrona</div>

                <!-- Wiersz włączników -->
                <div class="mx-label">Włączone</div>
                <label class="mx-cell"><input id="cb-stat-strength" type="checkbox" class="mx-check"></label>
                <label class="mx-cell"><input id="cb-stat-speed"    type="checkbox" class="mx-check"></label>
                <label class="mx-cell no-br"><input id="cb-stat-defense" type="checkbox" class="mx-check"></label>

                <!-- Wiersz priorytetów -->
                <div class="mx-label no-bb">Priorytet</div>
                <label class="mx-cell no-bb">
                  <select id="sel-prio-strength" class="mp-select" style="width:50px;padding:2px 4px;font-size:11px">
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                  </select>
                </label>
                <label class="mx-cell no-bb">
                  <select id="sel-prio-speed" class="mp-select" style="width:50px;padding:2px 4px;font-size:11px">
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                  </select>
                </label>
                <label class="mx-cell no-br no-bb">
                  <select id="sel-prio-defense" class="mp-select" style="width:50px;padding:2px 4px;font-size:11px">
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                  </select>
                </label>
              </div>
              <div id="stats-prio-info" style="font:600 11px/1.3 ui-sans-serif,system-ui; margin-top:6px; color:#93a0c0;">
                Priorytety 1–3 muszą być unikalne dla włączonych statystyk.
              </div>
            </div>
          </div>
        </div>
        <!-- Zakładka: Koszary -->
        <div class="mp-group" data-tab="barracks">
          <div class="mp-caption">Ustawienia: Koszary</div>

          <div class="mp-row" style="margin-top:14px">
            <div class="mp-row" style="color:#93a0c0">
              Wybierz kogo trenować i ustaw priorytet.
            </div>

            <div class="mp-row">
              <div class="mp-label" style="justify-content:space-between">
                <span>Aktywacja koszar od energii (≥)</span>
                <div class="mp-help" data-tip="Minimalna energia do rozpoczęcia treningu w koszarach.">?</div>
              </div>
              <input id="inp-barracks-energia" type="number" min="0" class="mp-input" />
            </div>

            <div class="mp-row">
              <div class="mp-label" style="justify-content:space-between">
                <span>Aktywacja koszar od szczęścia (≥)</span>
                <div class="mp-help" data-tip="Minimalna wartość szczęścia (awake) do rozpoczęcia treningu w koszarach.">?</div>
              </div>
              <input id="inp-barracks-awake" type="number" min="0" class="mp-input" />
            </div>

            <div class="mp-matrix" id="mx-barracks" style="grid-template-columns:88px repeat(2, 80px)">
              <!-- Nagłówki -->
              <div class="mx-head"></div>
              <div class="mx-head">Strażnicy</div>
              <div class="mx-head no-br">Bojownicy</div>

              <!-- Włączone -->
              <div class="mx-label">Włączone</div>
              <label class="mx-cell"><input id="cb-guards" type="checkbox" class="mx-check"></label>
              <label class="mx-cell no-br"><input id="cb-fighters" type="checkbox" class="mx-check"></label>

              <!-- Priorytet -->
              <div class="mx-label no-bb">Priorytet</div>
              <label class="mx-cell no-bb">
                <select id="sel-prio-guard" class="mp-select" style="width:50px;padding:2px 4px;font-size:11px">
                  <option value="1">1</option><option value="2">2</option>
                </select>
              </label>
              <label class="mx-cell no-br no-bb">
                <select id="sel-prio-fighters" class="mp-select" style="width:50px;padding:2px 4px;font-size:11px">
                  <option value="1">1</option><option value="2">2</option>
                </select>
              </label>
            </div>
            <div id="barracks-prio-info" style="font:600 11px/1.3 ui-sans-serif,system-ui; margin-top:6px; color:#93a0c0;">
              Priorytety 1–2 muszą być unikalne dla włączonych typów.
            </div>
          </div>
        </div>
        <div class="mp-group" data-tab="przestepstwa">
          <div class="mp-caption">Ustawienia: Przestępstwa</div>
          <div class="mp-row" style="color:#93a0c0">
            Automatyczne wykonywanie przestępstw.
          </div>
        
          <div class="mp-row">
            <div class="mp-label">
              <span>Min odwaga</span>
              <div class="mp-help" data-tip="Minimalna odwaga, aby skrypt próbował wykonać przestępstwo.">?</div>
            </div>
            <input id="inp-przestepstwa-odwaga" type="number" min="0" class="mp-input"/>
          </div>
        
          <div class="mp-row">
            <div class="mp-label">
              <span>Rodzaj przestępstwa</span>
              <div class="mp-help" data-tip="Wybierz, które przestępstwo ma być wykonywane.">?</div>
            </div>
            <select id="sel-przestepstwa-typ" class="mp-select">
              </select>
          </div>
        </div>
        <!-- Zakładka: Dodatki -->
        <div class="mp-group" data-tab="extra">
          <div class="mp-caption">Dodatki:</div> 
          <div class="mp-row">
            <div class="mp-label">
              <span>Powiadomienia bota</span>
              <div class="mp-help" data-tip="Włącza/wyłącza wyskakujące powiadomienia w rogu ekranu.">?</div>
            </div>
            <div class="mp-label">
              <label class="mx-inline">
                <input id="chk-notifications-enabled" type="checkbox" class="mx-check">
              </label>
            </div>
          </div>       
          <div class="mp-row">
            <div class="mp-label">
              <span>Auto odświeżanie strony</span>
              <div class="mp-help" data-tip="Automatycznie odświeża stronę.">?</div>
                </div>
                <div class="mp-label">
              <label class="mx-inline">
                <input id="chk-auto-refresh" type="checkbox" class="mx-check">
              </label>
            </div>
          </div>

          <div class="mp-row" id="grp-auto-refresh-time" style="display: none;">
            <div class="mp-label" style="margin-bottom: 10px;">
              <span>Interwał odświeżania (minuty)</span>
            </div>
            <div class="mp-radio-group">
              <label><input type="radio" name="autoRefreshTime" value="1"><span class="mp-radio-text">1</span></label>
              <label><input type="radio" name="autoRefreshTime" value="10"><span class="mp-radio-text">10</span></label>
              <label><input type="radio" name="autoRefreshTime" value="20"><span class="mp-radio-text">20</span></label>
              <label><input type="radio" name="autoRefreshTime" value="30"><span class="mp-radio-text">30</span></label>
              <label><input type="radio" name="autoRefreshTime" value="60"><span class="mp-radio-text">60</span></label>
            </div>
          </div>
        </div>
      </div>
      <!-- dół panelu -->
      <div class="mp-bottom">
        <button type="button" class="mp-close">Zamknij</button>
        <button type="button" class="mp-save"  id="btn-zapisz">Zapisz</button>
        <button type="button" class="mp-btn-reset" id="btn-reset" style="margin-left:8px;background:#5a3c16;color:#ffe5bf;border:1px solid #99631c;">Domyślne</button>
      </div>
    `;
    document.body.appendChild(panel);
    // Dynamiczne wypełnianie listy przestępstw
    const selPrzestepstwa = panel.querySelector("#sel-przestepstwa-typ");
    if (selPrzestepstwa) {
      selPrzestepstwa.innerHTML = Object.entries(PRZESTEPSTWA_MAPA)
        .map(([id, nazwa]) => `<option value="${id}">${nazwa}</option>`)
        .join('');
    }

    panel.hidden = true;
    const tabButtons = Array.from(panel.querySelectorAll('.mp-tab'));
    const tabViews   = Array.from(panel.querySelectorAll('.mp-group'));

    function activateTab(id){
      tabButtons.forEach(b=>{
        const on = b.dataset.tab === id;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      tabViews.forEach(v=> v.classList.toggle('is-active', v.dataset.tab === id));
    }

    tabButtons.forEach(btn=>{
      btn.addEventListener('click', ()=> activateTab(btn.dataset.tab));
      btn.addEventListener('keydown', (e)=>{
        // strzałki do zmiany zakładki
        const idx = tabButtons.indexOf(btn);
        if (e.key === 'ArrowRight'){ (tabButtons[idx+1]||tabButtons[0]).focus(); }
        if (e.key === 'ArrowLeft'){  (tabButtons[idx-1]||tabButtons[tabButtons.length-1]).focus(); }
        if (e.key === 'Enter' || e.key === ' '){ activateTab(btn.dataset.tab); e.preventDefault(); }
      });
    });

    const chkAtk = panel.querySelector("#chk-bot-atk");
    const chkStl = panel.querySelector("#chk-bot-stl");
    const chkBnk = panel.querySelector("#chk-bot-bnk");

    [chkAtk, chkStl, chkBnk].forEach(chk => {
      chk.addEventListener('change', () => {
        if (chk.checked) {
          // Odznacz inne, jeśli ten został zaznaczony
          [chkAtk, chkStl, chkBnk].forEach(other => { if (other !== chk) other.checked = false; });
        } else {
          // Nie pozwól odznaczyć wszystkiego (zawsze 1 musi być aktywny)
          if (!chkAtk.checked && !chkStl.checked && !chkBnk.checked) chk.checked = true;
        }
      });
    });

    // — BOT button stan + klik
    const botBtn = hud.querySelector('.mp-bot');
    const syncBotBtn = ()=>{
      const on = !!window.botWlaczony;
      botBtn.classList.toggle('is-on', on);
    };
    syncBotBtn();

    botBtn.addEventListener('click', async ()=>{
      window.botWlaczony = !window.botWlaczony;
      const aktywny = window.botWlaczony;
      if (aktywny) {
        if (PROGI.runtimeHours > 0) {
          runUntilTs = Date.now() + PROGI.runtimeHours * 3600 * 1000;
          await GM_setValue("runUntil", runUntilTs);
          console.log(`▶️ BOT ON – wyłączy się ok. ${new Date(runUntilTs).toLocaleString()} (za ${PROGI.runtimeHours}h)`);
        } else {
          runUntilTs = 0; await GM_setValue("runUntil", 0);
          console.log("▶️ BOT ON – bez limitu czasu");
        }
      } else {
        runUntilTs = 0; await GM_setValue("runUntil", 0);
        console.log("⏹️ BOT OFF – limit skasowany");
      }
      await GM_setValue("botEnabled", aktywny);
      syncBotBtn();
      botBtn.animate([{transform:'scale(0.96)'},{transform:'scale(1)'}],{duration:120});
    });

    // — GYM button stan + klik
    const gymBtn = hud.querySelector('.mp-gym');
    const syncGymBtn = () => gymBtn.classList.toggle('is-on', !!window.silkaWlaczona);
    syncGymBtn();

    gymBtn.addEventListener('click', async ()=>{
      window.silkaWlaczona = !window.silkaWlaczona;
      const on = window.silkaWlaczona;
      await GM_setValue("silkaEnabled", on);
      syncGymBtn();
      gymBtn.animate([{transform:'scale(0.96)'},{transform:'scale(1)'}],{duration:120});
      console.log(on ? "💪 SIŁKA ON – tryb aktywny." : "⏹️ SIŁKA OFF – wyłączono.");
    });

    // — BARRACKS button stan + klik
    const barrBtn = hud.querySelector('.mp-barracks');
    const syncBarrBtn = () => barrBtn.classList.toggle('is-on', !!window.koszaryWlaczony);
    syncBarrBtn();

    barrBtn.addEventListener('click', async ()=>{
      window.koszaryWlaczony = !window.koszaryWlaczony;
      const on = window.koszaryWlaczony;
      await GM_setValue("barracksEnabled", on);
      syncBarrBtn();
      barrBtn.animate([{transform:'scale(0.96)'},{transform:'scale(1)'}],{duration:120});
      console.log(on ? "🛡️ KOSZARY ON – tryb aktywny." : "⏹️ KOSZARY OFF – wyłączono.");
    });

    // — FARM button stan + klik
    const farmBtn = hud.querySelector('.mp-farm');
    const syncFarmBtn = ()=> farmBtn.classList.toggle('is-on', !!window.farmWlaczony);
    syncFarmBtn();

    farmBtn.addEventListener('click', async ()=>{
      window.farmWlaczony = !window.farmWlaczony;
      const on = window.farmWlaczony;

      await GM_setValue("farmEnabled", on);
      syncFarmBtn();
      farmBtn.animate([{transform:'scale(0.96)'},{transform:'scale(1)'}],{duration:120});

      if (on) {
        console.log("🌾 FARM ON – włączono farmienie (zapisano).");
      } else {
        console.log("⏹️ FARM OFF – wyłączono farmienie (zapisano).");
      }
    });

    // — PRZESTEPSTWA button stan + klik
    const przestepstwaBtn = hud.querySelector('.mp-przestepstwa');
    const syncPrzestepstwaBtn = () => przestepstwaBtn.classList.toggle('is-on', !!window.przestepstwaWlaczony);
    syncPrzestepstwaBtn();
    
    przestepstwaBtn.addEventListener('click', async ()=>{
      window.przestepstwaWlaczony = !window.przestepstwaWlaczony;
      const on = window.przestepstwaWlaczony;
      await GM_setValue("przestepstwaEnabled", on);
      syncPrzestepstwaBtn();
      przestepstwaBtn.animate([{transform:'scale(0.96)'},{transform:'scale(1)'}],{duration:120});
      console.log(on ? "👮 PRZESTĘPSTWA ON – tryb aktywny." : "⏹️ PRZESTĘPSTWA OFF – wyłączono.");
    });

    // — orientacja 
    const orientBtn = hud.querySelector('.mp-orient');

    orientBtn.addEventListener('click', async () => {
      hud.classList.toggle('vertical');
      const isVert = hud.classList.contains('vertical');
      await gmSet('hudOrientation', isVert ? 'vertical' : 'horizontal');
      orientBtn.animate([{ transform: 'scale(0.9)' }, { transform: 'scale(1)' }], { duration: 120 });
    });

    // przy starcie wczytaj ustawienie
    (async () => {
      const mode = await gmGet('hudOrientation', 'horizontal');
      if (mode === 'vertical') hud.classList.add('vertical');
    })();

    window.mpSyncButtons = function () {
      try { syncBotBtn(); } catch {}
      try { syncFarmBtn(); } catch {}
      try { syncGymBtn(); } catch {}
      try { syncBarrBtn(); } catch {}
      try { syncPrzestepstwaBtn(); } catch {}
    };

    function onAutoRefreshToggle() {
      const chk = panel.querySelector("#chk-auto-refresh");
      const grp = panel.querySelector("#grp-auto-refresh-time");
      if (grp) grp.style.display = chk.checked ? '' : 'none';
    }

    // — wypełnienie/obsługa panelu
    const energiaInp = panel.querySelector("#inp-energia");
    const odwagaInp  = panel.querySelector("#inp-odwaga");
    const lvlInp     = panel.querySelector("#inp-lvl");
    const victimsSel = panel.querySelector("#sel-victimsType");
    const delayInp   = panel.querySelector("#inp-delay");
    const runtimeInp = panel.querySelector("#inp-runtime");
    const diaxChk    = panel.querySelector("#chk-diax");
    const farmHopsInp   = panel.querySelector("#inp-farm-hops");
    const farmBarleyInp = panel.querySelector("#inp-farm-barley");
    const mxShip  = Array.from(panel.querySelectorAll('input#cb-ship-1,  input#cb-ship-2,  input#cb-ship-3,  input#cb-ship-4,  input#cb-ship-5,  input#cb-ship-6,  input#cb-ship-7,  input#cb-ship-8,  input#cb-ship-9'));
    const mxPlane = Array.from(panel.querySelectorAll('input#cb-plane-1, input#cb-plane-2, input#cb-plane-3, input#cb-plane-4, input#cb-plane-5, input#cb-plane-6, input#cb-plane-7, input#cb-plane-8, input#cb-plane-9'));
    const chkFarmMines  = panel.querySelector("#chk-farm-mines");
    const chkFarmFields = panel.querySelector("#chk-farm-fields");
    const chkFarmJobMarket = panel.querySelector("#chk-farm-jobmarket");
    const gymEnergyInp = panel.querySelector("#inp-gym-energy");
    const gymAwakeInp  = panel.querySelector("#inp-gym-awake");


    const fill = ()=>{
      energiaInp.value = PROGI.energiaMin;
      odwagaInp.value  = PROGI.odwagaMin;
      lvlInp.value     = PROGI.lvlMax;
      victimsSel.value = PROGI.victimsType;
      delayInp.value   = PROGI.delayMs;
      runtimeInp.value = PROGI.runtimeHours;
      diaxChk.checked  = !!PROGI.useDiax;
      farmHopsInp.value   = PROGI.farmHops;
      farmBarleyInp.value = PROGI.farmBarley;
      if (chkFarmMines)  chkFarmMines.checked  = !!PROGI.farmCheckMines;
      if (chkFarmFields) chkFarmFields.checked = !!PROGI.farmCheckFields;
      panel.querySelector("#cb-stat-strength").checked = !!PROGI.statStrength;
      panel.querySelector("#cb-stat-speed").checked    = !!PROGI.statSpeed;
      panel.querySelector("#cb-stat-defense").checked  = !!PROGI.statDefense;
      panel.querySelector("#sel-prio-strength").value = PROGI.prioStrength;
      panel.querySelector("#sel-prio-speed").value    = PROGI.prioSpeed;
      panel.querySelector("#sel-prio-defense").value  = PROGI.prioDefense;
      if (gymEnergyInp) gymEnergyInp.value = PROGI.gymEnergyMin ?? DEFAULTS.gymEnergyMin;
      if (gymAwakeInp)  gymAwakeInp.value  = PROGI.gymAwakeMin  ?? DEFAULTS.gymAwakeMin;
      panel.querySelector("#inp-barracks-energia").value = PROGI.barracksEnergiaMin;
      panel.querySelector("#inp-barracks-awake").value  = PROGI.barracksAwakeMin;
      panel.querySelector("#cb-guards").checked          = !!PROGI.Guards;
      panel.querySelector("#cb-fighters").checked        = !!PROGI.Fighters;
      panel.querySelector("#sel-prio-guard").value       = PROGI.prioGuard;
      panel.querySelector("#sel-prio-fighters").value    = PROGI.prioFighters;
      for (let i = 1; i <= 9; i++) {
        const s = panel.querySelector(`#cb-ship-${i}`);
        const p = panel.querySelector(`#cb-plane-${i}`);
        if (s) s.checked = isVehicleEnabled('ship',  i);
        if (p) p.checked = isVehicleEnabled('plane', i);
      }
      panel.querySelector("#inp-przestepstwa-odwaga").value = PROGI.przestepstwaMinOdwaga;
      panel.querySelector("#sel-przestepstwa-typ").value = PROGI.przestepstwaTyp;
      const chkAutoRefresh = panel.querySelector("#chk-auto-refresh");
      const grpAutoRefreshTime = panel.querySelector("#grp-auto-refresh-time");
      
      chkAutoRefresh.checked = !!PROGI.autoRefreshEnabled;
      grpAutoRefreshTime.style.display = !!PROGI.autoRefreshEnabled ? '' : 'none';
      
      // Zaznacz odpowiedni radio button
      const radio = panel.querySelector(`input[name="autoRefreshTime"][value="${PROGI.autoRefreshTime}"]`);
      if (radio) radio.checked = true;

      // Dodaj listener, aby pokazywać/ukrywać opcje czasu
      chkAutoRefresh.removeEventListener('change', onAutoRefreshToggle); 
      chkAutoRefresh.addEventListener('change', onAutoRefreshToggle);
      panel.querySelector("#chk-auto-collect-laundry").checked = !!PROGI.autoCollectLaundry;
      if (chkFarmJobMarket) chkFarmJobMarket.checked = !!PROGI.autoCheckJobMarket;
      panel.querySelector("#inp-attack-blacklist").value = PROGI.attackBlacklist;
      panel.querySelector("#inp-attack-whitelist").value = PROGI.attackWhitelist;
      panel.querySelector("#chk-bot-atk").checked = (PROGI.botAction === "attack");
      panel.querySelector("#chk-bot-stl").checked = (PROGI.botAction === "steal");
      panel.querySelector("#chk-bot-bnk").checked = (PROGI.botAction === "bank");
      panel.querySelector("#chk-notifications-enabled").checked = !!PROGI.notificationsEnabled;

    };
    fill();

    const saveBtn = panel.querySelector("#btn-zapisz");
    const hintEl  = panel.querySelector("#stats-prio-info");
    const cbStr = panel.querySelector("#cb-stat-strength");
    const cbSpd = panel.querySelector("#cb-stat-speed");
    const cbDef = panel.querySelector("#cb-stat-defense");
    const selStr = panel.querySelector("#sel-prio-strength");
    const selSpd = panel.querySelector("#sel-prio-speed");
    const selDef = panel.querySelector("#sel-prio-defense");
    const barracksEnergiaMin = Math.max(0, parseInt(panel.querySelector("#inp-barracks-energia").value || DEFAULTS.barracksEnergiaMin, 10));
    const barracksAwakeMin  = Math.max(0, parseInt(panel.querySelector("#inp-barracks-awake").value  || DEFAULTS.barracksAwakeMin,  10));
    const Guards             = !!panel.querySelector("#cb-guards").checked;
    const Fighters           = !!panel.querySelector("#cb-fighters").checked;
    const barrHint   = panel.querySelector("#barracks-prio-info");
    const cbGuards   = panel.querySelector("#cb-guards");
    const cbFighters = panel.querySelector("#cb-fighters");
    const selGuard   = panel.querySelector("#sel-prio-guard");
    const selFight   = panel.querySelector("#sel-prio-fighters");
    const prioGuard    = parseInt(panel.querySelector("#sel-prio-guard").value, 10) || 1;
    const prioFighters = parseInt(panel.querySelector("#sel-prio-fighters").value, 10) || 2;

    const readBarr = () => ({
      enable: { guards: !!cbGuards.checked, fighters: !!cbFighters.checked },
      prio:   { guard: parseInt(selGuard.value,10)||1, fighters: parseInt(selFight.value,10)||2 }
    });

    ["change","input"].forEach(ev=>{
      [cbGuards, cbFighters, selGuard, selFight].forEach(el=>{
        el?.addEventListener(ev, ()=>{
          validateBarracksPrioritiesLive(readBarr(), { selGuard, selFighters: selFight }, saveBtn, barrHint);
        });
      });
    });
    validateBarracksPrioritiesLive(readBarr(), { selGuard, selFighters: selFight }, saveBtn, barrHint);


    const readState = () => ({
      enable: {
        strength: !!cbStr.checked,
        speed:    !!cbSpd.checked,
        defense:  !!cbDef.checked,
      },
      prio: {
        strength: parseInt(selStr.value,10)||1,
        speed:    parseInt(selSpd.value,10)||2,
        defense:  parseInt(selDef.value,10)||3,
      }
    });

    ["change","input"].forEach(ev=>{
      [cbStr, cbSpd, cbDef, selStr, selSpd, selDef].forEach(el=>{
        el?.addEventListener(ev, ()=>{
          validatePrioritiesLive(readState(), { selStr, selSpd, selDef }, saveBtn, hintEl);
        });
      });
    });
    validatePrioritiesLive(readState(), { selStr, selSpd, selDef }, saveBtn, hintEl);

    panel.querySelector(".mp-close").addEventListener("click", ()=>{
      open = false; panel.style.display='none';
    });

    panel.querySelector("#btn-zapisz").addEventListener("click", async () => {
      const energiaMin   = Math.max(0, parseInt(panel.querySelector("#inp-energia").value || DEFAULTS.energiaMin, 10));
      const odwagaMin    = Math.max(0, parseInt(panel.querySelector("#inp-odwaga").value  || DEFAULTS.odwagaMin,  10));
      const lvlMax       = Math.max(1, parseInt(panel.querySelector("#inp-lvl").value     || DEFAULTS.lvlMax,     10));
      const victimsType  = panel.querySelector("#sel-victimsType").value || DEFAULTS.victimsType;
      const delayMs      = Math.max(0, parseInt(panel.querySelector("#inp-delay").value   || DEFAULTS.delayMs,    10));
      const runtimeHours = Math.max(0, Math.min(12, parseInt(panel.querySelector("#inp-runtime").value || DEFAULTS.runtimeHours, 10)));
      const useDiax      = !!panel.querySelector("#chk-diax").checked;
      const attackBlacklist = panel.querySelector("#inp-attack-blacklist").value;
      const attackWhitelist = panel.querySelector("#inp-attack-whitelist").value;
      const farmHops   = Math.max(0, parseInt(farmHopsInp.value   || DEFAULTS.farmHops,   10));
      const farmBarley = Math.max(0, parseInt(farmBarleyInp.value || DEFAULTS.farmBarley, 10));
      const farmCheckMines  = !!chkFarmMines?.checked;
      const farmCheckFields = !!chkFarmFields?.checked;
      const autoCheckJobMarket = !!chkFarmJobMarket?.checked;
      const statStrength = !!panel.querySelector("#cb-stat-strength").checked;
      const statSpeed    = !!panel.querySelector("#cb-stat-speed").checked;
      const statDefense  = !!panel.querySelector("#cb-stat-defense").checked;
      const prioStrength = parseInt(panel.querySelector("#sel-prio-strength").value, 10) || 1;
      const prioSpeed    = parseInt(panel.querySelector("#sel-prio-speed").value, 10) || 2;
      const prioDefense  = parseInt(panel.querySelector("#sel-prio-defense").value, 10) || 3;
      const gymEnergyMin = Math.max(0, parseInt(gymEnergyInp?.value  || DEFAULTS.gymEnergyMin, 10));
      const gymAwakeMin  = Math.max(0, parseInt(gymAwakeInp?.value   || DEFAULTS.gymAwakeMin,  10));
      let shipMask = 0, planeMask = 0;
      for (let i = 1; i <= 9; i++) {
        if (panel.querySelector(`#cb-ship-${i}`)?.checked)  shipMask  |= (1 << (i-1));
        if (panel.querySelector(`#cb-plane-${i}`)?.checked) planeMask |= (1 << (i-1));
      }
      const przestepstwaMinOdwaga = Math.max(0, parseInt(panel.querySelector("#inp-przestepstwa-odwaga").value || DEFAULTS.przestepstwaMinOdwaga, 10));
      const przestepstwaTyp = panel.querySelector("#sel-przestepstwa-typ").value || DEFAULTS.przestepstwaTyp;
      const autoRefreshEnabled = !!panel.querySelector("#chk-auto-refresh").checked;
      const checkedRadio = panel.querySelector('input[name="autoRefreshTime"]:checked');
      const autoRefreshTime = checkedRadio ? Number(checkedRadio.value) : DEFAULTS.autoRefreshTime;
      const autoCollectLaundry = !!panel.querySelector("#chk-auto-collect-laundry").checked;
      const notificationsEnabled = !!panel.querySelector("#chk-notifications-enabled").checked;

      let action = "attack";
      if (panel.querySelector("#chk-bot-stl").checked) action = "steal";
      if (panel.querySelector("#chk-bot-bnk").checked) action = "bank";
      
      let statEnable = {
        strength: !!cbStr.checked,
        speed:    !!cbSpd.checked,
        defense:  !!cbDef.checked,
      };
      let statPrio = {
        strength: Math.max(1, Math.min(3, parseInt(selStr.value||"1",10))),
        speed:    Math.max(1, Math.min(3, parseInt(selSpd.value||"2",10))),
        defense:  Math.max(1, Math.min(3, parseInt(selDef.value||"3",10))),
      };

      // jeśli wszystkie wyłączone – wymuś chociaż jedną =
      if (!statEnable.strength && !statEnable.speed && !statEnable.defense) {
        statEnable.strength = true;
        statPrio.strength = 1; statPrio.speed = 2; statPrio.defense = 3;
      }

      statPrio = normalizeUniquePriorities({ enable: statEnable, prio: statPrio });
      selStr.value = String(statPrio.strength);
      selSpd.value = String(statPrio.speed);
      selDef.value = String(statPrio.defense);
      validatePrioritiesLive({ enable: statEnable, prio: statPrio }, { selStr, selSpd, selDef }, saveBtn, hintEl);

      // --- KOSZARY: odczyt ---
      let barracksEnergiaMin = Math.max(0, parseInt(panel.querySelector("#inp-barracks-energia").value || DEFAULTS.barracksEnergiaMin, 10));
      let barracksAwakeMin   = Math.max(0, parseInt(panel.querySelector("#inp-barracks-awake").value   || DEFAULTS.barracksAwakeMin,   10));
      let Guards             = !!panel.querySelector("#cb-guards").checked;
      let Fighters           = !!panel.querySelector("#cb-fighters").checked;
      let prioGuard          = parseInt(panel.querySelector("#sel-prio-guard").value, 10) || 1;
      let prioFighters       = parseInt(panel.querySelector("#sel-prio-fighters").value, 10) || 2;

      // --- KOSZARY: autokorekta priorytetów 1/2 ---
      const bFix = normalizeBarracksPriorities({
        enable: { guards: Guards, fighters: Fighters },
        prio:   { guard: prioGuard, fighters: prioFighters }
      });
      prioGuard = bFix.guard;
      prioFighters = bFix.fighters;

      panel.querySelector("#sel-prio-guard").value     = String(prioGuard);
      panel.querySelector("#sel-prio-fighters").value  = String(prioFighters);
      validateBarracksPrioritiesLive(
        { enable:{guards:Guards,fighters:Fighters}, prio:{guard:prioGuard,fighters:prioFighters} },
        { selGuard, selFighters: selFight }, saveBtn, barrHint
      );
      Object.assign(PROGI, {
        statStrength: statEnable.strength,
        statSpeed:    statEnable.speed,
        statDefense:  statEnable.defense,
        prioStrength: statPrio.strength,
        prioSpeed:    statPrio.speed,
        prioDefense:  statPrio.defense,
        botAction:    action,
        energiaMin, odwagaMin, lvlMax, victimsType, delayMs, runtimeHours, useDiax,
        attackBlacklist, attackWhitelist,
        farmHops, farmBarley,
        farmShipMask:  shipMask,
        farmPlaneMask: planeMask,
        farmCheckMines, farmCheckFields,
        gymEnergyMin, gymAwakeMin,
        barracksEnergiaMin, barracksAwakeMin,
        Guards, Fighters, prioGuard, prioFighters,
        przestepstwaMinOdwaga, przestepstwaTyp,
        autoRefreshEnabled, autoRefreshTime,
        autoCollectLaundry, autoCheckJobMarket,
        notificationsEnabled,
      });

      await saveSettings(PROGI);
    });

    panel.querySelector("#btn-reset").addEventListener("click", async () => {
      await saveSettings({ ...DEFAULTS });
      fill();
    });

    const settingsBtn = hud.querySelector('.mp-settings');
    panel.hidden = true;

    const placePanel = () => {
      const r = settingsBtn.getBoundingClientRect();

      const wasHidden = panel.hidden || getComputedStyle(panel).display === 'none';
      if (wasHidden) {
        panel.hidden = false;
        panel.style.visibility = 'hidden';
        panel.style.display = 'block';
      }

      const ph = panel.offsetHeight || 0;
      const pw = panel.offsetWidth  || 0;

      const left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left - 8));
      let top = r.top - 8 - ph;
      if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - ph - 8);

      panel.style.left = left + 'px';
      panel.style.top  = top  + 'px';

      if (wasHidden) {
        panel.style.display = '';
        panel.style.visibility = '';
        panel.hidden = true;
      }
    };

    settingsBtn.addEventListener('click', () => {
      const willOpen = panel.hidden;
      if (willOpen) {
        fill();         
        placePanel();   
        panel.hidden = false;
      } else {
        panel.hidden = true;
      }
    });

    window.addEventListener('resize', () => { if (!panel.hidden) placePanel(); });
    window.addEventListener('scroll',  () => { if (!panel.hidden) placePanel(); }, { passive: true });

    document.addEventListener('click', (e) => {
      if (panel.hidden) return;
      if (!panel.contains(e.target) && !settingsBtn.contains(e.target)) {
        panel.hidden = true;
      }
    });

    // — przeciąganie HUDa
    (function makeDraggable(box, handle){
      let sx=0, sy=0, bx=0, by=0, drag=false;
      const loadPos = () => {
        try{
          const p = typeof GM_getValue==='function' && GM_getValue('mp_hud_pos_s3');
          Promise.resolve(p).then(v=>{
            if (v && v.x!=null && v.y!=null){
              box.style.left = v.x+'px';
              box.style.top  = v.y+'px';
              box.style.bottom = 'auto';
            }
          });
        }catch{}
      };
      const savePos = () => {
        try{
          const r = box.getBoundingClientRect();
          if (typeof GM_setValue==='function') GM_setValue('mp_hud_pos_s3', {x:r.left, y:r.top});
        }catch{}
      };
      const start = (x, y) => {
        drag = true;
        const r = box.getBoundingClientRect();
        sx = x; sy = y; bx = r.left; by = r.top;
      };

      const move = (x, y) => {
        if (!drag) return;
        const nx = bx + (x - sx);
        const ny = by + (y - sy);
        box.style.left = Math.max(6, nx) + 'px';
        box.style.top  = Math.max(6, ny) + 'px';
        box.style.bottom='auto';
      };

      const stop = () => {
        if (!drag) return;
        drag=false;
        savePos();
      };

      // --- obsługa myszy ---
      (handle||box).addEventListener('mousedown', e => {
        start(e.clientX, e.clientY);
        document.addEventListener('mousemove', mm);
        document.addEventListener('mouseup', mu);
        e.preventDefault();
      });
      const mm = e => move(e.clientX, e.clientY);
      const mu = () => {
        stop();
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
      };

      // --- obsługa dotyku ---
      (handle||box).addEventListener('touchstart', e => {
        const t = e.touches[0];
        start(t.clientX, t.clientY);
        document.addEventListener('touchmove', tm, {passive:false});
        document.addEventListener('touchend', tu);
      });
      const tm = e => {
        const t = e.touches[0];
        move(t.clientX, t.clientY);
        e.preventDefault();
      };
      const tu = () => {
        stop();
        document.removeEventListener('touchmove', tm);
        document.removeEventListener('touchend', tu);
      };

      loadPos();
    })(hud, hud.querySelector('.mp-grab'));
};

function setupAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
    if (autoRefreshPoller) {
        clearInterval(autoRefreshPoller);
        autoRefreshPoller = null;
    }

    if (PROGI.autoRefreshEnabled) {
        const interwalMs = (PROGI.autoRefreshTime || 10) * 60 * 1000;
        console.log(`🔄 Auto-odświeżanie włączone. Interwał co ${PROGI.autoRefreshTime} min.`);

        autoRefreshTimer = setInterval(() => {
            
            if (autoRefreshPoller) {
                console.log(`🔄 Auto-odświeżanie: Już oczekuję na bezczynność bota...`);
                return;
            }

            console.log(`🔄 Auto-odświeżanie: Uruchamiam "poller". Będę sprawdzać co 5 sekund, aż bot będzie wolny.`);
            
            autoRefreshPoller = setInterval(() => {
                const panel = document.querySelector('.mp-panel');
                const panelOtwarty = panel && !panel.hidden;

                if (aktualniePracuje || panelOtwarty) {
                    console.log(`   ...poller czeka (Bot pracuje: ${aktualniePracuje}, Panel otwarty: ${panelOtwarty})`);
                    return;
                }

                console.log(`🔄 Auto-odświeżanie: Bot jest wolny. Przeładowuję stronę...`);
                
                clearInterval(autoRefreshTimer);
                clearInterval(autoRefreshPoller);
                
                location.reload();

            }, 5000); 

        }, interwalMs); 
    
    } else {
        console.log("🔄 Auto-odświeżanie wyłączone.");
    }
}
 
async function initializeBot() {
	console.log("[BotMafia] Licencja OK. Uruchamiam bota...");
	// === HUD + Settings  ===

	// 1) STYLE
	GM_addStyle(`
		/* ===== Macierz pojazdów (ładna tabelka) ===== */
		.mp-matrix {
			display: grid;
			grid-template-columns: 88px repeat(9, 36px); /* lewa etykieta + 9 kolumn */
			border: 1px solid rgba(255,255,255,.14);
			border-radius: 10px;
			overflow: hidden;
		}

		.mp-matrix > .mx-head,
		.mp-matrix > .mx-label,
		.mp-matrix > label.mx-cell {
			display: flex; align-items: center; justify-content: center;
			height: 36px;
			border-right: 1px solid rgba(255,255,255,.10);
			border-bottom: 1px solid rgba(255,255,255,.10);
		}

		/* ostatnia w kolumnie/wierszu bez dolnej/prawej ramki */
		.mp-matrix > .no-br { border-right: none; }
		.mp-matrix > .no-bb { border-bottom: none; }

		/* nagłówki (wł/wył + liczby 1..9) */
		.mx-head {
			background: rgba(255,255,255,.06);
			color: #dbe3ff;
			font: 800 11px/1 ui-sans-serif,system-ui;
			letter-spacing:.3px; text-transform: uppercase;
		}
		.mp-error { color:#ffb4b4; }
		.mp-select.is-error { border-color:#ff6b6b !important; box-shadow:0 0 0 2px rgba(255,107,107,.12) inset; }
		/* lewa kolumna - etykiety wierszy */
		.mx-label {
			justify-content: flex-start;
			padding: 0 8px 0 10px;
			background: rgba(255,255,255,.03);
			color:#c7cbe0;
			font: 700 12px/1 ui-sans-serif,system-ui;
		}

		/* klikowalna komórka z checkboxem */
		label.mx-cell { cursor: pointer; }
		.mx-check {
			appearance:none; -webkit-appearance:none; width:18px; height:18px;
			border-radius:5px; background:#0f131c; border:1px solid rgba(255,255,255,.14);
			box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);
		}
		.mx-check:checked{
			background:#1e4c2a;
			border-color:#2c7b43;
			box-shadow:0 0 0 2px rgba(86,227,125,.22) inset;
		}

    /* Styl dla powiadomień Toast */
    .mp-toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
    }

    .mp-toast {
        background: rgba(22, 22, 30, 0.9);
        backdrop-filter: blur(8px);
        color: #e9ecf5;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 12px 18px;
        border-radius: 12px;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 8px 16px rgba(0,0,0,0.4);
        min-width: 200px;
        transform: translateX(120%);
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .mp-toast.is-show { transform: translateX(0); }

    .mp-toast-icon {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .mp-toast-ok .mp-toast-icon { background: #10b981; box-shadow: 0 0 8px #10b981; } /* Zielony */
    .mp-toast-error .mp-toast-icon { background: #e11d48; box-shadow: 0 0 8px #e11d48; }  /* Czerwony */
    .mp-toast-info .mp-toast-icon { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }  /* Niebieski */

		.mp-hud{
			position:fixed; left:16px; bottom:16px; z-index:2147483647;
			display:flex; align-items:center; gap:8px;
			padding:10px 12px; border-radius:14px;
			background:rgba(22,22,30,.85); backdrop-filter:blur(6px);
			border:1px solid rgba(255,255,255,.08);
			box-shadow:0 8px 22px rgba(0,0,0,.35);
			font-family:ui-sans-serif,system-ui,Segoe UI,Arial;
			user-select:none; -webkit-user-select:none;
		}
		.mp-hud.vertical {
			flex-direction: column; /* zamiast w wierszu */
			align-items: stretch;
			width: auto;
			height: auto;
		}
		.mp-hud.vertical .mp-sep {
			width: 100%;
			height: 1px;
			margin: 4px 0;
		}
		.mp-grab{
			width:28px; height:28px; border-radius:8px; cursor:move;
			display:flex; align-items:center; justify-content:center;
			color:#f2f5ff;
			background:rgba(255,255,255,.10);
			border:1px dashed rgba(255,255,255,.30);
			box-shadow:0 2px 8px rgba(0,0,0,.35),
						inset 0 0 0 1px rgba(0,0,0,.20);
		}

		.mp-grab svg{
			width:18px; height:18px; display:block;
			stroke:currentColor; fill:none;
			stroke-width:2; stroke-linecap:round; stroke-linejoin:round;
			filter: drop-shadow(0 0 2px rgba(255,255,255,.45));
		}

		.mp-grab:hover{
			background:rgba(255,255,255,.16);
			color:#ffffff;
			box-shadow:0 0 0 2px rgba(255,255,255,.18), 0 6px 16px rgba(0,0,0,.45);
		}
		.mp-grab:active{ transform:scale(.98); }

		.mp-btn{
			width:32px;height:32px;border-radius:50%;
			display:inline-flex;align-items:center;justify-content:center;
			font:800 13px/1 ui-sans-serif,system-ui; letter-spacing:.5px;
			color:#eaeef5; background:linear-gradient(180deg,#2a2f3a,#1e2230);
			border:1px solid rgba(255,255,255,.12); cursor:pointer;
			box-shadow:inset 0 0 0 1px rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.28);
			transition:transform .08s ease, box-shadow .12s ease, background .2s ease, color .2s ease;
		}
		.mp-btn:hover{ transform:translateY(-1px); }
		.mp-btn.is-on{
			background:linear-gradient(180deg,#2b4a2f,#143a1a);
			color:#ccffd2; border-color:rgba(145,255,175,.35);
			box-shadow:inset 0 0 0 1px rgba(0,0,0,.25), 0 0 0 2px rgba(86,227,125,.25);
		}
		.mp-sep{ width:1px;height:22px;background:rgba(255,255,255,.10); margin:0 4px; }

		.mp-panel{
			position: fixed;
			display: none;
			z-index: 2147483647;
			overflow: hidden;
			width: auto;
			min-width: 320px;
			max-width: min(460px, 92vw);
			max-height: calc(80dvh - 24px);
			padding: 14px 14px 12px;
			border-radius: 14px;
			background: rgba(18,18,24,.98);
			color: #e9ecf5;
			border: 1px solid rgba(255,255,255,.10);
			box-shadow: 0 16px 34px rgba(0,0,0,.45);
			display: flex;
			flex-direction: column;
			gap: 8px;
		}
		.mp-panel h3{ margin:0 0 8px; font:700 14px/1.2 ui-sans-serif,system-ui; color:#cfd6ff; }
		.mp-panel[hidden]{ display:none !important; }
		.mp-row{ margin:8px 0 10px; }
		.mp-label{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
		.mp-label span{ font:600 12px/1.2 ui-sans-serif,system-ui; color:#c7cbe0; white-space: normal; overflow-wrap: anywhere;}
		.mp-input, .mp-select{
			width:100%; padding:8px 10px; border-radius:10px;
			background:#0f131c; color:#e9ecf5; border:1px solid rgba(255,255,255,.12);
			outline:none; box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);
		}
    .mp-textarea {
      width:100%; padding:8px 10px; border-radius:10px;
			background:#0f131c; color:#e9ecf5; border:1px solid rgba(255,255,255,.12);
			outline:none; box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);
      min-height: 60px; /* Wyższe pole */
      resize: vertical; /* Pozwól na zmianę wysokości */
      font-family: ui-sans-serif,system-ui,Segoe UI,Arial; /* Ustaw czcionkę */
      box-sizing: border-box; /* Ważne dla 100% szerokości */
    }
		.mp-help{
			display:inline-flex;align-items:center;justify-content:center;
			width:18px;height:18px;border-radius:50%;
			background:#20263a; color:#aab4d4; font:700 12px/1;
			border:1px solid rgba(255,255,255,.14); cursor:default; position:relative;
		}
		.mp-help::after {
			content: attr(data-tip);
			position: absolute;
			top: 50%;
			right: calc(100% + 8px);
			left: auto;
			bottom: auto;
			transform: translateY(-50%);
			background: #0e1322;
			color: #e9ecf5;
			padding: 8px 10px;
			border-radius: 8px;
			border: 1px solid rgba(255,255,255,.12);
			box-shadow: 0 8px 18px rgba(0,0,0,.35);
			font: 500 12px/1.35 ui-sans-serif,system-ui;
			white-space: normal;
			word-wrap: break-word;
			max-width: min(260px, 80vw);
			opacity: 0;
			pointer-events: none;
			transition: .15s ease;
			z-index: 5;
		}

		.mp-help::before {
			content: "";
			position: absolute;
			top: 50%;
			left: 100%;
			transform: translateY(-50%);
			border: 6px solid transparent;
			border-right-color: #0e1322;
			opacity: 0;
			transition: .15s ease;
		}

		.mp-help:hover::after,
		.mp-help:hover::before {
			opacity: 1;
			transform: translateY(-50%)
		}
		.mp-help:hover::after,
		.mp-help:hover::before {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		.mp-help:hover::after, .mp-help:hover::before{ opacity:1; transform:translateX(-50%) translateY(0); }

		.mp-actions{ display:flex; gap:8px; margin-top:10px; }
		.mp-btn-save, .mp-btn-reset{
			flex:1; padding:9px 10px; border-radius:10px; font:800 12px/1 ui-sans-serif,system-ui; cursor:pointer;
			border:1px solid transparent;
		}
		.mp-btn-save{ background:#1e4c2a; color:#caffe0; border-color:#2c7b43; }
		.mp-btn-reset{ background:#5a3c16; color:#ffe5bf; border-color:#99631c; }

		/* === POPRAWIONY BLOK CSS === */
		.mp-panel .mp-radio-group {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
		}
		.mp-panel .mp-radio-group > label {
			display: inline-flex !important;
			flex-direction: row !important;
			align-items: center !important;
			justify-content: flex-start !important;
			gap: 5px !important;
			font: 600 12px/1 ui-sans-serif,system-ui !important;
			color: #c7cbe0 !important;
			padding: 6px 10px !important;
			border-radius: 8px !important;
			background: #0f131c !important;
			border: 1px solid rgba(255,255,255,.12) !important;
			cursor: pointer;
			width: auto !important;
			height: auto !important;
			flex: 0 0 auto !important;
			margin: 0 !important;
			position: relative !important;
			top: auto !important;
			left: auto !important;
			transform: none !important;
			opacity: 1 !important;
			visibility: visible !important;
		}
		.mp-panel .mp-radio-group > label > .mp-radio-text {
			display: inline !important;
			width: auto !important;
			height: auto !important;
			margin: 0 !important;
			padding: 0 !important;
			line-height: 1 !important;
			font-size: 12px !important;
			color: #c7cbe0 !important;
			position: static !important;
			opacity: 1 !important;
			visibility: visible !important;
			transform: none !important;
		}
		.mp-panel .mp-radio-group input[type="radio"] {
			appearance: none !important; -webkit-appearance: none !important;
			width: 16px !important;
			height: 16px !important;
			border-radius: 50% !important;
			background: #20263a !important;
			border: 1px solid rgba(255,255,255,.14) !important;
			position: relative !important;
			margin: 0 !important;
			padding: 0 !important;
			flex-shrink: 0;
		}
		.mp-panel .mp-radio-group input[type="radio"]:checked {
			background: #1e4c2a !important;
			border-color: #2c7b43 !important;
		}
		.mp-panel .mp-radio-group input[type="radio"]:checked::after {
			content: '' !important;
			position: absolute !important; top: 50% !important; left: 50% !important;
			width: 8px !important; height: 8px !important; border-radius: 50% !important;
			background: #caffe0 !important;
			transform: translate(-50%, -50%) !important;
		}
		/* === KONIEC POPRAWIONEGO BLOKU === */

		.mp-tabs {
			display:flex; flex-wrap:wrap; gap:6px;
			margin:-2px 0 8px 0;
		}
		.mp-tab {
			padding:6px 10px; border-radius:10px;
			background:rgba(255,255,255,.06);
			border:1px solid rgba(255,255,255,.12);
			color:#c7cbe0; font:700 12px/1 ui-sans-serif,system-ui;
			cursor:pointer; user-select:none;
			transition:filter .15s ease, background .2s ease, color .2s ease, border-color .2s ease;
		}
		.mp-tab:hover { filter:brightness(1.08); }
		.mp-tab.is-active{
			background:#1a2340; color:#dfe5ff;
			border-color:rgba(160,190,255,.35);
			box-shadow:0 0 0 2px rgba(120,160,255,.15) inset;
		}

		/* ——— Scrollbox i grupy ——— */
		.mp-scroll{
			flex: 1 1 auto; /* wypełnia resztę panelu */
			overflow-y: auto; /* tylko góra/dół */
			overflow-x: hidden; /* bez poziomego */
			padding-right: 2px; /* drobny margines przy suwaku */
		}

		.mp-input, .mp-select {
			width: 100%;
			box-sizing: border-box;
		}

		/* jeśli gdzieś w treści pojawi się długi tekst/URL */
		.mp-group { word-wrap: break-word; overflow-wrap: anywhere; }

		/* tabelki / bloki wewnątrz: nie pozwól rosnąć ponad panel */
		.mp-group table, .mp-group .autoTradeSettings {
			max-width: 100%;
		}
		.mp-group { display:none; }
		.mp-group.is-active { display:block; }
		.mp-caption{
			margin:2px 0 10px; color:#cfd6ff;
			font:800 13px/1.3 ui-sans-serif,system-ui;
		}

		/* ——— Dolne akcje panelu ——— */
		.mp-bottom{
			display:flex; justify-content:flex-end; gap:8px; margin-top:10px;
		}
		.mp-bottom .mp-close, .mp-bottom .mp-save{
			padding:8px 12px; border-radius:10px; font:800 12px/1 ui-sans-serif,system-ui; cursor:pointer;
			border:1px solid transparent;
		}
		.mp-bottom .mp-close{ background:#2a2f3a; color:#eaeef5; border-color:rgba(255,255,255,.12); }
		.mp-bottom .mp-save{ background:#1e4c2a; color:#caffe0; border-color:#2c7b43; }
	`);

	initHUD()
	await refreshFlag();
	await readFlag();
	await loadSettings();
	window.farmWlaczony = !!(await gmGet("farmEnabled", false));
	window.silkaWlaczona = !!(await gmGet("silkaEnabled", false));
	window.koszaryWlaczony = !!(await gmGet("barracksEnabled", false));
	window.przestepstwaWlaczony = !!(await gmGet("przestepstwaEnabled", false));
	try { window.mpSyncButtons && window.mpSyncButtons(); } catch {}
	window.botWlaczony = !!(await gmGet("botEnabled", false));
	try { window.mpSyncButtons && window.mpSyncButtons(); } catch {}
	if (window.botWlaczony) {
		if (runUntilTs > 0 && Date.now() >= runUntilTs) {
			window.botWlaczony = false;
			await GM_setValue("botEnabled", false);
			runUntilTs = 0;
			await GM_setValue("runUntil", 0);
		}
	}
	if (!KS_enabled) {
		console.warn("⛔ Kill-switch: bot nie wystartuje. Powód:", KS_reason || "(brak powodu)");
	} else {
		console.log("📦 Bot gotowy – czeka na uruchomienie...");
	}
	setInterval(Main, 5000);
	setInterval(checkAutoStop, 10 * 1000);
	setInterval(refreshFlag, 60 * 1000);
  setupAutoRefresh();
}

// =================================================================
// LOGIKA SPRAWDZANIA LICENCJI 
// =================================================================


(async function checkLicense() {
    console.log("[BotMafia] Sprawdzanie licencji...");

    let userNick = '';
    try {
        await new Promise(res => setTimeout(res, 1000)); 
        const nickElement = document.querySelector(NICK_SELECTOR);
        if (nickElement) {
            userNick = nickElement.textContent.trim();
        } else {
            console.error('[BotMafia] Nie znaleziono selektora nicku na stronie:', NICK_SELECTOR);
            return; 
        }
    } catch (e) {
        console.error('[BotMafia] Błąd podczas szukania nicku:', e);
        return;
    }

    if (!userNick) {
        console.warn('[BotMafia] Nie udało się odczytać nicku użytkownika.');
        return;
    }
    
    const localUserHash = CryptoJS.HmacSHA256(userNick.toLowerCase(), SECRET_KEY).toString();
    console.log(`[BotMafia] Użytkownik: ${userNick}. Hasz: ${localUserHash}. Weryfikacja...`);

    // Sprawdzamy licencję
    GM_xmlhttpRequest({
        method: 'GET',
        url: LICENSE_URL + '?nocache=' + Math.random(),
        onload: function(response) {
            let isAllowed = false; // Domyślnie brak dostępu
            try {
                const data = JSON.parse(response.responseText);
                const allowedList = data.allowed_hashes || [];
                isAllowed = allowedList.includes(localUserHash);
            
            } catch (e) {
                console.error('[BotMafia] Błąd podczas przetwarzania pliku licencji.', e);
            }

            // --- WYSYŁAMY LOG ---
            // Niezależnie od wyniku, wysyłamy log próby
            logAttempt(userNick, localUserHash, isAllowed);

            if (isAllowed) {
                initializeBot(); 
            } else {
                console.warn(`[BotMafia] Użytkownik ${userNick} (Hasz: ${localUserHash}) nie ma dostępu do skryptu.`);
            }
        },
        onerror: function(response) {
            // --- WYSYŁAMY LOG O BŁĘDZIE ---
            // Jeśli nie udało się nawet pobrać pliku licencji
            logAttempt(userNick, localUserHash, false); // Logujemy jako błąd

            console.error('[BotMafia] Nie udało się pobrać pliku licencji:', response.statusText);
        }
    });
})();
})();
