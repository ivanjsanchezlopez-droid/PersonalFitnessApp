const HISTORY_KEY = "personalFitnessHistoryV1";
const BODY_KEY = "personalFitnessBodyV1";
const ACTIVITY_TYPES = ["Gimnasio", "Natación", "Movilidad", "Montaña", "Aguas abiertas"];

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function addSession(type, session) {
  const history = getHistory();
  const today = localDateKey();
  const duplicate = history.some(item =>
    item.date === today && item.type === type && item.session === session
  );

  if (duplicate) {
    showToast("Esta sesión ya fue registrada hoy.");
    return;
  }

  history.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: today,
    timestamp: new Date().toISOString(),
    type,
    session
  });

  saveHistory(history);
  renderHistory();
  showToast("Sesión guardada.");
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function calculateStreak(history) {
  const uniqueDates = [...new Set(history.map(item => item.date))].sort().reverse();
  if (!uniqueDates.length) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const today = localDateKey(cursor);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);
  const startsTodayOrYesterday = uniqueDates[0] === today || uniqueDates[0] === localDateKey(yesterday);
  if (!startsTodayOrYesterday) return 0;

  if (uniqueDates[0] !== today) cursor.setDate(cursor.getDate() - 1);

  for (const dateKey of uniqueDates) {
    if (dateKey === localDateKey(cursor)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (dateKey < localDateKey(cursor)) {
      break;
    }
  }
  return streak;
}

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric", month: "short", year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function renderHistory() {
  const history = getHistory().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekCount = history.filter(item => new Date(`${item.date}T12:00:00`) >= weekStart).length;
  const monthCount = history.filter(item => new Date(`${item.date}T12:00:00`) >= monthStart).length;

  document.getElementById("weekCount").textContent = weekCount;
  document.getElementById("monthCount").textContent = monthCount;
  document.getElementById("streakCount").textContent = `${calculateStreak(history)} días`;

  const typeSummary = document.getElementById("typeSummary");
  typeSummary.innerHTML = ACTIVITY_TYPES.map(type => {
    const count = history.filter(item => item.type === type).length;
    return `<div class="type-row"><span>${type}</span><strong>${count}</strong></div>`;
  }).join("");

  const historyList = document.getElementById("historyList");
  if (!history.length) {
    historyList.innerHTML = '<p class="muted">Todavía no has registrado sesiones.</p>';
  } else {
    historyList.innerHTML = history.slice(0, 20).map(item => `
      <div class="history-item">
        <div>
          <strong>${item.session}</strong>
          <small>${item.type}</small>
        </div>
        <span>${formatDate(item.date)}</span>
      </div>
    `).join("");
  }

  document.querySelectorAll(".complete-btn").forEach(button => {
    const doneToday = history.some(item =>
      item.date === localDateKey() &&
      item.type === button.dataset.type &&
      item.session === button.dataset.session
    );
    button.classList.toggle("done", doneToday);
    button.textContent = doneToday ? "Completada hoy" : "Marcar sesión completada";
  });
}

function exportHistory() {
  const blob = new Blob([JSON.stringify(getHistory(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fitness-history-${localDateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  if (!confirm("¿Deseas borrar todo el historial guardado en este navegador?")) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast("Historial borrado.");
}

function signed(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const fixed = Number(value).toFixed(decimals);
  return `${value > 0 ? "+" : ""}${fixed}`;
}

function renderBodyData(records) {
  if (!Array.isArray(records) || !records.length) throw new Error("El archivo no contiene mediciones.");
  const sorted = [...records].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  document.getElementById("bodyWeight").textContent = `${latest.weightKg ?? "—"} kg`;
  document.getElementById("bodyBmi").textContent = latest.bmi ?? "—";
  document.getElementById("bodyMuscle").textContent = `${latest.muscleKg ?? "—"} kg`;
  document.getElementById("bodyFat").textContent = `${latest.bodyFatPercent ?? "—"}%`;

  const fields = [
    ["Fecha", latest.date],
    ["Estatura", latest.heightCm ? `${latest.heightCm} cm` : "—"],
    ["Peso", latest.weightKg != null ? `${latest.weightKg} kg` : "—"],
    ["IMC", latest.bmi ?? "—"],
    ["Masa muscular", latest.muscleKg != null ? `${latest.muscleKg} kg` : "—"],
    ["Masa grasa", latest.fatMassKg != null ? `${latest.fatMassKg} kg` : "—"],
    ["Grasa corporal", latest.bodyFatPercent != null ? `${latest.bodyFatPercent}%` : "—"],
    ["Grasa visceral", latest.visceralFat ?? "—"],
    ["Cintura/cadera", latest.waistHipRatio ?? "—"],
    ["Puntaje InBody", latest.inBodyScore ?? "—"]
  ];

  document.getElementById("bodyLatest").innerHTML = fields
    .map(([label, value]) => `<div class="body-row"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  if (previous) {
    const trendFields = [
      ["Peso", `${signed(latest.weightKg - previous.weightKg)} kg`],
      ["Masa muscular", `${signed(latest.muscleKg - previous.muscleKg)} kg`],
      ["Masa grasa", `${signed(latest.fatMassKg - previous.fatMassKg)} kg`],
      ["Grasa corporal", `${signed(latest.bodyFatPercent - previous.bodyFatPercent)} pts`],
      ["Grasa visceral", signed(latest.visceralFat - previous.visceralFat, 0)],
      ["Cintura/cadera", signed(latest.waistHipRatio - previous.waistHipRatio, 2)]
    ];
    document.getElementById("bodyTrend").innerHTML = trendFields
      .map(([label, value]) => `<div class="body-row"><span>${label}</span><strong>${value}</strong></div>`)
      .join("");
  } else {
    document.getElementById("bodyTrend").innerHTML = '<p class="muted">Se necesita al menos una medición anterior para calcular tendencias.</p>';
  }

  document.getElementById("bodyDashboard").classList.remove("hidden");
  document.getElementById("bodyStatus").textContent = `${sorted.length} medición(es) cargada(s).`;
}

function loadSavedBody() {
  try {
    const saved = JSON.parse(localStorage.getItem(BODY_KEY));
    if (saved) renderBodyData(saved);
  } catch {}
}

document.querySelectorAll(".complete-btn, .quick-activity").forEach(button => {
  button.addEventListener("click", () => addSession(button.dataset.type, button.dataset.session));
});

document.getElementById("exportHistory").addEventListener("click", exportHistory);
document.getElementById("clearHistory").addEventListener("click", clearHistory);

document.getElementById("bodyFile").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const records = JSON.parse(reader.result);
      renderBodyData(records);
      localStorage.setItem(BODY_KEY, JSON.stringify(records));
      showToast("Evaluación física cargada.");
    } catch (error) {
      document.getElementById("bodyStatus").textContent = `No se pudo leer el archivo: ${error.message}`;
    }
  };
  reader.readAsText(file);
});

renderHistory();
loadSavedBody();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
