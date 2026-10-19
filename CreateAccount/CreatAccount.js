//This file was created with the aid of AI(ChatGPT)

//Gets the creation form from HTML file, displays messages, gets the container for the Create button
const form = document.getElementById('createAccountForm');
const message = document.getElementById('message');
const createButton = document.getElementById('createButton');

//Listens for form submission and prevents browser from refreshing
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  //prevents page refreshing
  message.textContent = '';
  createButton.disabled = true;

  const formData = new FormData(form);

  //creates employee object using values collect from the form
  const employee = {
  employeeId: formData.get('employeeId').trim(),
  name: formData.get('name').trim(),
  email: formData.get('email').trim(),
  password: formData.get('password'),
  position: formData.get('position').trim(),
  manager: formData.get('manager').trim()
};

  //Logs employee object to console for debugging
  try {
    console.log('Sending employee:', employee);

      //Sends POST request to server API to create new record
      const response = await fetch('/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(employee)
    });

    //Reads server response
    const data = await response.json();

    //Checks if server responded with success
    if (!response.ok) {
      throw new Error(
        data.message || `Request failed: ${response.status}`
      );
    }

    message.textContent = data.message;
    form.reset();

  //Logs error message to console and re-enables Create button
  } catch (error) {
    console.error('Create account failed:', error);
    message.textContent = error.message;
  } finally {
    createButton.disabled = false;
  }
});
