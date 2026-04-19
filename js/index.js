document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('#hero-search-form .hero-search-input');
  if (!input) return;

  const placeholders = [
    'Search breed, seller, or location',
    'Try German Shepherd, Lagos, or grooming',
    'Search adoption, mating, or products',
  ];

  let index = 0;
  window.setInterval(() => {
    index = (index + 1) % placeholders.length;
    input.placeholder = placeholders[index];
  }, 3200);
});
