# Website Build Prompt — Smart Medication Adherence Box Dashboard

Paste the section below directly into Antigravity (or any AI coding tool) as the build spec.

---

## Project Summary

Build a web application for a "Smart Medication Adherence Box" IoT device. The
device (an ESP32) will call this backend's REST API to fetch the medicine
schedule and to upload event logs. The frontend is a dashboard where a
logged-in user can view logs, set the medicine schedule, manage WiFi settings
for their device, and manage their profile.

## Tech Stack

- Backend: Node.js + Express
- Database: MongoDB (Mongoose ODM)
- Frontend: Plain JavaScript (or React if preferred) + server-rendered or SPA,
  responsive/mobile-friendly
- Auth: Simple username/password login with sessions or JWT (either is fine)
- Notifications: Browser push notifications (ask for permission) or in-app
  notification banner when new log events arrive

## Data Models

Use the following schema exactly (already finalized — do not redesign it):

### User (`users`)
```js
{
  _id: ObjectId,
  username: String,        // unique, required
  passwordHash: String,    // bcrypt hash, required
  role: String,            // enum: "admin" | "caregiver" | "user"
  deviceId: ObjectId,      // ref -> devices._id
  createdAt: Date,
  lastLoginAt: Date
}
```
No self-registration endpoint. Accounts are created via a seed script only
("hardcoded" users) — do not build a public sign-up page.

### Device (`devices`)
```js
{
  _id: ObjectId,
  deviceName: String,
  deviceApiKey: String,       // fixed key the ESP32 sends on every API call
  wifi: {
    ssid: String,
    password: String,         // encrypt at rest if possible, it's a real WiFi credential
    lastUpdated: Date
  },
  snoozeTimerMinutes: Number,  // e.g. default 10
  status: {
    online: Boolean,
    lastSeenAt: Date,
    lastKnownIp: String
  },
  createdAt: Date
}
```

### Schedule (`schedules`)
```js
{
  _id: ObjectId,
  deviceId: ObjectId,
  slotName: String,        // "Morning" | "Noon" | "Night" | custom
  slotOrder: Number,        // 0, 1, 2 for defaults; higher for custom
  timeStart: String,        // "HH:MM"
  timeEnd: String,          // "HH:MM", optional acceptance-window end
  isDefault: Boolean,       // true for the original Morning/Noon/Night
  active: Boolean,
  createdAt: Date,
  lastUpdated: Date         // ESP32 uses this to decide whether to re-sync
}
```
Every device gets 3 default schedule documents auto-created on device
creation (Morning/Noon/Night, `isDefault: true`). The user can add more
(`isDefault: false`, any name) and must set/edit `timeStart` for each.

### Medicine (`medicines`)
```js
{
  _id: ObjectId,
  deviceId: ObjectId,
  name: String,              // e.g. "Tab. Paracetamol"
  dosePattern: [
    { scheduleId: ObjectId, quantity: Number }  // one entry per schedule slot
  ],
  active: Boolean,
  createdAt: Date,
  lastUpdated: Date
}
```
The UI must render this as **3 (or more) blank quantity boxes with "+"
between them**, one per schedule slot in `slotOrder`, exactly like a doctor's
prescription notation — e.g. entering `1`, `1`, `0` for Morning/Noon/Night
displays as `Tab. Paracetamol (1+1+0)`. Always store all 3 default-slot
entries (including `quantity: 0`) so the UI always shows all 3 boxes
consistently, even when a dose is skipped at a slot.

### Log (`logs`)
```js
{
  _id: ObjectId,
  deviceId: ObjectId,
  scheduleId: ObjectId,      // null if not tied to a specific dose (e.g. unscheduled_access)
  medicineId: ObjectId,      // optional, null if not applicable
  eventType: String,         // see enum below
  timestamp: Date,           // device-reported time
  receivedAt: Date,          // server-received time
  sequenceId: Number,        // device-assigned, used to reject duplicate uploads
  note: String                // optional free text
}
```
`eventType` enum: `reminder_due`, `snoozed`, `lid_opened`, `lid_closed`,
`user_confirmed`, `missed`, `unscheduled_access`, `sensor_disagreement`,
`lid_left_open_warning`.

Create a **unique compound index** on `(deviceId, sequenceId)` in `logs` to
reject duplicate uploads, and an index on `(deviceId, timestamp)` for fast
weekly-range queries.

## REST API Endpoints (for the ESP32 device — no login required, use a device API key instead)

- `GET /api/device/:deviceId/schedules` — returns active schedule slots
  (Morning/Noon/Night + any custom ones) with `timeStart`/`timeEnd`, plus
  `lastUpdated`. ESP32 only re-downloads if this is newer than what it has
  cached in flash.
- `GET /api/device/:deviceId/medicines` — returns active medicines with their
  `dosePattern` (quantity per scheduleId), plus `lastUpdated`.
- `POST /api/device/:deviceId/logs` — body:
  `{ eventType, timestamp, sequenceId, scheduleId?, medicineId?, note? }`.
  Reject/ignore duplicate `sequenceId` for the same device.
- `GET /api/device/:deviceId/status` — optional: lets ESP32 report itself as
  online/last-seen, so the website can show device connectivity.

Authenticate all device requests with a `deviceApiKey` header (one fixed key
per device) — never use the user's login credentials for device-to-server
calls.

## REST/Frontend Endpoints (for the logged-in user)

- `POST /api/auth/login`, `POST /api/auth/logout` — no register endpoint;
  accounts are seeded, not self-created
- `GET /api/logs?range=week` — default view is **current week**, allow a
  custom date range too; include `scheduleId`/`medicineId` populated with
  names so the UI doesn't have to do a second lookup
- `GET /api/schedules` — list schedule slots for the user's device
- `POST /api/schedules` — add a new custom schedule slot (name + time)
- `PUT /api/schedules/:id` / `DELETE /api/schedules/:id` — edit/remove
  (block deleting the 3 default slots, only allow disabling via `active`)
- `GET /api/medicines` — list medicines with their dose pattern
- `POST /api/medicines` — create a medicine with `name` + quantity per
  schedule slot (the "1+1+0" style form)
- `PUT /api/medicines/:id` / `DELETE /api/medicines/:id` — edit/remove
- `GET /api/device/wifi` / `PUT /api/device/wifi` — view/set the device's WiFi
  SSID + password (stored in `devices.wifi`); this is the authoritative
  source the ESP32 pulls from, in addition to being settable via the
  device's own AP-mode captive portal
- `GET /api/device/snooze` / `PUT /api/device/snooze` — view/set
  `snoozeTimerMinutes`
- `GET /api/profile` / `PUT /api/profile` — view/edit user profile info

## Pages / UI

Use a simple sidebar or top-nav with 4 sections:

1. **Schedule** — two parts on this page:
   - A small table/list of schedule slots (Morning/Noon/Night by default,
     shown with `slotOrder`), each with an editable time field
     (`timeStart`, optional `timeEnd`). The 3 defaults cannot be deleted,
     only their time edited or `active` toggled. An "Add schedule" button
     lets the user create additional custom slots.
   - A medicines list, where each medicine is added/edited via a form
     showing the medicine **name** field plus **one small number box per
     schedule slot with a "+" between them**, exactly like a doctor's
     prescription — e.g. `[1] + [1] + [0]` for Morning/Noon/Night, which
     saves as that medicine's `dosePattern`. Display existing medicines the
     same way, e.g. "Tab. Paracetamol (1+1+0)".
2. **Logs** — table of events with timestamp, event type (with a friendly
   label, e.g. "Lid opened" / "Dose confirmed" / "Missed dose" instead of
   raw enum text), and the related medicine/schedule name when present.
   Defaults to the current week, with a date-range filter. Highlight
   `missed`, `unscheduled_access`, and `sensor_disagreement` events visually
   (e.g. red/orange badge) since those need attention.
3. **WiFi** — form to view/edit the device's SSID and password (writes to
   `devices.wifi`), plus a snooze-timer field (`snoozeTimerMinutes`). Mask
   the password field like a normal password input. Note in the UI that
   WiFi can also be set directly on the device via its own AP-mode setup
   page — this is just a remote/backup way to update it.
4. **Profile** — basic user info, change password, and a toggle for
   "Enable browser notifications" that requests notification permission and
   stores the preference.

## Notifications

- On login (or via a settings toggle), ask the browser for notification
  permission.
- When a new `missed` or `unscheduled_access` log event arrives (poll the
  logs endpoint every 15-30 seconds, or use a simple WebSocket/SSE if you
  want it real-time), show a browser notification and/or an in-app toast.
- Do not notify for routine events like `lid_opened`/`user_confirmed` — only
  ones that need attention (`missed`, `unscheduled_access`,
  `sensor_disagreement`), to avoid notification fatigue.

## Important constraints to respect

- This system logs **lid access and button acknowledgement only** — it does
  **not** and must **never claim** to verify that medicine was actually
  swallowed. Keep this honest in the UI copy (e.g. label events as "Dose
  confirmed by user" not "Medicine taken").
- Keep the device-facing API extremely simple (plain REST/JSON) — the ESP32
  has limited memory and does not support anything more complex like
  GraphQL or WebSockets reliably.
- Handle duplicate log uploads gracefully (via `sequenceId`) since the device
  may retry sends after a reconnect.
- Default log view must be the **current week** as specified, with an option
  to view other ranges.

## Deliverables expected

- Express server with the routes above, connected to MongoDB.
- A working login flow and the 4-page dashboard described.
- Seed script or simple admin flow to create the first device + user + API
  key for testing.
- Basic input validation on schedule times (reject invalid/duplicate times
  for the same device, mirroring the same rule already enforced on the
  device side).
