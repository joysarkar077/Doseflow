window.loadLogs = async () => {
  const range = document.getElementById('log-range-filter')?.value || 'week';
  try {
    const logs = await window.apiFetch(`/logs?range=${range}`);
    renderLogs(logs);
  } catch (error) {
    console.error(error);
  }
};

document.getElementById('log-range-filter')?.addEventListener('change', () => {
  window.loadLogs();
});

const renderLogs = (logs) => {
  const tbody = document.querySelector('#logs-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align: center;">No logs found for this period.</td></tr>';
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement('tr');
    
    // Format timestamp
    const date = new Date(log.timestamp);
    const timeStr = date.toLocaleString();
    
    // Human readable event labels & colors
    let label = log.eventType;
    let badgeClass = 'badge-neutral';
    
    switch(log.eventType) {
      case 'reminder_due':
        label = 'Reminder Due';
        badgeClass = 'badge-neutral';
        break;
      case 'snoozed':
        label = 'Snoozed';
        badgeClass = 'badge-warning';
        break;
      case 'lid_opened':
        label = 'Lid Opened';
        badgeClass = 'badge-neutral';
        break;
      case 'lid_closed':
        label = 'Lid Closed';
        badgeClass = 'badge-neutral';
        break;
      case 'user_confirmed':
        label = 'Dose confirmed by user';
        badgeClass = 'badge-success';
        break;
      case 'missed':
        label = 'Missed Dose';
        badgeClass = 'badge-danger';
        break;
      case 'unscheduled_access':
        label = 'Unscheduled Access';
        badgeClass = 'badge-danger';
        break;
      case 'sensor_disagreement':
        label = 'Sensor Disagreement';
        badgeClass = 'badge-warning';
        break;
      case 'lid_left_open_warning':
        label = 'Lid Left Open';
        badgeClass = 'badge-warning';
        break;
      case 'settings_updated':
        label = 'Settings Updated';
        badgeClass = 'badge-info';
        break;
    }
    
    // Details string
    let details = '';
    if (log.medicineId && log.medicineId.name) details += log.medicineId.name;
    if (log.scheduleId && log.scheduleId.slotName) details += (details ? ' - ' : '') + log.scheduleId.slotName;
    if (log.note) details += (details ? ' | ' : '') + log.note;
    
    tr.innerHTML = `
      <td>${timeStr}</td>
      <td><span class="badge ${badgeClass}">${label}</span></td>
      <td>${details}</td>
    `;
    tbody.appendChild(tr);
  });
};
