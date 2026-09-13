"use strict";

const STORAGE_KEYS = {
  records: "mellow.weightRecords.v1",
  goal: "mellow.goalWeight.v1",
  theme: "mellow.theme.v1",
};

const state = {
  records: loadRecords(),
  goal: loadNumber(STORAGE_KEYS.goal),
  selectedMonth: startOfMonth(new Date()),
  editingDate: null,
  deleteDate: null,
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  form: $("#weightForm"), date: $("#dateInput"), weight: $("#weightInput"), dateError: $("#dateError"), weightError: $("#weightError"),
  submit: $("#submitButton"), cancelEdit: $("#cancelEditButton"), todayBadge: $("#todayBadge"),
  monthLabel: $("#monthLabel"), prevMonth: $("#prevMonth"), nextMonth: $("#nextMonth"), canvas: $("#weightChart"), chartEmpty: $("#chartEmpty"),
  currentWeight: $("#currentWeight"), goalDistance: $("#goalDistance"), goalStatus: $("#goalStatus"), openGoal: $("#openGoalButton"),
  goalDialog: $("#goalDialog"), goalForm: $("#goalForm"), goalInput: $("#goalInput"), goalError: $("#goalError"), removeGoal: $("#removeGoalButton"),
  changeBlock: $("#changeBlock"), changeValue: $("#changeValue"), changeRoute: $("#changeRoute"), firstWeight: $("#firstWeight"), latestWeight: $("#latestWeight"), minWeight: $("#minWeight"), maxWeight: $("#maxWeight"), avgWeight: $("#avgWeight"),
  recordsList: $("#recordsList"), recordsEmpty: $("#recordsEmpty"), recordCount: $("#recordCount"),
  deleteDialog: $("#deleteDialog"), deleteDescription: $("#deleteDescription"), confirmDelete: $("#confirmDeleteButton"),
  themeSelect: $("#themeSelect"), exportCsv: $("#exportCsvButton"), backup: $("#backupButton"), restore: $("#restoreInput"), toast: $("#toast"),
};

function loadRecords() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEYS.records) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(isValidRecord).map(({ date, weight }) => ({ date, weight: Number(weight) }));
  } catch { return []; }
}

function loadNumber(key) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value >= 20 && value <= 300 ? value : null;
}

function isValidDateString(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidRecord(record) {
  return record && isValidDateString(record.date) && Number.isFinite(Number(record.weight)) && Number(record.weight) >= 20 && Number(record.weight) <= 300;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function monthKey(date) { return localDateString(date).slice(0, 7); }
function formatWeight(value) { return Number.isFinite(value) ? `${value.toFixed(1)}kg` : "—"; }
function selectedRecords() { return state.records.filter((record) => record.date.startsWith(monthKey(state.selectedMonth))).sort((a, b) => a.date.localeCompare(b.date)); }

function saveRecords() {
  state.records.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(state.records));
}

function validateWeight(value) {
  const number = Number(value);
  if (value === "" || !Number.isFinite(number)) return "体重を入力してください。";
  if (number < 20 || number > 300) return "20.0〜300.0kgの範囲で入力してください。";
  if (Math.round(number * 10) !== number * 10) return "小数第1位までで入力してください。";
  return "";
}

function setFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function handleSubmit(event) {
  event.preventDefault();
  const date = elements.date.value;
  const weightError = validateWeight(elements.weight.value);
  const dateError = !date ? "日付を選択してください。" : !isValidDateString(date) ? "正しい日付を選択してください。" : "";
  setFieldError(elements.date, elements.dateError, dateError);
  setFieldError(elements.weight, elements.weightError, weightError);
  if (dateError || weightError) return;

  const weight = Number(Number(elements.weight.value).toFixed(1));
  if (state.editingDate && state.editingDate !== date) {
    state.records = state.records.filter((record) => record.date !== state.editingDate);
  }
  const existingIndex = state.records.findIndex((record) => record.date === date);
  if (existingIndex >= 0) state.records[existingIndex] = { ...state.records[existingIndex], date, weight };
  else state.records.push({ date, weight });
  saveRecords();
  state.selectedMonth = startOfMonth(parseLocalDate(date));
  const wasEditing = Boolean(state.editingDate || existingIndex >= 0);
  resetForm();
  render();
  showToast(wasEditing ? "記録を更新しました" : "体重を記録しました");
}

function resetForm() {
  state.editingDate = null;
  elements.date.value = localDateString();
  elements.weight.value = "";
  elements.submit.innerHTML = "記録する <span aria-hidden=\"true\">→</span>";
  elements.cancelEdit.classList.add("hidden");
  setFieldError(elements.date, elements.dateError, "");
  setFieldError(elements.weight, elements.weightError, "");
}

function editRecord(date) {
  const record = state.records.find((item) => item.date === date);
  if (!record) return;
  state.editingDate = date;
  elements.date.value = date;
  elements.weight.value = record.weight.toFixed(1);
  elements.submit.innerHTML = "更新する <span aria-hidden=\"true\">→</span>";
  elements.cancelEdit.classList.remove("hidden");
  elements.weight.focus();
  elements.form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function askDelete(date) {
  const record = state.records.find((item) => item.date === date);
  if (!record) return;
  state.deleteDate = date;
  elements.deleteDescription.textContent = `${formatDateLong(date)}・${formatWeight(record.weight)} の記録は元に戻せません。`;
  elements.deleteDialog.showModal();
}

function deleteRecord() {
  if (!state.deleteDate) return;
  state.records = state.records.filter((record) => record.date !== state.deleteDate);
  if (state.editingDate === state.deleteDate) resetForm();
  saveRecords();
  state.deleteDate = null;
  render();
  showToast("記録を削除しました");
}

function render() {
  const records = selectedRecords();
  elements.monthLabel.textContent = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" }).format(state.selectedMonth);
  renderCurrent();
  renderSummary(records);
  renderRecords(records);
  drawChart(records);
}

function renderCurrent() {
  const latest = [...state.records].sort((a, b) => b.date.localeCompare(a.date))[0];
  elements.currentWeight.textContent = latest ? latest.weight.toFixed(1) : "—";
  elements.goalStatus.textContent = state.goal ? `目標 ${state.goal.toFixed(1)}kg` : "目標を設定";
  elements.openGoal.textContent = state.goal ? "目標体重を変更" : "目標体重を設定";
  if (!latest) elements.goalDistance.textContent = "記録を追加すると表示されます";
  else if (!state.goal) elements.goalDistance.textContent = "目標を設定すると差が表示されます";
  else {
    const difference = latest.weight - state.goal;
    elements.goalDistance.textContent = Math.abs(difference) < .05 ? "目標体重に到達しています" : difference > 0 ? `目標まであと ${difference.toFixed(1)}kg` : `目標を ${Math.abs(difference).toFixed(1)}kg 達成しています`;
  }
}

function renderSummary(records) {
  const values = records.map((record) => record.weight);
  const first = records[0];
  const latest = records.at(-1);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
  elements.firstWeight.textContent = first ? formatWeight(first.weight) : "—";
  elements.latestWeight.textContent = latest ? formatWeight(latest.weight) : "—";
  elements.minWeight.textContent = values.length ? formatWeight(Math.min(...values)) : "—";
  elements.maxWeight.textContent = values.length ? formatWeight(Math.max(...values)) : "—";
  elements.avgWeight.textContent = values.length ? formatWeight(average) : "—";
  elements.changeBlock.className = "change-block neutral";
  if (!first || !latest) {
    elements.changeValue.textContent = "—";
    elements.changeRoute.textContent = "記録がありません";
    return;
  }
  const change = Number((latest.weight - first.weight).toFixed(1));
  elements.changeValue.textContent = `${change > 0 ? "+" : ""}${change.toFixed(1)}kg`;
  elements.changeRoute.textContent = `${first.weight.toFixed(1)}kg → ${latest.weight.toFixed(1)}kg`;
  elements.changeBlock.classList.add(change < 0 ? "loss" : change > 0 ? "gain" : "neutral");
}

function renderRecords(records) {
  const descending = [...records].reverse();
  elements.recordCount.textContent = `${records.length}件の記録`;
  elements.recordsEmpty.classList.toggle("hidden", records.length > 0);
  elements.recordsList.replaceChildren(...descending.map((record) => {
    const row = document.createElement("article");
    row.className = "record-row";
    const date = parseLocalDate(record.date);
    const weekday = new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
    row.innerHTML = `<div class="record-date"><strong>${date.getMonth() + 1}/${date.getDate()}</strong><span>${weekday}曜日</span></div><div class="record-weight">${record.weight.toFixed(1)}kg</div><div class="record-actions"><button type="button" data-action="edit" data-date="${record.date}" aria-label="${formatDateLong(record.date)}の記録を編集">編集</button><button type="button" class="delete" data-action="delete" data-date="${record.date}" aria-label="${formatDateLong(record.date)}の記録を削除">削除</button></div>`;
    return row;
  }));
}

function drawChart(records) {
  const canvas = elements.canvas;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  elements.chartEmpty.classList.toggle("hidden", records.length > 0);
  if (!records.length) return;

  const styles = getComputedStyle(document.documentElement);
  const ink = styles.getPropertyValue("--ink").trim();
  const muted = styles.getPropertyValue("--muted").trim();
  const line = styles.getPropertyValue("--line").trim();
  const accent = styles.getPropertyValue("--accent").trim();
  const goalColor = styles.getPropertyValue("--accent-2").trim();
  const padding = { top: 28, right: 24, bottom: 38, left: rect.width < 480 ? 44 : 54 };
  const width = rect.width - padding.left - padding.right;
  const height = rect.height - padding.top - padding.bottom;
  const daysInMonth = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + 1, 0).getDate();
  const allValues = records.map((record) => record.weight).concat(state.goal || []);
  let min = Math.floor((Math.min(...allValues) - 1) * 2) / 2;
  let max = Math.ceil((Math.max(...allValues) + 1) * 2) / 2;
  if (max - min < 2) { min -= 1; max += 1; }
  const x = (day) => padding.left + ((day - 1) / (daysInMonth - 1)) * width;
  const y = (weight) => padding.top + ((max - weight) / (max - min)) * height;

  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i += 1) {
    const value = max - ((max - min) * i) / 4;
    const py = padding.top + (height * i) / 4;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padding.left, py); ctx.lineTo(rect.width - padding.right, py); ctx.stroke();
    ctx.fillStyle = muted; ctx.fillText(value.toFixed(1), padding.left - 9, py);
  }
  ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = muted;
  [...new Set([1, 5, 10, 15, 20, 25, daysInMonth])].filter((day) => day <= daysInMonth).forEach((day) => ctx.fillText(String(day), x(day), rect.height - padding.bottom + 12));

  if (state.goal) {
    ctx.strokeStyle = goalColor; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(padding.left, y(state.goal)); ctx.lineTo(rect.width - padding.right, y(state.goal)); ctx.stroke(); ctx.setLineDash([]);
  }
  if (records.length > 1) {
    ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
    records.forEach((record, index) => { const pointX = x(parseLocalDate(record.date).getDate()); const pointY = y(record.weight); index ? ctx.lineTo(pointX, pointY) : ctx.moveTo(pointX, pointY); });
    ctx.stroke();
  }
  records.forEach((record) => {
    ctx.beginPath(); ctx.arc(x(parseLocalDate(record.date).getDate()), y(record.weight), 4.5, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.stroke();
  });
}

function formatDateLong(dateString) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(parseLocalDate(dateString));
}

function changeMonth(amount) {
  state.selectedMonth = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + amount, 1);
  render();
}

function saveGoal(event) {
  event.preventDefault();
  const error = validateWeight(elements.goalInput.value);
  setFieldError(elements.goalInput, elements.goalError, error);
  if (error) return;
  state.goal = Number(Number(elements.goalInput.value).toFixed(1));
  localStorage.setItem(STORAGE_KEYS.goal, String(state.goal));
  elements.goalDialog.close();
  render();
  showToast("目標体重を保存しました");
}

function exportFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv() {
  const rows = ["date,weight", ...[...state.records].sort((a,b) => a.date.localeCompare(b.date)).map((record) => `${record.date},${record.weight.toFixed(1)}`)];
  exportFile(`mellow-weight-${localDateString()}.csv`, `\uFEFF${rows.join("\n")}`, "text/csv;charset=utf-8");
  showToast("CSVを書き出しました");
}

function createBackup() {
  const backup = { app: "mellow", version: 1, exportedAt: new Date().toISOString(), records: state.records, goalWeight: state.goal };
  exportFile(`mellow-backup-${localDateString()}.json`, JSON.stringify(backup, null, 2), "application/json");
  showToast("バックアップを作成しました");
}

async function restoreBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "mellow" || data.version !== 1 || !Array.isArray(data.records) || !data.records.every(isValidRecord)) throw new Error("invalid");
    const deduplicated = new Map(data.records.map((record) => [record.date, { date: record.date, weight: Number(record.weight) }]));
    const nextRecords = [...deduplicated.values()].sort((a, b) => a.date.localeCompare(b.date));
    const nextGoal = data.goalWeight == null ? null : Number(data.goalWeight);
    if (nextGoal !== null && validateWeight(String(nextGoal))) throw new Error("invalid goal");
    if (!window.confirm("バックアップを復元すると、現在の記録と目標体重が置き換わります。復元しますか？")) return;

    const previousRecords = localStorage.getItem(STORAGE_KEYS.records);
    const previousGoal = localStorage.getItem(STORAGE_KEYS.goal);
    try {
      localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(nextRecords));
      if (nextGoal === null) localStorage.removeItem(STORAGE_KEYS.goal);
      else localStorage.setItem(STORAGE_KEYS.goal, String(nextGoal));
    } catch (storageError) {
      try {
        if (previousRecords === null) localStorage.removeItem(STORAGE_KEYS.records);
        else localStorage.setItem(STORAGE_KEYS.records, previousRecords);
        if (previousGoal === null) localStorage.removeItem(STORAGE_KEYS.goal);
        else localStorage.setItem(STORAGE_KEYS.goal, previousGoal);
      } catch {
        // 保存領域自体が利用できない場合は、画面上の状態を変更せずエラーとして扱います。
      }
      throw storageError;
    }

    state.records = nextRecords;
    state.goal = nextGoal;
    render();
    showToast(`${state.records.length}件の記録を復元しました`);
  } catch { showToast("このバックアップは読み込めません"); }
  finally { event.target.value = ""; }
}

let toastTimer;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  elements.themeSelect.value = theme;
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  requestAnimationFrame(() => drawChart(selectedRecords()));
}

elements.form.addEventListener("submit", handleSubmit);
elements.cancelEdit.addEventListener("click", resetForm);
elements.prevMonth.addEventListener("click", () => changeMonth(-1));
elements.nextMonth.addEventListener("click", () => changeMonth(1));
elements.recordsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "edit") editRecord(button.dataset.date);
  if (button.dataset.action === "delete") askDelete(button.dataset.date);
});
elements.confirmDelete.addEventListener("click", deleteRecord);
elements.openGoal.addEventListener("click", () => { elements.goalInput.value = state.goal?.toFixed(1) || ""; elements.goalError.textContent = ""; elements.removeGoal.classList.toggle("hidden", state.goal === null); elements.goalDialog.showModal(); });
elements.goalForm.addEventListener("submit", saveGoal);
elements.removeGoal.addEventListener("click", () => { state.goal = null; localStorage.removeItem(STORAGE_KEYS.goal); elements.goalDialog.close(); render(); showToast("目標体重を削除しました"); });
elements.themeSelect.addEventListener("change", (event) => applyTheme(event.target.value));
elements.exportCsv.addEventListener("click", exportCsv);
elements.backup.addEventListener("click", createBackup);
elements.restore.addEventListener("change", restoreBackup);
window.addEventListener("resize", () => requestAnimationFrame(() => drawChart(selectedRecords())));

const today = new Date();
elements.date.value = localDateString(today);
elements.todayBadge.textContent = new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric", weekday: "short" }).format(today);
applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || "auto");
render();

// HTTPSまたはlocalhostでのみ有効。更新はブラウザ標準のService Worker更新機構に任せます。
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // PWA機能が利用できなくても、通常のWebアプリ機能はそのまま使用できます。
    });
  });
}
