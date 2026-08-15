document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = loginForm.querySelector('button');

    try {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Logging in...';
      errorDiv.style.display = 'none';

      const response = await window.apiFetch('/auth/login', {
        method: 'POST',
        body: { username, password }
      });

      if (response && response.success) {
        window.location.href = '/dashboard.html';
      }
    } catch (error) {
      errorDiv.innerText = error.message;
      errorDiv.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Login';
    }
  });
});
