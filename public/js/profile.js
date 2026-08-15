window.loadProfile = async () => {
  try {
    const user = await window.apiFetch('/device/profile');
    if (user) {
      document.getElementById('profile-username').innerText = user.username;
    }
  } catch (error) {
    console.error(error);
  }
};

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('new-password').value;
  
  try {
    await window.apiFetch('/device/profile', {
      method: 'PUT',
      body: { password }
    });
    window.showToast('Password updated');
    document.getElementById('new-password').value = '';
  } catch (err) {}
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  try {
    await window.apiFetch('/auth/logout', { method: 'POST' });
    window.location.href = '/';
  } catch (err) {
    // Force redirect on error
    window.location.href = '/';
  }
});

// Notifications
document.getElementById('enable-notifications-btn')?.addEventListener('click', () => {
  if (!('Notification' in window)) {
    window.showToast('This browser does not support desktop notification', 'error');
    return;
  }
  
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      window.showToast('Notifications enabled successfully');
    } else {
      window.showToast('Notifications permission denied', 'warning');
    }
  });
});
