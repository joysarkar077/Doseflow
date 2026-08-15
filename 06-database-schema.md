# Database Schema — Smart Medication Adherence Box (MongoDB / Mongoose)

## Overview of collections

| Collection | Purpose |
|---|---|
| `users` | Hardcoded login-only accounts, with role |
| `devices` | One per physical box — WiFi credentials, snooze timer, API key |
| `schedules` | Time slots (Morning/Noon/Night by default, expandable) |
| `medicines` | Medicine name + dose pattern across schedule slots |
| `logs` | Event log (state machine outcomes, sensor events) |

Relationships: a `device` belongs to a `user`. A `device` has many `schedules`
(default 3, user can add more). A `medicine` references dose quantities per
`schedule` slot (not the other way around) — this matches the "Tab.
Paracetamol (1+1+0)" prescription-style input you described. `logs` reference
`device`, and optionally `schedule`/`medicine` when relevant.

---

## 1. `users`

Login-only, no self-registration — accounts are seeded/hardcoded.

```js
{
  _id: ObjectId,
  username: String,        // unique, required
  passwordHash: String,    // bcrypt hash, required
  role: String,            // enum: "admin" | "caregiver" | "user"
  deviceId: ObjectId,      // ref -> devices._id (which box this user manages)
  createdAt: Date,
  lastLoginAt: Date
}
```

- No `register` endpoint exposed. A seed script creates the initial account(s)
  directly in MongoDB (e.g. `node seed.js`), matching "user will be created
  hardcoded."
- `role` controls what the UI/API allows — e.g. `admin` could manage multiple
  devices/users later, `user`/`caregiver` limited to their own device.

---

## 2. `devices`

One document per physical ESP32 box.

```js
{
  _id: ObjectId,
  deviceName: String,        // e.g. "Grandma's Medicine Box"
  deviceApiKey: String,      // fixed key the ESP32 sends on every API call
  wifi: {
    ssid: String,
    password: String,        // see security note below
    lastUpdated: Date
  },
  snoozeTimerMinutes: Number, // e.g. default 10 - how long a single snooze delays the reminder
  status: {
    online: Boolean,
    lastSeenAt: Date,
    lastKnownIp: String
  },
  createdAt: Date
}
```

**Security note on `wifi.password`:** don't store it as plain readable text in
the database long-term if you can avoid it — at minimum, encrypt it at rest
(e.g. AES with a server-side secret key, decrypt only when the ESP32 requests
it via its authenticated `deviceApiKey`). For a course project, plaintext is
common enough, but it's worth flagging explicitly since it's a real WiFi
password, not just app data.

---

## 3. `schedules`

Represents a time slot (Morning/Noon/Night by default). Created automatically
(3 defaults) per device, and the user can add more.

```js
{
  _id: ObjectId,
  deviceId: ObjectId,     // ref -> devices._id
  slotName: String,       // e.g. "Morning", "Noon", "Night", or custom e.g. "Bedtime"
  slotOrder: Number,      // 0 = Morning, 1 = Noon, 2 = Night, 3+ = custom, for consistent ordering
  timeStart: String,      // "HH:MM" - when the reminder should fire / window opens
  timeEnd: String,        // "HH:MM" - optional, if you want a window instead of one fixed instant
  isDefault: Boolean,     // true for the original Morning/Noon/Night, false for user-added ones
  active: Boolean,
  createdAt: Date,
  lastUpdated: Date        // ESP32 uses this to know when to re-sync
}
```

- On device creation, auto-insert 3 documents: `Morning` (order 0), `Noon`
  (order 1), `Night` (order 2), each `isDefault: true`, with a sensible
  default `timeStart` the user then edits (e.g. 08:00 / 14:00 / 20:00).
- "User has to set time range for the schedule" → this is `timeStart` (and
  optionally `timeEnd` if you want an acceptance window rather than one exact
  moment — recommended, since your Arduino logic already uses a 30-minute
  confirmation window per dose).
- Additional schedules the user creates get `isDefault: false`, any `slotName`
  they want, and the next available `slotOrder`.

---

## 4. `medicines`

Represents one prescribed medicine and its dose pattern across schedule slots
— this is the "Tab. Paracetamol (1+1+0)" structure.

```js
{
  _id: ObjectId,
  deviceId: ObjectId,       // ref -> devices._id
  name: String,             // e.g. "Tab. Paracetamol"
  dosePattern: [
    {
      scheduleId: ObjectId, // ref -> schedules._id
      quantity: Number      // e.g. 1, 0, 2 - how many units at this slot
    }
    // one entry per schedule slot the medicine applies to
  ],
  active: Boolean,
  createdAt: Date,
  lastUpdated: Date
}
```

- The UI's "3 blank boxes with 2 plus signs" (`1 + 1 + 0`) maps directly to
  three `dosePattern` entries, one per default schedule slot, each holding a
  quantity (0 means "not taken at this slot" — still store the 0 entry so the
  UI can render all 3 boxes consistently, rather than omitting it).
- If the user later adds a 4th custom schedule slot (e.g. "Bedtime"), any
  medicine can optionally get a 4th `dosePattern` entry for it — the array
  structure supports this without a schema change.
- At the time a schedule slot fires, the Arduino/ESP32 side asks "which
  medicines have `quantity > 0` for this `scheduleId`?" and shows those on
  the OLED (name + quantity) for that reminder.

---

## 5. `logs`

Event log — matches the state machine and honest event names from earlier.

```js
{
  _id: ObjectId,
  deviceId: ObjectId,        // ref -> devices._id
  scheduleId: ObjectId,      // ref -> schedules._id, null for events not tied to a specific dose (e.g. unscheduled_access)
  medicineId: ObjectId,      // ref -> medicines._id, optional, null if not applicable
  eventType: String,         // enum, see table below
  timestamp: Date,           // device-reported time (from DS3231)
  receivedAt: Date,          // server time when the log arrived (for clock-drift debugging)
  sequenceId: Number,        // device-assigned, used to reject duplicate uploads
  note: String               // optional free text, e.g. sensor disagreement details
}
```

- Index on `(deviceId, sequenceId)` as unique, so a retried upload after
  reconnect can't create a duplicate row.
- Index on `(deviceId, timestamp)` for fast weekly-range queries on the logs
  page.

### `eventType` state definitions and trigger rules

| eventType | Meaning | Trigger rule |
|---|---|---|
| `reminder_due` | A schedule slot's time has arrived | RTC time matches a `schedule.timeStart` for an active medicine with quantity > 0 |
| `snoozed` | User pressed snooze once | Only accepted while state = `due`; only one allowed per dose window; ignored if already snoozed once |
| `lid_opened` | Box lid opened | Primary signal (reed/microswitch) transitions closed → open |
| `lid_closed` | Box lid closed | Primary signal transitions open → closed |
| `user_confirmed` | Touch sensor pressed to acknowledge dose | Only accepted within the active confirmation window (e.g. 30 min from `reminder_due`), after lid has been opened and closed again |
| `missed` | Dose window ended with no confirmation | Confirmation window (and snooze/grace period, if used) expired with no `user_confirmed` received |
| `unscheduled_access` | Lid opened outside any active dose window | `lid_opened` fires while state = `waiting` (no dose currently due) |
| `sensor_disagreement` | Supporting sensor (ToF) disagrees with primary lid signal | ToF reading contradicts the reed switch's reported open/closed state |
| `lid_left_open_warning` | Lid open too long | Lid has been open continuously for more than 15 minutes |

Each `reminder_due` → exactly **one** terminal outcome per dose:
`user_confirmed` **or** `missed` — never both, and never left open-ended
(matches the "every scheduled dose must finish with one outcome only" rule).

---

## Suggested indexes

```js
db.logs.createIndex({ deviceId: 1, sequenceId: 1 }, { unique: true });
db.logs.createIndex({ deviceId: 1, timestamp: -1 });
db.schedules.createIndex({ deviceId: 1, slotOrder: 1 });
db.medicines.createIndex({ deviceId: 1, active: 1 });
db.users.createIndex({ username: 1 }, { unique: true });
```

## Seed data example (for the hardcoded user + default schedules)

```js
// seed.js (run once)
const device = await Device.create({
  deviceName: "Medicine Box #1",
  deviceApiKey: "generate-a-random-key-here",
  wifi: { ssid: "", password: "" },
  snoozeTimerMinutes: 10,
  status: { online: false }
});

await Schedule.insertMany([
  { deviceId: device._id, slotName: "Morning", slotOrder: 0, timeStart: "08:00", isDefault: true, active: true },
  { deviceId: device._id, slotName: "Noon",    slotOrder: 1, timeStart: "14:00", isDefault: true, active: true },
  { deviceId: device._id, slotName: "Night",   slotOrder: 2, timeStart: "20:00", isDefault: true, active: true }
]);

await User.create({
  username: "admin",
  passwordHash: await bcrypt.hash("changeme", 10),
  role: "admin",
  deviceId: device._id
});
```
