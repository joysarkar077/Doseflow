let currentSchedules = [];

window.loadSchedules = async () => {
  try {
    const schedules = await window.apiFetch('/schedules');
    currentSchedules = schedules;
    renderSchedules(schedules);
    updateNextScheduleBanner(schedules);
    updateDeviceStatus();
    
    const medicines = await window.apiFetch('/medicines');
    renderMedicines(medicines, schedules);
  } catch (error) {
    console.error(error);
  }
};

const updateDeviceStatus = async () => {
  try {
    const status = await window.apiFetch('/device/status');
    const statusEl = document.getElementById('device-online-status');
    const lastSeenEl = document.getElementById('device-last-seen');
    
    if (statusEl && lastSeenEl) {
      if (status.online) {
        statusEl.innerHTML = '🟢 Online';
        if (status.lastSeenAt) {
          const diff = Math.floor((new Date() - new Date(status.lastSeenAt)) / 60000);
          lastSeenEl.innerText = `Last seen: ${diff > 0 ? diff + ' mins ago' : 'Just now'}`;
        }
      } else {
        statusEl.innerHTML = '🔴 Offline';
        lastSeenEl.innerText = '';
      }
    }
  } catch (err) {}
};

const updateNextScheduleBanner = (schedules) => {
  const banner = document.getElementById('next-schedule-banner');
  const textEl = document.getElementById('next-schedule-text');
  if (!banner || !textEl) return;

  const activeSchedules = schedules.filter(s => s.active);
  if (activeSchedules.length === 0) {
    banner.style.display = 'none';
    return;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let nextSchedule = null;
  let minDiff = Infinity;

  // First check schedules later today
  for (const sch of activeSchedules) {
    const [hours, mins] = sch.timeStart.split(':').map(Number);
    const schMinutes = hours * 60 + mins;
    
    if (schMinutes > currentMinutes) {
      const diff = schMinutes - currentMinutes;
      if (diff < minDiff) {
        minDiff = diff;
        nextSchedule = sch;
      }
    }
  }

  // If no schedules later today, the next one is the earliest schedule tomorrow
  if (!nextSchedule) {
    let earliestMinutes = Infinity;
    for (const sch of activeSchedules) {
      const [hours, mins] = sch.timeStart.split(':').map(Number);
      const schMinutes = hours * 60 + mins;
      if (schMinutes < earliestMinutes) {
        earliestMinutes = schMinutes;
        nextSchedule = sch;
      }
    }
    if (nextSchedule) {
      textEl.innerText = `${nextSchedule.slotName} at ${nextSchedule.timeStart} (Tomorrow)`;
    }
  } else {
    textEl.innerText = `${nextSchedule.slotName} at ${nextSchedule.timeStart} (Today)`;
  }

  if (nextSchedule) {
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
};

const renderSchedules = (schedules) => {
  const tbody = document.querySelector('#schedules-table tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  schedules.forEach(schedule => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${schedule.slotName} ${schedule.isDefault ? '<span class="badge badge-neutral">Default</span>' : ''}</td>
      <td>${schedule.timeStart}</td>
      <td>
        <input type="checkbox" ${schedule.active ? 'checked' : ''} 
               onchange="toggleScheduleActive('${schedule._id}', this.checked)">
      </td>
      <td style="text-align: center; font-size: 1.2rem;" title="${schedule.isAcknowledgedByDevice ? 'Synced to Device' : 'Pending Sync'}">
        ${schedule.isAcknowledgedByDevice ? '✅' : '⏳'}
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editSchedule('${schedule._id}')">Edit</button>
        ${!schedule.isDefault ? `<button class="btn btn-danger btn-sm" onclick="deleteSchedule('${schedule._id}')">Delete</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
};

const renderMedicines = (medicines, schedules) => {
  const list = document.getElementById('medicines-list');
  if(!list) return;
  list.innerHTML = '';
  
  if (medicines.length === 0) {
    list.innerHTML = '<p class="text-muted">No medicines added yet.</p>';
    return;
  }

  medicines.forEach(med => {
    // Build dose pattern string e.g. "1+1+0"
    // We order by the global schedules slotOrder to keep it consistent
    let patternStr = [];
    schedules.forEach(sch => {
      const dose = med.dosePattern.find(d => d.scheduleId && d.scheduleId._id === sch._id);
      patternStr.push(dose ? dose.quantity : 0);
    });
    
    const item = document.createElement('div');
    item.className = 'medicine-item';
    item.innerHTML = `
      <div>
        <div class="med-name">${med.name}</div>
        <div class="med-pattern">(${patternStr.join(' + ')})</div>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="editMedicine('${med._id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMedicine('${med._id}')">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
};

// Schedule Modals & Actions
document.getElementById('add-schedule-btn')?.addEventListener('click', () => {
  document.getElementById('sch-id').value = '';
  document.getElementById('sch-name').value = '';
  document.getElementById('sch-time').value = '';
  document.getElementById('sch-active').checked = true;
  document.getElementById('sch-name').disabled = false;
  document.getElementById('sch-modal-title').innerText = 'Add Schedule';
  document.getElementById('schedule-modal').style.display = 'flex';
});

window.editSchedule = (id) => {
  const schedule = currentSchedules.find(s => s._id === id);
  if (!schedule) return;
  
  document.getElementById('sch-id').value = schedule._id;
  document.getElementById('sch-name').value = schedule.slotName;
  document.getElementById('sch-time').value = schedule.timeStart;
  document.getElementById('sch-active').checked = schedule.active;
  document.getElementById('sch-name').disabled = schedule.isDefault;
  document.getElementById('sch-modal-title').innerText = 'Edit Schedule';
  document.getElementById('schedule-modal').style.display = 'flex';
};

document.getElementById('schedule-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('sch-id').value;
  const body = {
    slotName: document.getElementById('sch-name').value,
    timeStart: document.getElementById('sch-time').value,
    active: document.getElementById('sch-active').checked
  };
  
  try {
    if (id) {
      await window.apiFetch(`/schedules/${id}`, { method: 'PUT', body });
      window.showToast('Schedule updated');
    } else {
      await window.apiFetch(`/schedules`, { method: 'POST', body });
      window.showToast('Schedule added');
    }
    document.getElementById('schedule-modal').style.display = 'none';
    window.loadSchedules();
  } catch (err) {}
});

window.toggleScheduleActive = async (id, active) => {
  try {
    await window.apiFetch(`/schedules/${id}`, { method: 'PUT', body: { active } });
    window.showToast('Schedule updated');
  } catch (err) {
    window.loadSchedules(); // revert on fail
  }
};

window.deleteSchedule = async (id) => {
  if(!confirm('Are you sure you want to delete this schedule?')) return;
  try {
    await window.apiFetch(`/schedules/${id}`, { method: 'DELETE' });
    window.showToast('Schedule deleted');
    window.loadSchedules();
  } catch (err) {}
};

// Medicine Modals & Actions
let editMedicineData = null;

document.getElementById('add-medicine-btn')?.addEventListener('click', () => {
  editMedicineData = null;
  document.getElementById('med-id').value = '';
  document.getElementById('med-name').value = '';
  document.getElementById('med-modal-title').innerText = 'Add Medicine';
  
  buildDoseInputs(currentSchedules, []);
  document.getElementById('medicine-modal').style.display = 'flex';
});

window.editMedicine = async (id) => {
  try {
    const medicines = await window.apiFetch('/medicines');
    const med = medicines.find(m => m._id === id);
    if(!med) return;
    
    document.getElementById('med-id').value = med._id;
    document.getElementById('med-name').value = med.name;
    document.getElementById('med-modal-title').innerText = 'Edit Medicine';
    
    buildDoseInputs(currentSchedules, med.dosePattern);
    document.getElementById('medicine-modal').style.display = 'flex';
  } catch (err) {}
};

const buildDoseInputs = (schedules, existingDosePattern) => {
  const container = document.getElementById('dose-inputs-container');
  container.innerHTML = '';
  
  schedules.forEach((sch, index) => {
    const existing = existingDosePattern.find(d => d.scheduleId && d.scheduleId._id === sch._id);
    const quantity = existing ? existing.quantity : 0;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'dose-input-wrapper';
    wrapper.innerHTML = `
      <input type="checkbox" data-schedule-id="${sch._id}" ${quantity > 0 ? 'checked' : ''}>
      <span>${sch.slotName}</span>
    `;
    container.appendChild(wrapper);
    
    if (index < schedules.length - 1) {
      const plus = document.createElement('div');
      plus.className = 'dose-plus';
      plus.innerText = '+';
      container.appendChild(plus);
    }
  });
};

document.getElementById('medicine-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('med-id').value;
  const name = document.getElementById('med-name').value;
  
  const dosePattern = [];
  document.querySelectorAll('#dose-inputs-container input').forEach(input => {
    dosePattern.push({
      scheduleId: input.getAttribute('data-schedule-id'),
      quantity: input.checked ? 1 : 0
    });
  });
  
  try {
    if (id) {
      await window.apiFetch(`/medicines/${id}`, { method: 'PUT', body: { name, dosePattern } });
      window.showToast('Medicine updated');
    } else {
      await window.apiFetch(`/medicines`, { method: 'POST', body: { name, dosePattern } });
      window.showToast('Medicine added');
    }
    document.getElementById('medicine-modal').style.display = 'none';
    window.loadSchedules(); // reloads meds too
  } catch (err) {}
});

window.deleteMedicine = async (id) => {
  if(!confirm('Are you sure you want to delete this medicine?')) return;
  try {
    await window.apiFetch(`/medicines/${id}`, { method: 'DELETE' });
    window.showToast('Medicine deleted');
    window.loadSchedules();
  } catch (err) {}
};
