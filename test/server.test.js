const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const app = require('../server/server');

const alarmFile = path.join(__dirname, '..', 'data', 'alarms.json');
const historyFile = path.join(__dirname, '..', 'data', 'history.json');

function resetStorage() {
  fs.writeFileSync(alarmFile, JSON.stringify([], null, 2) + '\n', 'utf8');
  fs.writeFileSync(historyFile, JSON.stringify([], null, 2) + '\n', 'utf8');
}

test('GET /api/alarms returns an empty list when nothing exists', async () => {
  resetStorage();
  fs.unlinkSync(alarmFile);

  const response = await request(app).get('/api/alarms');
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.alarms, []);
  assert.deepEqual(JSON.parse(fs.readFileSync(alarmFile, 'utf8')), []);
});

test('POST /api/alarms creates a valid alarm', async () => {
  resetStorage();
  const response = await request(app)
    .post('/api/alarms')
    .send({ hour: 8, minute: 30, label: 'Wake Up', repeat: 'daily', snooze: 5, notes: 'Morning reminder' });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.alarm.label, 'Wake Up');
});

test('PUT /api/alarms/:id updates an alarm', async () => {
  resetStorage();
  const created = await request(app)
    .post('/api/alarms')
    .send({ hour: 7, minute: 15, label: 'Class', repeat: 'once', snooze: 10 });

  const response = await request(app)
    .put(`/api/alarms/${created.body.alarm.id}`)
    .send({ hour: 8, minute: 45, label: 'Updated Class', repeat: 'daily', snooze: 5 });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.alarm.label, 'Updated Class');
});

test('PATCH /api/alarms/:id/toggle toggles an alarm', async () => {
  resetStorage();
  const created = await request(app)
    .post('/api/alarms')
    .send({ hour: 9, minute: 0, label: 'Workout', repeat: 'daily' });

  const response = await request(app).patch(`/api/alarms/${created.body.alarm.id}/toggle`);
  assert.equal(response.status, 200);
  assert.equal(response.body.alarm.enabled, false);
});

test('POST /api/alarms/:id/snooze reschedules time', async () => {
  resetStorage();
  const created = await request(app)
    .post('/api/alarms')
    .send({ hour: 10, minute: 15, label: 'Study', repeat: 'daily' });

  const response = await request(app)
    .post(`/api/alarms/${created.body.alarm.id}/snooze`)
    .send({ minutes: 5 });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(response.body.message, /Snoozed until/);
});

test('GET /api/history returns stored activity', async () => {
  resetStorage();
  await request(app).post('/api/history').send({ alarmLabel: 'Wake Up', date: '2026-09-29', time: '07:30', status: 'Triggered' });
  const response = await request(app).get('/api/history');
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.history.length, 1);
  assert.equal(response.body.history[0].alarmLabel, 'Wake Up');
});

test('Invalid input is rejected', async () => {
  resetStorage();
  const response = await request(app)
    .post('/api/alarms')
    .send({ hour: 25, minute: 70, label: '', repeat: 'once' });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test('Alarm limit is enforced at 200 alarms', async () => {
  resetStorage();

  for (let i = 0; i < 200; i += 1) {
    await request(app).post('/api/alarms').send({
      hour: i % 24,
      minute: (i * 3) % 60,
      label: `Alarm ${i}`,
      repeat: i % 2 === 0 ? 'daily' : 'once',
    });
  }

  const response = await request(app).post('/api/alarms').send({
    hour: 12,
    minute: 0,
    label: 'Too many',
    repeat: 'daily',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Maximum of 200 alarms allowed/);
});
