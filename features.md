# DoseFlow: Smart Medicine Adherence Box Features

DoseFlow is a comprehensive system designed to track and encourage medication adherence through a smart physical medicine box paired with a web dashboard. Here is a breakdown of its core features based on the application's implementation:

## 📅 Schedule & Medication Management
- **Customizable Time Slots:** Define specific times of day (e.g., Morning, Afternoon, Evening) for taking medications.
- **Medicine Tracking:** Add and manage different medicines, including the specific quantity/dose to be taken during each scheduled slot (Dose Patterns).
- **Next Schedule Banner:** Real-time visibility of the upcoming scheduled dose directly on the dashboard.
- **Active/Inactive Toggling:** Easily pause or activate specific schedules or medicines without deleting them.

## 📋 Comprehensive Event Logging
The system maintains a detailed history of all interactions with the smart box to ensure accurate adherence tracking and security:
- **Routine Events:** Tracks when reminders are due, when users confirm taking their medication, and when doses are missed.
- **Physical Interactions:** Logs exact timestamps for when the box lid is opened and closed.
- **Anomalies & Security:** Records unscheduled access attempts, sensor disagreements, and issues a "lid left open" warning if the box isn't closed promptly.
- **User Actions:** Logs when a user hits "snooze" on a reminder or updates the device settings.
- **Filtering:** Filter event logs by "Current Week" or "All Time" to easily review adherence history.

## ⚙️ Device Configuration & Connectivity
Users can remotely configure the behavior of the physical smart box through the dashboard:
- **WiFi Management:** Securely update the WiFi SSID and password for the physical box directly from the web interface.
- **Snooze Timer:** Configure how long the box waits before sounding the reminder again after being snoozed (e.g., 10 minutes).
- **Schedule Window:** Define the acceptable time buffer around a schedule (e.g., 30 minutes) during which opening the box counts as taking that specific dose.
- **Lid Warning Timer:** Set a threshold (e.g., 35 minutes) for how long the lid can remain open before triggering an alert.
- **Status Monitoring:** Real-time indicator showing if the device is currently online and when it was last seen on the network.

## 👤 User Profile & Security
- **Authentication:** Secure login and user profile management, backed by JWT and encrypted passwords.
- **Notification System:** Opt-in to receive alerts when doses are missed or if the box is opened unexpectedly, adding an extra layer of safety.
