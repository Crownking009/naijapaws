document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('vet-request-form');
  if (!form) return;

  // Pre-fill user data if logged in
  try {
    const user = JSON.parse(localStorage.getItem('np_session_user') || 'null');
    if (!user) return;
    if (!form.elements.full_name.value) form.elements.full_name.value = user.fullName || '';
    if (!form.elements.phone.value) form.elements.phone.value = user.phone || '';
    if (!form.elements.whatsapp_number.value) form.elements.whatsapp_number.value = user.phone || '';
  } catch (error) {
    // Ignore local storage parsing issues on this helper layer.
  }

  // Handle form submission
  form.addEventListener('submit', handleVetRequestSubmit);
});

/**
 * Handle vet request form submission
 */
async function handleVetRequestSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  try {
    // Validate form
    if (!form.checkValidity()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Validate phone numbers
    const phone = form.elements.phone.value.trim();
    const whatsapp = form.elements.whatsapp_number.value.trim();

    if (!isValidPhone(phone)) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }

    if (!isValidPhone(whatsapp)) {
      showToast('Please enter a valid WhatsApp number', 'error');
      return;
    }

    // Validate image if provided
    const imageInput = form.elements.pet_image;
    if (imageInput.files.length > 0) {
      const file = imageInput.files[0];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Please upload a valid image (JPEG, PNG, or WebP)', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'error');
        return;
      }
    }

    // Prepare form data
    const formData = new FormData(form);

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Submit request
    const response = await fetch('submit-vet-request.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      // Show success modal
      showVetRequestSuccessModal(result);

      // Reset form
      form.reset();

      // Log activity if user is logged in
      try {
        const user = JSON.parse(localStorage.getItem('np_session_user') || 'null');
        if (user) {
          logActivity('vet_service', 'request', result.vet_request_id, 'Submitted vet service request');
        }
      } catch (e) {
        // Ignore
      }
    } else {
      showToast(result.message || 'Failed to submit request', 'error');
    }
  } catch (error) {
    console.error('Form submission error:', error);
    showToast('An error occurred. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * Show success modal for vet request
 */
function showVetRequestSuccessModal(result) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="text-align: center; max-width: 420px;">
      <div style="font-size: 3rem; margin-bottom: 1rem; animation: slideInDown 0.5s ease-out;">
        ✅
      </div>
      <h2 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.75rem;">
        Request Submitted Successfully!
      </h2>
      <div style="background-color: var(--warm-white); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem; text-align: left;">
        <p style="margin: 0 0 1rem 0; font-size: 0.95rem; line-height: 1.6; color: var(--text-default);">
          Thank you for reaching out to us! We truly value every pet and understand how important their health and well-being are to you.
        </p>
        <p style="margin: 0 0 1rem 0; font-size: 0.95rem; line-height: 1.6; color: var(--text-default);">
          <strong>Your vet will reach out as soon as possible</strong> through WhatsApp at the number you provided. Our experienced veterinary team is committed to providing prompt and professional care for your beloved companion.
        </p>
        <div style="background-color: rgba(56, 96, 127, 0.08); padding: 1rem; border-radius: var(--radius-md); border-left: 3px solid var(--forest);">
          <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">
            <strong>Request ID:</strong> #VET-${result.vet_request_id}
          </p>
          ${result.has_image ? '<p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--text-muted);">📷 Image attached to help with diagnosis</p>' : ''}
        </div>
      </div>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">
        Keep an eye on your WhatsApp messages for the vet's response. We're here to help! 🐾
      </p>
      <button class="btn btn-primary btn-block" style="cursor: pointer;">Done</button>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('button');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Add styles for modal
  if (!document.getElementById('modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
        animation: fadeIn 0.3s ease-out;
      }

      .modal-content {
        background: white;
        border-radius: var(--radius-xl);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        padding: 2rem;
        animation: slideUp 0.4s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 600px) {
        .modal-content {
          padding: 1.5rem;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 13;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <span>${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
      <span>${message}</span>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'true');
  container.style.cssText = `
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  `;

  // Add toast styles
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast {
        background: white;
        padding: 1rem 1.25rem;
        border-radius: var(--radius-md);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease-out;
        transition: opacity 0.3s ease;
        max-width: 400px;
        font-size: 0.95rem;
      }

      .toast-error {
        border-left: 4px solid #ef4444;
        color: #7f1d1d;
      }

      .toast-success {
        border-left: 4px solid #22c55e;
        color: #15803d;
      }

      .toast-info {
        border-left: 4px solid #3b82f6;
        color: #1e40af;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @media (max-width: 600px) {
        .toast-container {
          bottom: 1rem !important;
          right: 1rem !important;
          left: 1rem !important;
        }

        .toast {
          max-width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(container);
  return container;
}

/**
 * Log activity (if user is authenticated)
 */
function logActivity(type, subtype, itemId, description) {
  // This function can be expanded to send activity logs to backend
  console.log(`Activity: ${type} > ${subtype} (${itemId}): ${description}`);
}
