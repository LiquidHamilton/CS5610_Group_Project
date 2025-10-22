/**
 * Upload and Results Module
 * Handles image upload, polling for results, and displaying analysis
 */

let isUploading = false;

// DOM Elements
const fileInput = document.getElementById("fileInput");
const uploadBox = document.getElementById("uploadBox");
const instruction = document.getElementById("instruction");
const previewContainer = document.getElementById("preview-container");
const preview = document.getElementById("preview");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const statusMessage = document.getElementById("status-message");
const resultsContainer = document.getElementById("results-container");

/**
 * Show status message with optional spinner
 */
function showStatus(message, type, showSpinner = false) {
  statusMessage.innerHTML = showSpinner
    ? `<span class="spinner"></span>${message}`
    : message;
  statusMessage.className = `status-${type}`;
  statusMessage.style.display = "flex";
}

/**
 * Hide status message
 */
function hideStatus() {
  statusMessage.style.display = "none";
}

/**
 * Enable or disable upload box
 */
function setUploadBoxState(disabled) {
  isUploading = disabled;
  if (disabled) {
    uploadBox.classList.add('disabled');
    fileInput.disabled = true;
  } else {
    uploadBox.classList.remove('disabled');
    fileInput.disabled = false;
  }
}

/**
 * Reset upload UI and clear results
 */
function resetUpload() {
  instruction.style.display = "flex";
  previewContainer.style.display = "none";
  progressContainer.style.display = "none";
  resultsContainer.style.display = "none";
  hideStatus();
  progressBar.style.width = "0%";
  fileInput.value = "";
  setUploadBoxState(false);

  // Clear results
  document.getElementById("labels-list").innerHTML = "";
  document.getElementById("faces-list").innerHTML = "";
  document.getElementById("label-count").textContent = "0";
  document.getElementById("face-count").textContent = "0";
}

/**
 * Upload file to S3 via API Gateway
 */
async function uploadFile(file) {
  try {
    setUploadBoxState(true);
    progressContainer.style.display = "block";
    progressBar.style.width = "30%";
    showStatus("⬆️ Uploading image...", "uploading", true);

    // Get the Cognito ID token
    const idToken = sessionStorage.getItem('idToken');
    if (!idToken) {
      throw new Error('Please sign in to upload images');
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(API_CONFIG.UPLOAD_URL, {
      method: "POST",
      headers: {
        'Authorization': idToken
      },
      body: formData,
    });

    progressBar.style.width = "60%";

    if (!response.ok) {
      let errorMsg = `Upload failed (${response.status})`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch (e) {
        console.error("Could not parse error response:", e);
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log("Upload successful:", data);

    progressBar.style.width = "100%";
    showStatus("🔍 Analyzing image with AI...", "analyzing", true);

    // Wait for Rekognition to process (typically takes 2-4 seconds)
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Fetch results
    await fetchResults(data.key);

  } catch (error) {
    console.error("Upload error:", error);
    progressContainer.style.display = "none";
    showStatus(`❌ ${error.message}`, "error");
    setUploadBoxState(false);

    setTimeout(() => {
      resetUpload();
    }, 3000);
  }
}

/**
 * Fetch analysis results from DynamoDB
 */
async function fetchResults(imageKey) {
  try {
    console.log(`Fetching results for ${imageKey}`);

    const response = await fetch(`${API_CONFIG.RESULTS_URL}?imageKey=${encodeURIComponent(imageKey)}`);

    if (!response.ok) {
      let errorMsg = "Failed to retrieve analysis results";
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch (e) {
        console.error("Could not parse error response:", e);
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log("Results received:", data);

    progressContainer.style.display = "none";
    displayResults(data.data);
    showStatus("✅ Analysis complete!", "success");

    setTimeout(() => {
      hideStatus();
    }, 3000);

    setUploadBoxState(false);

  } catch (error) {
    console.error("Fetch results error:", error);
    progressContainer.style.display = "none";
    showStatus(`❌ ${error.message}`, "error");
    setUploadBoxState(false);
  }
}

/**
 * Display analysis results (labels and faces)
 */
function displayResults(analysis) {
  if (!analysis) {
    showStatus("❌ No analysis data received", "error");
    return;
  }

  resultsContainer.style.display = "block";

  // Set timestamp
  const timestamp = new Date(analysis.timestamp).toLocaleString();
  document.getElementById("analysis-timestamp").textContent = `Analyzed on ${timestamp}`;

  // Update summary stats
  const labelCount = analysis.labels?.length || 0;
  const faceCount = analysis.faceCount || 0;

  document.getElementById("label-count").textContent = labelCount;
  document.getElementById("face-count").textContent = faceCount;

  // Display labels
  const labelsList = document.getElementById("labels-list");
  if (labelCount > 0) {
    labelsList.innerHTML = analysis.labels
      .map(label => `
        <div class="label-item">
          <span class="label-name">${label.name}</span>
          <span class="confidence-badge">${label.confidence}%</span>
        </div>
      `).join('');
  } else {
    labelsList.innerHTML = '<div class="no-results">🔍 No labels detected in this image</div>';
  }

  // Display faces
  const facesList = document.getElementById("faces-list");
  if (faceCount > 0 && analysis.faces) {
    facesList.innerHTML = analysis.faces
      .map((face, index) => `
        <div class="face-item">
          <div class="face-header">
            <span class="face-detail">Face ${index + 1}</span>
            <span class="confidence-badge">${face.confidence}%</span>
          </div>
          <div class="face-attributes">
            <div class="attribute-item">
              <span class="attribute-icon">👤</span>
              <span>Gender: ${face.gender || 'Unknown'}</span>
            </div>
            <div class="attribute-item">
              <span class="attribute-icon">🎂</span>
              <span>Age: ${face.ageRange ? `${face.ageRange.Low}-${face.ageRange.High}` : 'Unknown'}</span>
            </div>
            <div class="attribute-item">
              <span class="attribute-icon">😊</span>
              <span>Smile: ${face.smile ? 'Yes' : 'No'}</span>
            </div>
            <div class="attribute-item">
              <span class="attribute-icon">👓</span>
              <span>Eyeglasses: ${face.eyeglasses ? 'Yes' : 'No'}</span>
            </div>
            <div class="attribute-item">
              <span class="attribute-icon">🕶️</span>
              <span>Sunglasses: ${face.sunglasses ? 'Yes' : 'No'}</span>
            </div>
          </div>
          ${face.emotions && face.emotions.length > 0 ? `
            <div class="emotion-section">
              <div class="emotion-label">Top Emotions:</div>
              <div class="emotion-list">
                ${face.emotions.map(e =>
          `<span class="emotion-tag">${e.type} ${e.confidence}%</span>`
        ).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `).join('');
  } else {
    facesList.innerHTML = '<div class="no-results">👤 No faces detected in this image</div>';
  }

  // Scroll to results
  resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
