/**
 * Authentication Module
 * Handles user sign-up, sign-in, verification, and sign-out
 */

let currentUser = null;
let pendingVerificationEmail = '';

/**
 * Switch between sign-in and sign-up tabs
 */
function switchAuthTab(tab) {
  const signinTab = document.querySelector('.auth-tab:nth-child(1)');
  const signupTab = document.querySelector('.auth-tab:nth-child(2)');
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');

  if (tab === 'signin') {
    signinTab.classList.add('active');
    signupTab.classList.remove('active');
    signinForm.classList.add('active');
    signupForm.classList.remove('active');
  } else {
    signupTab.classList.add('active');
    signinTab.classList.remove('active');
    signupForm.classList.add('active');
    signinForm.classList.remove('active');
  }
}

/**
 * Handle user sign-up
 */
function handleSignUp(event) {
  event.preventDefault();

  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const submitButton = document.getElementById('signup-button');

  submitButton.disabled = true;
  submitButton.textContent = 'Signing up...';

  const attributeList = [];

  const dataEmail = {
    Name: 'email',
    Value: email
  };
  const dataName = {
    Name: 'name',
    Value: name
  };

  attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail));
  attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute(dataName));

  userPool.signUp(email, password, attributeList, null, (err, result) => {
    submitButton.disabled = false;
    submitButton.textContent = 'Sign Up';

    if (err) {
      console.error('Sign up error:', err);
      alert('Sign up failed: ' + err.message);
      return;
    }

    console.log('Sign up successful!', result);

    // Store email for verification
    pendingVerificationEmail = email;

    // Hide signup form and show verification form
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('signin-form').style.display = 'none';
    document.getElementById('verify-form').style.display = 'block';
    document.getElementById('verify-email').textContent = email;

    // Clear signup form
    document.getElementById('signup-form').reset();
  });
}

/**
 * Handle email verification
 */
function handleVerification(event) {
  event.preventDefault();

  const code = document.getElementById('verify-code').value;
  const submitButton = document.getElementById('verify-button');

  if (!pendingVerificationEmail) {
    alert('No pending verification. Please sign up first.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Verifying...';

  const userData = {
    Username: pendingVerificationEmail,
    Pool: userPool
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.confirmRegistration(code, true, (err, result) => {
    submitButton.disabled = false;
    submitButton.textContent = 'Verify Email';

    if (err) {
      console.error('Verification error:', err);
      alert('Verification failed: ' + err.message);
      return;
    }

    console.log('Verification successful!', result);
    alert('Email verified successfully! You can now sign in.');

    // Clear verification data
    pendingVerificationEmail = '';
    document.getElementById('verify-code').value = '';

    // Show sign-in form
    document.getElementById('verify-form').style.display = 'none';
    document.getElementById('signin-form').style.display = 'block';
    switchAuthTab('signin');
  });
}

/**
 * Resend verification code
 */
function resendVerificationCode() {
  if (!pendingVerificationEmail) {
    alert('No pending verification. Please sign up first.');
    return;
  }

  const userData = {
    Username: pendingVerificationEmail,
    Pool: userPool
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.resendConfirmationCode((err, result) => {
    if (err) {
      console.error('Resend error:', err);
      alert('Failed to resend code: ' + err.message);
      return;
    }

    console.log('Code resent successfully!', result);
    alert('A new verification code has been sent to your email.');
  });
}

/**
 * Handle user sign-in
 */
function handleSignIn(event) {
  event.preventDefault();

  const email = document.getElementById('signin-email').value;
  const password = document.getElementById('signin-password').value;
  const submitButton = document.getElementById('signin-button');

  submitButton.disabled = true;
  submitButton.textContent = 'Signing in...';

  const authenticationData = {
    Username: email,
    Password: password,
  };

  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

  const userData = {
    Username: email,
    Pool: userPool
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: (result) => {
      console.log('Sign in successful!');
      const idToken = result.getIdToken().getJwtToken();

      // Store token and user info
      sessionStorage.setItem('idToken', idToken);
      sessionStorage.setItem('userEmail', email);
      currentUser = cognitoUser;

      submitButton.disabled = false;
      submitButton.textContent = 'Sign In';

      // Clear form
      document.getElementById('signin-form').reset();

      // Show upload section
      showUploadSection();
    },
    onFailure: (err) => {
      console.error('Sign in error:', err);
      submitButton.disabled = false;
      submitButton.textContent = 'Sign In';

      let errorMessage = err.message;
      if (err.code === 'UserNotConfirmedException') {
        errorMessage = 'Please verify your email before signing in. Check your email for the verification link.';
      }

      alert('Sign in failed: ' + errorMessage);
    }
  });
}

/**
 * Handle user sign-out
 */
function handleSignOut() {
  if (currentUser) {
    currentUser.signOut();
  }

  sessionStorage.removeItem('idToken');
  sessionStorage.removeItem('userEmail');
  currentUser = null;

  // Reset upload section
  resetUpload();

  // Show auth section
  showAuthSection();
}

/**
 * Show authentication section
 */
function showAuthSection() {
  document.getElementById('auth-container').style.display = 'block';
  document.getElementById('upload-container').style.display = 'none';
}

/**
 * Show upload section after successful authentication
 */
function showUploadSection() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('upload-container').style.display = 'block';

  // Display user email (try to get from various sources)
  let userEmail = sessionStorage.getItem('userEmail');

  // If not in sessionStorage, try to get from current user
  if (!userEmail && currentUser) {
    currentUser.getUserAttributes((err, attributes) => {
      if (!err && attributes) {
        const emailAttr = attributes.find(attr => attr.getName() === 'email');
        if (emailAttr) {
          userEmail = emailAttr.getValue();
          sessionStorage.setItem('userEmail', userEmail);
          document.getElementById('current-user-email').textContent = userEmail;
        }
      }
    });
  }

  document.getElementById('current-user-email').textContent = userEmail || 'Loading...';
}

/**
 * Check if user is already authenticated on page load
 */
function checkAuthStatus() {
  const cognitoUser = userPool.getCurrentUser();

  if (cognitoUser != null) {
    cognitoUser.getSession((err, session) => {
      if (err) {
        console.error('Session error:', err);
        showAuthSection();
        return;
      }

      if (session.isValid()) {
        // Store token and current user
        sessionStorage.setItem('idToken', session.getIdToken().getJwtToken());
        currentUser = cognitoUser;

        // Get user email from the ID token payload
        const idTokenPayload = session.getIdToken().payload;
        console.log('ID Token payload:', idTokenPayload);

        if (idTokenPayload.email) {
          console.log('Found email in token:', idTokenPayload.email);
          sessionStorage.setItem('userEmail', idTokenPayload.email);
        } else {
          console.warn('No email in ID token payload');
        }

        // Show upload section (email should be set now)
        showUploadSection();
      } else {
        showAuthSection();
      }
    });
  } else {
    showAuthSection();
  }
}
