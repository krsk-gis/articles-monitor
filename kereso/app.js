const DAY_NAMES = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

let buildings = [];
let rooms = [];
let teachers = [];
let schedule = [];
let activeTab = "termek";

function normalize(str) {
  return (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function loadData() {
  const [b, r, t, s] = await Promise.all([
    fetch("data/buildings.json").then((res) => res.json()),
    fetch("data/rooms.json").then((res) => res.json()),
    fetch("data/teachers.json").then((res) => res.json()),
    fetch("data/schedule.json").then((res) => res.json()),
  ]);
  buildings = b;
  rooms = r;
  teachers = t;
  schedule = s;
}

function buildingById(id) {
  return buildings.find((b) => b.id === id);
}

function roomById(id) {
  return rooms.find((r) => r.id === id);
}

function accessibilityBadges(acc) {
  const items = [
    ["wheelchair_accessible", "Kerekesszékkel megközelíthető"],
    ["elevator", "Lift"],
    ["ramp", "Rámpa"],
    ["accessible_toilet_nearby", "Akadálymentes mosdó közelben"],
    ["braille_signage", "Braille-jelzés"],
    ["induction_loop", "Indukciós hurok"],
  ];
  return items
    .map(([key, label]) => {
      const has = !!acc[key];
      return `<span class="badge ${has ? "ok" : "no"}">${has ? "✓" : "✕"} ${label}</span>`;
    })
    .join("");
}

function roomCardHtml(room) {
  const building = buildingById(room.building_id);
  const acc = room.accessibility || {};
  const entrance = building && building.entrances ? building.entrances.find((e) => e.wheelchair_accessible) || building.entrances[0] : null;
  const routeId = `route-${room.id}`;

  const equipmentBadges = (room.equipment || [])
    .map((e) => `<span class="badge">${e}</span>`)
    .join("");

  const routeSteps = (acc.route_from_entrance || [])
    .map((step) => `<li>${step}</li>`)
    .join("");

  const landmarks = (acc.landmarks || []).join(", ");

  return `
    <div class="card">
      <h2>${room.code} · ${room.name}</h2>
      <div class="subtitle">${building ? building.name : ""} · ${room.floor}. emelet · ${room.type}, ${room.capacity} fő</div>
      <div class="badges">${equipmentBadges}</div>
      <div class="badges">${accessibilityBadges(acc)}</div>
      <span class="route-toggle" onclick="toggleRoute('${routeId}')">📍 Hogyan jutok oda?</span>
      <div class="route" id="${routeId}">
        ${entrance ? `<div class="landmarks">Bejárat: <strong>${entrance.name}</strong> (${entrance.opening_hours || "nyitvatartás n.a."})</div>` : ""}
        <ol>${routeSteps}</ol>
        ${landmarks ? `<div class="landmarks">Tájékozódási pontok: ${landmarks}</div>` : ""}
      </div>
    </div>
  `;
}

function currentClassForTeacher(teacherId) {
  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return schedule.find((entry) => {
    if (entry.teacher_id !== teacherId || entry.day !== dayName) return false;
    const [start, end] = entry.time.split("-");
    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    return nowMinutes >= toMinutes(start) && nowMinutes <= toMinutes(end);
  });
}

function teacherCardHtml(teacher) {
  const office = roomById(teacher.office_room_id);
  const current = currentClassForTeacher(teacher.id);

  const hoursHtml = (teacher.office_hours || [])
    .map((oh) => `<span class="badge">${oh.day} ${oh.time}</span>`)
    .join("");

  return `
    <div class="card">
      <h2>${teacher.name}</h2>
      <div class="subtitle">${teacher.department}</div>
      <div class="badges">${hoursHtml}</div>
      <div class="landmarks">Iroda: ${office ? `${office.code} (${office.name})` : "nincs megadva"}</div>
      <div class="landmarks">E-mail: ${teacher.email}</div>
      ${
        current
          ? `<div class="landmarks">🟢 Most tanít: <strong>${current.subject}</strong>, terem ${current.room_id.toUpperCase()}</div>`
          : ""
      }
    </div>
  `;
}

function toggleRoute(id) {
  document.getElementById(id).classList.toggle("open");
}
window.toggleRoute = toggleRoute;

function renderResults(query) {
  const resultsEl = document.getElementById("results");
  const q = normalize(query);

  if (activeTab === "termek") {
    const filtered = rooms.filter((r) => {
      const building = buildingById(r.building_id);
      return (
        normalize(r.code).includes(q) ||
        normalize(r.name).includes(q) ||
        normalize(r.type).includes(q) ||
        (building && normalize(building.name).includes(q))
      );
    });
    resultsEl.innerHTML = filtered.length
      ? filtered.map(roomCardHtml).join("")
      : `<div class="empty-state">Nincs találat.</div>`;
  } else {
    const filtered = teachers.filter(
      (t) => normalize(t.name).includes(q) || normalize(t.department).includes(q)
    );
    resultsEl.innerHTML = filtered.length
      ? filtered.map(teacherCardHtml).join("")
      : `<div class="empty-state">Nincs találat.</div>`;
  }
}

function setTab(tab) {
  activeTab = tab;
  document.getElementById("tab-termek").classList.toggle("active", tab === "termek");
  document.getElementById("tab-tanarok").classList.toggle("active", tab === "tanarok");
  document.getElementById("search-input").placeholder =
    tab === "termek" ? "Terem neve, kódja..." : "Tanár neve, tanszéke...";
  renderResults(document.getElementById("search-input").value);
}
window.setTab = setTab;

async function init() {
  await loadData();
  renderResults("");
  document.getElementById("search-input").addEventListener("input", (e) => {
    renderResults(e.target.value);
  });
}

init();
