document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-register-form]').forEach((form) => {
    const password = form.querySelector('input[name="password"]');
    const confirmPassword = form.querySelector('input[name="password2"]');
    if (!password || !confirmPassword) return;

    const syncMatchState = () => {
      const mismatch = confirmPassword.value && password.value !== confirmPassword.value;
      confirmPassword.dataset.passwordMatch = mismatch ? 'false' : 'true';
    };

    password.addEventListener('input', syncMatchState);
    confirmPassword.addEventListener('input', syncMatchState);
    syncMatchState();
  });
});
