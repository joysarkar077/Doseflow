window.loadWifiSettings = async () => {
  try {
    const wifiData = await window.apiFetch('/device/wifi');
    if (wifiData) {
      document.getElementById('wifi-ssid').value = wifiData.ssid || '';
      document.getElementById('wifi-password').value = '';
    }
    
    const snoozeData = await window.apiFetch('/device/snooze');
    if (snoozeData) {
      document.getElementById('snooze-timer').value = snoozeData.snoozeTimerMinutes || 10;
    }
  } catch (error) {
    console.error(error);
  }
};

document.getElementById('wifi-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ssid = document.getElementById('wifi-ssid').value;
  const password = document.getElementById('wifi-password').value;
  
  try {
    await window.apiFetch('/device/wifi', {
      method: 'PUT',
      body: { ssid, password }
    });
    window.showToast('WiFi settings updated');
    document.getElementById('wifi-password').value = ''; // clear password field
  } catch (err) {}
});

document.getElementById('snooze-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const snoozeTimerMinutes = document.getElementById('snooze-timer').value;
  
  try {
    await window.apiFetch('/device/snooze', {
      method: 'PUT',
      body: { snoozeTimerMinutes: parseInt(snoozeTimerMinutes) }
    });
    window.showToast('Snooze timer updated');
  } catch (err) {}
});
