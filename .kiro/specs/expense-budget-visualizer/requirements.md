# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by category. Users can add and delete transactions, view their total balance, and see a visual breakdown of spending by category through a pie chart. The application runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted via the browser's Local Storage API. No backend server or build toolchain is required.

## Glossary

- **App**: The Expense & Budget Visualizer web application running in the browser.
- **Transaction**: A single expense record consisting of an item name, amount, and category.
- **Category**: A classification label for a transaction. Supported values: Food, Transport, Fun.
- **Transaction List**: The scrollable UI element displaying all stored transactions.
- **Balance**: The sum of all transaction amounts currently stored in Local Storage.
- **Chart**: The pie chart rendered by Chart.js that visualizes spending distribution by category.
- **Local Storage**: The browser's Web Storage API used to persist transaction data client-side.
- **Input Form**: The HTML form containing fields for item name, amount, and category.
- **Validator**: The client-side validation logic that checks Input Form fields before submission.

---

## Requirements

### Requirement 1: Project Structure and Technology Stack

**User Story:** As a developer, I want the project to use only HTML, CSS, and Vanilla JavaScript with a clear folder structure, so that the codebase is simple to understand and maintain without any build tools or framework setup.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no frontend frameworks (React, Vue, Angular, etc.), no CSS preprocessors (Sass, Less, etc.), no module bundlers (Webpack, Vite, etc.), and no backend server.
2. THE App SHALL contain exactly one CSS file located at `css/style.css`; no other .css files shall exist in the project.
3. THE App SHALL contain exactly one JavaScript file located at `js/app.js`; no other .js files shall exist in the project.
4. THE App SHALL render within 3 seconds in the latest stable versions of Chrome, Firefox, Edge, and Safari when opened directly from the file system (via `file://` protocol), with zero console errors during normal operation.

---

### Requirement 2: Transaction Input Form

**User Story:** As a user, I want to fill out a form with an item name, amount, and category, so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input Form SHALL contain a text field for entering an item name with a maximum length of 100 characters.
2. THE Input Form SHALL contain a numeric field for entering an amount that accepts values in the range 0.01 to 999,999,999.99.
3. THE Input Form SHALL contain a dropdown selector with the options: Food, Transport, and Fun, with no pre-selected default option (a placeholder such as "Select a category" SHALL be shown).
4. WHEN the user submits the Input Form, THE Validator SHALL verify that the item name field is not empty, the amount field contains a value in the range 0.01 to 999,999,999.99, and a category is selected.
5. IF the item name field is empty on submit, THEN THE Validator SHALL display an inline error message adjacent to the item name field and prevent the transaction from being added.
6. IF the amount field does not contain a number in the range 0.01 to 999,999,999.99 on submit, THEN THE Validator SHALL display an inline error message adjacent to the amount field and prevent the transaction from being added.
7. IF no category is selected on submit, THEN THE Validator SHALL display an inline error message adjacent to the category field and prevent the transaction from being added.
8. WHEN the Input Form is successfully submitted, THE App SHALL reset the item name field to empty, the amount field to empty, and the category selector to its placeholder state.

---

### Requirement 3: Transaction Persistence via Local Storage

**User Story:** As a user, I want my transactions to be saved automatically, so that my data is still available when I reload or reopen the browser tab.

#### Acceptance Criteria

1. WHEN a new transaction is successfully added, THE App SHALL serialize the full transaction list to JSON and write it to Local Storage under the fixed application-specific key `"expense_transactions"`.
2. WHEN a transaction is deleted, THE App SHALL update the transaction list in Local Storage under the same key `"expense_transactions"` to reflect the deletion.
3. WHEN the App is loaded or reloaded, THE App SHALL read the transaction list from Local Storage and restore all previously saved transactions to the UI before the user can interact with the interface.
4. IF Local Storage contains no transaction data on load, THEN THE App SHALL render the UI in the zero-transaction state (empty transaction list and a Balance of 0.00).
5. IF Local Storage contains data under `"expense_transactions"` that cannot be parsed as valid JSON, THEN THE App SHALL discard the corrupted data, initialize with an empty transaction list, and display a non-blocking warning message to the user.

---

### Requirement 4: Transaction List Display

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review what I have spent.

#### Acceptance Criteria

1. THE Transaction List SHALL display all stored transactions, each entry showing the item name (up to 100 characters), the amount formatted as a currency value (2 decimal places with currency symbol), and the category label.
2. THE Transaction List container SHALL have a fixed maximum height with `overflow-y: auto` so that it becomes scrollable when entries exceed the visible area.
3. WHEN a transaction is added, THE Transaction List SHALL insert the new entry at the top of the list immediately (most recent first order) without requiring a page reload.
4. WHEN a transaction is deleted, THE Transaction List SHALL remove that entry immediately without requiring a page reload.
5. WHEN the transaction list is empty, THE App SHALL display a placeholder message (e.g., "No transactions yet") inside the Transaction List container.

---

### Requirement 5: Delete Transaction

**User Story:** As a user, I want to delete individual transactions from the list, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. Each transaction entry in THE Transaction List SHALL render a clearly labeled delete button or icon with an accessible `aria-label` (e.g., `aria-label="Delete [item name]"`).
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the in-memory array and synchronously update Local Storage.
3. WHEN a transaction is deleted, THE App SHALL recalculate and update the Balance display and re-render the Chart within 200 milliseconds.

---

### Requirement 6: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the total Balance formatted as a currency value (2 decimal places with currency symbol) in a visually prominent position at the top of the page.
2. WHEN a transaction is added, THE App SHALL recalculate and update the Balance display to reflect the new total within 1 second of the add action, without requiring a page reload.
3. WHEN a transaction is deleted, THE App SHALL recalculate and update the Balance display to reflect the reduced total within 1 second of the delete action, without requiring a page reload.
4. WHEN the transaction list is empty, THE App SHALL display a Balance of "0.00" (currency formatted).
5. IF the total Balance is negative (expenses exceed income), THEN THE App SHALL display the Balance in a visually distinct color (e.g., red) to indicate a deficit.

---

### Requirement 7: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. THE App SHALL render a pie chart using Chart.js where each arc's proportion equals `category_total / sum_of_all_totals` for each category with a non-zero total.
2. WHEN a transaction is added, THE Chart SHALL update automatically to reflect the new category distribution within 1 second, without requiring a page reload.
3. WHEN a transaction is deleted, THE Chart SHALL update automatically to reflect the updated category distribution within 1 second, without requiring a page reload.
4. THE Chart SHALL display only categories with a total amount greater than zero.
5. WHEN the transaction list is empty, THE Chart canvas SHALL be replaced by a placeholder message (e.g., "No data to display") inside the chart container.
6. THE App SHALL load Chart.js from a CDN `<script>` tag in the HTML file so that no local installation or build step is required.
7. IF Chart.js fails to load from the CDN, THEN THE App SHALL display a fallback error message in place of the Chart indicating that the chart could not be rendered.

---

### Requirement 8: Responsive and Accessible UI

**User Story:** As a user, I want the application to be readable and usable on different screen sizes and accessible to assistive technologies, so that I can use it on desktop and mobile browsers.

#### Acceptance Criteria

1. THE App SHALL render without horizontal scrolling on viewport widths from 320px to 1440px; all interactive controls SHALL have a minimum touch target size of 44×44 CSS pixels.
2. THE Input Form SHALL associate each input field with a visible `<label>` element using matching `for` and `id` attributes, and SHALL mark all required fields with `aria-required="true"`, so that screen readers can identify each field and its required status.
3. Normal text (below 18pt / 14pt bold) SHALL meet a minimum contrast ratio of 4.5:1 between text and background colors; large text (18pt or above, or 14pt bold or above) SHALL meet a minimum contrast ratio of 3:1.
4. WHEN the user navigates the App using only a keyboard, THE App SHALL support Tab (forward focus), Shift+Tab (backward focus), Enter (submit form), and Space (activate buttons); all focused interactive elements SHALL display a visible focus indicator.
5. WHEN inline validation errors are displayed, THE App SHALL announce those error messages to screen readers via `aria-live` regions or `role="alert"` attributes.

---

### Requirement 9: Performance

**User Story:** As a user, I want the application to load quickly and respond instantly to interactions, so that I am not waiting for the UI to update.

#### Acceptance Criteria

1. THE App SHALL complete initial render and display all stored transactions within 1 second on a modern browser with a cold cache, for a transaction list of up to 500 entries.
2. WHEN a transaction is added or deleted, THE App SHALL update the Transaction List, Balance display, and Chart within 200 milliseconds from the moment the user confirms the action (form submit or delete click) to all three components reflecting the change.
3. THE App SHALL support a maximum of 500 stored transactions; WHEN the limit is reached, THE App SHALL prevent adding new transactions and display a non-blocking notification informing the user that the limit has been reached.
