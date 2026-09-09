/* EcoTech login interactions - replace demo handlers with API calls when wiring a backend. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const showToast = (type, title, message) => {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `app-toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div><b>${title}</b><span>${message}</span></div>`;
    $('#toast-stack').append(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 350); }, 3000);
  };

  // Theme preference
  const savedTheme = localStorage.getItem('ecotech-theme');
  if (savedTheme === 'dark') document.body.classList.add('dark');
  const themeButton = $('.theme-toggle');
  const syncThemeIcon = () => themeButton.querySelector('i').className = document.body.classList.contains('dark') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  syncThemeIcon();
  themeButton.addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('ecotech-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); syncThemeIcon(); });

  // User role, including arrow-key navigation. The backend can later set this from the authenticated user session.
  let selectedRole = $('.role.active').dataset.role;
  $$('.role').forEach((role, index, roles) => {
    role.addEventListener('click', () => {
      roles.forEach(item => { item.classList.remove('active'); item.setAttribute('aria-checked', 'false'); });
      role.classList.add('active'); role.setAttribute('aria-checked', 'true');
      selectedRole = role.dataset.role;
      showToast('info', `${role.dataset.role} portal selected`, 'Your sign-in will open the correct workspace.');
    });
    role.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); roles[(index + (event.key === 'ArrowRight' ? 1 : roles.length - 1)) % roles.length].focus(); } });
  });

  // Method tabs
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.tab').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-selected', 'false'); });
    $$('.login-form').forEach(pane => { pane.hidden = true; pane.classList.remove('active'); });
    tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
    const pane = $(`#${tab.dataset.target}`); pane.hidden = false; requestAnimationFrame(() => pane.classList.add('active'));
  }));

  // Password visibility
  $('.password-toggle').addEventListener('click', () => {
    const input = $('#password'); const visible = input.type === 'text'; input.type = visible ? 'password' : 'text';
    $('.password-toggle').setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
    $('.password-toggle i').className = visible ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
  });

  // Bootstrap-compatible client validation and demo loading state
  $('#email-pane').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget;
    if (!form.checkValidity()) { form.classList.add('was-validated'); showToast('error', 'Check your details', 'Please correct the highlighted fields.'); return; }
    const button = $('button[type="submit"]', form); button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Signing you in…</span>';
    (async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: $('#email').value.trim(), password: $('#password').value, role: selectedRole })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to sign in');
        localStorage.setItem('ecotech-token', result.token);
        localStorage.setItem('ecotech-user', JSON.stringify(result.user));
        const destinations = { admin: 'admin-dashboard/index.html', driver: 'driver-dashboard/index.html', citizen: 'citizen-dashboard/index.html' };
        const destination = destinations[String(result.user.role).toLowerCase()];
        if (!destination) throw new Error('Citizen dashboard is not configured yet.');
        showToast('success', 'Sign-in successful', `Opening your ${result.user.role} workspace...`);
        setTimeout(() => { window.location.href = destination; }, 500);
      } catch (error) {
        showToast('error', 'Sign-in failed', error.message);
      } finally {
        button.disabled = false; button.innerHTML = '<span>Sign in securely</span><i class="fa-solid fa-arrow-right"></i>';
      }
    })();
  });

  // Phone OTP flow backed by the existing authentication API.
  let generatedOtp = '';
  $('#send-otp').addEventListener('click', async () => {
    const phone = $('#phone'); const form = $('#phone-pane');
    if (!phone.checkValidity()) { form.classList.add('was-validated'); showToast('error', 'Enter a valid phone number', 'Use a 10-digit phone number to receive a demo OTP.'); return; }
    try {
      const response = await fetch('http://localhost:5000/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to send OTP');
      generatedOtp = result.demoOTP; $('#demo-otp').textContent = generatedOtp; $('#otp-area').hidden = false; $('#otp-1').focus(); showToast('info', 'Demo OTP generated', 'Use the displayed OTP to verify your phone.');
    } catch (error) { showToast('error', 'OTP unavailable', error.message); }
  });
  const otpInputs = $$('.otp-inputs input');
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(-1); if (input.value && otpInputs[index + 1]) otpInputs[index + 1].focus(); });
    input.addEventListener('keydown', event => { if (event.key === 'Backspace' && !input.value && otpInputs[index - 1]) otpInputs[index - 1].focus(); });
    input.addEventListener('paste', event => { const digits = (event.clipboardData.getData('text').match(/\d/g) || []).slice(0, 6); if (!digits.length) return; event.preventDefault(); digits.forEach((digit, i) => otpInputs[i].value = digit); otpInputs[Math.min(digits.length, 6) - 1].focus(); });
  });
  $('#verify-otp').addEventListener('click', async () => {
    const entered = otpInputs.map(input => input.value).join('');
    if (entered.length !== 6) { showToast('error', 'OTP incomplete', 'Enter all six digits to continue.'); return; }
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: $('#phone').value, otp: entered, role: selectedRole }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'OTP verification failed');
      localStorage.setItem('ecotech-token', result.token); localStorage.setItem('ecotech-user', JSON.stringify(result.user));
      const destination = ({ admin: 'admin-dashboard/index.html', driver: 'driver-dashboard/index.html', citizen: 'citizen-dashboard/index.html' })[String(result.user.role).toLowerCase()];
      if (!destination) throw new Error('No dashboard is available for this account.');
      showToast('success', 'Phone verified', `Opening your ${result.user.role} workspace...`); otpInputs.forEach(input => input.value = ''); setTimeout(() => { window.location.href = destination; }, 500);
    } catch (error) { showToast('error', 'OTP verification failed', error.message); }
  });
  const loadGoogleIdentity = () => new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = resolve; script.onerror = () => reject(new Error('Google Identity Services could not load.')); document.head.append(script);
  });
  const finishGoogleLogin = async credential => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential, role: selectedRole }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Google sign-in failed');
      localStorage.setItem('ecotech-token', result.token); localStorage.setItem('ecotech-user', JSON.stringify(result.user));
      const destination = ({ admin: 'admin-dashboard/index.html', driver: 'driver-dashboard/index.html', citizen: 'citizen-dashboard/index.html' })[String(result.user.role).toLowerCase()];
      if (!destination) throw new Error('No dashboard is available for this account.');
      showToast('success', 'Google sign-in successful', `Opening your ${result.user.role} workspace...`); setTimeout(() => { location.href = destination; }, 500);
    } catch (error) { showToast('error', 'Google sign-in failed', error.message); }
  };
  $('#google-login').addEventListener('click', async () => {
    if (!window.GOOGLE_OAUTH_CLIENT_ID || window.GOOGLE_OAUTH_CLIENT_ID.startsWith('PASTE_')) { showToast('info', 'Google sign-in needs setup', 'Add the Google OAuth Web Client ID in oauth-config.js first.'); return; }
    try { await loadGoogleIdentity(); window.google.accounts.id.initialize({ client_id: window.GOOGLE_OAUTH_CLIENT_ID, callback: response => finishGoogleLogin(response.credential) }); window.google.accounts.id.prompt(); }
    catch (error) { showToast('error', 'Google sign-in unavailable', error.message); }
  });

  // Button ripple
  $$('.ripple').forEach(button => button.addEventListener('click', event => { const wave = document.createElement('span'); const size = Math.max(button.clientWidth, button.clientHeight); const rect = button.getBoundingClientRect(); wave.className = 'wave'; wave.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`; button.append(wave); wave.addEventListener('animationend', () => wave.remove()); }));
  document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#email').focus(); } });
})();
