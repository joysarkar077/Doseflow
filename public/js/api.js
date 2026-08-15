// Utility to show toasts
window.showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// API Fetch Wrapper
window.apiFetch = async (endpoint, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  if (options.body) {
    finalOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`/api${endpoint}`, finalOptions);
    
    // Auto redirect to login on 401
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      window.location.href = '/';
      return null;
    }
    
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // empty response body
    }

    if (!response.ok) {
      throw new Error((data && data.message) || (data && data.errors && data.errors[0].msg) || 'API Error');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    window.showToast(error.message, 'error');
    throw error;
  }
};
