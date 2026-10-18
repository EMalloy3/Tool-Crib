//This file was created with the aid of AI (ChatGPT)

// Gets the login form, login button, and message element from the HTML
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');

// Runs the function and prevents the page from refreshing
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  //disables login button after submission and displays login message
  loginButton.disabled = true;
  loginMessage.textContent = 'Verifying employee ID and password...';

  // Gets employee ID and password
  const employeeId = document.getElementById('employeeId').value.trim();
  const password = document.getElementById('password').value;

  //Sends user information to the server for verification
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ employeeId, password })
    });

    //Reads server response 
    const data = await response.json();

    //Checks if server response
    if (!response.ok) {
      loginMessage.textContent = data.message;
      return;
    }

    //Redirects employee after successful login
    window.location.href = data.redirect;

  //Logs error to console
  //Re-enables login button after request is finished
  } catch (error) {
    console.error('Login error:', error);
    loginMessage.textContent =
      'Cannot connect to the server. Please try again.';
  } finally {
    loginButton.disabled = false;
  }
});
