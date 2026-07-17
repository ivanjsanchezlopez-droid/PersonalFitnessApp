/* Personal Fitness App v4.6 enhancements */
(() => {
  const SPECIALISTS_KEY = "personalFitnessSpecialistsV1";
  const ACTIVE_ACTIVITY_TYPES = [
    "Gimnasio",
    "Natación",
    "Movilidad",
    "Montaña",
    "Aguas abiertas"
  ];
  const SUMMARY_ACTIVITY_TYPES = [
    ...ACTIVE_ACTIVITY_TYPES,
    "Reposo Total"
  ];

  const extraStyles = document.createElement("style");
  extraStyles.textContent = `
    .weekly-plan{display:grid;gap:0}
    .weekly-plan div{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid rgba(48,66,95,.75)}
    .weekly-plan div:last-child{border-bottom:0}
    .weekly-plan span{color:var(--muted);text-align:right}
    .plan-objective{margin:0 0 14px;color:#dbeafe}
    .session-divider{margin:22px 0 4px;padding-top:16px;border-top:1px solid var(--line)}
    .strength-adjustment{margin-top:12px}
    .rest-activity{border-color:#475569;background:#111827}
    .rest-activity.done{background:#334155;border-color:#94a3b8}
    .custom-specialists-heading{margin:22px 2px 10px}
    .custom-specialists-heading h3{margin:0 0 4px}
    .custom-specialists-heading p{margin:0}
    .empty-specialists{grid-column:1/-1;margin:0;padding:8px 2px}
    .delete-specialist-btn{width:100%;margin-top:12px;border:1px solid #7f1d1d;background:transparent;color:#fecaca;border-radius:9px;padding:9px 10px;font-size:.78rem;font-weight:800;cursor:pointer}
    @media(max-width:520px){
      .weekly-plan div{display:block}
      .weekly-plan span{display:block;text-align:left;margin-top:4px}
      .routine-list li{display:block}
      .routine-list span{display:block;text-align:left;margin-top:4px}
    }
  `;
  document.head.appendChild(extraStyles);

  function readSpecialists() {
    try {
      const value = JSON.parse(localStorage.getItem(SPECIALISTS_KEY));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveSpecialists(items) {
    localStorage.setItem(SPECIALISTS_KEY, JSON.stringify(items));
  }

  const originalGetAppointments = getAppointments;
  const originalSaveAppointments = saveAppointments;

  getAppointments = function getAppointmentsV46() {
    const appointments = originalGetAppointments();
    appointments.customSpecialists = readSpecialists();
    return appointments;
  };

  saveAppointments = function saveAppointmentsV46(appointments) {
    saveSpecialists(
      Array.isArray(appointments.customSpecialists)
        ? appointments.customSpecialists
        : readSpecialists()
    );
    originalSaveAppointments(appointments);
  };

  calculateStreak = function calculateActiveStreak(history) {
    const uniqueDates = [...new Set(
      history
        .filter(item => ACTIVE_ACTIVITY_TYPES.includes(item.type))
        .map(item => item.date)
    )].sort().reverse();

    if (!uniqueDates.length) return 0;

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);

    const today = localDateKey(cursor);
    const yesterday = new Date(cursor);
    yesterday.setDate(yesterday.getDate() - 1);

    if (
      uniqueDates[0] !== today &&
      uniqueDates[0] !== localDateKey(yesterday)
    ) {
      return 0;
    }

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
  };

  renderHistory = function renderHistoryV46() {
    const history = getHistory().sort((a, b) =>
      String(b.timestamp).localeCompare(String(a.timestamp))
    );

    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const weekCount = history.filter(item =>
      ACTIVE_ACTIVITY_TYPES.includes(item.type) &&
      dateFromKey(item.date) >= weekStart
    ).length;

    const monthCount = history.filter(item =>
      ACTIVE_ACTIVITY_TYPES.includes(item.type) &&
      dateFromKey(item.date) >= monthStart
    ).length;

    document.getElementById("weekCount").textContent = weekCount;
    document.getElementById("monthCount").textContent = monthCount;
    document.getElementById("streakCount").textContent =
      `${calculateStreak(history)} días`;

    document.getElementById("typeSummary").innerHTML =
      SUMMARY_ACTIVITY_TYPES.map(type => {
        const count = history.filter(item => item.type === type).length;
        return `<div class="type-row"><span>${type}</span><strong>${count}</strong></div>`;
      }).join("");

    const historyList = document.getElementById("historyList");

    if (!history.length) {
      historyList.innerHTML =
        '<p class="muted">Todavía no has registrado sesiones.</p>';
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
        const isTotalRest = button.dataset.type === "Reposo Total";
        button.textContent = doneToday
          ? `${button.dataset.session} registrado · tocar para eliminar`
          : isTotalRest
            ? "Registrar reposo total"
            : `${button.dataset.session} completada`;
      }
    });

    renderBackupStatus();
  };

  function specialistLabel(specialist) {
    return specialist.name
      ? `${specialist.type} · ${specialist.name}`
      : specialist.type;
  }

  function findSpecialist(id) {
    const items = readSpecialists();
    return {
      items,
      specialist: items.find(item => item.id === id)
    };
  }

  function renderCustomSpecialists() {
    const container = document.getElementById("customSpecialistsList");
    if (!container) return;

    const specialists = readSpecialists();
    if (!specialists.length) {
      container.innerHTML =
        '<p class="muted empty-specialists">Todavía no has creado seguimientos adicionales.</p>';
      return;
    }

    container.innerHTML = specialists.map(specialist => {
      const status = getPsychologyDateStatus(specialist.nextDate);
      const statusCopy = specialist.name
        ? `${status.title} · ${status.message}`
        : status.message;

      return `
        <article class="card static-card appointment-card ${status.className}">
          <div class="appointment-heading">
            <div>
              <p class="eyebrow">${escapeHtml(specialist.type)}</p>
              <h3>${escapeHtml(specialist.name || status.title)}</h3>
              <p class="muted">${escapeHtml(statusCopy)}</p>
            </div>
          </div>

          <label class="form-field">
            <span>Próxima fecha</span>
            <input
              class="specialist-date"
              data-specialist-id="${specialist.id}"
              type="date"
              value="${specialist.nextDate || ""}"
            >
          </label>

          <div class="appointment-actions">
            <button class="primary-btn save-specialist-date" data-specialist-id="${specialist.id}" type="button">Guardar fecha</button>
            <button class="secondary-btn complete-specialist-date" data-specialist-id="${specialist.id}" type="button" ${specialist.nextDate ? "" : "disabled"}>Marcar realizada</button>
            <button class="text-button clear-specialist-date" data-specialist-id="${specialist.id}" type="button" ${specialist.nextDate ? "" : "disabled"}>Quitar fecha</button>
          </div>

          <p class="microcopy">${specialist.lastVisit
            ? `Última visita registrada: ${formatDate(specialist.lastVisit)}.`
            : "Sin visita anterior registrada."}</p>
          <button class="delete-specialist-btn" data-specialist-id="${specialist.id}" type="button">Eliminar seguimiento</button>
        </article>
      `;
    }).join("");

    container.querySelectorAll(".save-specialist-date").forEach(button => {
      button.addEventListener("click", () => {
        const input = container.querySelector(
          `.specialist-date[data-specialist-id="${button.dataset.specialistId}"]`
        );
        const date = input?.value;
        if (!date) {
          showToast("Selecciona una fecha.");
          return;
        }
        const { items, specialist } = findSpecialist(button.dataset.specialistId);
        if (!specialist) return;
        specialist.nextDate = date;
        saveSpecialists(items);
        renderAll();
        showToast("Fecha guardada.");
      });
    });

    container.querySelectorAll(".complete-specialist-date").forEach(button => {
      button.addEventListener("click", () => {
        const { items, specialist } = findSpecialist(button.dataset.specialistId);
        if (!specialist?.nextDate) return;
        if (!confirm(
          `¿Marcar como realizada la cita de ${specialistLabel(specialist)} del ${formatDate(specialist.nextDate)}?`
        )) return;
        specialist.lastVisit = specialist.nextDate;
        specialist.nextDate = null;
        saveSpecialists(items);
        renderAll();
        showToast("Cita marcada como realizada.");
      });
    });

    container.querySelectorAll(".clear-specialist-date").forEach(button => {
      button.addEventListener("click", () => {
        const { items, specialist } = findSpecialist(button.dataset.specialistId);
        if (!specialist?.nextDate) return;
        if (!confirm("¿Quitar la próxima fecha?")) return;
        specialist.nextDate = null;
        saveSpecialists(items);
        renderAll();
        showToast("Fecha eliminada.");
      });
    });

    container.querySelectorAll(".delete-specialist-btn").forEach(button => {
      button.addEventListener("click", () => {
        const { items, specialist } = findSpecialist(button.dataset.specialistId);
        if (!specialist) return;
        if (!confirm(`¿Eliminar el seguimiento de ${specialistLabel(specialist)}?`)) return;
        saveSpecialists(items.filter(item => item.id !== specialist.id));
        renderAll();
        showToast("Seguimiento eliminado.");
      });
    });
  }

  const originalRenderAppointments = renderAppointments;
  renderAppointments = function renderAppointmentsV46() {
    originalRenderAppointments();
    renderCustomSpecialists();
  };

  const originalRenderAttention = renderAttention;
  renderAttention = function renderAttentionV46() {
    originalRenderAttention();

    const dueItems = readSpecialists().flatMap(specialist => {
      const status = getPsychologyDateStatus(specialist.nextDate);
      if (status.daysRemaining === 1) {
        return [{ label: specialistLabel(specialist), value: "Cita mañana" }];
      }
      if (status.daysRemaining === 0) {
        return [{ label: specialistLabel(specialist), value: "Cita hoy" }];
      }
      return [];
    });

    if (!dueItems.length) return;

    const banner = document.getElementById("attentionBanner");
    const itemsNode = document.getElementById("attentionItems");
    banner.classList.remove("hidden");

    dueItems.slice(0, 3).forEach(item => {
      const row = document.createElement("div");
      row.className = "attention-item";
      row.innerHTML = `
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.value)}</span>
      `;
      itemsNode.appendChild(row);
    });
  };

  const specialistDialogButton = document.getElementById("openSpecialistDialog");
  const specialistDialog = document.getElementById("specialistDialog");
  const specialistForm = document.getElementById("specialistForm");

  specialistDialogButton?.addEventListener("click", () => {
    document.getElementById("specialistNextDate").value = "";
    specialistDialog.showModal();
  });

  specialistForm?.addEventListener("submit", event => {
    event.preventDefault();
    const type = document.getElementById("specialistType").value;
    const name = document.getElementById("specialistName").value.trim();
    const nextDate = document.getElementById("specialistNextDate").value || null;
    const specialists = readSpecialists();

    specialists.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      name,
      nextDate,
      lastVisit: null
    });

    saveSpecialists(specialists);
    specialistForm.reset();
    specialistDialog.close();
    renderAll();
    showToast("Seguimiento creado.");
  });

  const originalExportButton = document.getElementById("exportHistory");
  if (originalExportButton) {
    const replacement = originalExportButton.cloneNode(true);
    originalExportButton.replaceWith(replacement);
    replacement.addEventListener("click", () => {
      const backup = {
        app: "Personal Fitness App",
        version: "4.6",
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
    });
  }

  const originalImportInput = document.getElementById("historyImport");
  if (originalImportInput) {
    const importInput = originalImportInput.cloneNode(true);
    originalImportInput.replaceWith(importInput);

    importInput.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;

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
              const incomingAppointments = {
                psychologyNextDate: parsed.appointments.psychologyNextDate || null,
                psychologyLastVisit: parsed.appointments.psychologyLastVisit || null,
                nutritionistNextDate: parsed.appointments.nutritionistNextDate || null,
                nutritionistLastVisit: parsed.appointments.nutritionistLastVisit || null,
                customSpecialists: Array.isArray(parsed.appointments.customSpecialists)
                  ? parsed.appointments.customSpecialists
                  : [],
                physio: {
                  lastVisit: parsed.appointments.physio?.lastVisit || null,
                  intervalWeeks: Number(parsed.appointments.physio?.intervalWeeks) || 8
                }
              };
              saveAppointments(incomingAppointments);
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
        } finally {
          importInput.value = "";
        }
      };

      reader.readAsText(file);
    });
  }

  renderAll();
})();
