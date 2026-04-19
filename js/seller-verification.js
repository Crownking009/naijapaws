document.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector('.page-seller-verification h1');
  if (!title) return;

  document.title = `NaijaPaws | ${title.textContent.trim()}`;
});
