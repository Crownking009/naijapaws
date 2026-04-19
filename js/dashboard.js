document.addEventListener('DOMContentLoaded', () => {
  const adminLink = document.querySelector('.page-dashboard a[href="admin/index.html"]');
  const role = document.getElementById('dashboard-user-role');
  if (!adminLink || !role) return;

  const sync = () => {
    adminLink.style.display = role.textContent.trim() === 'admin' ? '' : 'none';
  };

  sync();
  window.setTimeout(sync, 100);
});
