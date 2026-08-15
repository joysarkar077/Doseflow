let lastCheckedAt = new Date().toISOString();

const pollLogs = async () => {
  try {
    // Only fetch logs that arrived since last check
    // In a real app we'd pass lastCheckedAt to the server, but for simplicity here we just get the week
    // and filter client-side based on receivedAt.
    const logs = await window.apiFetch('/logs?range=week');
    
    if (logs && logs.length > 0) {
      const newLogs = logs.filter(log => new Date(log.receivedAt) > new Date(lastCheckedAt));
      
      newLogs.forEach(log => {
        // Only notify for critical events
        if (['missed', 'unscheduled_access', 'sensor_disagreement'].includes(log.eventType)) {
          let title = 'DoseFlow Alert';
          let body = 'A critical event occurred.';
          
          if (log.eventType === 'missed') {
            title = 'Missed Dose';
            body = `Dose missed${log.medicineId ? ' for ' + log.medicineId.name : ''}`;
          } else if (log.eventType === 'unscheduled_access') {
            title = 'Unscheduled Access';
            body = 'Medicine box was opened outside scheduled time';
          }
          
          // Browser Notification
          if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
          }
          
          // In-app Toast
          window.showToast(`${title}: ${body}`, 'error');
          
          // If on logs page, refresh it
          if (document.getElementById('logs').classList.contains('active')) {
            window.loadLogs();
          }
        }
      });
      
      if (newLogs.length > 0) {
        lastCheckedAt = new Date().toISOString();
      }
    }
  } catch (e) {
    // ignore poll errors
  }
};

// Start polling every 20 seconds only if user is on dashboard (apiFetch will fail if no cookie, handled internally)
if (window.location.pathname.includes('dashboard')) {
  setInterval(pollLogs, 20000);
}
