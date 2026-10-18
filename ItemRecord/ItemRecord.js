//This file was created with the aid of AI(ChatGPT)

document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const message = document.getElementById('message');

  const toolForm = document.getElementById('toolForm');
  const editButton = document.getElementById('editButton');
  const saveButton = document.getElementById('saveButton');
  const cancelButton = document.getElementById('cancelButton');
  const historyBody = document.getElementById('historyBody');

  let selectedToolId = null;
  let originalLocation = '';

  // --------------------------------------------------
  // FETCH JSON SAFELY
  // Handles HTML responses and server errors.
  // --------------------------------------------------

  async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      console.error('Invalid JSON response:', {
        url: response.url,
        status: response.status,
        contentType: response.headers.get('content-type'),
        response: text.slice(0, 500)
      });

      throw new Error(
        `Expected JSON but received invalid data. ` +
        `Status: ${response.status}. Check the browser console.`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message || `Request failed: ${response.status}`
      );
    }

    return data;
  }

  // --------------------------------------------------
  // DISPLAY MESSAGES
  // --------------------------------------------------

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? '#b00020' : '#176b35';
  }

  // --------------------------------------------------
  // FORMAT DATES
  // --------------------------------------------------

  function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }

  // --------------------------------------------------
  // FILL INPUT FIELDS
  // --------------------------------------------------

  function setField(id, value) {
    document.getElementById(id).value = value ?? '';
  }

  // --------------------------------------------------
  // RESET TOOL INFORMATION
  // --------------------------------------------------

  function resetTool() {
    selectedToolId = null;
    toolForm.reset();

    [
      'toolId',
      'description',
      'serialNumber',
      'modelNumber',
      'manufacturer',
      'type',
      'calibrationDate',
      'calibrationDue',
      'location'
    ].forEach(id => {
      document.getElementById(id).readOnly = true;
    });

    editButton.disabled = true;
    editButton.hidden = false;
    saveButton.hidden = true;
    cancelButton.hidden = true;

    historyBody.replaceChildren();

    const row = historyBody.insertRow();
    const cell = row.insertCell();

    cell.colSpan = 8;
    cell.textContent = 'Select a tool to view its history.';
  }

  // --------------------------------------------------
  // SEARCH FOR TOOLS
  // GET /api/tools/search?q=...
  // --------------------------------------------------

  searchForm.addEventListener('submit', async event => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
      showMessage('Enter a tool ID or search term.', true);
      return;
    }

    showMessage('Searching...');
    searchResults.replaceChildren();
    resetTool();

    try {
      const data = await fetchJSON(
        `/api/tools/search?q=${encodeURIComponent(query)}`
      );

      if (!Array.isArray(data) || data.length === 0) {
        showMessage('No matching tools were found.', true);
        return;
      }

      showMessage(`Found ${data.length} matching tool(s).`);

      const list = document.createElement('ul');

      data.forEach(tool => {
        const item = document.createElement('li');
        const button = document.createElement('button');

        button.type = 'button';

        button.textContent =
          `${tool.Tool_ID} — ${tool.Description || 'No description'}`;

        button.addEventListener('click', () => {
          loadTool(tool.Tool_ID);
        });

        item.appendChild(button);

        if (tool.Checked_Out_By) {
          const status = document.createElement('span');

          status.textContent =
            ` (Checked out by ${tool.Checked_Out_By})`;

          item.appendChild(status);
        }

        list.appendChild(item);
      });

      searchResults.appendChild(list);

      // Automatically open the tool if only one result exists.
      if (data.length === 1) {
        await loadTool(data[0].Tool_ID);
      }

    } catch (error) {
      console.error('Tool search error:', error);
      showMessage(error.message, true);
    }
  });

  // --------------------------------------------------
  // LOAD ONE TOOL
  // GET /api/tools/:toolId
  // --------------------------------------------------

  async function loadTool(toolId) {
    showMessage('Loading tool information...');

    try {
      const tool = await fetchJSON(
        `/api/tools/${encodeURIComponent(toolId)}`
      );

      selectedToolId = tool.Tool_ID;

      setField('toolId', tool.Tool_ID);
      setField('description', tool.Description);
      setField('serialNumber', tool.Serial_Number);
      setField('modelNumber', tool.Model_Number);
      setField('manufacturer', tool.Manufacturer);
      setField('type', tool.Type);
      setField('calibrationDate', tool.Calibration_Date);
      setField('calibrationDue', tool.Calibration_Due);
      setField('location', tool.Location);

      originalLocation = tool.Location ?? '';

      editButton.disabled = false;
      editButton.hidden = false;
      saveButton.hidden = true;
      cancelButton.hidden = true;

      await loadHistory(tool.Tool_ID);

      showMessage(`Tool ${tool.Tool_ID} loaded successfully.`);

    } catch (error) {
      console.error('Load tool error:', error);
      showMessage(error.message, true);
    }
  }

  // --------------------------------------------------
  // LOAD TOOL HISTORY
  // GET /api/tools/:toolId/history
  // --------------------------------------------------

  async function loadHistory(toolId) {
    const data = await fetchJSON(
      `/api/tools/${encodeURIComponent(toolId)}/history`
    );

    historyBody.replaceChildren();

    if (!Array.isArray(data) || data.length === 0) {
      const row = historyBody.insertRow();
      const cell = row.insertCell();

      cell.colSpan = 8;
      cell.textContent = 'No history records found for this tool.';

      return;
    }

    data.forEach(record => {
      const row = historyBody.insertRow();

      const values = [
        record.ID,
        record.Tool_ID,
        record.Employee_ID,
        record.Employee_Name,
        record.Event_Type,
        formatDate(record.Event_Date),
        formatDate(record.Check_Out_Date),
        formatDate(record.Return_Date)
      ];

      values.forEach(value => {
        const cell = row.insertCell();

        cell.textContent =
          value === null || value === undefined || value === ''
            ? '—'
            : String(value);
      });
    });
  }

  // --------------------------------------------------
  // EDIT TOOL LOCATION
  // --------------------------------------------------

  editButton.addEventListener('click', () => {
    if (selectedToolId === null) return;

    originalLocation =
      document.getElementById('location').value;

    document.getElementById('location').readOnly = false;

    editButton.hidden = true;
    saveButton.hidden = false;
    cancelButton.hidden = false;

    document.getElementById('location').focus();
  });

  // --------------------------------------------------
  // CANCEL LOCATION CHANGES
  // --------------------------------------------------

  cancelButton.addEventListener('click', () => {
    setField('location', originalLocation);

    document.getElementById('location').readOnly = true;

    editButton.hidden = false;
    saveButton.hidden = true;
    cancelButton.hidden = true;

    showMessage('Location changes cancelled.');
  });

  // --------------------------------------------------
  // SAVE TOOL LOCATION
  // PUT /update/:id
  // --------------------------------------------------

  toolForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (selectedToolId === null) {
      showMessage('Search for a tool before saving.', true);
      return;
    }

    const location =
      document.getElementById('location').value.trim();

    if (!location) {
      showMessage('Enter a valid location.', true);
      return;
    }

    saveButton.disabled = true;

    try {
      const data = await fetchJSON(
        `/update/${encodeURIComponent(selectedToolId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Location: location
          })
        }
      );

      originalLocation = data.tool.Location ?? location;

      setField('location', originalLocation);

      document.getElementById('location').readOnly = true;

      editButton.hidden = false;
      saveButton.hidden = true;
      cancelButton.hidden = true;

      showMessage('Tool location updated successfully.');

    } catch (error) {
      console.error('Save location error:', error);
      showMessage(error.message, true);

    } finally {
      saveButton.disabled = false;
    }
  });

  // --------------------------------------------------
  // INITIALIZE PAGE
  // --------------------------------------------------

  resetTool();
});
