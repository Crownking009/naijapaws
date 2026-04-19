document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('marketplace-filter-form');
  if (!form) return;

  ['category', 'breed', 'state', 'gender', 'sort'].forEach((name) => {
    form.elements[name]?.addEventListener('change', () => form.requestSubmit());
  });
});
