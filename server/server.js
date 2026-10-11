const express = require('express');
const path = require('path');
const {
  getAlarmList,
  createAlarm,
  updateAlarm,
  deleteAlarm,
  toggleAlarm,
  addHistoryEntry,
  computeAlarmStats,
  findNextAlarm,
  addMinutesToTime,
  getHistory,
  formatDisplayTime,
  isValidAlarmId,
} = require('./alarmManager');
const { getSystemSnapshot } = require('./systemMonitor');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function sendError(res, statusCode, message) {
  return res.status(statusCode).json({ success: false, message });
}

function validateAlarmInput(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Malformed alarm request.');
  }

  const hour = Number(payload.hour);
  const minute = Number(payload.minute);
  const label = String(payload.label ?? '').trim();

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('Hour must be between 0 and 23.');
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error('Minute must be between 0 and 59.');
  }

  if (!label) {
    throw new Error('Alarm label cannot be empty.');
  }

  return {
    ...payload,
    hour,
    minute,
    label,
    repeat: payload.repeat === 'daily' ? 'daily' : 'once',
    snooze: Number(payload.snooze ?? 5),
    enabled: payload.enabled !== false,
    sound: payload.sound || 'classic',
    notes: String(payload.notes ?? '').trim(),
  };
}

app.get('/api/alarms', (req, res) => {
  try {
    const alarms = getAlarmList();
    res.json({ success: true, alarms });
  } catch (error) {
    sendError(res, 500, 'Unable to load alarms.');
  }
});

app.post('/api/alarms', (req, res) => {
  try {
    const payload = validateAlarmInput(req.body);
    const alarm = createAlarm(payload);
    res.status(201).json({ success: true, alarm });
  } catch (error) {
    const message = error.message || 'Unable to create alarm.';
    const status = message.includes('Maximum') ? 400 : 400;
    sendError(res, status, message);
  }
});

app.put('/api/alarms/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidAlarmId(id)) {
      return sendError(res, 400, 'Invalid alarm ID.');
    }

    const payload = validateAlarmInput(req.body);
    const updated = updateAlarm(id, payload);
    res.json({ success: true, alarm: updated });
  } catch (error) {
    sendError(res, 400, error.message || 'Unable to update alarm.');
  }
});

app.delete('/api/alarms/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidAlarmId(id)) {
      return sendError(res, 400, 'Invalid alarm ID.');
    }

    deleteAlarm(id);
    res.json({ success: true, message: 'Alarm deleted.' });
  } catch (error) {
    sendError(res, 400, error.message || 'Unable to delete alarm.');
  }
});

app.patch('/api/alarms/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidAlarmId(id)) {
      return sendError(res, 400, 'Invalid alarm ID.');
    }

    const updated = toggleAlarm(id);
    res.json({ success: true, alarm: updated });
  } catch (error) {
    sendError(res, 400, error.message || 'Unable to toggle alarm.');
  }
});

app.post('/api/alarms/:id/snooze', (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidAlarmId(id)) {
      return sendError(res, 400, 'Invalid alarm ID.');
    }

    const alarms = getAlarmList();
    const target = alarms.find((alarm) => Number(alarm.id) === Number(id));
    if (!target) {
      return sendError(res, 404, `Alarm with id ${id} was not found.`);
    }

    const minutes = Number(req.body?.minutes ?? target.snooze ?? 5);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
      return sendError(res, 400, 'Snooze duration must be between 1 and 60 minutes.');
    }

    const rescheduled = addMinutesToTime(target.hour, target.minute, minutes);
    target.hour = rescheduled.hour;
    target.minute = rescheduled.minute;
    target.enabled = true;
    target.status = 'enabled';
    target.timeLabel = formatDisplayTime(target.hour, target.minute);
    target.snooze = minutes;

    const newList = alarms.map((alarm) => (Number(alarm.id) === Number(id) ? target : alarm));
    const fs = require('fs');
    fs.writeFileSync(path.join(__dirname, '..', 'data', 'alarms.json'), JSON.stringify(newList, null, 2) + '\n', 'utf8');

    res.json({ success: true, message: `Snoozed until ${formatDisplayTime(target.hour, target.minute)}`, alarm: target });
  } catch (error) {
    sendError(res, 500, error.message || 'Unable to snooze alarm.');
  }
});

app.get('/api/history', (req, res) => {
  try {
    res.json({ success: true, history: getHistory() });
  } catch (error) {
    sendError(res, 500, 'Unable to load alarm history.');
  }
});

app.get('/api/system', (req, res) => {
  try {
    res.json({ success: true, system: getSystemSnapshot() });
  } catch (error) {
    sendError(res, 500, 'Unable to read system status.');
  }
});

app.get('/api/status', (req, res) => {
  try {
    const alarms = getAlarmList();
    const stats = computeAlarmStats(alarms);
    const nextAlarm = findNextAlarm(alarms, new Date());
    const now = new Date();

    res.json({
      success: true,
      now: now.toISOString(),
      formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      formattedDate: now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      stats,
      nextAlarm: nextAlarm ? {
        id: nextAlarm.alarm.id,
        label: nextAlarm.alarm.label,
        time: formatDisplayTime(nextAlarm.alarm.hour, nextAlarm.alarm.minute),
        repeat: nextAlarm.alarm.repeat,
        minutesUntil: nextAlarm.difference,
      } : null,
    });
  } catch (error) {
    sendError(res, 500, 'Unable to compute system status.');
  }
});

app.post('/api/history', (req, res) => {
  try {
    const entry = req.body || {};
    const saved = addHistoryEntry(entry);
    res.status(201).json({ success: true, entry: saved });
  } catch (error) {
    sendError(res, 400, error.message || 'Unable to save alarm history.');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Alarm Clock server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
