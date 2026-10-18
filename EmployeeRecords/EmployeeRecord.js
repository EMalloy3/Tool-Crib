//This file was created with the aid of AI(ChatGPT)

//Confirms HTML document loads before running the script
document.addEventListener('DOMContentLoaded', () => {

  //Gets references to the HTML elements used by search function
  const searchInput = document.getElementById('Search');
  const searchButton = document.getElementById('searchButton');
  const status = document.getElementById('statusMessage');
  const tbody = document.getElementById('employeeRecord');

  //Checks that all required HTML elements exist and handles error message
  if (!searchInput || !searchButton || !status || !tbody) {
    console.error('Missing HTML element. Check your element IDs.');
    return;
  }

  //Runs search function when button is clicked
  searchButton.addEventListener('click', searchEmployee);

  //Allows user to execute search
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchEmployee();
    }
  });

  //Searches for employees abd tools checked out to them
  async function searchEmployee() {
    const id = searchInput.value.trim();

    //Checks if user entered employee ID
    if (!id) {
      status.textContent = 'Enter an employee number first.';
      return;
    }

    status.textContent = 'Searching for employee ' + id + '...';
    searchButton.disabled = true;

    //Builds API URL using employee ID
    try {
      const url =
        '/api/employee-record/' + encodeURIComponent(id);

        console.log('Requesting:', url);

      //Sends a request to the server to retrieve employee record
      const response = await fetch(url);
      const data = await response.json();

      console.log('Server response:', response.status, data);

      //Checks if server returned a successful response
      if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
      }

      document.getElementById('Name').value =
        data.employee.Name ?? '';

      document.getElementById('Employee_ID').value =
        data.employee.Employee_ID ?? '';

      document.getElementById('Position').value =
        data.employee.Position ?? '';

      document.getElementById('Manager').value =
        data.employee.Manager ?? '';

      tbody.replaceChildren();

      //Checks if employees has any tools checked out
      if (!data.tools || data.tools.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="9">No tools checked out.</td></tr>';
      } else {
        data.tools.forEach((tool) => {
          const row = document.createElement('tr');

          //Lists tool info in table
          [
            'Tool_ID',
            'Description',
            'Model_Number',
            'Serial_Number',
            'Manufacturer',
            'Type',
            'Location',
            'Calibration_Date',
            'Calibration_Due'
          ].forEach((key) => {
            const cell = document.createElement('td');
            cell.textContent = tool[key] ?? '—';
            row.appendChild(cell);
          });

          tbody.appendChild(row);
        });
      }

      status.textContent =
        'Employee found. Tools displayed: ' + data.tools.length;

    //Logs any errors to the console and re-enables button
      } catch (error) {
      console.error('Employee search failed:', error);
      status.textContent = 'Error: ' + error.message;
    } finally {
      searchButton.disabled = false;
    }
  }
});
