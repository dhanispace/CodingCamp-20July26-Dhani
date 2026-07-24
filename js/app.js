(function () {
  'use strict';

  // ─── Module-level state ────────────────────────────────────────────────────

  /** @type {Array<{id: string, name: string, amount: number, category: string}>} */
  let transactions = [];

  /** Set to true when Local Storage contains corrupt (non-parseable) JSON (Requirement 3.5) */
  let storageCorrupt = false;

  /** Set to false by the Chart.js <script onerror> handler if the CDN fails to load */
  let chartJsLoaded = true;

  /** Chart.js instance; created on first renderChart() call, updated on subsequent calls */
  let chartInstance = null;

  /** Category color palette used by Chart.js (Requirement 7.1) */
  const CATEGORY_COLORS = {
    Food:      '#FF6384',
    Transport: '#36A2EB',
    Fun:       '#FFCE56'
  };

  // ─── Utility functions ─────────────────────────────────────────────────────

  /**
   * Generates a unique ID string composed of the current timestamp and a random
   * alphanumeric suffix.
   *
   * @returns {string}  e.g. "1721234567890_abc123"
   */
  function generateId() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Formats a numeric amount as a USD currency string.
   *
   * @param   {number} amount  The numeric value to format.
   * @returns {string}         e.g. "$1,234.56"
   */
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style:                 'currency',
      currency:              'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Aggregates transaction amounts by category, excluding categories whose total
   * is zero or below.
   *
   * @param   {Array<{category: string, amount: number}>} list  Array of transaction objects.
   * @returns {{ [category: string]: number }}                  Map of category → total (non-zero only).
   *
   * Validates: Requirements 7.1, 7.4
   */
  function aggregateByCategory(list) {
    var totals = {};

    for (var i = 0; i < list.length; i++) {
      var tx = list[i];
      if (totals[tx.category] === undefined) {
        totals[tx.category] = 0;
      }
      totals[tx.category] += tx.amount;
    }

    // Exclude any category whose running total ended up at zero or below
    var result = {};
    var keys = Object.keys(totals);
    for (var k = 0; k < keys.length; k++) {
      if (totals[keys[k]] > 0) {
        result[keys[k]] = totals[keys[k]];
      }
    }

    return result;
  }

  // ─── Storage functions ─────────────────────────────────────────────────────

  /**
   * Reads and parses the transaction list from Local Storage.
   *
   * - Returns the parsed array on success.
   * - Returns `[]` and sets `storageCorrupt = true` if the stored value cannot
   *   be parsed as valid JSON; also clears the corrupt entry from storage.
   * - Returns `[]` if the parsed value is not an array (e.g. an object or null).
   * - Returns `[]` silently when no data is present under the key.
   *
   * @returns {Array<{id: string, name: string, amount: number, category: string}>}
   *
   * Validates: Requirements 3.1, 3.2, 3.3, 3.5
   */
  function readFromStorage() {
    var raw = localStorage.getItem('expense_transactions');

    if (raw === null) {
      // No data stored yet — normal zero-transaction state (Requirement 3.4)
      return [];
    }

    try {
      var parsed = JSON.parse(raw);

      // Guard against valid JSON that is not an array (e.g. `{}`, `null`, `42`)
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed;
    } catch (e) {
      // Corrupt / non-parseable JSON (Requirement 3.5)
      storageCorrupt = true;
      localStorage.removeItem('expense_transactions');
      return [];
    }
  }

  /**
   * Serializes the transaction list to JSON and persists it to Local Storage.
   *
   * @param {Array<{id: string, name: string, amount: number, category: string}>} list
   *
   * Validates: Requirements 3.1, 3.2
   */
  function writeToStorage(list) {
    localStorage.setItem('expense_transactions', JSON.stringify(list));
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  /**
   * Validates the transaction input form fields before submission.
   *
   * @param   {string} name      Raw item name from the text input.
   * @param   {string} amount    Raw amount string from the number input (parsed with parseFloat).
   * @param   {string} category  Selected category value from the dropdown.
   * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
   *
   * Validates: Requirements 2.4, 2.5, 2.6, 2.7
   */
  function validateForm(name, amount, category) {
    var errors = {};

    // Validate name: must not be empty or whitespace-only (Requirement 2.5)
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.name = 'Item name is required.';
    }

    // Validate amount: must be a finite number in [0.01, 999999999.99] (Requirement 2.6)
    var parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount < 0.01 || parsedAmount > 999999999.99) {
      errors.amount = 'Amount must be between 0.01 and 999,999,999.99.';
    }

    // Validate category: must be one of the three allowed values (Requirement 2.7)
    var validCategories = ['Food', 'Transport', 'Fun'];
    if (validCategories.indexOf(category) === -1) {
      errors.category = 'Please select a valid category.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  }

  // ─── Core transaction operations ───────────────────────────────────────────

  /**
   * Creates a new transaction, prepends it to the in-memory array, persists to
   * Local Storage, and triggers a full UI re-render.
   *
   * If the 500-transaction limit has already been reached, the submit button is
   * disabled, the limit notification is revealed, and the function returns null.
   *
   * @param   {string} name      Item name (will be trimmed).
   * @param   {number|string} amount  Expense amount (parsed to float).
   * @param   {string} category  One of "Food", "Transport", "Fun".
   * @returns {{ id: string, name: string, amount: number, category: string }|null}
   *
   * Validates: Requirements 3.1, 4.3, 9.2, 9.3
   */
  function addTransaction(name, amount, category) {
    // Guard: enforce 500-transaction limit (Requirement 9.3)
    if (transactions.length >= 500) {
      document.querySelector('#transaction-form button[type="submit"]').disabled = true;
      var limitNotification = document.getElementById('limit-notification');
      if (limitNotification) {
        limitNotification.removeAttribute('hidden');
      }
      return null;
    }

    // Build the new Transaction object
    var newTx = {
      id:       generateId(),
      name:     name.trim(),
      amount:   parseFloat(amount),
      category: category
    };

    // Insert at the front of the array (most-recent-first order, Requirement 4.3)
    transactions.unshift(newTx);

    // Persist and re-render
    writeToStorage(transactions);
    renderAll();

    return newTx;
  }

  /**
   * Removes the transaction with the given id from the in-memory array, persists
   * the updated list to Local Storage, and triggers a full UI re-render.
   *
   * @param {string} id  The unique identifier of the transaction to remove.
   *
   * Validates: Requirements 3.2, 5.2, 9.2
   */
  function removeTransaction(id) {
    transactions = transactions.filter(function(tx) { return tx.id !== id; });
    writeToStorage(transactions);
    renderAll();
  }

  /**
   * Calculates the total balance for a given list of transactions, rounded to
   * 2 decimal places.
   *
   * @param   {Array<{amount: number}>} list  Array of transaction objects.
   * @returns {number}  Sum of all amounts rounded to 2 decimal places, or 0 for
   *                    an empty array.
   *
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4
   */
  function computeBalance(list) {
    if (list.length === 0) {
      return 0;
    }

    var sum = 0;
    for (var i = 0; i < list.length; i++) {
      sum += list[i].amount;
    }

    return Math.round(sum * 100) / 100;
  }

  // ─── Render functions ──────────────────────────────────────────────────────
  /**
   * Rebuilds the #transaction-list DOM from the current `transactions` array.
   *
   * - Clears the container on every call (full re-render).
   * - Renders a placeholder when the list is empty (Requirement 4.5).
   * - Each entry is built with createElement to avoid XSS from user-supplied names
   *   (Requirements 4.1, 4.3, 4.4, 5.1, 5.2).
   *
   * Validates: Requirements 4.1, 4.3, 4.4, 4.5, 5.1, 5.2
   */
  function renderTransactionList() {
    var list = document.getElementById('transaction-list');

    // Clear previous content
    list.innerHTML = '';

    // Empty state placeholder (Requirement 4.5)
    if (transactions.length === 0) {
      var placeholder = document.createElement('p');
      placeholder.className = 'empty-placeholder';
      placeholder.textContent = 'No transactions yet';
      list.appendChild(placeholder);
      return;
    }

    // Render each transaction entry (transactions[] is already most-recent-first)
    for (var i = 0; i < transactions.length; i++) {
      (function (tx) {
        // Outer container — satisfies role="list" on the parent by using listitem role
        var entry = document.createElement('div');
        entry.setAttribute('role', 'listitem');
        entry.className = 'transaction-entry';

        // Item name span (Requirement 4.1)
        var nameSpan = document.createElement('span');
        nameSpan.className = 'entry-name';
        nameSpan.textContent = tx.name;

        // Amount span — formatted as currency (Requirement 4.1)
        var amountSpan = document.createElement('span');
        amountSpan.className = 'entry-amount';
        amountSpan.textContent = formatCurrency(tx.amount);

        // Category label span (Requirement 4.1)
        var categorySpan = document.createElement('span');
        categorySpan.className = 'entry-category';
        categorySpan.textContent = tx.category;

        // Delete button with accessible aria-label (Requirement 5.1)
        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
        deleteBtn.textContent = 'Delete';

        // Click handler calls removeTransaction with this entry's id (Requirement 5.2)
        deleteBtn.addEventListener('click', function () {
          removeTransaction(tx.id);
        });

        entry.appendChild(nameSpan);
        entry.appendChild(amountSpan);
        entry.appendChild(categorySpan);
        entry.appendChild(deleteBtn);

        list.appendChild(entry);
      })(transactions[i]);
    }
  }

  /**
   * Recalculates the total balance from the current transaction list and updates
   * the #balance-amount element.
   *
   * - Formats the total using formatCurrency() (Requirement 6.1)
   * - Updates the text content of #balance-amount (Requirement 6.2, 6.3, 6.4)
   * - Toggles the .negative CSS class when the total is less than 0 (Requirement 6.5)
   *
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
   */
  function renderBalance() {
    var total = computeBalance(transactions);
    var balanceEl = document.getElementById('balance-amount');
    balanceEl.textContent = formatCurrency(total);
    if (total < 0) {
      balanceEl.classList.add('negative');
    } else {
      balanceEl.classList.remove('negative');
    }
  }

  /**
   * Renders or updates the spending pie chart using Chart.js.
   *
   * - If Chart.js failed to load, shows #chart-error and returns early.
   * - If there are no transactions with a positive total, hides the canvas and
   *   shows #chart-placeholder (destroying any existing chart instance first).
   * - Otherwise, creates a new Chart instance or updates the existing one with
   *   the latest aggregated data.
   *
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.7
   */
  function renderChart() {
    var canvas = document.getElementById('spending-chart');
    var chartPlaceholder = document.getElementById('chart-placeholder');
    var chartError = document.getElementById('chart-error');

    // Requirement 7.7: Chart.js failed to load — show error, hide canvas, bail out
    if (!chartJsLoaded) {
      chartError.removeAttribute('hidden');
      canvas.setAttribute('hidden', '');
      return;
    }

    var aggregated = aggregateByCategory(transactions);
    var categories = Object.keys(aggregated);

    // Requirement 7.5: No data — hide canvas, show placeholder, destroy stale instance
    if (categories.length === 0) {
      canvas.setAttribute('hidden', '');
      chartPlaceholder.removeAttribute('hidden');
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      return;
    }

    // Data is present — show canvas, hide placeholder
    canvas.removeAttribute('hidden');
    chartPlaceholder.setAttribute('hidden', '');

    var labels = categories;
    var data = categories.map(function (cat) { return aggregated[cat]; });
    var backgroundColor = categories.map(function (cat) { return CATEGORY_COLORS[cat]; });

    if (chartInstance) {
      // Update existing instance (Requirement 7.2, 7.3)
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = data;
      chartInstance.data.datasets[0].backgroundColor = backgroundColor;
      chartInstance.update();
    } else {
      // Create new Chart instance (Requirement 7.1)
      chartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColor
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
  }
  /**
   * Triggers a full UI re-render by calling each render function in sequence.
   *
   * Called after every state-mutating operation (add / delete) so that the
   * Transaction List, Balance display, and Chart are always in sync with the
   * current `transactions` array.
   *
   * Validates: Requirements 9.1, 9.2
   */
  function renderAll() {
    renderTransactionList();
    renderBalance();
    renderChart();
  }

  // ─── Initialisation ────────────────────────────────────────────────────────

  /**
   * Initialises the application on DOMContentLoaded.
   *
   * 1. Checks for Chart.js CDN load failure and updates the chartJsLoaded flag.
   * 2. Reads persisted transactions from Local Storage.
   * 3. Shows the storage-corrupt warning banner when needed (Requirement 3.5).
   * 4. Performs the initial full UI render.
   * 5. Attaches the submit event listener to the transaction form, wiring up
   *    validation, error display, transaction creation, and form reset
   *    (Requirements 2.4–2.8, 3.3, 3.4, 3.5, 8.5).
   *
   * Validates: Requirements 1.4, 2.8, 3.3, 3.4, 3.5, 8.5
   */
  function init() {
    // Step 1: Honour the CDN failure flag set by the <script onerror> handler
    if (window.__chartJsLoadFailed) {
      chartJsLoaded = false;
    }

    // Step 2: Restore persisted transactions
    transactions = readFromStorage();

    // Step 3: Show storage-corrupt warning when applicable (Requirement 3.5)
    if (storageCorrupt) {
      var storageWarning = document.getElementById('storage-warning');
      if (storageWarning) {
        storageWarning.removeAttribute('hidden');
      }
    }

    // Step 4: Paint the initial UI
    renderAll();

    // Re-enable submit button if under the limit (e.g. user deleted some after a reload)
    if (transactions.length < 500) {
      var submitBtn = document.querySelector('#transaction-form button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
      }
      var limitNotif = document.getElementById('limit-notification');
      if (limitNotif) {
        limitNotif.setAttribute('hidden', '');
      }
    }

    // Step 5: Wire up the transaction form
    var form         = document.getElementById('transaction-form');
    var nameInput    = document.getElementById('item-name');
    var amountInput  = document.getElementById('amount');
    var categorySelect = document.getElementById('category');

    var errorName     = document.getElementById('error-item-name');
    var errorAmount   = document.getElementById('error-amount');
    var errorCategory = document.getElementById('error-category');

    form.addEventListener('submit', function (event) {
      // Always prevent the default browser form submission
      event.preventDefault();

      var nameVal     = nameInput.value;
      var amountVal   = amountInput.value;
      var categoryVal = categorySelect.value;

      var result = validateForm(nameVal, amountVal, categoryVal);

      if (!result.valid) {
        // Show error messages and mark fields aria-invalid for each failing field
        if (result.errors.name) {
          errorName.textContent = result.errors.name;
          nameInput.setAttribute('aria-invalid', 'true');
        } else {
          errorName.textContent = '';
          nameInput.removeAttribute('aria-invalid');
        }

        if (result.errors.amount) {
          errorAmount.textContent = result.errors.amount;
          amountInput.setAttribute('aria-invalid', 'true');
        } else {
          errorAmount.textContent = '';
          amountInput.removeAttribute('aria-invalid');
        }

        if (result.errors.category) {
          errorCategory.textContent = result.errors.category;
          categorySelect.setAttribute('aria-invalid', 'true');
        } else {
          errorCategory.textContent = '';
          categorySelect.removeAttribute('aria-invalid');
        }
      } else {
        // Clear ALL error spans and aria-invalid attributes before adding
        errorName.textContent     = '';
        errorAmount.textContent   = '';
        errorCategory.textContent = '';
        nameInput.removeAttribute('aria-invalid');
        amountInput.removeAttribute('aria-invalid');
        categorySelect.removeAttribute('aria-invalid');

        // Persist the new transaction and re-render
        addTransaction(nameVal, amountVal, categoryVal);

        // Reset the form to its blank/placeholder state (Requirement 2.8)
        form.reset();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
