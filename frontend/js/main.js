/**
 * Main Application Module
 * Initializes the app and sets up event handlers
 */

/**
 * Initialize the application
 */
function initApp() {
  console.log('Image Analysis App initialized');

  // Check authentication status on page load
  if (userPool) {
    checkAuthStatus();
  }

  // Set up file input change handler
  fileInput.addEventListener("change", async (event) => {
    if (isUploading) return;

    const file = event.target.files[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showStatus("❌ Please upload a JPG, PNG, or GIF image", "error");
      fileInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showStatus("❌ File size must be less than 5MB", "error");
      fileInput.value = "";
      return;
    }

    // Show preview
    instruction.style.display = "none";
    previewContainer.style.display = "block";
    preview.src = URL.createObjectURL(file);
    resultsContainer.style.display = "none";
    hideStatus();

    // Start upload
    await uploadFile(file);
  });

  // Set up drag and drop handlers
  setupDragAndDrop();
}

/**
 * Set up drag and drop functionality for upload box
 */
function setupDragAndDrop() {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadBox.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadBox.addEventListener(eventName, () => {
      if (!isUploading) {
        uploadBox.style.borderColor = 'var(--primary-color)';
        uploadBox.style.backgroundColor = '#f0f8ff';
      }
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadBox.addEventListener(eventName, () => {
      uploadBox.style.borderColor = 'var(--secondary-color)';
      uploadBox.style.backgroundColor = '#fafafa';
    }, false);
  });

  uploadBox.addEventListener('drop', (e) => {
    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files;
      fileInput.dispatchEvent(new Event('change'));
    }
  }, false);
}

// Initialize app when DOM is fully loaded
window.addEventListener('load', initApp);
