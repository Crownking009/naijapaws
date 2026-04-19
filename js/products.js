document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('product-filter-form');
  if (!form) return;

  ['category', 'sort'].forEach((name) => {
    form.elements[name]?.addEventListener('change', () => form.requestSubmit());
  });
});
