//This file was assembled with the aid of AI(ChatGPT). Original APIs submitted did not function
//This file contains the APIs to connect the database tables and data to the HTML and JavaScript pages.

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = 3000;

// One PostgreSQL connection pool for the entire application.
const db = new Pool({
  host: 'localhost',
  user: 'postgres',
  port: 5433,
  password: 'August1985!',
  database: 'Tool Crib'
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve all frontend files from the public folder.
const publicFolder = path.join(__dirname, 'public');
app.use(express.static(publicFolder, { index: false }));

// --------------------------------------------------
// PAGE ROUTES
// --------------------------------------------------

app.get('/', (req, res) => {
  res.sendFile(path.join(publicFolder, 'index.html'));
});
// --------------------------------------------------
// LOGIN
// POST /login
// --------------------------------------------------
app.post('/login', async (req, res) => {
  const { employeeId, password } = req.body;

  if (
    typeof employeeId !== 'string' ||
    typeof password !== 'string' ||
    !employeeId.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: 'Enter your employee ID and password.'
    });
  }

  try {
    const result = await db.query(
      `SELECT "Employee_ID", "Name", "Password"
        FROM public."User Accounts"
        WHERE "Employee_ID" = $1`,
      [employeeId.trim()]
    );

    const user = result.rows[0];

    if (!user || password !== user.Password) {
      return res.status(401).json({
        message: 'Incorrect employee ID or password.'
      });
    }

    return res.json({
      success: true,
      redirect: '/MainMenu.html'
    });

  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      message: 'A server error occurred.'
    });
  }
});
// --------------------------------------------------
// CREATE TOOL RECORD
// POST /postData
// --------------------------------------------------

app.post('/postData', async (req, res) => {
  const {
    Tool_ID,
    Description,
    Model_Number,
    Serial_Number,
    Manufacturer,
    Location,
    Calibration_Date,
    Calibration_Due,
    Type
  } = req.body;

  if (
    Tool_ID == null ||
    !String(Tool_ID).trim() ||
    !Description ||
    !String(Description).trim()
  ) {
    return res.status(400).json({
      message: 'Tool ID and Description are required.'
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO public."Tools"
        ("Tool_ID", "Description", "Model_Number",
        "Serial_Number", "Manufacturer", "Location",
        "Calibration_Date", "Calibration_Due", "Type")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        Tool_ID,
        Description,
        Model_Number || null,
        Serial_Number || null,
        Manufacturer || null,
        Location || null,
        Calibration_Date || null,
        Calibration_Due || null,
        Type || null
      ]
    );

    return res.status(201).json({
      message: 'Tool record created successfully.',
      tool: result.rows[0]
    });
  } catch (error) {
    console.error('Create tool error:', error);
    return res.status(500).json({
      message: 'Could not create tool record. Check the database columns and values.'
    });
  }
});

// --------------------------------------------------
// FETCH ALL TOOLS
// GET /fetchData
// --------------------------------------------------

app.get('/fetchData', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM public."Tools" ORDER BY "Tool_ID"`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Fetch tools error:', error);
    return res.status(500).json({
      message: 'Could not retrieve tool records.'
    });
  }
});

// --------------------------------------------------
// FETCH ONE TOOL BY TOOL ID
// GET /api/tools/:toolId
// --------------------------------------------------

app.get('/api/tools/search', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.status(400).json({
      message: 'Enter a search term.'
    });
  }

  try {
    const result = await db.query(
      `SELECT
          t.*,
          active."Employee_ID" AS "Checked_Out_By_ID",
          ua."Name" AS "Checked_Out_By"
        FROM public."Tools" AS t

        LEFT JOIN LATERAL (
          SELECT
            h."Employee_ID"
          FROM public."History" AS h
          WHERE h."Tool_ID"::TEXT = t."Tool_ID"::TEXT

            -- Only checkout events.
            AND LOWER(TRIM(h."Event_Type"))
                IN ('check out', 'checkout', 'checked out')

            -- A checkout with a return date is no longer active.
            AND h."Return_Date" IS NULL

            -- Ignore checkout events without a checkout date
            -- only if your application requires that field
            ORDER BY
            h."Check_Out_Date" DESC NULLS LAST,
            h."Event_Date" DESC NULLS LAST,
            h."ID" DESC
          LIMIT 1
        ) AS active ON TRUE

        LEFT JOIN public."User Accounts" AS ua
          ON ua."Employee_ID" = active."Employee_ID"

        WHERE
          CAST(t."Tool_ID" AS TEXT) ILIKE $1
          OR COALESCE(t."Description", '') ILIKE $1
          OR COALESCE(t."Model_Number", '') ILIKE $1
          OR COALESCE(t."Serial_Number", '') ILIKE $1
          OR COALESCE(t."Manufacturer", '') ILIKE $1
          OR COALESCE(t."Type", '') ILIKE $1
          OR COALESCE(t."Location", '') ILIKE $1

        ORDER BY t."Tool_ID"`,
      [`%${q}%`]
    );

    return res.json(result.rows);

  } catch (error) {
    console.error('Search tools error:', error.message);
    console.error('PostgreSQL error code:', error.code);

    return res.status(500).json({
      message: 'Could not search tool records.'
    });
  }
});

app.get('/api/tools/:toolId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM public."Tools"
        WHERE "Tool_ID" = $1`,
      [req.params.toolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Tool not found.'
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch tool error:', error);
    return res.status(500).json({
      message: 'Could not retrieve tool record.'
    });
  }
});


// --------------------------------------------------
// SEARCH TOOLS
// GET /api/tools/search?q=hammer
// --------------------------------------------------

app.get('/api/tools/search', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.status(400).json({
      message: 'Enter a search term.'
    });
  }

  try {
    const result = await db.query(
      `SELECT
          t.*,
          active."Employee_ID" AS "Checked_Out_By_ID",
          ua."Name" AS "Checked_Out_By"
        FROM public."Tools" AS t

        LEFT JOIN LATERAL (
          SELECT h."Employee_ID"
          FROM public."History" AS h
          WHERE h."Tool_ID"::TEXT = t."Tool_ID"::TEXT
            AND LOWER(TRIM(h."Event_Type"))
            IN ('check out', 'checkout', 'checked out')
            AND h."Return_Date" IS NULL
          ORDER BY
            h."Check_Out_Date" DESC NULLS LAST,
            h."Event_Date" DESC NULLS LAST,
            h."ID" DESC
          LIMIT 1
        ) AS active ON TRUE

        LEFT JOIN public."User Accounts" AS ua
          ON ua."Employee_ID" = active."Employee_ID"

        WHERE
          CAST(t."Tool_ID" AS TEXT) ILIKE $1
          OR COALESCE(t."Description", '') ILIKE $1
          OR COALESCE(t."Model_Number", '') ILIKE $1
          OR COALESCE(t."Serial_Number", '') ILIKE $1
          OR COALESCE(t."Manufacturer", '') ILIKE $1
          OR COALESCE(t."Type", '') ILIKE $1
          OR COALESCE(t."Location", '') ILIKE $1
          ORDER BY t."Tool_ID"`,
      [`%${q}%`]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Search tools error:', error.message);
    console.error('PostgreSQL error code:', error.code);

    return res.status(500).json({
      message: 'Could not search tool records.',
      code: error.code
    });
  }
});

// --------------------------------------------------
// FETCH EMPLOYEE ACCOUNT
// GET /fetchByID/:Employee_ID
// --------------------------------------------------

app.get('/fetchByID/:Employee_ID', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT "Employee_ID", "Name"
        FROM public."User Accounts"
        WHERE "Employee_ID" = $1`,
      [req.params.Employee_ID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Employee not found.'
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch employee error:', error);
    return res.status(500).json({
      message: 'Could not retrieve employee.'
    });
  }
});

// GET /api/employees/:employeeId

app.get('/api/employees/:employeeId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT "Employee_ID", "Name", "Position", "Manager"
        FROM public."Users"
        WHERE "Employee_ID" = $1`,
      [req.params.employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Employee not found.'
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Employee lookup error:', error);
    return res.status(500).json({
      message: 'Could not retrieve employee details.'
    });
  }
});

// --------------------------------------------------
// UPDATE TOOL LOCATION
// PUT /update/:id
// --------------------------------------------------

app.put('/update/:id', async (req, res) => {
  const { Location } = req.body;

  if (typeof Location !== 'string' || !Location.trim()) {
    return res.status(400).json({
      message: 'Enter a valid location.'
    });
  }

  try {
    const result = await db.query(
      `UPDATE public."Tools"
        SET "Location" = $1
        WHERE "Tool_ID" = $2
        RETURNING *`,
      [Location.trim(), req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Tool not found.'
      });
    }

    return res.json({
      message: 'Tool location updated successfully.',
      tool: result.rows[0]
    });
  } catch (error) {
    console.error('Update location error:', error);
    return res.status(500).json({
      message: 'Could not update tool location.'
    });
  }
});

/* --------------------------------------------------
CHECK OUT A TOOL
POST /api/checkout
-------------------------------------------------- */

app.post('/api/checkout', async (req, res) => {
  const { employeeId, toolId } = req.body;

  if (
    employeeId == null ||
    !String(employeeId).trim() ||
    toolId == null ||
    !String(toolId).trim()
  ) {
    return res.status(400).json({
      message: 'Employee ID and Tool ID are required.'
    });
  }

  let client;
  let transactionStarted = false;

  try {
    // Get a database connection.
    client = await db.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    // 1. Find the employee.
    const employeeResult = await client.query(
      `SELECT "Employee_ID", "Name"
        FROM public."User Accounts"
        WHERE "Employee_ID" = $1`,
      [String(employeeId).trim()]
    );

    if (employeeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        message: 'Employee not found.'
      });
    }

    const employee = employeeResult.rows[0];

    // 2. Find and lock the selected tool.
    const toolResult = await client.query(
      `SELECT "Tool_ID", "Description", "Model_Number",
              "Serial_Number", "Manufacturer", "Location",
              "Calibration_Date", "Calibration_Due"
              FROM public."Tools"
              WHERE "Tool_ID" = $1
              FOR UPDATE`,
      [String(toolId).trim()]
    );

    if (toolResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        message: 'Tool not found.'
      });
    }

    const tool = toolResult.rows[0];

    const activeCheckoutResult = await client.query(
  `SELECT "ID"
   FROM public."History"
   WHERE "Tool_ID"::TEXT = $1
     AND LOWER(TRIM("Event_Type"))
         IN ('check out', 'checkout', 'checked out')
     AND "Return_Date" IS NULL
   LIMIT 1`,
  [String(tool.Tool_ID)]
);

if (activeCheckoutResult.rows.length > 0) {
  await client.query('ROLLBACK');
  transactionStarted = false;

  return res.status(409).json({
    message: 'This tool is already checked out.'
  });
}

    // 3. Insert the checkout record.
    const checkoutResult = await client.query(
      `INSERT INTO public."History"
        ("Tool_ID", "Employee_ID", "Event_Type",
        "Event_Date", "Check_Out_Date", "Return_Date",
        "Calibration_Date", "Calibration_Due")
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP, NULL, $4, $5)
       RETURNING *`,
      [
        tool.Tool_ID,
        employee.Employee_ID,
        'Check Out',
        tool.Calibration_Date,
        tool.Calibration_Due
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: 'Tool checked out successfully.',
      checkout: checkoutResult.rows[0]
    });

  } catch (error) {
    // Roll back only if a transaction was started.
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Checkout rollback error:',
          rollbackError.message
        );
      }
    }

    // Log diagnostic information in the server terminal.
    console.error('Checkout error message:', error.message);
    console.error('PostgreSQL error code:', error.code || 'N/A');
    console.error('PostgreSQL detail:', error.detail || 'N/A');
    console.error('PostgreSQL constraint:', error.constraint || 'N/A');
    console.error('PostgreSQL table:', error.table || 'N/A');
    console.error('PostgreSQL column:', error.column || 'N/A');
    console.error('Error stack:', error.stack);

    // Return a safe message to the frontend.
    return res.status(500).json({
      message: 'Could not check out the tool. Check the server terminal for details.',
      code: error.code || 'INTERNAL_ERROR'
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

// --------------------------------------------------
// CREATE EMPLOYEE ACCOUNT
// POST /api/employees
// --------------------------------------------------

app.post('/api/employees', async (req, res) => {
  const {
    employeeId,
    name,
    email,
    password,
    position,
    manager
  } = req.body;

  const fields = {
    employeeId,
    name,
    email,
    password,
    position,
    manager
  };

  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({
        message: `Please enter a valid ${field}.`
      });
    }
  }

  try {

    const result = await db.query(
      `INSERT INTO public."User Accounts"
        ("Employee_ID", "Name", "Email", "Password",
        "Manager", "Position")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING "Employee_ID", "Name", "Email",
        "Manager", "Position"`,
      [
        employeeId.trim(),
        name.trim(),
        email.trim(),
        password,
        manager.trim(),
        position.trim()
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Employee account created successfully.',
      employee: result.rows[0]
    });

  } catch (error) {
    console.error('Create employee error:', error.message);
    console.error('PostgreSQL error code:', error.code);

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Employee ID or email already exists.'
      });
    }

    return res.status(500).json({
      message: 'Could not create employee account.'
    });
  }
});

/* --------------------------------------------------
RESET PASSWORD
POST /api/reset-password
-------------------------------------------------- */

app.post('/api/reset-password', async (req, res) => {
  const { employeeId, name, email, newPassword } = req.body;

  // Validate the submitted fields.
  if (
    typeof employeeId !== 'string' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof newPassword !== 'string' ||
    !employeeId.trim() ||
    !name.trim() ||
    !email.trim() ||
    !newPassword.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Please complete all fields.'
    });
  }

  try {
    // Find the employee by ID.
    const result = await db.query(
      `SELECT "Employee_ID", "Name", "Email"
        FROM public."User Accounts"
        WHERE BTRIM("Employee_ID"::TEXT) = $1`,
      [employeeId.trim()]
    );

    // Check whether the employee exists.
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID was not found.'
      });
    }

    const employee = result.rows[0];

    // Compare the submitted name and email.
    const dbName = String(employee.Name ?? '').trim();
const dbEmail = String(employee.Email ?? '').trim();

const submittedName = name.trim();
const submittedEmail = email.trim();

const nameMatches =
  dbName.localeCompare(submittedName, undefined, {
    sensitivity: 'accent'
  }) === 0;

const emailMatches =
  dbEmail.toLowerCase() === submittedEmail.toLowerCase();

console.log('Password reset diagnostic:', {
  employeeFound: true,
  nameMatches,
  emailMatches,
  dbNameLength: dbName.length,
  submittedNameLength: submittedName.length,
  dbEmailLength: dbEmail.length,
  submittedEmailLength: submittedEmail.length
});

if (!nameMatches || !emailMatches) {
  return res.status(400).json({
    success: false,
    message: 'Name or email does not match our records.'
  });
}

// Update the password in PostgreSQL.
const updateResult = await db.query(
  `UPDATE public."User Accounts"
    SET "Password" = $1
    WHERE "Employee_ID" = $2
    RETURNING "Employee_ID"`,
  [newPassword, employee.Employee_ID]
);

// Confirm that a row was updated.
if (updateResult.rowCount !== 1) {
  return res.status(500).json({
    success: false,
    message: 'Password could not be updated.'
  });
}

// Send a success message to the frontend.
return res.status(200).json({
  success: true,
  message: 'Password reset successfully! You can now log in.'
});

} catch (error) {
  console.error('Password reset error:', error.message);

  return res.status(500).json({
    success: false,
    message: 'A server error occurred while resetting the password.'
  });
}
});

/* --------------------------------------------------
EMPLOYEE RECORD
GET /api/employee-record/:employeeId
-------------------------------------------------- */

app.get('/api/employee-record/:employeeId', async (req, res) => {
  const employeeId = String(req.params.employeeId || '').trim();

  if (!employeeId) {
    return res.status(400).json({
      message: 'Enter an Employee ID.'
    });
  }

  try {
    // 1. Fetch employee information from Users.
    const employeeResult = await db.query(
      `SELECT
          "Employee_ID",
          "Name",
          "Position",
          "Manager"
        FROM public."Users"
        WHERE BTRIM("Employee_ID"::TEXT) = $1
        LIMIT 1`,
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Employee not found.'
      });
    }

    const employee = employeeResult.rows[0];

    // 2. Fetch tools currently checked out by this employee.
    const toolsResult = await db.query(
      `SELECT
          t."Tool_ID",
          t."Description",
          t."Model_Number",
          t."Serial_Number",
          t."Manufacturer",
          t."Type",
          t."Location",
          t."Calibration_Date",
          t."Calibration_Due"
        FROM public."History" AS h
        INNER JOIN public."Tools" AS t
        ON t."Tool_ID"::TEXT = h."Tool_ID"::TEXT
        WHERE h."Employee_ID"::TEXT = $1
        AND LOWER(TRIM(h."Event_Type"))
        IN ('check out', 'checkout', 'checked out')
        AND h."Return_Date" IS NULL
        ORDER BY t."Tool_ID"`,
      [employeeId]
    );

    return res.json({
      employee,
      tools: toolsResult.rows
    });

  } catch (error) {
    console.error('Employee record error:', error);

    return res.status(500).json({
      message: 'Could not retrieve employee record.'
    });
  }
});

/* --------------------------------------------------
   CHECK IN A TOOL
   POST /api/checkin
-------------------------------------------------- */

app.post('/api/checkin', async (req, res) => {
  const { checkoutId } = req.body;

  if (
    checkoutId == null ||
    !String(checkoutId).trim()
  ) {
    return res.status(400).json({
      message: 'Checkout ID is required.'
    });
  }

  let client;
  let transactionStarted = false;

  try {
    client = await db.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    const updateResult = await client.query(
      `UPDATE public."History"
       SET "Return_Date" = CURRENT_TIMESTAMP
       WHERE "ID" = $1
         AND LOWER(BTRIM("Event_Type"))
             IN ('check out', 'checkout', 'checked out')
         AND "Return_Date" IS NULL
       RETURNING "ID", "Tool_ID", "Employee_ID", "Return_Date"`,
      [String(checkoutId).trim()]
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(409).json({
        message:
          'This checkout has already been returned or is no longer active. Search again to refresh the results.'
      });
    }

    await client.query('COMMIT');
    transactionStarted = false;

    return res.json({
      success: true,
      message: 'Tool checked in successfully.',
      checkout: updateResult.rows[0]
    });

  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Check-in rollback error:', rollbackError.message);
      }
    }

    console.error('Check-in error:', error.message);
    console.error('PostgreSQL error code:', error.code);

    return res.status(500).json({
      message: 'Could not check in the tool.'
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

/* --------------------------------------------------
   SEARCH TOOLS FOR RETURN
   GET /api/return/search?q=...
-------------------------------------------------- */

app.get('/api/return/search', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.status(400).json({
      message: 'Enter an employee name, employee ID, or tool ID.'
    });
  }

  try {
    const result = await db.query(
      `SELECT
          t."Tool_ID",
          t."Description",
          t."Model_Number",
          t."Serial_Number",
          t."Manufacturer",
          t."Type",
          t."Location",
          t."Calibration_Date",
          t."Calibration_Due",
          active."ID" AS "Checkout_ID",
          active."Employee_ID" AS "Checked_Out_By_ID",
          ua."Name" AS "Checked_Out_By"
       FROM public."Tools" AS t

       INNER JOIN LATERAL (
         SELECT
           h."ID",
           h."Employee_ID"
         FROM public."History" AS h
         WHERE BTRIM(h."Tool_ID"::TEXT) =
               BTRIM(t."Tool_ID"::TEXT)
           AND LOWER(BTRIM(h."Event_Type"))
               IN ('check out', 'checkout', 'checked out')
           AND h."Return_Date" IS NULL
         ORDER BY h."ID" DESC
         LIMIT 1
       ) AS active ON TRUE

       LEFT JOIN public."User Accounts" AS ua
         ON BTRIM(ua."Employee_ID"::TEXT) =
            BTRIM(active."Employee_ID"::TEXT)

       WHERE
         t."Tool_ID"::TEXT ILIKE $1
         OR COALESCE(t."Description"::TEXT, '') ILIKE $1
         OR COALESCE(active."Employee_ID"::TEXT, '') ILIKE $1
         OR COALESCE(ua."Name"::TEXT, '') ILIKE $1

       ORDER BY t."Tool_ID"`,
      [`%${q}%`]
    );

    // Never return a selectable item without its checkout ID.
    const invalidRow = result.rows.find(
      row => row.Checkout_ID == null || row.Tool_ID == null
    );

    if (invalidRow) {
      console.error('Invalid return search row:', invalidRow);

      return res.status(500).json({
        message: 'A search result is missing its checkout or tool ID.'
      });
    }

    return res.json(result.rows);

  } catch (error) {
    console.error('Return search error:', error.message);
    console.error('PostgreSQL error code:', error.code);
    console.error('PostgreSQL detail:', error.detail);
    console.error('PostgreSQL table:', error.table);
    console.error('PostgreSQL column:', error.column);

    return res.status(500).json({
      message: 'Could not search checked-out tools.',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
});

/* --------------------------------------------------
   FETCH TOOL HISTORY
   GET /api/tools/:toolId/history
-------------------------------------------------- */

app.get('/api/tools/:toolId/history', async (req, res) => {
  const toolId = String(req.params.toolId || '').trim();

  if (!toolId) {
    return res.status(400).json({
      message: 'Tool ID is required.'
    });
  }

  try {
    const result = await db.query(
      `SELECT
          h."ID",
          h."Tool_ID",
          h."Employee_ID",
          ua."Name" AS "Employee_Name",
          h."Event_Type",
          h."Event_Date",
          h."Check_Out_Date",
          h."Return_Date",
          h."Calibration_Date",
          h."Calibration_Due"
       FROM public."History" AS h
       LEFT JOIN public."User Accounts" AS ua
         ON ua."Employee_ID"::TEXT = h."Employee_ID"::TEXT
       WHERE BTRIM(h."Tool_ID"::TEXT) = $1
       ORDER BY
         h."Event_Date" DESC NULLS LAST,
         h."ID" DESC`,
      [toolId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Tool history error:', error.message);

    return res.status(500).json({
      message: 'Could not retrieve tool history.'
    });
  }
});
// --------------------------------------------------
// START ONE SERVER
// --------------------------------------------------

async function startServer() {
  try {
    await db.query('SELECT 1');
    console.log('Connected to PostgreSQL');

    app.listen(PORT, () => {
      console.log(`Tool Crib running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Could not connect to PostgreSQL:', error.message);
    process.exit(1);
  }
}

startServer();
