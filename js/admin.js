document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.page-admin .dashboard-header .text-muted');
  if (!header) return;

  const stamp = new Date().toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  header.textContent = `${header.textContent} Updated ${stamp}.`;
});
