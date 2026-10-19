//This file was created with the aid of AI(ChatGPT)

const searchForm = document.getElementById('returnSearchForm');
const searchInput = document.getElementById('searchTerm');
const tableBody = document.getElementById('returnTableBody');
const selectAll = document.getElementById('selectAll');
const checkinButton = document.getElementById('checkinButton');
const statusMessage = document.getElementById('statusMessage');

if (
  !searchForm ||
  !searchInput ||
  !tableBody ||
  !selectAll ||
  !checkinButton ||
  !statusMessage
) {
  console.error(
    'ReturnItems.js: One or more required HTML elements were not found.'
  );
  throw new Error('The Return page HTML is missing a required element.');
}

let isProcessing = false;

function showMessage(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? 'red' : 'green';
}

function updateSelection() {
  const checkboxes = [
    ...tableBody.querySelectorAll('.tool-checkbox')
  ];

  const selected = checkboxes.filter(
    checkbox => checkbox.checked
  );

  checkinButton.disabled =
    isProcessing || selected.length === 0;

  selectAll.checked =
    checkboxes.length > 0 &&
    selected.length === checkboxes.length;

  selectAll.indeterminate =
    selected.length > 0 &&
    selected.length < checkboxes.length;
}

function createCell(value) {
  const cell = document.createElement('td');

  cell.textContent =
    value == null ? '' : String(value);

  cell.style.border = '1px solid black';
  cell.style.padding = '8px';

  return cell;
}

function showTableMessage(message) {
  tableBody.replaceChildren();

  const row = document.createElement('tr');
  const cell = createCell(message);

  cell.colSpan = 12;

  row.appendChild(cell);
  tableBody.appendChild(row);

  selectAll.checked = false;
  selectAll.indeterminate = false;
  checkinButton.disabled = true;
}

function resetSelection() {
  selectAll.checked = false;
  selectAll.indeterminate = false;
  checkinButton.disabled = true;
}

function renderTools(tools) {
  tableBody.replaceChildren();
  resetSelection();

  if (!Array.isArray(tools)) {
    showTableMessage('Invalid search results received from the server.');
    return 0;
  }

  if (tools.length === 0) {
    showTableMessage('No currently checked-out tools found.');
    return 0;
  }

  let renderedCount = 0;

  for (const tool of tools) {
    // Checkout_ID must be History.ID, not Tools.Tool_ID.
    if (
      tool.Checkout_ID == null ||
      String(tool.Checkout_ID).trim() === '' ||
      tool.Tool_ID == null
    ) {
      console.error(
        'Return search result is missing Checkout_ID or Tool_ID:',
        tool
      );
      continue;
    }

    const row = document.createElement('tr');
    const selectCell = createCell('');

    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    checkbox.className = 'tool-checkbox';

    // ID of the active checkout record in History.
    checkbox.value = String(tool.Checkout_ID);

    // Tool ID is kept separately for display and error messages.
    checkbox.dataset.toolId = String(tool.Tool_ID);

    checkbox.setAttribute(
      'aria-label',
      `Select tool ${tool.Tool_ID} for check-in`
    );

    checkbox.addEventListener('change', updateSelection);

    selectCell.appendChild(checkbox);
    row.appendChild(selectCell);

    const values = [
      tool.Tool_ID,
      tool.Description,
      tool.Model_Number,
      tool.Serial_Number,
      tool.Manufacturer,
      tool.Type,
      tool.Location,
      tool.Calibration_Date,
      tool.Calibration_Due,
      tool.Checked_Out_By,
      tool.Checked_Out_By_ID
    ];

    for (const value of values) {
      row.appendChild(createCell(value));
    }

    tableBody.appendChild(row);
    renderedCount++;
  }

  if (renderedCount === 0) {
    showTableMessage(
      'Search results are missing checkout IDs. Check the server search query.'
    );
  } else {
    updateSelection();
  }

  return renderedCount;
}

async function readResponse(response) {
  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `The server returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    const error = new Error(
      data.message ||
      `Request failed with HTTP ${response.status}.`
    );

    error.status = response.status;
    error.code = data.code;

    throw error;
  }

  return data;
}

async function searchTools() {
  const query = searchInput.value.trim();

  if (!query) {
    showMessage(
      'Enter an employee name, employee ID, or tool ID.',
      true
    );
    searchInput.focus();
    return;
  }

  if (isProcessing) {
    return;
  }

  showMessage('Searching...');
  showTableMessage('Searching for checked-out tools...');

  try {
    const response = await fetch(
      `/api/return/search?q=${encodeURIComponent(query)}`
    );

    const data = await readResponse(response);

    if (!Array.isArray(data)) {
      throw new Error(
        'The server did not return a list of tools.'
      );
    }

    const renderedCount = renderTools(data);

    const invalidCount = data.length - renderedCount;

    if (invalidCount > 0) {
      showMessage(
        `${renderedCount} tool(s) displayed. ${invalidCount} result(s) were missing required IDs.`,
        true
      );
    } else {
      showMessage(
        `Found ${renderedCount} checked-out tool(s).`
      );
    }
  } catch (error) {
    console.error('Return search failed:', {
      message: error.message,
      status: error.status,
      code: error.code
    });

    showTableMessage('Search failed. See the status message.');

    showMessage(
      `${error.message}${error.code ? ` (Code: ${error.code})` : ''}`,
      true
    );
  }
}

searchForm.addEventListener('submit', async event => {
  event.preventDefault();
  await searchTools();
});

selectAll.addEventListener('change', () => {
  tableBody
    .querySelectorAll('.tool-checkbox')
    .forEach(checkbox => {
      checkbox.checked = selectAll.checked;
    });

  updateSelection();
});

checkinButton.addEventListener('click', async () => {
  if (isProcessing) {
    return;
  }

  const selectedCheckboxes = [
    ...tableBody.querySelectorAll('.tool-checkbox:checked')
  ];

  const selectedItems = selectedCheckboxes.map(checkbox => ({
    checkoutId: checkbox.value,
    toolId: checkbox.dataset.toolId
  }));

  if (selectedItems.length === 0) {
    showMessage(
      'Select at least one tool to check in.',
      true
    );
    return;
  }

  // Verify that every selection has both required IDs.
  const invalidItem = selectedItems.find(
    item => !item.checkoutId || !item.toolId
  );

  if (invalidItem) {
    showMessage(
      'A selected tool is missing its checkout ID. Search again.',
      true
    );
    return;
  }

  const confirmed = window.confirm(
    `Check in ${selectedItems.length} selected tool(s)?`
  );

  if (!confirmed) {
    return;
  }

  isProcessing = true;
  updateSelection();
  showMessage('Processing check-ins...');

  const succeeded = [];
  const failed = [];

  try {
    // Send one request per selected checkout record.
    for (const item of selectedItems) {
      try {
        const response = await fetch('/api/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            checkoutId: item.checkoutId
          })
        });

        const data = await readResponse(response);

        if (data.success === false) {
          throw new Error(
            data.message || 'Check-in failed.'
          );
        }

        succeeded.push(item.toolId);
      } catch (error) {
        console.error(
          `Check-in failed for tool ${item.toolId}:`,
          error
        );

        failed.push({
          toolId: item.toolId,
          message: error.message
        });
      }
    }

    if (succeeded.length > 0) {
      showMessage(
        `Successfully checked in ${succeeded.length} tool(s).` +
        (failed.length > 0
          ? ` ${failed.length} failed.`
          : '')
      );
    } else {
      showMessage(
        'No tools were checked in.',
        true
      );
    }

    if (failed.length > 0) {
      const details = failed
        .map(
          item => `Tool ${item.toolId}: ${item.message}`
        )
        .join('\n');

      window.alert(
        `Some tools could not be checked in:\n\n${details}`
      );
    }
  } finally {
    isProcessing = false;
    updateSelection();

    // Refresh the current search after processing.
    await searchTools();
  }
});
