//This file was created with the aid of AI(ChatGPT)

//Gets the form, Create button, and message element from the HTML
const createRecordForm = document.getElementById('createRecordForm');
const createButton = document.getElementById('createButton');
const createMessage = document.getElementById('createMessage');

//Runs this function when the user submits the form
createRecordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  createButton.disabled = true;
  createMessage.textContent = 'Creating tool record...';

  //Collects the form values and stores them in a tool object
  const tool = {
    Tool_ID: document.getElementById('Tool_ID').value.trim(),
    Description: document.getElementById('Description').value.trim(),
    Model_Number: document.getElementById('Model_Number').value.trim(),
    Serial_Number: document.getElementById('Serial_Number').value.trim(),
    Manufacturer: document.getElementById('Manufacturer').value.trim(),
    Type: document.getElementById('Type').value.trim(),
    Location: document.getElementById('Location').value.trim(),
    Calibration_Date:
      document.getElementById('Calibration_Date').value || null,
    Calibration_Due:
      document.getElementById('Calibration_Due').value || null
  };

  //Sends the tool information to the server using a POST request
  try {
    const response = await fetch('/postData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tool)
    });

    const data = await response.json();

    //Checks whether the server returned an unsuccessful HTTP status
    if (!response.ok) {
      createMessage.textContent =
        data.message || 'Failed to create tool record.';
      return;
    }

    createMessage.textContent = data.message;

    createRecordForm.reset();

  //Logs errors and re0enables button
  } catch (error) {
    console.error('Create record error:', error);

    createMessage.textContent =
      'Unable to connect to the server. Please try again.';
  } finally {
    createButton.disabled = false;
  }
});
