# ESP32 Local Web Server Design Guide: DoseFlow

This guide explains how to build the DoseFlow captive portal directly on the ESP32 while respecting its strict memory limitations.

## Design Philosophy

The ESP32 has limited RAM (~520KB). Serving a modern, beautiful web interface requires extreme optimization.
- **No external CSS/JS frameworks:** Do not use Bootstrap, Tailwind, or React. Everything must be Vanilla HTML/CSS/JS.
- **Single File Structure:** Embed all CSS and JS inside `index.html`.
- **Gzip Compression:** Compress the HTML file and serve it directly from PROGMEM (or LittleFS) with the `Content-Encoding: gzip` HTTP header.
- **Use Emojis instead of SVGs/Images:** Emojis are rendered by the OS and take only 4 bytes of memory. (e.g., 💊 instead of a logo).

## UI Requirements

### 1. Typography
Use system fonts to prevent downloading large font files over the ESP32's slow WiFi interface.
```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
```

### 2. Color Palette (Dark Theme)
Use these exact CSS variables to match the DoseFlow cloud dashboard.

```css
:root {
  --bg-dark: #0f111a;
  --bg-card: rgba(25, 28, 41, 0.7);
  --border-color: rgba(255, 255, 255, 0.1);
  --text-main: #f0f2f5;
  --text-muted: #8b949e;
  --accent-blue: #3b82f6;
  --accent-hover: #2563eb;
}
```

### 3. Glassmorphism CSS Snippet
To achieve the premium DoseFlow look on the ESP32 config cards, use this lightweight CSS class for the setup container:

```css
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); /* For iOS captive portals */
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
```

## Recommended C++ Architecture (`ESPAsyncWebServer`)

Do not use the standard `WebServer.h` library, as it is blocking and can cause the ESP32 to drop client requests. Use `ESPAsyncWebServer`.

### Serving the Interface
Store your HTML as a minified string or a byte array.

```cpp
#include <ESPAsyncWebServer.h>

AsyncWebServer server(80);

const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Insert CSS Variables & Glassmorphism here */
  </style>
</head>
<body style="background: #0f111a; color: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh;">
  <div class="glass-card">
    <div style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">💊 DoseFlow Setup</div>
    <form action="/save" method="POST">
      <input type="text" name="ssid" placeholder="WiFi SSID" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 6px;">
      <input type="password" name="password" placeholder="WiFi Password" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 6px;">
      
      <!-- Optional: Emergency Offline Configs -->
      <label style="color: #8b949e;">Snooze Timer (min)</label>
      <input type="number" name="snooze" value="10" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 6px;">
      
      <button type="submit" style="background: #3b82f6; color: white; width: 100%; padding: 12px; border: none; border-radius: 6px;">Save Settings</button>
    </form>
  </div>
</body>
</html>
)rawliteral";

void setupServer() {
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send_P(200, "text/html", index_html);
  });
  
  server.on("/save", HTTP_POST, [](AsyncWebServerRequest *request){
    // Handle saving credentials to EEPROM/LittleFS here
    request->send(200, "text/plain", "Saved! Rebooting ESP32...");
  });

  server.begin();
}
```

### Fallback Variables
Ensure the ESP32 code provides fallbacks for the new settings if the server isn't reachable:
- `int snoozeTimerMinutes = 10;`
- `int scheduleWindowMinutes = 30;`
- `int lidWarningMinutes = 35;`
