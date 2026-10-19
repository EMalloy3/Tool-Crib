//This file was created with the aid of AI(ChatGPT)

//Get the password reset form and the element used to display messages
const resetForm = document.getElementById('resetForm');
const message = document.getElementById('message');

resetForm.addEventListener('submit', async function (event) {
  event.preventDefault();

  //Get the input elements from the HTML document
  const employeeIdInput = document.getElementById('employeeId');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('newPassword');

  //Check that all required elements exist.
  if (
    !employeeIdInput ||
    !nameInput ||
    !emailInput ||
    !passwordInput ||
    !message
  ) {
    console.error('Password recovery error: An HTML element is missing.');
    return;
  }

  //Collect form values.
  const data = {
    employeeId: employeeIdInput.value.trim(),
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    newPassword: passwordInput.value
  };

  message.textContent = 'Processing...';

  try {
    const response = await fetch('/api/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    //Display the server response.
    message.textContent =
      result.message || 'The server returned no message.';

    if (response.ok && result.success) {
      resetForm.reset();
    }

  } catch (error) {
    console.error('Password reset error:', error);

    message.textContent =
      'Could not connect to the server. Please try again.';
  }
});
