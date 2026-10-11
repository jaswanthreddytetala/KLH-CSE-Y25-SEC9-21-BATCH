const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ALARM_FILE = path.join(DATA_DIR, 'alarms.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(ALARM_FILE)) {
    fs.writeFileSync(ALARM_FILE, JSON.stringify([], null, 2) + '\n', 'utf8');
  }

  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2) + '\n', 'utf8');
  }
}

function readJson(filePath, fallback) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2) + '\n', 'utf8');
      return fallback;
    }

    const parsed = JSON.parse(content);
    return parsed ?? fallback;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2) + '\n', 'utf8');
      return fallback;
    }

    if (error instanceof SyntaxError) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2) + '\n', 'utf8');
      return fallback;
    }

    throw error;
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function ensureNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be a valid integer.`);
  }
  return parsed;
}

function isValidAlarmId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function formatDisplayTime(hour, minute) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function normalizeAlarm(rawAlarm = {}) {
  const hour = ensureNumber(rawAlarm.hour, 'Hour');
  const minute = ensureNumber(rawAlarm.minute, 'Minute');

  if (hour < 0 || hour > 23) {
    throw new Error('Hour must be between 0 and 23.');
  }

  if (minute < 0 || minute > 59) {
    throw new Error('Minute must be between 0 and 59.');
  }

  const label = String(rawAlarm.label ?? '').trim();
  if (!label) {
    throw new Error('Alarm label cannot be empty.');
  }

  const repeat = rawAlarm.repeat === 'daily' ? 'daily' : 'once';
  const enabled = rawAlarm.enabled !== false;
  const sound = rawAlarm.sound || 'classic';
  const snooze = ensureNumber(rawAlarm.snooze ?? 5, 'Snooze duration');
  const requestedStatus = String(rawAlarm.status || '').toLowerCase();

  if (snooze < 1 || snooze > 60) {
    throw new Error('Snooze duration must be between 1 and 60 minutes.');
  }

  let status = requestedStatus;
  if (!['enabled', 'disabled', 'ringing', 'completed'].includes(status)) {
    status = enabled ? 'enabled' : 'disabled';
  }

  return {
    id: Number(rawAlarm.id ?? 0) || undefined,
    hour,
    minute,
    label,
    repeat,
    enabled,
    sound,
    snooze,
    notes: String(rawAlarm.notes ?? '').trim(),
    status,
    createdAt: rawAlarm.createdAt || new Date().toISOString(),
    lastTriggeredAt: rawAlarm.lastTriggeredAt || null,
    timeLabel: formatDisplayTime(hour, minute),
  };
}

function sortAlarms(alarms) {
  return [...alarms].sort((a, b) => {
    const aTime = a.hour * 60 + a.minute;
    const bTime = b.hour * 60 + b.minute;
    return aTime - bTime;
  });
}

function getAlarmList() {
  ensureDataFiles();
  const alarms = readJson(ALARM_FILE, []);
  return Array.isArray(alarms) ? alarms : [];
}

function saveAlarmList(alarms) {
  ensureDataFiles();
  writeJson(ALARM_FILE, sortAlarms(alarms));
}

function getHistory() {
  ensureDataFiles();
  const history = readJson(HISTORY_FILE, []);
  return Array.isArray(history) ? history : [];
}

function saveHistory(history) {
  ensureDataFiles();
  writeJson(HISTORY_FILE, history);
}

function nextAlarmId(alarms) {
  const maxExisting = alarms.reduce((max, alarm) => Math.max(max, Number(alarm.id) || 0), 0);
  return maxExisting + 1;
}

function isDuplicateAlarm(alarmList, candidate) {
  return alarmList.some((current) => {
    if (current.id && candidate.id && Number(current.id) === Number(candidate.id)) {
      return false;
    }

    return current.hour === candidate.hour && current.minute === candidate.minute && current.label === candidate.label;
  });
}

function createAlarm(payload = {}) {
  ensureDataFiles();
  const alarmList = getAlarmList();
  const normalized = normalizeAlarm(payload);
  if (alarmList.length >= 200) {
    throw new Error('Maximum of 200 alarms allowed.');
  }

  if (isDuplicateAlarm(alarmList, normalized)) {
    throw new Error('A similar alarm already exists.');
  }

  const cleanAlarm = {
    ...normalized,
    id: Number(normalized.id) || nextAlarmId(alarmList),
  };

  alarmList.push(cleanAlarm);
  saveAlarmList(alarmList);
  return cleanAlarm;
}

function updateAlarm(id, payload = {}) {
  ensureDataFiles();
  const alarmList = getAlarmList();
  const targetIndex = alarmList.findIndex((alarm) => Number(alarm.id) === Number(id));

  if (targetIndex === -1) {
    throw new Error(`Alarm with id ${id} was not found.`);
  }

  const updatedAlarm = normalizeAlarm({
    ...alarmList[targetIndex],
    ...payload,
    id,
  });

  if (isDuplicateAlarm(alarmList.filter((alarm) => Number(alarm.id) !== Number(id)), updatedAlarm)) {
    throw new Error('A similar alarm already exists.');
  }

  alarmList[targetIndex] = {
    ...alarmList[targetIndex],
    ...updatedAlarm,
    id: Number(id),
    status: updatedAlarm.status || (updatedAlarm.enabled ? 'enabled' : 'disabled'),
  };

  saveAlarmList(alarmList);
  return alarmList[targetIndex];
}

function deleteAlarm(id) {
  ensureDataFiles();
  const alarms = getAlarmList();
  const nextList = alarms.filter((alarm) => Number(alarm.id) !== Number(id));
  saveAlarmList(nextList);
  return nextList;
}

function toggleAlarm(id) {
  const alarms = getAlarmList();
  const target = alarms.find((alarm) => Number(alarm.id) === Number(id));

  if (!target) {
    throw new Error(`Alarm with id ${id} was not found.`);
  }

  target.enabled = !target.enabled;
  target.status = target.enabled ? 'enabled' : 'disabled';
  saveAlarmList(alarms);
  return target;
}

function addHistoryEntry(entry) {
  ensureDataFiles();
  const history = getHistory();
  const item = {
    id: Number(entry.id ?? Date.now()),
    alarmLabel: String(entry.alarmLabel ?? 'Alarm'),
    date: entry.date || new Date().toISOString().slice(0, 10),
    time: entry.time || '00:00',
    status: entry.status || 'Triggered',
    createdAt: new Date().toISOString(),
  };

  history.unshift(item);
  saveHistory(history);
  return item;
}

function computeAlarmStats(alarms) {
  const total = alarms.length;
  const active = alarms.filter((alarm) => alarm.enabled).length;
  const disabled = alarms.filter((alarm) => !alarm.enabled).length;
  const daily = alarms.filter((alarm) => alarm.repeat === 'daily').length;
  const once = alarms.filter((alarm) => alarm.repeat === 'once').length;
  const ringing = alarms.filter((alarm) => alarm.status === 'ringing').length;

  return { total, active, disabled, daily, once, ringing };
}

function findNextAlarm(alarms, now = new Date()) {
  const candidateList = alarms
    .filter((alarm) => alarm.enabled)
    .map((alarm) => {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const alarmMinutes = alarm.hour * 60 + alarm.minute;
      const difference = alarmMinutes - currentMinutes;
      return {
        alarm,
        difference: difference >= 0 ? difference : difference + 24 * 60,
      };
    })
    .filter((entry) => entry.difference >= 0)
    .sort((a, b) => a.difference - b.difference);

  if (!candidateList.length) {
    return null;
  }

  return candidateList[0];
}

function addMinutesToTime(hour, minute, mins) {
  const totalMinutes = hour * 60 + minute + mins;
  const nextHour = (Math.floor(totalMinutes / 60) % 24 + 24) % 24;
  const nextMinute = totalMinutes % 60;
  return { hour: nextHour, minute: nextMinute };
}

module.exports = {
  ensureDataFiles,
  getAlarmList,
  saveAlarmList,
  getHistory,
  saveHistory,
  normalizeAlarm,
  createAlarm,
  updateAlarm,
  deleteAlarm,
  toggleAlarm,
  addHistoryEntry,
  computeAlarmStats,
  findNextAlarm,
  addMinutesToTime,
  formatDisplayTime,
  isValidAlarmId,
};
