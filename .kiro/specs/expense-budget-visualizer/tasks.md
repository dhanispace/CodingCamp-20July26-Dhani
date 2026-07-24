# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a single-page, client-side expense tracker using pure HTML, CSS, and Vanilla JavaScript. All logic lives in `js/app.js` as a single IIFE, styles in `css/style.css`, and markup in `index.html`. Chart.js is loaded from CDN. Data is persisted to `localStorage` under the key `"expense_transactions"`.

---

## Tasks

- [x] 1. Set up project file structure and HTML skeleton
  - Create `index.html` with the full semantic HTML structure: `<header>` with `#balance-display`, `<main>` with `#form-section`, `#transactions-section`, and `#chart-section`
  - Add Chart.js CDN `<script>` tag with an `onerror` handler attribute to detect load failure
  - Add `<link>` to `css/style.css` and `<script defer>` to `js/app.js`
  - Include all form fields: `#item-name` (text, maxlength=100), `#amount` (number, min=0.01, max=999999999.99, step=0.01), `#category` (select with Food/Transport/Fun options and a disabled placeholder)
  - Add `aria-required="true"` on each required input; add `<span class="error-msg" role="alert" aria-live="polite">` adjacent to each field
  - Add `#chart-placeholder` and `#chart-error` paragraphs (initially `hidden`) inside `#chart-container`
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 7.6, 8.2_

- [x] 2. Implement core CSS layout and styles
  - [x] 2.1 Write base layout and typography styles in `css/style.css`
    - Responsive single-column layout that works from 320px to 1440px viewport with no horizontal scroll
    - Use CSS custom properties for colors and spacing
    - Style `<header>`, `<main>`, `<section>` with readable margins and padding
    - _Requirements: 1.2, 8.1, 8.3_

  - [x] 2.2 Style the input form, transaction list, and chart section
    - Style form fields and submit button with minimum 44×44px touch targets
    - Style `.error-msg` as hidden by default; show when non-empty (use `:not(:empty)` or a `.visible` class)
    - Style `#transaction-list` with a fixed max-height and `overflow-y: auto` for scrolling
    - Style each transaction entry (item name, amount, category label, delete button)
    - Add visible `:focus` indicator for all interactive elements
    - Style balance amount to display in red when it has a `.negative` class
    - _Requirements: 4.2, 5.1, 6.5, 8.1, 8.3, 8.4_

- [x] 3. Implement `js/app.js` — IIFE scaffold and utility functions
  - Create the IIFE wrapper: `(function() { 'use strict'; ... })();`
  - Declare module-level state: `let transactions = [];` and `let chartJsLoaded = true;`
  - Implement `generateId()` — returns `Date.now() + '_' + Math.random().toString(36).slice(2, 8)`
  - Implement `formatCurrency(amount)` — returns amount formatted as `"$1,234.56"` using `toLocaleString` or `Intl.NumberFormat`
  - Implement `aggregateByCategory(list)` — iterates transactions, sums amounts by category, excludes zero-total keys
  - _Requirements: 1.3, 7.1, 7.4_

- [x] 4. Implement storage functions
  - [x] 4.1 Implement `readFromStorage()` and `writeToStorage(list)` in `js/app.js`
    - `readFromStorage`: wrap `JSON.parse(localStorage.getItem("expense_transactions"))` in `try/catch`; on failure return `[]` and set a module-level flag `storageCorrupt = true`; clear the corrupt entry with `localStorage.removeItem`
    - `writeToStorage(list)`: serialize array to JSON and call `localStorage.setItem("expense_transactions", ...)`
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ]* 4.2 Write property test for Local Storage round-trip (Property 1)
    - **Property 1: Local Storage round-trip preserves transaction data**
    - For any valid `Transaction[]`, calling `writeToStorage` then `readFromStorage` must return a deeply equal array
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 5. Implement form validation
  - [x] 5.1 Implement `validateForm(name, amount, category)` in `js/app.js`
    - Return `{valid: true, errors: {}}` when all fields pass
    - Reject empty or whitespace-only name; reject amount outside `[0.01, 999999999.99]` or non-finite; reject category not in `["Food","Transport","Fun"]`
    - Return `{valid: false, errors: {name?, amount?, category?}}` with a descriptive message per failing field
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [ ]* 5.2 Write property test for validator rejects invalid inputs (Property 3)
    - **Property 3: Validator rejects all invalid inputs**
    - For any combo where name is blank/whitespace OR amount is out-of-range/non-finite OR category is invalid, `validateForm` must return `{valid: false}` with a message for each failing field
    - **Validates: Requirements 2.4, 2.5, 2.6, 2.7**

- [x] 6. Implement transaction mutation functions
  - [x] 6.1 Implement `addTransaction(name, amount, category)` in `js/app.js`
    - Guard: if `transactions.length >= 500`, disable the submit button, show the limit notification, and return early
    - Create a `Transaction` object using `generateId()`
    - Unshift the new transaction to the front of the `transactions` array
    - Call `writeToStorage(transactions)`
    - Call `renderAll()`
    - Return the newly created transaction object
    - _Requirements: 3.1, 4.3, 9.2, 9.3_

  - [ ]* 6.2 Write property test for add inserts at head (Property 5)
    - **Property 5: Adding a transaction inserts it at the head of the list**
    - For any valid transaction and any array with length < 500, after `addTransaction` the array length is +1 and the new entry is at index 0
    - **Validates: Requirements 4.3, 6.2, 9.3**

  - [x] 6.3 Implement `removeTransaction(id)` in `js/app.js`
    - Filter `transactions` to exclude the entry with matching `id`
    - Call `writeToStorage(transactions)`
    - Call `renderAll()`
    - _Requirements: 3.2, 5.2, 9.2_

  - [ ]* 6.4 Write property test for delete removes exactly one entry (Property 6)
    - **Property 6: Deleting a transaction removes exactly that entry and leaves all others intact**
    - For any list with ≥1 entry, after `removeTransaction(id)` no entry with that id remains and all others are unchanged
    - **Validates: Requirements 5.2, 4.4, 6.3**

- [x] 7. Implement render functions
  - [x] 7.1 Implement `renderBalance()` in `js/app.js`
    - Sum all `amount` fields in `transactions`, round to 2 decimal places
    - Write `formatCurrency(total)` to `#balance-amount` text content
    - Toggle a `.negative` CSS class on the balance element when total < 0
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Write property test for balance sum (Property 2)
    - **Property 2: Balance equals the arithmetic sum of all transaction amounts**
    - For any `Transaction[]`, `computeBalance(list)` must equal `list.reduce((s,t) => s+t.amount, 0)` rounded to 2 decimal places; empty array returns `0.00`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [x] 7.3 Implement `renderTransactionList()` in `js/app.js`
    - Clear `#transaction-list` inner HTML
    - If `transactions` is empty, render the placeholder message (`"No transactions yet"`)
    - Otherwise, for each transaction (already in most-recent-first order), build a `<div role="listitem">` containing: item name, formatted amount, category label, and a delete `<button>` with `aria-label="Delete [item name]"`
    - Attach a click handler on each delete button that calls `removeTransaction(id)`
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 5.1, 5.2_

  - [x] 7.4 Implement `renderChart()` in `js/app.js`
    - Check `chartJsLoaded`; if false, show `#chart-error` and return
    - Call `aggregateByCategory(transactions)`
    - If result is empty (no transactions), hide `<canvas>` and show `#chart-placeholder`; destroy existing Chart instance if any, then return
    - Otherwise show `<canvas>`, hide `#chart-placeholder`
    - If a Chart instance already exists, update its `data.labels`, `data.datasets[0].data`, and `data.datasets[0].backgroundColor`, then call `chart.update()`
    - If no instance exists, create `new Chart(canvas, { type: 'pie', data: {...}, options: {...} })` using `CATEGORY_COLORS` for colors
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

  - [ ]* 7.5 Write property test for chart aggregation (Property 4)
    - **Property 4: Chart aggregation is correct and excludes zero-total categories**
    - For any `Transaction[]`, `aggregateByCategory` returns a map where each key's value equals the exact category sum and no key with a zero or negative sum is present
    - **Validates: Requirements 7.1, 7.4**

  - [x] 7.6 Implement `renderAll()` in `js/app.js`
    - Call `renderTransactionList()`, `renderBalance()`, `renderChart()` in sequence
    - _Requirements: 9.1, 9.2_

- [x] 8. Implement `init()` and event wiring
  - [x] 8.1 Implement `init()` and attach event listeners in `js/app.js`
    - Set `chartJsLoaded = false` in the Chart.js `<script onerror>` handler (wire via a global flag the IIFE reads)
    - In `init()`: call `readFromStorage()`, populate `transactions`, call `renderAll()`
    - If `storageCorrupt` flag is set, show the non-blocking warning banner (`<div role="alert">`)
    - Attach `submit` event listener on `#transaction-form`: call `validateForm`, display or clear inline errors for each field, on success call `addTransaction` and reset the form
    - Call `init()` inside a `DOMContentLoaded` listener
    - _Requirements: 1.4, 3.3, 3.4, 3.5, 2.8, 8.5_

  - [x] 8.2 Wire the 500-transaction limit UI in `js/app.js`
    - In `addTransaction`, after the limit check, disable the `<button type="submit">` with `button.disabled = true`
    - Show a visible notification paragraph near the form (e.g., `#limit-notification`)
    - _Requirements: 9.3_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify: form validation, Local Storage round-trip, balance calculation, chart rendering, delete behavior, 500-limit enforcement, Chart.js CDN failure fallback, and responsive layout at 320px and 1440px viewports

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The design explicitly notes that formal automated tests require a Node.js environment (not available in this project's pure `file://` setup); property tests documented above are intended for a future test-runner setup
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3"] },
    { "id": 1, "tasks": ["2.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3"] },
    { "id": 5, "tasks": ["6.4", "7.1", "7.3"] },
    { "id": 6, "tasks": ["7.2", "7.4"] },
    { "id": 7, "tasks": ["7.5", "7.6"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2"] }
  ]
}
```
