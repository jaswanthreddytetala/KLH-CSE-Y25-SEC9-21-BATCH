# Alarm Clock System

A polished alarm clock dashboard built with Node.js, Express, and browser-side JavaScript. The project keeps the native C/OS layer concept separate from the web interface while still representing the same alarm functionality in a modern dashboard.

## Project structure

```text
OS_PROJECT/
├── README.md
├── package.json
├── .gitignore
├── data/
│   ├── alarms.json
│   └── history.json
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── assets/
├── server/
│   ├── server.js
│   ├── alarmManager.js
│   └── systemMonitor.js
├── src/
│   └── alarm_clock.c
├── test/
│   └── server.test.js
└── results/
```

## Features

- Current live browser time and date
- Starts with no alarms; users can create up to 200 alarms
- Add, edit, delete, enable, disable, snooze, and stop
- Daily and once-only alarm modes
- Alarm search and filtering
- Persistent storage in JSON files
- History tracking with status updates
- Notification and sound handling
- System monitor and OS concept panel
- Responsive dashboard with light and dark mode

## Run the application

```bash
cd d:/OS_PROJECT
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## API endpoints

- GET /api/alarms
- POST /api/alarms
- PUT /api/alarms/:id
- DELETE /api/alarms/:id
- PATCH /api/alarms/:id/toggle
- POST /api/alarms/:id/snooze
- GET /api/history
- GET /api/system
- GET /api/status

## Testing

```bash
cd d:/OS_PROJECT
npm test
```

## OS / C integration note

The native C implementation remains in the project as the OS-level reference, while the web app runs as the front-end alarm interface. The browser does not execute Linux system calls like fork(), mmap(), or pthreads directly; those concepts are documented through the System Monitor panel and the C source file.
