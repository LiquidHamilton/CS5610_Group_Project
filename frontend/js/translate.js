/**
 * Translation Module
 * Handles text translation using Amazon Translate
 */

/**
 * Supported languages for translation
 */
const LANGUAGES = {
  'auto': 'Auto-detect',
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'ru': 'Russian',
};

/**
 * Populate language dropdown selects
 */
function populateLanguageSelects() {
  const sourceSelect = document.getElementById('source-language');
  const targetSelect = document.getElementById('target-language');

  // Populate source language (includes auto-detect)
  Object.entries(LANGUAGES).forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    if (code === 'auto') option.selected = true;
    sourceSelect.appendChild(option);
  });

  // Populate target language (exclude auto-detect)
  Object.entries(LANGUAGES).forEach(([code, name]) => {
    if (code === 'auto') return;
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    if (code === 'es') option.selected = true; // Default to Spanish
    targetSelect.appendChild(option);
  });
}

/**
 * Handle translation form submission
 */
async function handleTranslate(event) {
  event.preventDefault();

  const textInput = document.getElementById('translate-text');
  const sourceLanguage = document.getElementById('source-language').value;
  const targetLanguage = document.getElementById('target-language').value;
  const translateButton = document.getElementById('translate-button');
  const resultsContainer = document.getElementById('translation-results');
  const translatedTextElement = document.getElementById('translated-text');

  const text = textInput.value.trim();

  if (!text) {
    alert('Please enter some text to translate');
    return;
  }

  if (text.length > 10000) {
    alert('Text exceeds maximum length of 10,000 characters');
    return;
  }

  // Get authentication token
  const idToken = sessionStorage.getItem('idToken');
  if (!idToken) {
    alert('Please sign in to use translation');
    return;
  }

  // Disable button and show loading state
  translateButton.disabled = true;
  translateButton.textContent = 'Translating...';
  resultsContainer.style.display = 'none';

  try {
    const response = await fetch(API_CONFIG.TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': idToken
      },
      body: JSON.stringify({
        text: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage
      })
    });

    if (!response.ok) {
      let errorMsg = `Translation failed (${response.status})`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch (e) {
        console.error("Could not parse error response:", e);
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log('Translation successful:', data);

    // Display translated text
    translatedTextElement.textContent = data.translatedText;
    resultsContainer.style.display = 'block';

    // Update language labels
    const sourceLangName = LANGUAGES[data.sourceLanguage] || data.sourceLanguage;
    const targetLangName = LANGUAGES[data.targetLanguage] || data.targetLanguage;
    document.getElementById('detected-source-lang').textContent = sourceLangName;
    document.getElementById('result-target-lang').textContent = targetLangName;

  } catch (error) {
    console.error('Translation error:', error);
    alert('Translation failed: ' + error.message);
  } finally {
    translateButton.disabled = false;
    translateButton.textContent = 'Translate';
  }
}

/**
 * Clear translation form
 */
function clearTranslation() {
  document.getElementById('translate-text').value = '';
  document.getElementById('translation-results').style.display = 'none';
  document.getElementById('source-language').value = 'auto';
  document.getElementById('target-language').value = 'es';
}

// Initialize language selects when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', populateLanguageSelects);
} else {
  populateLanguageSelects();
}
