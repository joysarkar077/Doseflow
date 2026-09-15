# DoseFlow: Smart Medicine Adherence Box

DoseFlow is a comprehensive IoT system designed to track and encourage medication adherence through a smart physical medicine box paired with a web dashboard.

## 🎥 Demonstration Video
[Watch the Demonstration Video](https://www.choto.cc/CSE360Demo)

## 📁 Project Documents & Source Code
The following files are available in the `public/assets/` directory:
- [CSE360 Project Report (PDF)](public/assets/CSE360%20Project%20Report.pdf)
- [ESP32 Source Code](public/assets/CSE360%20Project%20-%20Smart%20Medicine%20Box%20-%20ESP32%20Code.txt)
- [Arduino Source Code](public/assets/CSE360%20Project%20-%20Smart%20Medicine%20Box%20-%20Arduino%20Code.txt)

## ✨ Core Features

### 📅 Schedule & Medication Management
- **Customizable Time Slots:** Define specific times of day (e.g., Morning, Afternoon, Evening) for taking medications.
- **Medicine Tracking:** Add and manage different medicines, including the specific quantity/dose to be taken during each scheduled slot (Dose Patterns like 1+1+0).
- **Next Schedule Banner:** Real-time visibility of the upcoming scheduled dose directly on the dashboard.
- **Active/Inactive Toggling:** Easily pause or activate specific schedules or medicines without deleting them.

### 📋 Comprehensive Event Logging
Maintains a detailed history of all interactions with the smart box to ensure accurate adherence tracking and security:
- **Routine Events:** Tracks when reminders are due, when users confirm taking their medication, and when doses are missed.
- **Physical Interactions:** Logs exact timestamps for when the box lid is opened and closed.
- **Anomalies & Security:** Records unscheduled access attempts, sensor disagreements, and issues a "lid left open" warning if the box isn't closed promptly.
- **User Actions:** Logs when a user hits "snooze" on a reminder or updates the device settings.
- **Filtering:** Filter event logs by "Current Week" or "All Time" to easily review adherence history.

### ⚙️ Device Configuration & Connectivity
Users can remotely configure the behavior of the physical smart box through the dashboard:
- **WiFi Management:** Securely update the WiFi SSID and password for the physical box directly from the web interface or via the device's own Captive Portal.
- **Snooze Timer:** Configure how long the box waits before sounding the reminder again after being snoozed (e.g., 10 minutes).
- **Schedule Window:** Define the acceptable time buffer around a schedule (e.g., 30 minutes) during which opening the box counts as taking that specific dose.
- **Lid Warning Timer:** Set a threshold (e.g., 35 minutes) for how long the lid can remain open before triggering an alert.
- **Status Monitoring:** Real-time indicator showing if the device is currently online and when it was last seen on the network.

### 👤 User Profile & Security
- **Authentication:** Secure login and user profile management, backed by JWT/Sessions and encrypted passwords.
- **Notification System:** Opt-in to receive browser alerts when doses are missed or if the box is opened unexpectedly.

## 🛠️ Technology Stack
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose ODM)
- **Frontend:** Plain JavaScript, responsive HTML/CSS using Glassmorphism design aesthetics.
- **Hardware/IoT:** ESP32 with C++ (`ESPAsyncWebServer`) and Arduino for sensors/actuators.

## 🗄️ Database Schema Overview
The MongoDB database uses the following collections to organize data:
- **`users`**: Login-only accounts (Admin/User).
- **`devices`**: Physical box credentials, settings (WiFi, snooze timer), and online status.
- **`schedules`**: Time slots for doses (Morning/Noon/Night).
- **`medicines`**: Medicine names mapped to dose patterns across schedule slots.
- **`logs`**: Comprehensive event log recording state machine outcomes and sensor events.

## 🔌 ESP32 Captive Portal Design
The ESP32 hosts a built-in config portal for initial setup:
- **Single File Architecture:** Embeds all HTML, CSS, and JS inside a gzipped `index.html` string in PROGMEM to save RAM.
- **No External Frameworks:** Uses pure vanilla HTML/CSS to fit within the 520KB RAM limit.
- **Glassmorphism UI:** Adheres to the exact design language (Dark Theme, blur effects) as the main web dashboard using custom CSS variables.
- **Non-blocking Server:** Runs `ESPAsyncWebServer` to ensure stability and avoid dropping client requests.
