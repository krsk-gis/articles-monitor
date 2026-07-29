let data = { buildings: [], rooms: [], teachers: [], schedule: [] };

async function loadData() {
  const [b, r, t, s] = await Promise.all([
    fetch("data/buildings.json").then((res) => res.json()),
    fetch("data/rooms.json").then((res) => res.json()),
    fetch("data/teachers.json").then((res) => res.json()),
    fetch("data/schedule.json").then((res) => res.json()),
  ]);
  data.buildings = b;
  data.rooms = r;
  data.teachers = t;
  data.schedule = s;
}

function parseBool(str) {
  return (str || "").trim().toLowerCase().startsWith("i");
}

function findIndexById(arr, id) {
  return arr.findIndex((item) => item.id === id);
}

/* ---------- selects ---------- */

function fillSelect(selectEl, items, valueFn, labelFn, placeholder) {
  selectEl.innerHTML =
    `<option value="">${placeholder}</option>` +
    items.map((item) => `<option value="${valueFn(item)}">${labelFn(item)}</option>`).join("");
}

function refreshSelects() {
  fillSelect(document.getElementById("room-building"), data.buildings, (b) => b.id, (b) => b.name, "– válassz épületet –");
  fillSelect(document.getElementById("teacher-office"), data.rooms, (r) => r.id, (r) => `${r.code} · ${r.name}`, "– válassz termet –");
  fillSelect(document.getElementById("schedule-teacher"), data.teachers, (t) => t.id, (t) => t.name, "– válassz tanárt –");
  fillSelect(document.getElementById("schedule-room"), data.rooms, (r) => r.id, (r) => `${r.code} · ${r.name}`, "– válassz termet –");
}

/* ---------- json preview ---------- */

function refreshJson(entity) {
  document.getElementById(`${entity}-json`).textContent = JSON.stringify(data[entity], null, 2);
}

function refreshAllJson() {
  ["buildings", "rooms", "teachers", "schedule"].forEach(refreshJson);
}

function downloadJson(entity) {
  const blob = new Blob([JSON.stringify(data[entity], null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${entity}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
window.downloadJson = downloadJson;

/* ---------- buildings ---------- */

function renderBuildingsList() {
  const el = document.getElementById("buildings-list");
  el.innerHTML = data.buildings
    .map(
      (b) => `
      <div class="card">
        <h2>${b.name}</h2>
        <div class="subtitle">${b.address || ""}</div>
        <button type="button" onclick="editBuilding('${b.id}')">Szerkesztés</button>
        <button type="button" class="secondary" onclick="deleteBuilding('${b.id}')">Törlés</button>
      </div>`
    )
    .join("");
}

function editBuilding(id) {
  const b = data.buildings[findIndexById(data.buildings, id)];
  if (!b) return;
  document.getElementById("building-edit-id").value = b.id;
  document.getElementById("building-id").value = b.id;
  document.getElementById("building-name").value = b.name || "";
  document.getElementById("building-address").value = b.address || "";
  document.getElementById("building-coords").value = b.coordinates ? `${b.coordinates.lat}, ${b.coordinates.lng}` : "";
  document.getElementById("building-transit").value = b.nearest_transit || "";
  document.getElementById("building-parking").value = b.parking || "";
  document.getElementById("building-notes").value = b.notes || "";
  document.getElementById("building-entrances").value = (b.entrances || [])
    .map((e) => `${e.name} | ${e.description || ""} | ${e.wheelchair_accessible ? "igen" : "nem"} | ${e.automatic_door ? "igen" : "nem"} | ${e.opening_hours || ""}`)
    .join("\n");
  window.scrollTo({ top: document.getElementById("building-form").offsetTop - 20, behavior: "smooth" });
}
window.editBuilding = editBuilding;

function deleteBuilding(id) {
  if (!confirm("Biztosan törlöd ezt az épületet?")) return;
  data.buildings.splice(findIndexById(data.buildings, id), 1);
  renderBuildingsList();
  refreshJson("buildings");
  refreshSelects();
}
window.deleteBuilding = deleteBuilding;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("building-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = document.getElementById("building-edit-id").value;
    const [latStr, lngStr] = document.getElementById("building-coords").value.split(",").map((s) => s.trim());

    const entrances = document
      .getElementById("building-entrances")
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, description, accessible, autoDoor, hours] = line.split("|").map((s) => (s || "").trim());
        return {
          name: name || "",
          description: description || "",
          wheelchair_accessible: parseBool(accessible),
          automatic_door: parseBool(autoDoor),
          opening_hours: hours || "",
        };
      });

    const building = {
      id: document.getElementById("building-id").value.trim(),
      name: document.getElementById("building-name").value.trim(),
      address: document.getElementById("building-address").value.trim(),
      coordinates: latStr && lngStr ? { lat: parseFloat(latStr), lng: parseFloat(lngStr) } : undefined,
      entrances,
      nearest_transit: document.getElementById("building-transit").value.trim(),
      parking: document.getElementById("building-parking").value.trim(),
      notes: document.getElementById("building-notes").value.trim(),
    };

    if (editId) {
      data.buildings[findIndexById(data.buildings, editId)] = building;
    } else {
      data.buildings.push(building);
    }
    resetForm("building");
    renderBuildingsList();
    refreshJson("buildings");
    refreshSelects();
  });

  document.getElementById("room-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = document.getElementById("room-edit-id").value;

    const room = {
      id: document.getElementById("room-id").value.trim(),
      code: document.getElementById("room-code").value.trim(),
      name: document.getElementById("room-name").value.trim(),
      building_id: document.getElementById("room-building").value,
      floor: parseInt(document.getElementById("room-floor").value, 10) || 0,
      type: document.getElementById("room-type").value.trim(),
      capacity: parseInt(document.getElementById("room-capacity").value, 10) || 0,
      equipment: document
        .getElementById("room-equipment")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      accessibility: {
        wheelchair_accessible: document.getElementById("room-wheelchair").checked,
        elevator: document.getElementById("room-elevator").checked,
        ramp: document.getElementById("room-ramp").checked,
        accessible_toilet_nearby: document.getElementById("room-toilet").checked,
        braille_signage: document.getElementById("room-braille").checked,
        induction_loop: document.getElementById("room-induction").checked,
        route_from_entrance: document
          .getElementById("room-route")
          .value.split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        landmarks: document
          .getElementById("room-landmarks")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        photo_url: document.getElementById("room-photo").value.trim(),
      },
    };

    if (editId) {
      data.rooms[findIndexById(data.rooms, editId)] = room;
    } else {
      data.rooms.push(room);
    }
    resetForm("room");
    renderRoomsList();
    refreshJson("rooms");
    refreshSelects();
  });

  document.getElementById("teacher-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = document.getElementById("teacher-edit-id").value;

    const office_hours = document
      .getElementById("teacher-hours")
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [day, time] = line.split(",").map((s) => s.trim());
        return { day: day || "", time: time || "" };
      });

    const teacher = {
      id: document.getElementById("teacher-id").value.trim(),
      name: document.getElementById("teacher-name").value.trim(),
      department: document.getElementById("teacher-department").value.trim(),
      email: document.getElementById("teacher-email").value.trim(),
      office_room_id: document.getElementById("teacher-office").value,
      office_hours,
    };

    if (editId) {
      data.teachers[findIndexById(data.teachers, editId)] = teacher;
    } else {
      data.teachers.push(teacher);
    }
    resetForm("teacher");
    renderTeachersList();
    refreshJson("teachers");
    refreshSelects();
  });

  document.getElementById("schedule-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const editIndex = document.getElementById("schedule-edit-id").value;

    const entry = {
      subject: document.getElementById("schedule-subject").value.trim(),
      teacher_id: document.getElementById("schedule-teacher").value,
      room_id: document.getElementById("schedule-room").value,
      day: document.getElementById("schedule-day").value,
      time: document.getElementById("schedule-time").value.trim(),
    };

    if (editIndex !== "") {
      data.schedule[parseInt(editIndex, 10)] = entry;
    } else {
      data.schedule.push(entry);
    }
    resetForm("schedule");
    renderScheduleList();
    refreshJson("schedule");
  });

  init();
});

/* ---------- rooms ---------- */

function renderRoomsList() {
  const el = document.getElementById("rooms-list");
  el.innerHTML = data.rooms
    .map(
      (r) => `
      <div class="card">
        <h2>${r.code} · ${r.name}</h2>
        <div class="subtitle">${(data.buildings.find((b) => b.id === r.building_id) || {}).name || ""}</div>
        <button type="button" onclick="editRoom('${r.id}')">Szerkesztés</button>
        <button type="button" class="secondary" onclick="deleteRoom('${r.id}')">Törlés</button>
      </div>`
    )
    .join("");
}

function editRoom(id) {
  const r = data.rooms[findIndexById(data.rooms, id)];
  if (!r) return;
  const acc = r.accessibility || {};
  document.getElementById("room-edit-id").value = r.id;
  document.getElementById("room-id").value = r.id;
  document.getElementById("room-code").value = r.code || "";
  document.getElementById("room-name").value = r.name || "";
  document.getElementById("room-building").value = r.building_id || "";
  document.getElementById("room-floor").value = r.floor ?? "";
  document.getElementById("room-type").value = r.type || "";
  document.getElementById("room-capacity").value = r.capacity ?? "";
  document.getElementById("room-equipment").value = (r.equipment || []).join(", ");
  document.getElementById("room-wheelchair").checked = !!acc.wheelchair_accessible;
  document.getElementById("room-elevator").checked = !!acc.elevator;
  document.getElementById("room-ramp").checked = !!acc.ramp;
  document.getElementById("room-toilet").checked = !!acc.accessible_toilet_nearby;
  document.getElementById("room-braille").checked = !!acc.braille_signage;
  document.getElementById("room-induction").checked = !!acc.induction_loop;
  document.getElementById("room-route").value = (acc.route_from_entrance || []).join("\n");
  document.getElementById("room-landmarks").value = (acc.landmarks || []).join(", ");
  document.getElementById("room-photo").value = acc.photo_url || "";
  window.scrollTo({ top: document.getElementById("room-form").offsetTop - 20, behavior: "smooth" });
}
window.editRoom = editRoom;

function deleteRoom(id) {
  if (!confirm("Biztosan törlöd ezt a termet?")) return;
  data.rooms.splice(findIndexById(data.rooms, id), 1);
  renderRoomsList();
  refreshJson("rooms");
  refreshSelects();
}
window.deleteRoom = deleteRoom;

/* ---------- teachers ---------- */

function renderTeachersList() {
  const el = document.getElementById("teachers-list");
  el.innerHTML = data.teachers
    .map(
      (t) => `
      <div class="card">
        <h2>${t.name}</h2>
        <div class="subtitle">${t.department || ""}</div>
        <button type="button" onclick="editTeacher('${t.id}')">Szerkesztés</button>
        <button type="button" class="secondary" onclick="deleteTeacher('${t.id}')">Törlés</button>
      </div>`
    )
    .join("");
}

function editTeacher(id) {
  const t = data.teachers[findIndexById(data.teachers, id)];
  if (!t) return;
  document.getElementById("teacher-edit-id").value = t.id;
  document.getElementById("teacher-id").value = t.id;
  document.getElementById("teacher-name").value = t.name || "";
  document.getElementById("teacher-department").value = t.department || "";
  document.getElementById("teacher-email").value = t.email || "";
  document.getElementById("teacher-office").value = t.office_room_id || "";
  document.getElementById("teacher-hours").value = (t.office_hours || []).map((h) => `${h.day}, ${h.time}`).join("\n");
  window.scrollTo({ top: document.getElementById("teacher-form").offsetTop - 20, behavior: "smooth" });
}
window.editTeacher = editTeacher;

function deleteTeacher(id) {
  if (!confirm("Biztosan törlöd ezt a tanárt?")) return;
  data.teachers.splice(findIndexById(data.teachers, id), 1);
  renderTeachersList();
  refreshJson("teachers");
  refreshSelects();
}
window.deleteTeacher = deleteTeacher;

/* ---------- schedule ---------- */

function renderScheduleList() {
  const el = document.getElementById("schedule-list");
  el.innerHTML = data.schedule
    .map((s, idx) => {
      const teacher = data.teachers.find((t) => t.id === s.teacher_id);
      const room = data.rooms.find((r) => r.id === s.room_id);
      return `
      <div class="card">
        <h2>${s.subject}</h2>
        <div class="subtitle">${teacher ? teacher.name : ""} · ${room ? room.code : ""} · ${s.day} ${s.time}</div>
        <button type="button" onclick="editSchedule(${idx})">Szerkesztés</button>
        <button type="button" class="secondary" onclick="deleteSchedule(${idx})">Törlés</button>
      </div>`;
    })
    .join("");
}

function editSchedule(idx) {
  const s = data.schedule[idx];
  if (!s) return;
  document.getElementById("schedule-edit-id").value = idx;
  document.getElementById("schedule-subject").value = s.subject || "";
  document.getElementById("schedule-teacher").value = s.teacher_id || "";
  document.getElementById("schedule-room").value = s.room_id || "";
  document.getElementById("schedule-day").value = s.day || "Hétfő";
  document.getElementById("schedule-time").value = s.time || "";
  window.scrollTo({ top: document.getElementById("schedule-form").offsetTop - 20, behavior: "smooth" });
}
window.editSchedule = editSchedule;

function deleteSchedule(idx) {
  if (!confirm("Biztosan törlöd ezt az órarendi bejegyzést?")) return;
  data.schedule.splice(idx, 1);
  renderScheduleList();
  refreshJson("schedule");
}
window.deleteSchedule = deleteSchedule;

/* ---------- reset ---------- */

function resetForm(entity) {
  document.getElementById(`${entity}-form`).reset();
  document.getElementById(`${entity}-edit-id`).value = "";
}
window.resetForm = resetForm;

/* ---------- init ---------- */

async function init() {
  await loadData();
  renderBuildingsList();
  renderRoomsList();
  renderTeachersList();
  renderScheduleList();
  refreshSelects();
  refreshAllJson();
}
