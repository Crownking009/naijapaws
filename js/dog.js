document.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector('main h1');
  if (!title) return;

  document.title = `NaijaPaws | ${title.textContent.trim()}`;
});
