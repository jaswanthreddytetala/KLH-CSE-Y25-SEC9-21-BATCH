const state = {
  alarms: [],
  history: [],
  system: null,
  searchTerm: '',
  filter: 'all',
  draftQueue: [],
  modalMode: 'add',
  editingId: null,
  activePage: 'dashboard',
  ringingAlarmId: null,
  audioContext: null,
  soundEnabled: true,
  customSound: '',
  customSoundName: '',
  notificationEnabled: true,
  darkMode: false,
  clock24: false,
  snoozeMinutes: 5,
};

const elements = {
  navButtons: document.querySelectorAll('.nav-button'),
  pages: document.querySelectorAll('.page'),
  clockDisplay: document.getElementById('clockDisplay'),
  dateDisplay: document.getElementById('dateDisplay'),
  nextAlarmTime: document.getElementById('nextAlarmTime'),
  nextAlarmLabel: document.getElementById('nextAlarmLabel'),
  nextAlarmMeta: document.getElementById('nextAlarmMeta'),
  countdownDisplay: document.getElementById('countdownDisplay'),
  statsGrid: document.getElementById('statsGrid'),
  alarmTableBody: document.getElementById('alarmTableBody'),
  historyTableBody: document.getElementById('historyTableBody'),
  systemStatusList: document.getElementById('systemStatusList'),
  technicalDetailsList: document.getElementById('technicalDetailsList'),
  searchInput: document.getElementById('searchInput'),
  searchInputPage: document.getElementById('searchInputPage'),
  filterButtons: document.querySelectorAll('.filter-button'),
  alarmModal: document.getElementById('alarmModal'),
  ringingModal: document.getElementById('ringingModal'),
  modalTitle: document.getElementById('modalTitle'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelAlarmBtn: document.getElementById('cancelAlarmBtn'),
  addAnotherBtn: document.getElementById('addAnotherBtn'),
  saveAlarmBtn: document.getElementById('saveAlarmBtn'),
  alarmForm: document.getElementById('alarmForm'),
  hourInput: document.getElementById('hourInput'),
  minuteInput: document.getElementById('minuteInput'),
  periodInput: document.getElementById('periodInput'),
  periodFieldGroup: document.getElementById('periodFieldGroup'),
  labelInput: document.getElementById('labelInput'),
  repeatInput: document.getElementById('repeatInput'),
  soundInput: document.getElementById('soundInput'),
  soundUpload: document.getElementById('soundUpload'),
  snoozeInput: document.getElementById('snoozeInput'),
  notesInput: document.getElementById('notesInput'),
  draftSummary: document.getElementById('draftSummary'),
  ringingTime: document.getElementById('ringingTime'),
  ringingLabel: document.getElementById('ringingLabel'),
  stopAlarmBtn: document.getElementById('stopAlarmBtn'),
  snoozeAlarmBtn: document.getElementById('snoozeAlarmBtn'),
  toast: document.getElementById('toast'),
  addAlarmFromDashboard: document.getElementById('addAlarmFromDashboard'),
  addAlarmFromAlarms: document.getElementById('addAlarmFromAlarms'),
  enableNotificationsBtn: document.getElementById('enableNotificationsBtn'),
  testSoundBtn: document.getElementById('testSoundBtn'),
  stopSoundBtn: document.getElementById('stopSoundBtn'),
  clockFormat: document.getElementById('clockFormat'),
  defaultSnooze: document.getElementById('defaultSnooze'),
  defaultSoundUpload: document.getElementById('defaultSoundUpload'),
  customSoundName: document.getElementById('customSoundName'),
  clearCustomSoundBtn: document.getElementById('clearCustomSoundBtn'),
  soundEnabled: document.getElementById('soundEnabled'),
  notificationEnabled: document.getElementById('notificationEnabled'),
  darkModeEnabled: document.getElementById('darkModeEnabled'),
  appStatus: document.getElementById('appStatus'),
  monitorStatus: document.getElementById('monitorStatus'),
  serverStatus: document.getElementById('serverStatus'),
  activeCountDisplay: document.getElementById('activeCountDisplay'),
  alarmsListContainer: document.getElementById('alarmsListContainer'),
};

const statDefs = [
  { key: 'total', label: 'Total Alarms' },
  { key: 'active', label: 'Active' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'daily', label: 'Daily' },
  { key: 'once', label: 'Once' },
  { key: 'ringing', label: 'Ringing' },
];

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => elements.toast.classList.add('hidden'), 3000);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

function configureAlarmTimeFields() {
  elements.hourInput.min = state.clock24 ? '0' : '1';
  elements.hourInput.max = state.clock24 ? '23' : '12';
  elements.periodFieldGroup.style.display = state.clock24 ? 'none' : 'flex';
  elements.periodInput.disabled = state.clock24;
}

function getAlarmHour() {
  const displayedHour = Number(elements.hourInput.value);
  if (state.clock24) return displayedHour;
  return (displayedHour % 12) + (elements.periodInput.value === 'PM' ? 12 : 0);
}

function setAlarmTime(hour, minute) {
  configureAlarmTimeFields();
  if (state.clock24) {
    elements.hourInput.value = hour;
  } else {
    elements.hourInput.value = hour % 12 || 12;
    elements.periodInput.value = hour >= 12 ? 'PM' : 'AM';
  }
  elements.minuteInput.value = minute;
}

function renderCustomSoundSetting() {
  elements.customSoundName.textContent = state.customSoundName || (state.customSound ? 'Custom sound ready.' : 'No custom sound selected.');
  elements.clearCustomSoundBtn.disabled = !state.customSound;
}

function applySettings() {
  document.body.classList.toggle('dark-mode', state.darkMode);
  elements.clockFormat.value = state.clock24 ? '24' : '12';
  elements.defaultSnooze.value = String(state.snoozeMinutes);
  elements.soundEnabled.checked = state.soundEnabled;
  elements.notificationEnabled.checked = state.notificationEnabled;
  elements.darkModeEnabled.checked = state.darkMode;
  configureAlarmTimeFields();
  renderCustomSoundSetting();
}

function saveLocalSettings() {
  localStorage.setItem('alarm-clock-settings', JSON.stringify({
    darkMode: state.darkMode,
    clock24: state.clock24,
    snoozeMinutes: state.snoozeMinutes,
    soundEnabled: state.soundEnabled,
    customSound: state.customSound,
    customSoundName: state.customSoundName,
    notificationEnabled: state.notificationEnabled,
  }));
}

function loadLocalSettings() {
  const saved = JSON.parse(localStorage.getItem('alarm-clock-settings') || '{}');
  state.darkMode = Boolean(saved.darkMode);
  state.clock24 = Boolean(saved.clock24);
  state.snoozeMinutes = Number(saved.snoozeMinutes || 5);
  state.soundEnabled = saved.soundEnabled !== false;
  state.customSound = typeof saved.customSound === 'string' ? saved.customSound : '';
  state.customSoundName = typeof saved.customSoundName === 'string' ? saved.customSoundName : '';
  state.notificationEnabled = saved.notificationEnabled !== false;
  applySettings();
}

function formatClockValue(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  if (state.clock24) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${suffix}`;
}

function updateClock() {
  const now = new Date();
  elements.clockDisplay.textContent = formatClockValue(now);
  elements.dateDisplay.textContent = now.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeDisplay(hour, minute) {
  if (state.clock24) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function getStats() {
  const total = state.alarms.length;
  const active = state.alarms.filter((alarm) => alarm.enabled).length;
  const disabled = state.alarms.filter((alarm) => !alarm.enabled).length;
  const daily = state.alarms.filter((alarm) => alarm.repeat === 'daily').length;
  const once = state.alarms.filter((alarm) => alarm.repeat === 'once').length;
  const ringing = state.alarms.filter((alarm) => alarm.status === 'ringing').length;
  return { total, active, disabled, daily, once, ringing };
}

function renderStats() {
  const stats = getStats();
  elements.statsGrid.innerHTML = statDefs.map((stat) => {
    const value = stats[stat.key];
    return `
      <div class="stat-card">
        <span class="label">${stat.label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }).join('');

  elements.activeCountDisplay.textContent = stats.active;
}

function getFilteredAlarms() {
  const search = state.searchTerm.trim().toLowerCase();
  return state.alarms.filter((alarm) => {
    const searchable = [
      String(alarm.id),
      alarm.label,
      formatTimeDisplay(alarm.hour, alarm.minute),
      alarm.repeat,
      alarm.enabled ? 'enabled' : 'disabled',
      alarm.status,
    ].join(' ').toLowerCase();

    const matchesSearch = !search || searchable.includes(search);
    const matchesFilter = state.filter === 'all'
      || (state.filter === 'active' && alarm.enabled)
      || (state.filter === 'disabled' && !alarm.enabled)
      || (state.filter === 'daily' && alarm.repeat === 'daily')
      || (state.filter === 'once' && alarm.repeat === 'once')
      || (state.filter === 'ringing' && alarm.status === 'ringing');

    return matchesSearch && matchesFilter;
  });
}

function renderAlarmTable() {
  const filtered = getFilteredAlarms();
  if (!filtered.length) {
    elements.alarmTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No alarms match your current search.</td></tr>';
    return;
  }

  elements.alarmTableBody.innerHTML = filtered.map((alarm) => {
    const time = formatTimeDisplay(alarm.hour, alarm.minute);
    const statusClass = alarm.status === 'ringing' ? 'ringing' : (alarm.enabled ? 'enabled' : 'disabled');
    return `
      <tr>
        <td>${alarm.id}</td>
        <td>${time}</td>
        <td>${escapeHtml(alarm.label)}</td>
        <td>${alarm.repeat.toUpperCase()}</td>
        <td><span class="alarm-status ${statusClass}">${alarm.status === 'ringing' ? 'Ringing' : (alarm.enabled ? 'Enabled' : 'Disabled')}</span></td>
        <td>
          <div class="action-group">
            <button class="action-button" data-action="edit" data-id="${alarm.id}">Edit</button>
            <button class="action-button danger" data-action="delete" data-id="${alarm.id}">Delete</button>
            <button class="action-button warning" data-action="toggle" data-id="${alarm.id}">${alarm.enabled ? 'Disable' : 'Enable'}</button>
            <button class="action-button" data-action="snooze" data-id="${alarm.id}">Snooze</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  elements.alarmsListContainer.innerHTML = filtered.map((alarm) => `
    <div class="alarm-card-item">
      <div>
        <strong>${escapeHtml(alarm.label)}</strong>
        <small>${formatTimeDisplay(alarm.hour, alarm.minute)} • ${alarm.repeat}</small>
      </div>
      <div class="action-group">
        <button class="action-button" data-action="edit" data-id="${alarm.id}">Edit</button>
        <button class="action-button danger" data-action="delete" data-id="${alarm.id}">Delete</button>
        <button class="action-button warning" data-action="toggle" data-id="${alarm.id}">${alarm.enabled ? 'Disable' : 'Enable'}</button>
        <button class="action-button" data-action="snooze" data-id="${alarm.id}">Snooze</button>
      </div>
    </div>
  `).join('');
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No alarm activity yet.</td></tr>';
    return;
  }

  elements.historyTableBody.innerHTML = state.history.map((entry) => `
    <tr>
      <td>${escapeHtml(entry.alarmLabel || 'Alarm')}</td>
      <td>${entry.date}</td>
      <td>${entry.time}</td>
      <td>${entry.status}</td>
    </tr>
  `).join('');
}

function renderSystemData() {
  if (!state.system) {
    elements.systemStatusList.innerHTML = '<li><span>Loading</span><strong>…</strong></li>';
    return;
  }

  const { application, alarmMonitor, server, storage, processId, memory } = state.system;
  elements.systemStatusList.innerHTML = `
    <li><span>Application</span><strong>${application}</strong></li>
    <li><span>Alarm Monitor</span><strong>${alarmMonitor}</strong></li>
    <li><span>Server</span><strong>${server}</strong></li>
    <li><span>Storage</span><strong>${storage}</strong></li>
    <li><span>Process ID</span><strong>${processId}</strong></li>
    <li><span>Memory Used</span><strong>${formatBytes(memory.used)}</strong></li>
    <li><span>Memory Free</span><strong>${formatBytes(memory.free)}</strong></li>
  `;

  elements.technicalDetailsList.innerHTML = (state.system.technicalDetails || []).map((item) => `
    <div class="tech-item">
      <strong>OS concept</strong>
      <span>${escapeHtml(item)}</span>
    </div>
  `).join('');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value.toFixed(1)} ${units[index]}`;
}

function renderNextAlarm() {
  const next = getNextAlarm();
  if (!next) {
    elements.nextAlarmTime.textContent = 'No upcoming alarms';
    elements.nextAlarmLabel.textContent = 'Set your next reminder';
    elements.nextAlarmMeta.textContent = 'No active alarms';
    elements.countdownDisplay.textContent = '--h --m --s';
    return;
  }

  const { alarm, difference } = next;
  elements.nextAlarmTime.textContent = formatTimeDisplay(alarm.hour, alarm.minute);
  elements.nextAlarmLabel.textContent = alarm.label;
  elements.nextAlarmMeta.textContent = alarm.repeat.toUpperCase();

  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;
  const seconds = 59;
  elements.countdownDisplay.textContent = `${hours}h ${minutes}m ${seconds}s`;
}

function getNextAlarm() {
  const now = new Date();
  const candidates = state.alarms
    .filter((alarm) => alarm.enabled)
    .map((alarm) => {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const alarmMinutes = alarm.hour * 60 + alarm.minute;
      let diff = alarmMinutes - nowMinutes;
      if (diff < 0) diff += 24 * 60;
      return { alarm, difference: diff };
    })
    .filter((entry) => entry.difference >= 0)
    .sort((a, b) => a.difference - b.difference);

  return candidates[0] || null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDraftSummary() {
  if (!state.draftQueue.length) {
    elements.draftSummary.innerHTML = '';
    return;
  }

  elements.draftSummary.innerHTML = state.draftQueue.map((item, index) => `
    <span class="draft-pill">${index + 1}. ${escapeHtml(item.label)} ${formatTimeDisplay(item.hour, item.minute)}</span>
  `).join('');
}

async function refreshData() {
  try {
    const [alarmsRes, historyRes, systemRes] = await Promise.all([
      requestJson('/api/alarms'),
      requestJson('/api/history'),
      requestJson('/api/system'),
    ]);

    state.alarms = alarmsRes.alarms || [];
    state.history = historyRes.history || [];
    state.system = systemRes.system || null;
    renderStats();
    renderAlarmTable();
    renderHistory();
    renderSystemData();
    renderNextAlarm();
  } catch (error) {
    showToast(error.message || 'Unable to refresh data.');
  }
}

function setActivePage(page) {
  state.activePage = page;
  elements.navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.page === page);
  });

  elements.pages.forEach((section) => {
    section.classList.toggle('active', section.id === page);
  });
}

function openModal(mode = 'add', alarm = null) {
  state.modalMode = mode;
  state.editingId = alarm ? Number(alarm.id) : null;
  state.draftQueue = [];
  renderDraftSummary();
  elements.alarmForm.reset();
  elements.soundUpload.dataset.audio = '';
  elements.soundUpload.value = '';
  updateSoundSelection();

  if (mode === 'edit' && alarm) {
    elements.modalTitle.textContent = 'Edit Alarm';
    setAlarmTime(alarm.hour, alarm.minute);
    elements.labelInput.value = alarm.label;
    elements.repeatInput.value = alarm.repeat;
    const soundValue = alarm.sound && alarm.sound.startsWith('data:audio') ? 'custom' : (alarm.sound || 'classic');
    elements.soundInput.value = soundValue;
    elements.soundUpload.dataset.audio = alarm.sound && alarm.sound.startsWith('data:audio') ? alarm.sound : '';
    elements.snoozeInput.value = alarm.snooze || 5;
    elements.notesInput.value = alarm.notes || '';
    elements.saveAlarmBtn.textContent = 'Save Changes';
    elements.addAnotherBtn.style.display = 'none';
  } else {
    elements.modalTitle.textContent = 'Add Alarm';
    const now = new Date();
    setAlarmTime(now.getHours(), now.getMinutes());
    elements.labelInput.value = '';
    elements.repeatInput.value = 'once';
    elements.soundInput.value = 'classic';
    elements.snoozeInput.value = state.snoozeMinutes;
    elements.notesInput.value = '';
    elements.saveAlarmBtn.textContent = 'Save Alarm';
    elements.addAnotherBtn.style.display = 'inline-flex';
  }

  updateSoundSelection();
  elements.alarmModal.classList.remove('hidden');
  elements.alarmModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  elements.alarmModal.classList.add('hidden');
  elements.alarmModal.setAttribute('aria-hidden', 'true');
  state.draftQueue = [];
  renderDraftSummary();
}

function fileToDataUrl(file) {
  if (file.size > 700 * 1024) {
    return Promise.reject(new Error('Choose an audio file smaller than 700 KB.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read sound file.'));
    reader.readAsDataURL(file);
  });
}

function updateSoundSelection() {
  const selection = elements.soundInput.value;
  const customGroup = document.querySelector('.custom-sound-group');
  if (selection === 'custom') {
    customGroup.style.display = 'flex';
    return;
  }

  customGroup.style.display = 'none';
}

function parseFormData() {
  const selectedSound = elements.soundInput.value === 'custom'
    ? (elements.soundUpload.dataset.audio || state.customSound)
    : elements.soundInput.value;

  const payload = {
    hour: getAlarmHour(),
    minute: Number(elements.minuteInput.value),
    label: elements.labelInput.value.trim(),
    repeat: elements.repeatInput.value,
    sound: selectedSound,
    snooze: Number(elements.snoozeInput.value || state.snoozeMinutes),
    notes: elements.notesInput.value.trim(),
    enabled: true,
  };

  if (!payload.label) {
    throw new Error('Label cannot be empty.');
  }

  if (elements.soundInput.value === 'custom' && !selectedSound) {
    throw new Error('Add a custom sound in Settings or upload one for this alarm.');
  }

  const displayedHour = Number(elements.hourInput.value);
  const minHour = state.clock24 ? 0 : 1;
  const maxHour = state.clock24 ? 23 : 12;
  if (!Number.isInteger(displayedHour) || displayedHour < minHour || displayedHour > maxHour) {
    throw new Error(state.clock24 ? 'Hour must be between 0 and 23.' : 'Hour must be between 1 and 12.');
  }

  if (!Number.isInteger(payload.hour) || payload.hour < 0 || payload.hour > 23) {
    throw new Error('Hour must be between 0 and 23.');
  }

  if (!Number.isInteger(payload.minute) || payload.minute < 0 || payload.minute > 59) {
    throw new Error('Minute must be between 0 and 59.');
  }

  if (payload.repeat !== 'daily' && payload.repeat !== 'once') {
    throw new Error('Repeat must be once or daily.');
  }

  if (!Number.isInteger(payload.snooze) || payload.snooze < 1 || payload.snooze > 60) {
    throw new Error('Snooze duration must be between 1 and 60 minutes.');
  }

  return payload;
}

async function submitAlarmQueue() {
  const queue = [...state.draftQueue];
  if (state.modalMode === 'edit' && state.editingId !== null) {
    const updated = parseFormData();
    const response = await requestJson(`/api/alarms/${state.editingId}`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    showToast(response.message || 'Alarm updated.');
    closeModal();
    await refreshData();
    return;
  }

  if (!queue.length) {
    const next = parseFormData();
    queue.push(next);
  }

  if (state.alarms.length + queue.length > 200) {
    throw new Error('Maximum of 200 alarms allowed.');
  }

  for (const item of queue) {
    await requestJson('/api/alarms', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  state.draftQueue = [];
  renderDraftSummary();
  closeModal();
  await refreshData();
  showToast(queue.length > 1 ? `${queue.length} alarms saved.` : 'Alarm saved.');
}

function addDraftFromForm() {
  try {
    const payload = parseFormData();
    if (state.alarms.length + state.draftQueue.length + 1 > 200) {
      throw new Error('Maximum of 200 alarms allowed.');
    }

    state.draftQueue.push(payload);
    renderDraftSummary();
    elements.alarmForm.reset();
    const now = new Date();
    setAlarmTime(now.getHours(), now.getMinutes());
    elements.labelInput.value = '';
    elements.repeatInput.value = 'once';
    elements.soundInput.value = 'classic';
    elements.soundUpload.dataset.audio = '';
    elements.soundUpload.value = '';
    updateSoundSelection();
    elements.snoozeInput.value = state.snoozeMinutes;
    elements.notesInput.value = '';
    showToast('Alarm queued. Add another or save all.');
  } catch (error) {
    showToast(error.message || 'Unable to queue alarm.');
  }
}

function handleFormSubmit(event) {
  event.preventDefault();
  if (state.draftQueue.length > 0 && state.modalMode !== 'edit') {
    submitAlarmQueue().catch((error) => showToast(error.message || 'Unable to save alarms.'));
    return;
  }

  submitAlarmQueue().catch((error) => showToast(error.message || 'Unable to save alarm.'));
}

async function handleAlarmAction(action, id) {
  const alarm = state.alarms.find((item) => Number(item.id) === Number(id));
  if (!alarm) return;

  if (action === 'delete') {
    const confirmed = window.confirm('Are you sure you want to delete this alarm?');
    if (!confirmed) return;

    await requestJson(`/api/alarms/${id}`, { method: 'DELETE' });
    showToast('Alarm deleted.');
    await refreshData();
    return;
  }

  if (action === 'toggle') {
    await requestJson(`/api/alarms/${id}/toggle`, { method: 'PATCH' });
    showToast(alarm.enabled ? 'Alarm disabled.' : 'Alarm enabled.');
    await refreshData();
    return;
  }

  if (action === 'snooze') {
    const minutes = Number(alarm.snooze || state.snoozeMinutes || 5);
    const result = await requestJson(`/api/alarms/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    });
    showToast(result.message || 'Alarm snoozed.');
    await refreshData();
    return;
  }

  if (action === 'edit') {
    openModal('edit', alarm);
  }
}

function currentlyRingingAlarm() {
  return state.alarms.find((alarm) => Number(alarm.id) === Number(state.ringingAlarmId));
}

async function stopCurrentAlarm() {
  const alarm = currentlyRingingAlarm();
  if (!alarm) return;

  const payload = {
    ...alarm,
    enabled: alarm.repeat === 'daily',
    status: 'completed',
  };

  try {
    await requestJson(`/api/alarms/${alarm.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (alarm.repeat === 'once') {
      alarm.enabled = false;
      alarm.status = 'disabled';
    } else {
      alarm.enabled = true;
      alarm.status = 'enabled';
    }
    state.ringingAlarmId = null;
    closeRingingModal();
    stopAlarmSound();
    await refreshData();
  } catch (error) {
    showToast(error.message || 'Unable to stop alarm.');
  }
}

function closeRingingModal() {
  elements.ringingModal.classList.add('hidden');
  elements.ringingModal.setAttribute('aria-hidden', 'true');
}

function triggerAlarm(alarm) {
  const now = new Date();
  if (state.ringingAlarmId && Number(state.ringingAlarmId) === Number(alarm.id)) {
    return;
  }

  state.ringingAlarmId = Number(alarm.id);
  alarm.status = 'ringing';
  alarm.enabled = true;
  elements.ringingTime.textContent = formatTimeDisplay(alarm.hour, alarm.minute);
  elements.ringingLabel.textContent = alarm.label;
  elements.ringingModal.classList.remove('hidden');
  elements.ringingModal.setAttribute('aria-hidden', 'false');
  if (state.notificationEnabled && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('ALARM RINGING', {
      body: `${alarm.label} • ${formatTimeDisplay(alarm.hour, alarm.minute)}`,
    });
  }
  playAlarmTone(alarm);
  renderAlarmTable();
}

function playAlarmTone(alarm = null) {
  if (!state.soundEnabled) return;

  const chosenSound = alarm?.sound || elements.soundInput.value || 'classic';
  if (typeof chosenSound === 'string' && chosenSound.startsWith('data:audio')) {
    const customAudio = new Audio(chosenSound);
    customAudio.volume = 0.8;
    customAudio.play().catch(() => {
      console.warn('Custom audio could not autoplay.');
    });
    return;
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!state.audioContext) {
      state.audioContext = new AudioCtx();
    }

    const oscillator = state.audioContext.createOscillator();
    const gainNode = state.audioContext.createGain();
    const toneMap = {
      classic: { type: 'sine', frequency: 880, gain: 0.05 },
      soft: { type: 'sine', frequency: 440, gain: 0.03 },
      beep: { type: 'square', frequency: 660, gain: 0.07 },
    };
    const selected = toneMap[chosenSound] || toneMap.classic;
    oscillator.type = selected.type;
    oscillator.frequency.value = selected.frequency;
    gainNode.gain.value = selected.gain;
    oscillator.connect(gainNode);
    gainNode.connect(state.audioContext.destination);
    oscillator.start();

    const stopAt = state.audioContext.currentTime + 0.45;
    oscillator.stop(stopAt);
  } catch (error) {
    console.warn('Unable to play browser sound.', error);
  }
}

function stopAlarmSound() {
  if (state.audioContext) {
    state.audioContext.close().catch(() => {});
    state.audioContext = null;
  }
}

async function snoozeCurrentAlarm() {
  const alarm = currentlyRingingAlarm();
  if (!alarm) return;

  const minutes = Number(alarm.snooze || state.snoozeMinutes || 5);
  const result = await requestJson(`/api/alarms/${alarm.id}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  });

  state.ringingAlarmId = null;
  showToast(result.message || 'Alarm snoozed.');
  closeRingingModal();
  stopAlarmSound();
  await refreshData();
}

function monitorAlarms() {
  const now = new Date();
  const currentMinuteKey = `${now.getHours()}:${now.getMinutes()}`;

  for (const alarm of state.alarms) {
    const alarmKey = `${alarm.hour}:${alarm.minute}`;
    const isMatch = alarm.enabled && alarmKey === currentMinuteKey && alarm.status !== 'ringing';
    if (isMatch) {
      triggerAlarm(alarm);
    }
  }

  const next = getNextAlarm();
  if (next) {
    const totalMinutes = next.difference * 60;
    const hours = Math.floor(totalMinutes / 3600);
    const mins = Math.floor((totalMinutes % 3600) / 60);
    const secs = totalMinutes % 60;
    elements.countdownDisplay.textContent = `${hours}h ${mins}m ${secs}s`;
  }
}

async function enableNotifications() {
  if (!('Notification' in window)) {
    showToast('Browser notifications are not supported here.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showToast('Notifications enabled.');
  } else {
    showToast('Notifications were denied.');
  }
}

function setSearchValue(value) {
  state.searchTerm = value;
  elements.searchInput.value = value;
  elements.searchInputPage.value = value;
  renderAlarmTable();
}

async function handleHistoryEntry(status) {
  const currentAlarm = currentlyRingingAlarm();
  if (!currentAlarm) return;

  const now = new Date();
  const entry = {
    id: Number(currentAlarm.id),
    alarmLabel: currentAlarm.label,
    date: now.toISOString().slice(0, 10),
    time: formatTimeDisplay(currentAlarm.hour, currentAlarm.minute),
    status,
  };

  try {
    await requestJson('/api/history', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  } catch (error) {
    console.warn('Unable to save history entry.', error);
  }
}

async function handleAlarmEnd(status) {
  const alarm = currentlyRingingAlarm();
  if (!alarm) return;

  if (status === 'Snoozed') {
    await handleHistoryEntry('Snoozed');
    return;
  }

  if (alarm.repeat === 'once') {
    alarm.enabled = false;
    alarm.status = 'disabled';
  } else {
    alarm.enabled = true;
    alarm.status = 'enabled';
  }

  await handleHistoryEntry(status);
  await refreshData();
}

async function initialize() {
  loadLocalSettings();
  setActivePage('dashboard');
  updateClock();
  setInterval(updateClock, 1000);

  elements.searchInput.addEventListener('input', (event) => {
    state.searchTerm = event.target.value;
    elements.searchInputPage.value = event.target.value;
    renderAlarmTable();
  });

  elements.searchInputPage.addEventListener('input', (event) => {
    state.searchTerm = event.target.value;
    elements.searchInput.value = event.target.value;
    renderAlarmTable();
  });

  elements.filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      elements.filterButtons.forEach((item) => item.classList.toggle('active', item === button));
      renderAlarmTable();
    });
  });

  elements.navButtons.forEach((button) => {
    button.addEventListener('click', () => setActivePage(button.dataset.page));
  });

  elements.addAlarmFromDashboard.addEventListener('click', () => openModal('add'));
  elements.addAlarmFromAlarms.addEventListener('click', () => openModal('add'));
  elements.closeModalBtn.addEventListener('click', closeModal);
  elements.cancelAlarmBtn.addEventListener('click', closeModal);
  elements.addAnotherBtn.addEventListener('click', addDraftFromForm);
  elements.alarmForm.addEventListener('submit', handleFormSubmit);
  elements.stopAlarmBtn.addEventListener('click', async () => {
    await handleAlarmEnd('Stopped');
    await stopCurrentAlarm();
  });
  elements.snoozeAlarmBtn.addEventListener('click', async () => {
    await handleAlarmEnd('Snoozed');
    await snoozeCurrentAlarm();
  });
  elements.enableNotificationsBtn.addEventListener('click', enableNotifications);
  elements.testSoundBtn.addEventListener('click', () => {
    const selectedSound = elements.soundInput.value === 'custom'
      ? (elements.soundUpload.dataset.audio || state.customSound || 'classic')
      : elements.soundInput.value;
    playAlarmTone({ sound: selectedSound });
  });
  elements.stopSoundBtn.addEventListener('click', stopAlarmSound);
  elements.soundInput.addEventListener('change', updateSoundSelection);
  elements.soundUpload.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      elements.soundUpload.dataset.audio = dataUrl;
      elements.soundInput.value = 'custom';
      showToast(`Loaded custom sound: ${file.name}`);
      updateSoundSelection();
    } catch (error) {
      showToast(error.message || 'Unable to read custom sound file.');
    }
  });

  elements.defaultSoundUpload.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const previousSound = state.customSound;
    const previousName = state.customSoundName;
    try {
      state.customSound = await fileToDataUrl(file);
      state.customSoundName = file.name;
      saveLocalSettings();
      renderCustomSoundSetting();
      showToast('Custom alarm sound saved in Settings.');
    } catch (error) {
      state.customSound = previousSound;
      state.customSoundName = previousName;
      renderCustomSoundSetting();
      showToast(error.message || 'Unable to save custom alarm sound.');
    }
  });

  elements.clearCustomSoundBtn.addEventListener('click', () => {
    state.customSound = '';
    state.customSoundName = '';
    elements.defaultSoundUpload.value = '';
    saveLocalSettings();
    renderCustomSoundSetting();
    showToast('Custom alarm sound removed from Settings.');
  });

  elements.clockFormat.addEventListener('change', () => {
    const displayedHour = Number(elements.hourInput.value);
    const currentHour = Number.isInteger(displayedHour) ? getAlarmHour() : null;
    const currentMinute = Number(elements.minuteInput.value);
    state.clock24 = elements.clockFormat.value === '24';
    configureAlarmTimeFields();
    if (currentHour !== null) setAlarmTime(currentHour, currentMinute);
    saveLocalSettings();
    applySettings();
    updateClock();
  });

  elements.defaultSnooze.addEventListener('change', () => {
    state.snoozeMinutes = Number(elements.defaultSnooze.value || 5);
    saveLocalSettings();
  });

  elements.soundEnabled.addEventListener('change', () => {
    state.soundEnabled = elements.soundEnabled.checked;
    saveLocalSettings();
  });

  elements.notificationEnabled.addEventListener('change', () => {
    state.notificationEnabled = elements.notificationEnabled.checked;
    saveLocalSettings();
  });

  elements.darkModeEnabled.addEventListener('change', () => {
    state.darkMode = elements.darkModeEnabled.checked;
    saveLocalSettings();
    applySettings();
  });

  document.body.addEventListener('click', async (event) => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    const { action, id } = actionTarget.dataset;
    await handleAlarmAction(action, id);
  });

  document.body.addEventListener('click', (event) => {
    if (event.target.dataset.close === 'modal') {
      closeModal();
    }
  });

  const systemInterval = setInterval(async () => {
    try {
      const response = await requestJson('/api/status');
      if (response && response.stats) {
        state.alarms = state.alarms.length ? state.alarms : [];
      }
    } catch (error) {
      console.warn('Status refresh failed.', error);
    }

    monitorAlarms();
    renderNextAlarm();
  }, 1000);

  await refreshData();
  monitorAlarms();
  renderNextAlarm();
  setInterval(() => {
    monitorAlarms();
    renderNextAlarm();
  }, 1000);

  if (Notification.permission === 'default') {
    elements.enableNotificationsBtn.textContent = 'Enable Notifications';
  }

  if (Notification.permission === 'denied') {
    elements.enableNotificationsBtn.textContent = 'Notifications Blocked';
  }

  if (window.Notification && Notification.permission === 'granted') {
    elements.enableNotificationsBtn.textContent = 'Notifications Enabled';
  }

  console.info('Alarm Clock dashboard ready.', { systemInterval });
}

initialize().catch((error) => {
  console.error('Failed to initialize app', error);
  showToast('Unable to start the alarm dashboard.');
});
