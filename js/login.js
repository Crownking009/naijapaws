document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const email = document.getElementById('login-email');
  if (!form || !email) return;

  email.focus();
});
