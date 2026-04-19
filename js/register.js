document.addEventListener('DOMContentLoaded', () => {
  const password = document.getElementById('register-password');
  const confirmPassword = document.getElementById('register-password2');
  if (!password || !confirmPassword) return;

  const syncMatchState = () => {
    const mismatch = confirmPassword.value && password.value !== confirmPassword.value;
    confirmPassword.dataset.passwordMatch = mismatch ? 'false' : 'true';
  };

  password.addEventListener('input', syncMatchState);
  confirmPassword.addEventListener('input', syncMatchState);
});
