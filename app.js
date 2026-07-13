const HISTORY_KEY = "personalFitnessHistoryV1";
const BODY_KEY = "personalFitnessBodyV1";
const RECOVERY_KEY = "personalFitnessRecoveryV1";
const PHYSIO_KEY = "personalFitnessPhysioV1";
const GOALS_KEY = "personalFitnessGoalsV1";
const APPOINTMENTS_KEY = "personalFitnessAppointmentsV1";
const BACKUP_META_KEY = "personalFitnessBackupMetaV1";
const APP_VERSION = "4.5";

const ACTIVITY_TYPES = ["Gimnasio", "Natación", "Movilidad", "Montaña", "Aguas abiertas"];
const LOAD_TYPES = ["Gimnasio", "Natación", "Montaña", "Aguas abiertas"];


const GOAL_START_DATE = "2026-06-01";

const GOAL_DEFINITIONS = [
  {
    id: "weight",
    title: "Peso corporal",
    initial: "77,7 kg",
    target: "73–75 kg",
    field: "weightKg",
    format: value => `${Number(value).toFixed(1)} kg`,
    reached: value => Number(value) >= 73 && Number(value) <= 75
  },
  {
    id: "bodyFat",
    title: "Grasa corporal",
    initial: "20,1%",
    target: "17–18%",
    field: "bodyFatPercent",
    format: value => `${Number(value).toFixed(1)}%`,
    reached: value => Number(value) >= 17 && Number(value) <= 18
  },
  {
    id: "muscle",
    title: "Mantener masa muscular",
    initial: "35,4 kg",
    target: "≥35 kg",
    field: "muscleKg",
    format: value => `${Number(value).toFixed(1)} kg`,
    reached: value => Number(value) >= 35
  },
  {
    id: "fatMass",
    title: "Masa grasa",
    initial: "15,6 kg",
    target: "12–13,5 kg",
    field: "fatMassKg",
    format: value => `${Number(value).toFixed(1)} kg`,
    reached: value => Number(value) >= 12 && Number(value) <= 13.5
  },
  {
    id: "visceralFat",
    title: "Grasa visceral",
    initial: "Nivel 6",
    target: "Nivel 5–6",
    field: "visceralFat",
    format: value => `Nivel ${Number(value).toFixed(0)}`,
    reached: value => Number(value) >= 5 && Number(value) <= 6
  }
];

function readJsonStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function getHistory() {
  return readJsonStorage(HISTORY_KEY, []);
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getRecoveryChecks() {
  return readJsonStorage(RECOVERY_KEY, []);
}

function saveRecoveryChecks(checks) {
  localStorage.setItem(RECOVERY_KEY, JSON.stringify(checks));
}

function getDefaultGoalsState() {
  return {
    items: Object.fromEntries(
      GOAL_DEFINITIONS.map(goal => [
        goal.id,
        {
          completed: false,
          completionDate: null
        }
      ])
    ),
    custom: []
  };
}

function getGoalsState() {
  const stored = readJsonStorage(GOALS_KEY, null);
  const defaults = getDefaultGoalsState();

  if (!stored || typeof stored !== "object") return defaults;

  GOAL_DEFINITIONS.forEach(goal => {
    defaults.items[goal.id] = {
      ...defaults.items[goal.id],
      ...(stored.items?.[goal.id] || {})
    };
  });

  defaults.custom = Array.isArray(stored.custom)
    ? stored.custom
    : [];

  return defaults;
}

function saveGoalsState(state) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(state));
}

function getAppointments() {
  const stored = readJsonStorage(APPOINTMENTS_KEY, null);
  const legacyPhysio = readJsonStorage(PHYSIO_KEY, null);

  return {
    psychologyNextDate: stored?.psychologyNextDate || null,
    psychologyLastVisit: stored?.psychologyLastVisit || null,
    nutritionistNextDate: stored?.nutritionistNextDate || null,
    nutritionistLastVisit: stored?.nutritionistLastVisit || null,
    physio: {
      lastVisit: stored?.physio?.lastVisit || legacyPhysio?.lastVisit || null,
      intervalWeeks:
        Number(stored?.physio?.intervalWeeks || legacyPhysio?.intervalWeeks) || 8
    }
  };
}

function saveAppointments(appointments) {
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
  localStorage.setItem(PHYSIO_KEY, JSON.stringify(appointments.physio));
}

function getPhysioSettings() {
  return getAppointments().physio;
}

function savePhysioSettings(settings) {
  const appointments = getAppointments();
  appointments.physio = {
    lastVisit: settings.lastVisit || null,
    intervalWeeks: Number(settings.intervalWeeks) || 8
  };
  saveAppointments(appointments);
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatDate(dateKey) {
  if (!dateKey) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(dateFromKey(dateKey));
}

function daysBetween(fromDate, toDate) {
  const oneDay = 86400000;
  const start = new Date(fromDate);
  const end = new Date(toDate);
  start.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);
  return Math.round((end - start) / oneDay);
}

function showToast(message, actionLabel = null, actionCallback = null, duration = 2500) {
  const toast = document.getElementById("toast");
  const messageNode = document.getElementById("toastMessage");
  const actionButton = document.getElementById("toastAction");

  messageNode.textContent = message;
  actionButton.hidden = !actionLabel;
  actionButton.textContent = actionLabel || "";
  actionButton.onclick = null;

  if (actionLabel && actionCallback) {
    actionButton.onclick = () => {
      actionCallback();
      toast.classList.remove("show");
    };
  }

  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
    actionButton.onclick = null;
  }, duration);
}

function addSession(type, session) {
  const history = getHistory();
  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: localDateKey(),
    timestamp: new Date().toISOString(),
    type,
    session
  };

  history.push(item);
  saveHistory(history);
  renderAll();

  showToast(
    "Sesión guardada.",
    "Deshacer",
    () => removeSessionById(item.id, false, false),
    5000
  );
}

function removeSessionById(id, requireConfirmation = true, notify = true) {
  const history = getHistory();
  const item = history.find(entry => entry.id === id);
  if (!item) return;

  if (
    requireConfirmation &&
    !confirm(`¿Eliminar "${item.session}" del ${formatDate(item.date)}?`)
  ) {
    return;
  }

  saveHistory(history.filter(entry => entry.id !== id));
  renderAll();
  if (notify) showToast("Sesión eliminada.");
}

function toggleTodaySession(type, session) {
  const history = getHistory();
  const today = localDateKey();
  const existing = history.find(item =>
    item.date === today &&
    item.type === type &&
    item.session === session
  );

  if (existing) {
    removeSessionById(existing.id, true);
  } else {
    addSession(type, session);
  }
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
  cursor.setHours(12, 0, 0, 0);

  const today = localDateKey(cursor);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);

  if (uniqueDates[0] !== today && uniqueDates[0] !== localDateKey(yesterday)) return 0;
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

function getConsecutiveLoadDays(history) {
  const loadDates = [...new Set(
    history
      .filter(item => LOAD_TYPES.includes(item.type))
      .map(item => item.date)
  )].sort().reverse();

  if (!loadDates.length) return 0;

  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  const today = localDateKey(cursor);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);

  if (loadDates[0] !== today && loadDates[0] !== localDateKey(yesterday)) return 0;
  if (loadDates[0] !== today) cursor.setDate(cursor.getDate() - 1);

  let count = 0;
  for (const dateKey of loadDates) {
    if (dateKey === localDateKey(cursor)) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (dateKey < localDateKey(cursor)) {
      break;
    }
  }
  return count;
}

function getLoadStats(history) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const last7 = history.filter(item => {
    if (!LOAD_TYPES.includes(item.type)) return false;
    const age = daysBetween(dateFromKey(item.date), now);
    return age >= 0 && age < 7;
  }).length;

  const previous21 = history.filter(item => {
    if (!LOAD_TYPES.includes(item.type)) return false;
    const age = daysBetween(dateFromKey(item.date), now);
    return age >= 7 && age < 28;
  }).length;

  const priorWeeklyAverage = previous21 / 3;
  const notableIncrease =
    priorWeeklyAverage >= 1 &&
    last7 >= 4 &&
    last7 > priorWeeklyAverage * 1.5;

  return {
    last7,
    priorWeeklyAverage,
    notableIncrease,
    consecutiveDays: getConsecutiveLoadDays(history)
  };
}

function renderHistory() {
  const history = getHistory().sort((a, b) =>
    String(b.timestamp).localeCompare(String(a.timestamp))
  );

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekCount = history.filter(item =>
    dateFromKey(item.date) >= weekStart
  ).length;

  const monthCount = history.filter(item =>
    dateFromKey(item.date) >= monthStart
  ).length;

  document.getElementById("weekCount").textContent = weekCount;
  document.getElementById("monthCount").textContent = monthCount;
  document.getElementById("streakCount").textContent = `${calculateStreak(history)} días`;

  document.getElementById("typeSummary").innerHTML = ACTIVITY_TYPES.map(type => {
    const count = history.filter(item => item.type === type).length;
    return `<div class="type-row"><span>${type}</span><strong>${count}</strong></div>`;
  }).join("");

  const historyList = document.getElementById("historyList");

  if (!history.length) {
    historyList.innerHTML = '<p class="muted">Todavía no has registrado sesiones.</p>';
  } else {
    historyList.innerHTML = history.slice(0, 20).map(item => `
      <div class="history-item">
        <div class="history-copy">
          <strong>${escapeHtml(item.session)}</strong>
          <small>${escapeHtml(item.type)} · ${formatDate(item.date)}</small>
        </div>
        <button
          class="delete-session-btn"
          type="button"
          data-entry-id="${item.id}"
          aria-label="Eliminar ${escapeHtml(item.session)}"
        >Eliminar</button>
      </div>
    `).join("");

    historyList.querySelectorAll(".delete-session-btn").forEach(button => {
      button.addEventListener("click", () => {
        removeSessionById(button.dataset.entryId, true);
      });
    });
  }

  document.querySelectorAll(".complete-btn, .quick-activity").forEach(button => {
    const doneToday = history.some(item =>
      item.date === localDateKey() &&
      item.type === button.dataset.type &&
      item.session === button.dataset.session
    );

    button.classList.toggle("done", doneToday);

    if (button.classList.contains("complete-btn")) {
      button.textContent = doneToday
        ? "Registrada hoy · tocar para eliminar"
        : "Marcar sesión completada";
    } else {
      button.textContent = doneToday
        ? `${button.dataset.session} registrada · tocar para eliminar`
        : `${button.dataset.session} completada`;
    }
  });

  renderBackupStatus();
}

function exportBackup() {
  const backup = {
    app: "Personal Fitness App",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    history: getHistory(),
    bodyComposition: readJsonStorage(BODY_KEY, null),
    recoveryChecks: getRecoveryChecks(),
    goals: getGoalsState(),
    appointments: getAppointments(),
    physio: getPhysioSettings()
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `personal-fitness-backup-${localDateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);

  localStorage.setItem(BACKUP_META_KEY, JSON.stringify({
    lastExport: new Date().toISOString()
  }));

  renderBackupStatus();
  showToast("Respaldo exportado.");
}

function importBackupFile(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const isLegacyHistory = Array.isArray(parsed);
      const history = isLegacyHistory ? parsed : parsed.history;

      if (!Array.isArray(history)) {
        throw new Error("El archivo no contiene un historial válido.");
      }

      if (!confirm("¿Reemplazar los datos locales actuales con este respaldo?")) {
        return;
      }

      saveHistory(history);

      if (!isLegacyHistory) {
        if (Array.isArray(parsed.bodyComposition)) {
          localStorage.setItem(BODY_KEY, JSON.stringify(parsed.bodyComposition));
        }
        if (Array.isArray(parsed.recoveryChecks)) {
          saveRecoveryChecks(parsed.recoveryChecks);
        }
        if (parsed.goals && typeof parsed.goals === "object") {
          saveGoalsState(parsed.goals);
        }

        if (parsed.appointments && typeof parsed.appointments === "object") {
          saveAppointments({
            psychologyNextDate: parsed.appointments.psychologyNextDate || null,
            psychologyLastVisit: parsed.appointments.psychologyLastVisit || null,
            nutritionistNextDate:
              parsed.appointments.nutritionistNextDate || null,
            nutritionistLastVisit:
              parsed.appointments.nutritionistLastVisit || null,
            physio: {
              lastVisit: parsed.appointments.physio?.lastVisit || null,
              intervalWeeks:
                Number(parsed.appointments.physio?.intervalWeeks) || 8
            }
          });
        } else if (parsed.physio && typeof parsed.physio === "object") {
          savePhysioSettings({
            lastVisit: parsed.physio.lastVisit || null,
            intervalWeeks: Number(parsed.physio.intervalWeeks) || 8
          });
        }
      }

      localStorage.setItem(BACKUP_META_KEY, JSON.stringify({
        lastImport: new Date().toISOString()
      }));

      renderAll();
      loadSavedBody();
      showToast("Respaldo importado.");
    } catch (error) {
      alert(`No se pudo importar el respaldo: ${error.message}`);
    }
  };

  reader.readAsText(file);
}

function renderBackupStatus() {
  const meta = readJsonStorage(BACKUP_META_KEY, {});
  const status = document.getElementById("backupStatus");

  if (meta.lastExport) {
    const date = new Date(meta.lastExport);
    status.textContent = `Último respaldo exportado: ${new Intl.DateTimeFormat("es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date)}.`;
  } else if (meta.lastImport) {
    const date = new Date(meta.lastImport);
    status.textContent = `Último respaldo importado: ${new Intl.DateTimeFormat("es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date)}.`;
  } else {
    status.textContent = "Datos guardados solo en este dispositivo.";
  }
}

function clearHistory() {
  if (!confirm("¿Deseas borrar todo el historial guardado en este navegador?")) return;
  localStorage.removeItem(HISTORY_KEY);
  renderAll();
  showToast("Historial borrado.");
}


function getLatestBodyRecord() {
  const records = readJsonStorage(BODY_KEY, null);
  if (!Array.isArray(records) || !records.length) return null;

  return [...records].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  ).at(-1);
}

function renderGoalCard(definition, goalState) {
  const latestBody = getLatestBodyRecord();
  const currentValue = latestBody?.[definition.field];
  const hasCurrentValue =
    currentValue !== null &&
    currentValue !== undefined &&
    currentValue !== "";

  const measurementReached =
    hasCurrentValue && definition.reached(currentValue);

  const completed = Boolean(goalState.completed);
  const completionDate =
    goalState.completionDate || (completed ? localDateKey() : null);

  const daysToComplete = completionDate
    ? Math.max(
        0,
        daysBetween(dateFromKey(GOAL_START_DATE), dateFromKey(completionDate))
      )
    : null;

  return `
    <article class="goal-card ${completed ? "goal-completed" : ""}">
      <label class="goal-check-row">
        <input
          class="goal-checkbox"
          type="checkbox"
          data-goal-id="${definition.id}"
          ${completed ? "checked" : ""}
        >
        <div class="goal-copy">
          <h3>${escapeHtml(definition.title)}</h3>
          <p>Meta: ${escapeHtml(definition.target)}</p>
        </div>
      </label>

      <div class="goal-details">
        <div class="goal-detail">
          <span>Valor inicial</span>
          <strong>${escapeHtml(definition.initial)}</strong>
        </div>
        <div class="goal-detail">
          <span>Fecha de inicio</span>
          <strong>${formatDate(GOAL_START_DATE)}</strong>
        </div>
        <div class="goal-detail">
          <span>Última medición</span>
          <strong>
            ${
              hasCurrentValue
                ? escapeHtml(definition.format(currentValue))
                : "Sin datos cargados"
            }
          </strong>
        </div>
        <div class="goal-detail">
          <span>Estado</span>
          <strong>${completed ? "Completado" : "Activo"}</strong>
        </div>
      </div>

      ${
        measurementReached
          ? '<span class="goal-reached">La última medición cumple la meta</span>'
          : hasCurrentValue
            ? '<span class="goal-not-reached">La última medición aún no cumple la meta</span>'
            : '<span class="goal-not-reached">Carga tu InBody para comparar automáticamente</span>'
      }

      ${
        completed
          ? `
            <div class="goal-completion">
              <label>
                Fecha de cumplimiento
                <input
                  class="goal-completion-date"
                  data-goal-id="${definition.id}"
                  type="date"
                  min="${GOAL_START_DATE}"
                  max="${localDateKey()}"
                  value="${completionDate}"
                >
              </label>
              <p class="goal-days">
                Tiempo para lograrlo: ${daysToComplete} ${
                  daysToComplete === 1 ? "día" : "días"
                }
              </p>
            </div>
          `
          : ""
      }
    </article>
  `;
}


function renderCustomGoalCard(goal) {
  const completed = Boolean(goal.completed);
  const completionDate = goal.completionDate || (completed ? localDateKey() : null);
  const daysToComplete = completionDate
    ? Math.max(0, daysBetween(dateFromKey(goal.startDate), dateFromKey(completionDate)))
    : null;

  return `
    <article class="goal-card ${completed ? "goal-completed" : ""}">
      <label class="goal-check-row">
        <input class="custom-goal-checkbox" type="checkbox" data-custom-goal-id="${goal.id}" ${completed ? "checked" : ""}>
        <div class="goal-copy">
          <h3>${escapeHtml(goal.title)}</h3>
          <p>Meta: ${escapeHtml(goal.target)}</p>
        </div>
      </label>

      <div class="goal-details">
        <div class="goal-detail"><span>Valor inicial</span><strong>${escapeHtml(goal.initial || "No definido")}</strong></div>
        <div class="goal-detail"><span>Fecha de inicio</span><strong>${formatDate(goal.startDate)}</strong></div>
        <div class="goal-detail"><span>Estado</span><strong>${completed ? "Completado" : "Activo"}</strong></div>
      </div>

      ${completed ? `
        <div class="goal-completion">
          <label>
            Fecha de cumplimiento
            <input class="custom-goal-completion-date" data-custom-goal-id="${goal.id}" type="date" min="${goal.startDate}" max="${localDateKey()}" value="${completionDate}">
          </label>
          <p class="goal-days">Tiempo para lograrlo: ${daysToComplete} ${daysToComplete === 1 ? "día" : "días"}</p>
        </div>
      ` : ""}

      <div class="goal-card-actions">
        <button class="delete-goal-btn" type="button" data-custom-goal-id="${goal.id}">Eliminar</button>
      </div>
    </article>
  `;
}

function addCustomGoal(event) {
  event.preventDefault();
  const title = document.getElementById("customGoalTitle").value.trim();
  const initial = document.getElementById("customGoalInitial").value.trim();
  const target = document.getElementById("customGoalTarget").value.trim();
  const startDate = document.getElementById("customGoalStartDate").value;

  if (!title || !target || !startDate) {
    showToast("Completa nombre, meta y fecha de inicio.");
    return;
  }

  const state = getGoalsState();
  state.custom.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    initial,
    target,
    startDate,
    completed: false,
    completionDate: null
  });
  saveGoalsState(state);
  document.getElementById("customGoalForm").reset();
  document.getElementById("customGoalStartDate").value = localDateKey();
  document.getElementById("customGoalDialog").close();
  renderGoals();
  showToast("Objetivo agregado.");
}

function toggleCustomGoal(goalId, completed) {
  const state = getGoalsState();
  const goal = state.custom.find(item => item.id === goalId);
  if (!goal) return;

  if (!completed) {
    if (!confirm("¿Marcar este objetivo como pendiente nuevamente?")) {
      renderGoals();
      return;
    }
    goal.completed = false;
    goal.completionDate = null;
  } else {
    goal.completed = true;
    goal.completionDate = localDateKey();
  }
  saveGoalsState(state);
  renderGoals();
  showToast(completed ? "Objetivo completado." : "Objetivo marcado como pendiente.");
}

function updateCustomGoalCompletionDate(goalId, date) {
  const state = getGoalsState();
  const goal = state.custom.find(item => item.id === goalId);
  if (!goal) return;
  goal.completionDate = date || localDateKey();
  saveGoalsState(state);
  renderGoals();
  showToast("Fecha actualizada.");
}

function deleteCustomGoal(goalId) {
  const state = getGoalsState();
  const goal = state.custom.find(item => item.id === goalId);
  if (!goal) return;
  if (!confirm(`¿Eliminar el objetivo "${goal.title}"?`)) return;
  state.custom = state.custom.filter(item => item.id !== goalId);
  saveGoalsState(state);
  renderGoals();
  showToast("Objetivo eliminado.");
}

function renderGoals() {
  const state = getGoalsState();

  const active = GOAL_DEFINITIONS.filter(
    goal => !state.items[goal.id]?.completed
  );

  const completed = GOAL_DEFINITIONS.filter(
    goal => state.items[goal.id]?.completed
  );

  const customActive = state.custom.filter(goal => !goal.completed);
  const customCompleted = state.custom.filter(goal => goal.completed);

  document.getElementById("activeGoalsCount").textContent = active.length + customActive.length;
  document.getElementById("completedGoalsTotal").textContent = completed.length + customCompleted.length;
  document.getElementById("completedGoalsCount").textContent = completed.length + customCompleted.length;

  document.getElementById("activeGoalsList").innerHTML = active.length
    ? active
        .map(goal => renderGoalCard(goal, state.items[goal.id]))
        .join("")
    : '<p class="goals-empty">Todos los objetivos están completados.</p>';

  document.getElementById("customGoalsList").innerHTML = customActive.length
    ? customActive.map(renderCustomGoalCard).join("")
    : '<p class="goals-empty">Todavía no hay objetivos personalizados activos.</p>';

  const completedCards = [
    ...completed.map(goal => renderGoalCard(goal, state.items[goal.id])),
    ...customCompleted.map(renderCustomGoalCard)
  ];

  document.getElementById("completedGoalsList").innerHTML = completedCards.length
    ? completedCards.join("")
    : '<p class="goals-empty">Todavía no hay objetivos completados.</p>';

  document.querySelectorAll(".goal-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const goalId = checkbox.dataset.goalId;
      const current = getGoalsState();
      const item = current.items[goalId];

      if (!checkbox.checked) {
        if (!confirm("¿Marcar este objetivo como pendiente nuevamente?")) {
          checkbox.checked = true;
          return;
        }

        item.completed = false;
        item.completionDate = null;
        saveGoalsState(current);
        renderGoals();
        showToast("Objetivo marcado como pendiente.");
        return;
      }

      item.completed = true;
      item.completionDate = localDateKey();
      saveGoalsState(current);
      renderGoals();
      showToast("Objetivo completado.");
    });
  });

  document.querySelectorAll(".goal-completion-date").forEach(input => {
    input.addEventListener("change", () => {
      const goalId = input.dataset.goalId;
      const stateNow = getGoalsState();

      if (!input.value) {
        input.value = localDateKey();
      }

      stateNow.items[goalId].completionDate = input.value;
      saveGoalsState(stateNow);
      renderGoals();
      showToast("Fecha de cumplimiento actualizada.");
    });
  });

  document.querySelectorAll(".custom-goal-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      toggleCustomGoal(checkbox.dataset.customGoalId, checkbox.checked);
    });
  });

  document.querySelectorAll(".custom-goal-completion-date").forEach(input => {
    input.addEventListener("change", () => {
      updateCustomGoalCompletionDate(input.dataset.customGoalId, input.value);
    });
  });

  document.querySelectorAll(".delete-goal-btn").forEach(button => {
    button.addEventListener("click", () => {
      deleteCustomGoal(button.dataset.customGoalId);
    });
  });
}

function getPsychologyDateStatus(dateKey) {
  if (!dateKey) {
    return {
      className: "",
      title: "No agendada todavía",
      message: "Selecciona la fecha de tu próxima cita.",
      daysRemaining: null
    };
  }

  const daysRemaining = daysBetween(new Date(), dateFromKey(dateKey));

  if (daysRemaining < 0) {
    return {
      className: "date-past",
      title: "La fecha registrada ya pasó",
      message: `${formatDate(dateKey)} · actualiza o marca la cita como realizada.`,
      daysRemaining
    };
  }

  if (daysRemaining === 0) {
    return {
      className: "reminder-today",
      title: "Cita de psicología hoy",
      message: formatDate(dateKey),
      daysRemaining
    };
  }

  if (daysRemaining === 1) {
    return {
      className: "reminder-tomorrow",
      title: "Cita de psicología mañana",
      message: `${formatDate(dateKey)} · recuerda verificar hora y modalidad.`,
      daysRemaining
    };
  }

  return {
    className: "",
    title: formatDate(dateKey),
    message: `Faltan ${daysRemaining} días.`,
    daysRemaining
  };
}

function getPhysioDueInfo() {
  const settings = getPhysioSettings();

  if (!settings.lastVisit) {
    return {
      dueDate: null,
      daysRemaining: null,
      title: "Sin visita registrada",
      message: "Registra la última visita para calcular la próxima revisión."
    };
  }

  const dueDate = dateFromKey(settings.lastVisit);
  dueDate.setDate(
    dueDate.getDate() + Number(settings.intervalWeeks || 8) * 7
  );

  const daysRemaining = daysBetween(new Date(), dueDate);

  if (daysRemaining < 0) {
    return {
      dueDate: localDateKey(dueDate),
      daysRemaining,
      title: `Revisión vencida hace ${Math.abs(daysRemaining)} días`,
      message: `Fecha estimada: ${formatDate(localDateKey(dueDate))}.`
    };
  }

  if (daysRemaining === 0) {
    return {
      dueDate: localDateKey(dueDate),
      daysRemaining,
      title: "Revisión preventiva hoy",
      message: formatDate(localDateKey(dueDate))
    };
  }

  if (daysRemaining === 1) {
    return {
      dueDate: localDateKey(dueDate),
      daysRemaining,
      title: "Revisión preventiva mañana",
      message: formatDate(localDateKey(dueDate))
    };
  }

  return {
    dueDate: localDateKey(dueDate),
    daysRemaining,
    title: formatDate(localDateKey(dueDate)),
    message: `Faltan ${daysRemaining} días.`
  };
}

function renderAppointments() {
  const appointments = getAppointments();
  const psychology = getPsychologyDateStatus(
    appointments.psychologyNextDate
  );

  const psychologyCard = document.getElementById("psychologyCard");
  psychologyCard.classList.remove(
    "reminder-tomorrow",
    "reminder-today",
    "date-past"
  );

  if (psychology.className) {
    psychologyCard.classList.add(psychology.className);
  }

  document.getElementById("psychologyDate").value =
    appointments.psychologyNextDate || "";
  document.getElementById("psychologyStatus").textContent = psychology.title;
  document.getElementById("psychologyCountdown").textContent =
    psychology.message;
  document.getElementById("psychologyLastVisit").textContent =
    appointments.psychologyLastVisit
      ? `Última cita registrada: ${formatDate(
          appointments.psychologyLastVisit
        )}.`
      : "Sin cita anterior registrada.";

  document.getElementById("completePsychologyDate").disabled =
    !appointments.psychologyNextDate;
  document.getElementById("clearPsychologyDate").disabled =
    !appointments.psychologyNextDate;

  const nutritionist = getPsychologyDateStatus(
    appointments.nutritionistNextDate
  );

  const nutritionistCard = document.getElementById("nutritionistCard");
  nutritionistCard.classList.remove(
    "reminder-tomorrow",
    "reminder-today",
    "date-past"
  );
  if (nutritionist.className) nutritionistCard.classList.add(nutritionist.className);

  document.getElementById("nutritionistDate").value = appointments.nutritionistNextDate || "";
  document.getElementById("nutritionistStatus").textContent = nutritionist.title;
  document.getElementById("nutritionistCountdown").textContent = nutritionist.message;
  document.getElementById("nutritionistLastVisit").textContent =
    appointments.nutritionistLastVisit
      ? `Última cita registrada: ${formatDate(appointments.nutritionistLastVisit)}.`
      : "Sin cita anterior registrada.";

  document.getElementById("completeNutritionistDate").disabled = !appointments.nutritionistNextDate;
  document.getElementById("clearNutritionistDate").disabled = !appointments.nutritionistNextDate;

  const physio = getPhysioDueInfo();
  document.getElementById("physioDate").value =
    appointments.physio.lastVisit || "";
  document.getElementById("physioInterval").value =
    String(appointments.physio.intervalWeeks || 8);
  document.getElementById("physioAppointmentStatus").textContent =
    physio.title;
  document.getElementById("physioAppointmentCountdown").textContent =
    physio.message;
}

function savePsychologyDate() {
  const date = document.getElementById("psychologyDate").value;
  if (!date) {
    showToast("Selecciona una fecha.");
    return;
  }

  if (!confirm(`¿Guardar la próxima cita para el ${formatDate(date)}?`)) {
    return;
  }

  const appointments = getAppointments();
  appointments.psychologyNextDate = date;
  saveAppointments(appointments);
  renderAll();
  showToast("Cita de psicología guardada.");
}

function completePsychologyDate() {
  const appointments = getAppointments();
  if (!appointments.psychologyNextDate) return;

  if (
    !confirm(
      `¿Marcar como realizada la cita del ${formatDate(
        appointments.psychologyNextDate
      )}?`
    )
  ) {
    return;
  }

  appointments.psychologyLastVisit =
    appointments.psychologyNextDate;
  appointments.psychologyNextDate = null;
  saveAppointments(appointments);
  renderAll();
  showToast("Cita marcada como realizada.");
}

function clearPsychologyDate() {
  const appointments = getAppointments();
  if (!appointments.psychologyNextDate) return;

  if (!confirm("¿Quitar la fecha de la próxima cita de psicología?")) {
    return;
  }

  appointments.psychologyNextDate = null;
  saveAppointments(appointments);
  renderAll();
  showToast("Fecha eliminada.");
}


function saveNutritionistDate() {
  const date = document.getElementById("nutritionistDate").value;
  if (!date) { showToast("Selecciona una fecha."); return; }
  if (!confirm(`¿Guardar la próxima cita para el ${formatDate(date)}?`)) return;
  const appointments = getAppointments();
  appointments.nutritionistNextDate = date;
  saveAppointments(appointments);
  renderAll();
  showToast("Cita de nutrición guardada.");
}

function completeNutritionistDate() {
  const appointments = getAppointments();
  if (!appointments.nutritionistNextDate) return;
  if (!confirm(`¿Marcar como realizada la cita del ${formatDate(appointments.nutritionistNextDate)}?`)) return;
  appointments.nutritionistLastVisit = appointments.nutritionistNextDate;
  appointments.nutritionistNextDate = null;
  saveAppointments(appointments);
  renderAll();
  showToast("Cita marcada como realizada.");
}

function clearNutritionistDate() {
  const appointments = getAppointments();
  if (!appointments.nutritionistNextDate) return;
  if (!confirm("¿Quitar la fecha de la próxima cita de nutrición?")) return;
  appointments.nutritionistNextDate = null;
  saveAppointments(appointments);
  renderAll();
  showToast("Fecha eliminada.");
}

function savePhysioFromAppointments() {
  const date = document.getElementById("physioDate").value;
  const intervalWeeks = Number(
    document.getElementById("physioInterval").value
  );

  if (!date) {
    showToast("Selecciona la fecha de la última visita.");
    return;
  }

  savePhysioSettings({
    lastVisit: date,
    intervalWeeks
  });

  renderAll();
  showToast("Seguimiento de fisioterapia guardado.");
}

function renderAttention() {
  const banner = document.getElementById("attentionBanner");
  const itemsNode = document.getElementById("attentionItems");
  const items = [];

  const appointments = getAppointments();
  const psychology = getPsychologyDateStatus(
    appointments.psychologyNextDate
  );

  if (psychology.daysRemaining === 1) {
    items.push({
      label: "Psicología",
      value: "Cita mañana"
    });
  } else if (psychology.daysRemaining === 0) {
    items.push({
      label: "Psicología",
      value: "Cita hoy"
    });
  }

  const nutritionist = getPsychologyDateStatus(
    appointments.nutritionistNextDate
  );
  if (nutritionist.daysRemaining === 1) {
    items.push({ label: "Nutrición", value: "Cita mañana" });
  } else if (nutritionist.daysRemaining === 0) {
    items.push({ label: "Nutrición", value: "Cita hoy" });
  }

  const physio = getPhysioDueInfo();
  if (physio.daysRemaining !== null && physio.daysRemaining <= 1) {
    items.push({
      label: "Fisioterapia",
      value:
        physio.daysRemaining < 0
          ? `Vencida hace ${Math.abs(physio.daysRemaining)} días`
          : physio.daysRemaining === 0
            ? "Revisión hoy"
            : "Revisión mañana"
    });
  }

  const recovery = calculateRecoveryStatus();
  if (recovery.status === "orange" || recovery.status === "red") {
    items.push({
      label: "Recuperación",
      value:
        recovery.status === "red"
          ? "Busca valoración"
          : "Valora fisioterapia"
    });
  }

  banner.classList.toggle("hidden", items.length === 0);
  itemsNode.innerHTML = items
    .slice(0, 3)
    .map(
      item => `
        <div class="attention-item">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.value)}</span>
        </div>
      `
    )
    .join("");
}


function classifyCheck(check) {
  if (!check) return "green";
  if (check.redFlag) return "red";

  const orange =
    Number(check.painScore) >= 5 ||
    check.symptomDuration === "7+" ||
    check.techniqueImpact === "yes" ||
    check.movementLimitation === true;

  if (orange) return "orange";

  const yellow =
    Number(check.painScore) >= 3 ||
    check.techniqueImpact === "slight" ||
    check.fatigueLevel === "high" ||
    check.sleepQuality === "bad";

  return yellow ? "yellow" : "green";
}

function calculateRecoveryStatus() {
  const history = getHistory();
  const checks = getRecoveryChecks()
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  const load = getLoadStats(history);
  const latestRecorded = checks[0] || null;
  const latestAge = latestRecorded
    ? daysBetween(dateFromKey(latestRecorded.date), new Date())
    : null;
  const latest = latestAge !== null && latestAge <= 14
    ? latestRecorded
    : null;
  const checkStale = latestRecorded && !latest;

  let status = classifyCheck(latest);
  const reasons = [];

  if (latest) {
    if (latest.redFlag) {
      reasons.push("Registraste un síntoma agudo importante.");
    } else {
      if (Number(latest.painScore) >= 5) reasons.push(`Dolor ${latest.painScore}/10.`);
      else if (Number(latest.painScore) >= 3) reasons.push(`Dolor ${latest.painScore}/10.`);

      if (latest.symptomDuration === "7+") reasons.push("La molestia lleva 7 días o más.");
      if (latest.techniqueImpact === "yes") reasons.push("La molestia alteró el entrenamiento.");
      if (latest.techniqueImpact === "slight") reasons.push("La molestia alteró un poco el entrenamiento.");
      if (latest.movementLimitation) reasons.push("Registraste pérdida de fuerza o movilidad.");
      if (latest.fatigueLevel === "high") reasons.push("Fatiga alta.");
      if (latest.sleepQuality === "bad") reasons.push("Sueño de mala calidad.");
    }
  }

  if (status !== "red") {
    if (load.consecutiveDays >= 4 && status === "green") status = "yellow";
    if (load.consecutiveDays >= 4) reasons.push(`${load.consecutiveDays} días de carga consecutivos.`);

    if (load.notableIncrease && status === "green") status = "yellow";
    if (load.notableIncrease) reasons.push("Aumento notable de sesiones frente a semanas anteriores.");

    if (load.last7 >= 6 && status === "green") status = "yellow";
    if (load.last7 >= 6) reasons.push(`${load.last7} sesiones de carga en 7 días.`);

    const physio = getPhysioSettings();
    if (physio.lastVisit) {
      const due = dateFromKey(physio.lastVisit);
      due.setDate(due.getDate() + Number(physio.intervalWeeks || 8) * 7);
      const daysRemaining = daysBetween(new Date(), due);
      if (daysRemaining < 0) {
        if (status === "green") status = "yellow";
        reasons.push(`La revisión preventiva lleva ${Math.abs(daysRemaining)} días vencida.`);
      }
    }
  }

  const recentConcerning = checks
    .filter(check => {
      const age = daysBetween(dateFromKey(check.date), new Date());
      return age >= 0 && age < 14;
    })
    .map(classifyCheck)
    .filter(level => level === "yellow" || level === "orange");

  if (
    status !== "red" &&
    recentConcerning.length >= 2 &&
    status !== "orange"
  ) {
    status = "orange";
    reasons.push("Dos chequeos recientes mostraron señales de vigilancia.");
  }

  return { status, reasons, load, latest: latestRecorded, checkStale };
}

function renderRecovery() {
  const { status, reasons, load, latest, checkStale } = calculateRecoveryStatus();
  const card = document.getElementById("recoveryCard");
  const statusNode = document.getElementById("recoveryStatus");
  const titleNode = document.getElementById("recoveryTitle");
  const messageNode = document.getElementById("recoveryMessage");

  card.classList.remove("status-green", "status-yellow", "status-orange", "status-red");
  card.classList.add(`status-${status}`);

  const labels = {
    green: "Verde",
    yellow: "Amarillo",
    orange: "Naranja",
    red: "Rojo"
  };

  const titles = {
    green: "Sin alertas actuales",
    yellow: "Conviene priorizar recuperación",
    orange: "Valora una revisión próxima",
    red: "Suspende la actividad y busca valoración"
  };

  const defaultMessages = {
    green: "Continúa según el plan y realiza un chequeo semanal.",
    yellow: "Considera descanso o movilidad suave y revisa cómo evolucionas durante 24–48 horas.",
    orange: "Considera programar fisioterapia durante los próximos 7 días y evita cargar la zona afectada.",
    red: "Busca valoración médica apropiada sin esperar al recordatorio preventivo."
  };

  statusNode.textContent = labels[status];
  titleNode.textContent = status === "green" && checkStale
    ? "Chequeo semanal pendiente"
    : titles[status];
  messageNode.textContent = reasons.length
    ? `${reasons.slice(0, 2).join(" ")} ${defaultMessages[status]}`
    : status === "green" && checkStale
      ? "El último chequeo tiene más de 14 días. Registra uno nuevo para actualizar el indicador."
      : defaultMessages[status];

  document.getElementById("load7Count").textContent = load.last7;
  document.getElementById("loadStreak").textContent = load.consecutiveDays;

  if (latest) {
    const area = latest.bodyArea && latest.bodyArea !== "none"
      ? ` · ${latest.bodyArea}`
      : "";
    document.getElementById("lastRecoveryCheck").textContent =
      `Último chequeo: ${formatDate(latest.date)} · dolor ${latest.painScore}/10${area}.`;
  } else {
    document.getElementById("lastRecoveryCheck").textContent =
      "Sin chequeos registrados.";
  }

  renderPhysioDue(status);
}

function renderPhysioDue(recoveryStatus = "green") {
  const settings = getPhysioSettings();
  const node = document.getElementById("physioDue");

  if (!settings.lastVisit) {
    node.textContent = recoveryStatus === "orange"
      ? "Recomendada esta semana"
      : "Sin fecha";
    return;
  }

  const lastVisit = dateFromKey(settings.lastVisit);
  const due = new Date(lastVisit);
  due.setDate(due.getDate() + Number(settings.intervalWeeks || 8) * 7);

  const daysRemaining = daysBetween(new Date(), due);

  if (recoveryStatus === "orange") {
    node.textContent = "Recomendada esta semana";
  } else if (daysRemaining < 0) {
    node.textContent = `Vencida hace ${Math.abs(daysRemaining)} días`;
  } else if (daysRemaining === 0) {
    node.textContent = "Hoy";
  } else if (daysRemaining <= 7) {
    node.textContent = `En ${daysRemaining} días`;
  } else {
    node.textContent = formatDate(localDateKey(due));
  }
}

function saveRecoveryCheck(event) {
  event.preventDefault();

  const check = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: localDateKey(),
    timestamp: new Date().toISOString(),
    painScore: Number(document.getElementById("painScore").value),
    techniqueImpact: document.getElementById("techniqueImpact").value,
    fatigueLevel: document.getElementById("fatigueLevel").value,
    sleepQuality: document.getElementById("sleepQuality").value,
    symptomDuration: document.getElementById("symptomDuration").value,
    bodyArea: document.getElementById("bodyArea").value,
    movementLimitation: document.getElementById("movementLimitation").checked,
    redFlag: document.getElementById("redFlag").checked
  };

  const checks = getRecoveryChecks();
  checks.push(check);
  saveRecoveryChecks(checks);

  document.getElementById("recoveryDialog").close();
  renderRecovery();
  showToast("Chequeo guardado.");
}


function signed(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const fixed = Number(value).toFixed(decimals);
  return `${value > 0 ? "+" : ""}${fixed}`;
}

function renderBodyData(records) {
  if (!Array.isArray(records) || !records.length) {
    throw new Error("El archivo no contiene mediciones.");
  }

  const sorted = [...records].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

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
    .map(([label, value]) =>
      `<div class="body-row"><span>${label}</span><strong>${value}</strong></div>`
    )
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
      .map(([label, value]) =>
        `<div class="body-row"><span>${label}</span><strong>${value}</strong></div>`
      )
      .join("");
  } else {
    document.getElementById("bodyTrend").innerHTML =
      '<p class="muted">Se necesita al menos una medición anterior para calcular tendencias.</p>';
  }

  document.getElementById("bodyDashboard").classList.remove("hidden");
  document.getElementById("bodyStatus").textContent =
    `${sorted.length} medición(es) cargada(s).`;

  renderGoals();
}

function loadSavedBody() {
  const saved = readJsonStorage(BODY_KEY, null);
  if (saved) {
    try {
      renderBodyData(saved);
    } catch {}
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function enableAccordions() {
  document.querySelectorAll(".cards, .timeline").forEach(container => {
    container.querySelectorAll(":scope > details").forEach(details => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        container.querySelectorAll(":scope > details").forEach(other => {
          if (other !== details) other.open = false;
        });
      });
    });
  });
}

function renderAll() {
  renderHistory();
  renderGoals();
  renderRecovery();
  renderAppointments();
  renderAttention();
}

document.querySelectorAll(".complete-btn, .quick-activity").forEach(button => {
  button.addEventListener("click", () => {
    toggleTodaySession(button.dataset.type, button.dataset.session);
  });
});

document.getElementById("exportHistory").addEventListener("click", exportBackup);
document.getElementById("clearHistory").addEventListener("click", clearHistory);

document.getElementById("historyImport").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) importBackupFile(file);
  event.target.value = "";
});

document.getElementById("openRecoveryCheck").addEventListener("click", () => {
  document.getElementById("recoveryDialog").showModal();
});

document.getElementById("recoveryForm").addEventListener("submit", saveRecoveryCheck);

document.getElementById("openCustomGoal").addEventListener("click", () => {
  document.getElementById("customGoalStartDate").value = localDateKey();
  document.getElementById("customGoalDialog").showModal();
});

document.getElementById("customGoalForm").addEventListener("submit", addCustomGoal);

document.getElementById("savePsychologyDate").addEventListener(
  "click",
  savePsychologyDate
);
document.getElementById("completePsychologyDate").addEventListener(
  "click",
  completePsychologyDate
);
document.getElementById("clearPsychologyDate").addEventListener(
  "click",
  clearPsychologyDate
);

document.getElementById("saveNutritionistDate").addEventListener("click", saveNutritionistDate);
document.getElementById("completeNutritionistDate").addEventListener("click", completeNutritionistDate);
document.getElementById("clearNutritionistDate").addEventListener("click", clearNutritionistDate);

document.getElementById("savePhysioSettings").addEventListener(
  "click",
  savePhysioFromAppointments
);

document.querySelectorAll("[data-close-dialog]").forEach(button => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.closeDialog).close();
  });
});

document.getElementById("painScore").addEventListener("input", event => {
  document.getElementById("painValue").textContent = event.target.value;
});

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
      document.getElementById("bodyStatus").textContent =
        `No se pudo leer el archivo: ${error.message}`;
    }
  };
  reader.readAsText(file);
});

enableAccordions();
renderAll();
loadSavedBody();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
