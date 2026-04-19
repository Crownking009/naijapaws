document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('vet-request-form');
  if (!form) return;

  try {
    const user = JSON.parse(localStorage.getItem('np_session_user') || 'null');
    if (!user) return;
    if (!form.elements.full_name.value) form.elements.full_name.value = user.fullName || '';
    if (!form.elements.phone.value) form.elements.phone.value = user.phone || '';
    if (!form.elements.whatsapp_number.value) form.elements.whatsapp_number.value = user.phone || '';
  } catch (error) {
    // Ignore local storage parsing issues on this helper layer.
  }
});
