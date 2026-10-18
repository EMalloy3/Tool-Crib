//This file was created with the aid of AI(ChatGPT)

//Get references to the HTML elements used by the search functionality
const searchInput = document.getElementById('Search');
const searchButton = document.getElementById('searchButton');
const searchResults = document.getElementById('searchResults');
const searchMessage = document.getElementById('searchMessage');

//Search when the button is clicked.
searchButton.addEventListener('click', searchTools);

//Allow the Enter key to initiate a search.
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    searchTools();
  }
});

//Searches for tools
async function searchTools() {
  const query = searchInput.value.trim();

  //Checks if user entered search term
  if (!query) {
    searchMessage.textContent = 'Please enter a search term.';
    searchResults.replaceChildren();
    return;
  }

  searchButton.disabled = true;
  searchMessage.textContent = 'Searching tools...';
  searchResults.replaceChildren();

  //Sends a request to servers tool search API
  try {
    const response = await fetch(
      `/api/tools/search?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    //Checks if server returned HTTP status
    if (!response.ok) {
      throw new Error(data.message || 'Search failed.');
    }

    //Checks if search returned any matching tools
    if (data.length === 0) {
      searchMessage.textContent = 'No matching tools found.';
      return;
    }

    // Display the search results.
    data.forEach((tool) => {
      const row = document.createElement('tr');

      // Display the location and current checkout holder.
      const locationDisplay = tool.Checked_Out_By_ID != null
  ? `${tool.Location ?? ''} (Checked out by: ${
      tool.Checked_Out_By ?? 'Unknown employee'
    }, ID: ${tool.Checked_Out_By_ID})`
  : `${tool.Location ?? ''} (Available)`;

const values = [
  tool.Tool_ID,
  tool.Description,
  tool.Model_Number,
  tool.Serial_Number,
  tool.Manufacturer,
  tool.Type,
  locationDisplay,
  tool.Calibration_Date,
  tool.Calibration_Due
];

      //Creates a table cell for each value
        values.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value ?? '';
        row.appendChild(cell);
      });

      // Add a Check Out button to this tool.
      const actionCell = document.createElement('td');
      const checkoutButton = document.createElement('button');

      checkoutButton.type = 'button';
      checkoutButton.textContent = 'Check Out';

      checkoutButton.addEventListener('click', () => {
        checkoutTool(tool.Tool_ID, checkoutButton);
      });

      actionCell.appendChild(checkoutButton);
      row.appendChild(actionCell);

      searchResults.appendChild(row);
    });

    searchMessage.textContent = `Found ${data.length} tool(s).`;

  //Logs errors to console and re-enables button
  } catch (error) {
    console.error('Search error:', error);

    searchMessage.textContent =
      'Unable to search tools. Please check the server connection.';

  } finally {
    searchButton.disabled = false;
  }
}

// Check out a selected tool.
async function checkoutTool(toolId, button) {
  const employeeId = prompt(
    `Enter the employee ID checking out tool ${toolId}:`
  );

  if (employeeId === null) {
    return;
  }

  if (!employeeId.trim()) {
    alert('Please enter an employee ID.');
    return;
  }

  button.disabled = true;

 //Sends POST request to server's API
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employeeId: employeeId.trim(),
        toolId: toolId
      })
    });

    const data = await response.json();

    //Checks server response
    if (!response.ok) {
      throw new Error(data.message || 'Checkout failed.');
    }

    alert(data.message);

    // Refresh the results to display the updated holder.
    await searchTools();

  //Logs errors and re-enables button
  } catch (error) {
    console.error('Checkout error:', error);

    alert(error.message || 'Could not check out the tool.');

  } finally {
    button.disabled = false;
  }
}
