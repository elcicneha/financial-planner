# Split Feature Architecture: A Complete Beginner's Guide

## 🎯 Part 1: The Real-World Problem

### Imagine This Scenario

You and your flatmate go grocery shopping. Here's what happens:

**Shopping Trip 1:**
- You pay ₹500 for groceries
- But wait! Some items are just for you (your snacks = ₹150)
- Some items are just for flatmate (their snacks = ₹100)
- Some items you both share (milk, bread = ₹250)

**Shopping Trip 2:**
- Flatmate pays ₹800 for electricity bill
- This is shared equally between you both

**The Question:** At the end of the month, who owes whom how much?

This is HARD to track manually! That's why we built the split feature.

---

## 📚 Part 2: Basic Concepts You Need to Know

### What is "Frontend" and "Backend"?

Think of a restaurant:

**Frontend = The Dining Area**
- What you SEE and INTERACT with
- The menu, tables, waiter taking your order
- In our app: The web page with buttons, tables, forms you click on

**Backend = The Kitchen**
- Where the REAL WORK happens
- Cooking food, storing ingredients, following recipes
- In our app: The part that saves data, does calculations, validates things

**Why separate?**
- The dining area doesn't need to know HOW to cook
- The kitchen doesn't need to know HOW to set tables
- Each does its job well

### What is an API?

**API = The Waiter**

When you want food:
1. You tell the waiter (you don't go to kitchen yourself)
2. Waiter takes your order to the kitchen
3. Kitchen cooks the food
4. Waiter brings food back to you

In our app:
1. Frontend tells the API "Save this expense!"
2. API takes the request to the Backend
3. Backend processes and saves it
4. API brings back confirmation to Frontend

---

## 🎨 Part 3: Understanding Data

### What is Data?

Data is just INFORMATION stored in a specific format.

**An Expense looks like this:**

```
One Expense = {
  "What day?": "2024-01-15"
  "How much money?": 500
  "What was it?": "Groceries"
  "Who paid?": "Me"
  "How to split?": {
    "My portion": 150
    "Flatmate's portion": 100
    "Shared portion": 250
  }
}
```

### Where Does Data Live?

**Three Places:**

1. **In Your Browser (Frontend Memory)**
   - Like your notepad while shopping
   - Temporary! Goes away when you close browser

2. **Traveling on the Internet (API)**
   - Like items in the waiter's hands
   - Only exists while moving between frontend and backend

3. **On the Computer's Hard Drive (Backend Storage)**
   - Like a filing cabinet
   - Permanent! Stays even when computer turns off
   - Stored in a file called `expenses.json`

---

## 🏗️ Part 4: The Architecture (Big Picture)

### The Complete System

```
┌─────────────────────────────────────────┐
│          YOUR WEB BROWSER               │
│         (What You See)                  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │       The Table                 │  │
│  │  Shows list of all expenses     │  │
│  │  Click to edit, add, delete     │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │    Split Editor (Popup Box)     │  │
│  │  Three input boxes:             │  │
│  │   - Mine: ___                   │  │
│  │   - Flatmate: ___               │  │
│  │   - Shared: ___                 │  │
│  └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
              ↕️ (Data travels up and down)
┌─────────────────────────────────────────┐
│       THE INTERNET (API)                │
│    Like a messenger/waiter              │
│  Carries data back and forth            │
└─────────────────────────────────────────┘
              ↕️
┌─────────────────────────────────────────┐
│      COMPUTER SERVER (Backend)          │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │    The Brain (Business Logic)   │  │
│  │  - Checks if splits add up       │  │
│  │  - Calculates your share         │  │
│  │  - Makes sure data is correct    │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  The Filing Cabinet (Storage)   │  │
│  │    expenses.json file            │  │
│  │    All expenses saved here       │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🎬 Part 5: Step-by-Step Journey (Adding an Expense)

Let me walk you through EXACTLY what happens when you add an expense.

### Step 1: You Type in the Table

**You do this:**
- Date: 2024-01-15
- Amount: 500
- Note: Groceries
- Click the "Split" icon

**What happens in the browser:**
- The table component is "listening" for your typing
- Every keystroke updates temporary memory in the browser
- Think of it like writing on a whiteboard - not saved yet!

### Step 2: You Choose Split Type

**You click the "Mix" tab (scissors icon)**

**What happens:**
- A popup box appears (the SplitEditor)
- Shows three empty boxes: Mine, Flatmate, Shared
- Shows total to split: ₹500

### Step 3: You Fill Split Details

**You type:**
- Mine: 150
- Flatmate: 100
- Shared: 250

**What happens behind the scenes:**

```
SplitEditor Component is doing this:

Every time you type in a box:
1. Update the number in that box
2. Add all three boxes: 150 + 100 + 250 = 500
3. Check: Does it equal total (500)?
   - YES ✅ → Enable "Save" button
   - NO ❌ → Disable "Save" button, show error
```

**The Auto-Magic Feature:**

When you click "All" button on Shared:
- Shared becomes 500
- Mine becomes 0
- Flatmate becomes 0

Now if you type "150" in Mine:
- Mine becomes 150
- **Shared AUTOMATICALLY becomes 350** (500 - 150 = 350)
- Flatmate stays 0

It's like a smart calculator that keeps everything balanced!

### Step 4: You Click "Save" in Popup

**What happens:**

```javascript
// SplitEditor calls a function:
onSave({
  user: 150,
  flatmate: 100,
  shared: 250
})
```

This is like handing a note to the table saying "Here are the split details!"

The popup closes. The table now has your split details in memory.

### Step 5: You Click "Add Row" in Table

**Now the BIG journey begins!**

The table component runs a function called `handleAdd()`:

```javascript
handleAdd() {
  // Step 5a: Gather all information
  const expense = {
    date: "2024-01-15",
    amount: 500,
    note: "Groceries",
    category: "Food",
    paidBy: "user",
    splits: {
      user: 150,
      flatmate: 100,
      shared: 250
    }
  }

  // Step 5b: Send to API
  expenseAPI.create(expense)
}
```

### Step 6: Frontend API Layer Prepares Data

**Problem:** Frontend speaks "JavaScript" but Backend speaks "Python"

They have different naming styles:
- JavaScript likes: `paidBy`, `amountFormula` (camelCase)
- Python likes: `paid_by`, `amount_formula` (snake_case)

So we have a translator!

```javascript
// In useExpenseAPI.ts
create(expense) {
  // TRANSLATE: camelCase → snake_case
  const translated = {
    date: expense.date,
    amount: expense.amount,
    note: expense.note,
    category: expense.category,
    paid_by: expense.paidBy,        // ← Changed!
    splits: expense.splits
  }

  // SEND TO BACKEND
  Send translated to: http://localhost:8000/api/expenses
}
```

### Step 7: Data Travels Through Internet

The data becomes a letter (called HTTP Request) and travels to the backend:

```
📧 HTTP POST Request
To: http://localhost:8000/api/expenses
Body: {
  "date": "2024-01-15",
  "amount": 500,
  "note": "Groceries",
  "category": "Food",
  "paid_by": "user",
  "splits": {
    "user": 150,
    "flatmate": 100,
    "shared": 250
  }
}
```

### Step 8: Backend Receives Request

The backend has a "routes.py" file - think of it as a receptionist:

```python
# routes.py says:
"Oh, someone sent a POST to /api/expenses"
"That means they want to CREATE a new expense"
"Let me call the ExpenseService to handle this!"

Call: service.create_expense(expense_data)
```

### Step 9: ExpenseService (The Brain) Validates

```python
# service.py does this:

create_expense(expense_data):
    # 1. CHECK: Do splits add up?
    total = 150 + 100 + 250 = 500

    if total != expense_data.amount:
        STOP! Return error: "Splits don't match amount!"

    # 2. CHECK: Is paid_by valid?
    if paid_by not in ["user", "flatmate"]:
        STOP! Return error: "Invalid paid_by!"

    # 3. All checks passed! Create a unique ID
    expense_data.id = "abc-123-def-456"  # Random unique ID

    # 4. Save it!
    repository.add_expense(expense_data)
```

**Why validate?**
- What if frontend has a bug?
- What if someone sends data directly to API (bypassing frontend)?
- Backend is the LAST line of defense!

### Step 10: Repository Saves to File

```python
# repository.py does this:

add_expense(expense):
    # 1. Open the filing cabinet
    Read file: data/expenses.json

    # Current contents:
    [
      {old expense 1},
      {old expense 2}
    ]

    # 2. Add new expense
    [
      {old expense 1},
      {old expense 2},
      {NEW expense}  ← Added here!
    ]

    # 3. Save back to file
    Write to: data/expenses.json
```

**The file now looks like this:**

```json
[
  {
    "id": "old-1",
    "date": "2024-01-10",
    "amount": 300,
    ...
  },
  {
    "id": "old-2",
    "date": "2024-01-12",
    "amount": 400,
    ...
  },
  {
    "id": "abc-123-def-456",
    "date": "2024-01-15",
    "amount": 500,
    "note": "Groceries",
    "paid_by": "user",
    "splits": {
      "user": 150,
      "flatmate": 100,
      "shared": 250
    }
  }
]
```

### Step 11: Backend Sends Success Response

```python
# Backend says:
"Success! Here's the saved expense back to you"

Return: {
  "id": "abc-123-def-456",
  "date": "2024-01-15",
  "amount": 500,
  "note": "Groceries",
  "paid_by": "user",
  "splits": {
    "user": 150,
    "flatmate": 100,
    "shared": 250
  }
}
```

### Step 12: Response Travels Back Through Internet

```
📧 HTTP Response
Status: 200 OK (success!)
Body: {expense data}
```

### Step 13: Frontend Receives Response

```javascript
// useExpenseAPI.ts receives response

create(expense) {
  ...

  // Response arrives!
  const response = {
    paid_by: "user",  // snake_case
    ...
  }

  // TRANSLATE BACK: snake_case → camelCase
  const translated = {
    paidBy: response.paid_by,  // ← Changed back!
    ...
  }

  return translated
}
```

### Step 14: Table Updates Display

```javascript
// ExcelTab-Split-2.tsx updates state

handleAdd() {
  ...
  const newExpense = await expenseAPI.create(expense)

  // Add to list in browser memory
  setExpenses([newExpense, ...oldExpenses])

  // Table re-renders automatically!
  // You see the new row appear! ✨
}
```

### Step 15: You See The Result!

The table now shows:
```
Date       | Amount | Note      | Split | Your Share
-----------|--------|-----------|-------|------------
2024-01-15 | ₹500   | Groceries | ✂️    | ₹275
```

**Your Share Calculation:**
```
Your portion + (Shared ÷ 2)
= 150 + (250 ÷ 2)
= 150 + 125
= ₹275
```

---

## 🎯 Part 6: Understanding Each Component's Job

### 1. SplitEditor.tsx (The Popup)

**Job:** Help you enter split details correctly

**Skills:**
- Shows three input boxes
- Adds up numbers as you type
- Shows if total matches or not
- Auto-adjusts when you click "All" button
- Only lets you save when everything is correct

**Think of it as:** A smart form with a calculator built-in

### 2. useExpenseColumns.tsx (The Cell Renderers)

**Job:** Decide how each column in the table looks

**Skills:**
- Split column: Shows icon (👤/🤝/✂️) based on split type
- Paid By column: Shows "Me" or "Flatmate"
- Your Share column: Calculates and displays your share

**Think of it as:** Instructions for "how to draw each cell in the table"

### 3. ExcelTab-Split-2.tsx (The Main Table)

**Job:** Show all expenses, let you add/edit/delete

**Skills:**
- Displays table with all expenses
- Handles clicking "Add Row"
- Handles editing cells
- Handles deleting rows
- Calls the API when changes happen

**Think of it as:** The manager of the table - coordinates everything

### 4. useExpenseAPI.ts (The Messenger)

**Job:** Talk to the backend

**Skills:**
- Translate JavaScript → Python format
- Send requests to backend
- Receive responses from backend
- Translate Python → JavaScript format
- Handle errors

**Think of it as:** The waiter/messenger between frontend and backend

### 5. routes.py (The Receptionist)

**Job:** Receive API requests and direct them

**Skills:**
- Listen for POST /api/expenses → "Create new expense"
- Listen for GET /api/expenses → "Get all expenses"
- Listen for PUT /api/expenses/{id} → "Update expense"
- Listen for DELETE /api/expenses/{id} → "Delete expense"
- Call the right service function

**Think of it as:** A receptionist directing calls to the right department

### 6. service.py (The Brain)

**Job:** Business logic and validation

**Skills:**
- Validate splits add up to amount
- Generate unique IDs
- Check all data is correct
- Calculate things
- Handle errors

**Think of it as:** The smart person who makes sure everything makes sense

### 7. repository.py (The Filing Clerk)

**Job:** Read and write to the file

**Skills:**
- Open expenses.json file
- Read all expenses
- Add new expense
- Update existing expense
- Delete expense
- Save file

**Think of it as:** The person who manages the filing cabinet

---

## 🔄 Part 7: Understanding Data Flow Visually

### Creating an Expense

```
YOU (Human)
  ↓ Type in browser
BROWSER MEMORY (Temporary whiteboard)
  ↓ Click "Add"
FRONTEND CODE (handleAdd function)
  ↓ Prepares data
API TRANSLATOR (useExpenseAPI)
  ↓ Converts JavaScript → Python
INTERNET (HTTP Request)
  ↓ Travels to server
ROUTES (Receptionist)
  ↓ "This is a create request"
SERVICE (Brain)
  ↓ Validates and processes
REPOSITORY (Filing clerk)
  ↓ Writes to file
HARD DRIVE (expenses.json file)
  ↓ Saved permanently!
REPOSITORY
  ↓ Confirms save
SERVICE
  ↓ Returns saved expense
ROUTES
  ↓ Sends response
INTERNET (HTTP Response)
  ↓ Travels back
API TRANSLATOR
  ↓ Converts Python → JavaScript
FRONTEND CODE
  ↓ Updates browser memory
BROWSER DISPLAY
  ↓ Re-renders table
YOU (Human)
  ✨ See new expense in table!
```

### Reading Expenses (When you refresh page)

```
YOU (Human)
  ↓ Open browser
FRONTEND CODE
  ↓ "I need to load expenses!"
API TRANSLATOR
  ↓ GET /api/expenses
INTERNET
  ↓
ROUTES
  ↓ "Get all expenses request"
SERVICE
  ↓ "Load from file"
REPOSITORY
  ↓ Reads expenses.json
HARD DRIVE
  ↓ Returns array of expenses
REPOSITORY
  ↓
SERVICE
  ↓ Processes (adds missing splits for old data)
ROUTES
  ↓ Sends response
INTERNET
  ↓
API TRANSLATOR
  ↓ Converts to JavaScript
FRONTEND CODE
  ↓ Stores in memory
BROWSER DISPLAY
  ↓ Shows table
YOU (Human)
  ✨ See all your expenses!
```

---

## 🧠 Part 8: Understanding Smart Features

### Feature 1: Auto-Adjustment in SplitEditor

**The Problem:**
When splitting ₹500, typing each number is tedious and error-prone.

**The Solution:**
Click "All" on one field, then type in others - it auto-calculates!

**How it works:**

```javascript
// SplitEditor keeps track of which field is "all"
allField = "shared"

// When you type in "user" field:
onChange(fieldName, newValue) {
  if (allField === "shared") {
    // Calculate what shared should be
    const newShared = totalAmount - newValue - flatmate

    // Update both fields!
    setSplits({
      user: newValue,      // Your input
      flatmate: flatmate,
      shared: newShared    // Auto-calculated!
    })
  }
}
```

**Why this is smart:**
- You only have to enter the numbers you know
- Computer calculates the rest
- Always adds up correctly!

### Feature 2: Split Type Icons

**The Problem:**
Looking at numbers like `{user: 150, flatmate: 100, shared: 250}` is confusing.

**The Solution:**
Show a simple icon that tells you the split type at a glance!

**How it works:**

```javascript
// Look at the splits and decide icon
function getIcon(splits) {
  if (splits.shared > 0 && (splits.user > 0 || splits.flatmate > 0)) {
    return "✂️"  // Mix - it's complicated
  }

  if (splits.shared > 0) {
    return "🤝"  // Just shared - 50/50 split
  }

  return "👤"  // Personal - one person's expense
}
```

**Why this is smart:**
- One glance tells you: "Oh, this is a shared expense"
- No need to read numbers every time
- Visual = faster understanding!

### Feature 3: Backward Compatibility

**The Problem:**
Old expenses were saved BEFORE we added the split feature. They don't have `splits` field!

**What would happen without fix:**
```javascript
// Try to calculate your share
const yourShare = expense.splits.user + (expense.splits.shared * 0.5)
// ERROR! expense.splits is undefined! 💥
```

**The Solution:**
When loading old expenses, automatically add splits!

**How it works:**

```python
# In service.py
def get_all_expenses():
    expenses = repository.get_all()

    for expense in expenses:
        # Check if this is old data
        if "splits" not in expense:
            # Add default splits
            expense["splits"] = {
                "user": expense["amount"],  # Treat as personal
                "flatmate": 0,
                "shared": 0
            }

    return expenses
```

**Why this is smart:**
- Old data still works!
- No need to manually update old expenses
- Seamless upgrade!

### Feature 4: Validation at Multiple Levels

**The Problem:**
What if someone tries to save splits that don't add up?

**The Solution:**
Check at MULTIPLE points!

**Level 1: SplitEditor (Frontend)**
```javascript
// Disable save button if invalid
const isValid = (user + flatmate + shared) === totalAmount
<button disabled={!isValid}>Save</button>
```
You can't even click Save if it's wrong!

**Level 2: Backend**
```python
# Even if frontend fails, backend catches it
if splits_total != amount:
    raise HTTPException("Splits don't match amount!")
```
If somehow bad data gets through, backend rejects it!

**Why multiple levels?**
- Frontend validation = good user experience (instant feedback)
- Backend validation = data integrity (nothing bad gets saved)
- Defense in depth = safe system!

---

## 🎨 Part 9: Understanding the Table Component

### What is EditableTable?

It's a REUSABLE component - like a Lego block you can use in different places.

**What it does:**
- Shows data in rows and columns
- Lets you click to edit cells
- Handles save/cancel
- Works with ANY kind of data (not just expenses!)

### How Does It Know What to Show?

You give it a CONFIGURATION (instructions):

```javascript
const columns = [
  {
    key: "date",           // Which field in data?
    header: "Date",        // What to show at top?
    type: "date",          // What kind of data?
    editable: true,        // Can user edit?
  },
  {
    key: "amount",
    header: "Amount",
    type: "number",
    editable: true,
  },
  {
    key: "splits",
    header: "Split",
    type: "custom",               // Special!
    cellRenderer: (props) => <SplitTypeCell {...props} />
    // ↑ Use this component to render
  }
]

<EditableTable
  data={expenses}
  columns={columns}
/>
```

### How Does Custom Rendering Work?

**Normal column (like "amount"):**
```javascript
// Table just shows the number
<td>500</td>
```

**Custom column (like "splits"):**
```javascript
// Table calls your custom function
if (column.cellRenderer) {
  return column.cellRenderer({
    value: expense.splits,      // Current value
    row: expense,               // Entire row data
    isEditing: false,           // Are we editing?
    onChange: (newSplits) => {} // Function to update
  })
}
```

Your SplitTypeCell receives these props and decides what to show!

**View mode:**
```javascript
<SplitTypeCell value={{user: 150, ...}}>
  // Shows icon based on split type
  return "✂️"
</SplitTypeCell>
```

**Edit mode:**
```javascript
<SplitTypeCell isEditing={true}>
  // Shows tabs: Personal | Shared | Mix
  return <Tabs>...</Tabs>
</SplitTypeCell>
```

---

## 🔐 Part 10: Understanding Data Safety

### Why Do We Validate?

**Scenario without validation:**
```
You: "Save this expense: amount=500, splits={user:200, flatmate:100, shared:100}"
Computer: "OK, saved!"
Later...
You: "Why is my share showing ₹275?"
Computer: "Because I calculated: 200 + (100÷2) = 250... wait, where did ₹100 go?"
😱 Money disappeared into thin air!
```

**With validation:**
```
You: "Save this expense: amount=500, splits={user:200, flatmate:100, shared:100}"
Computer: "STOP! 200+100+100 = 400, but amount is 500. These don't match!"
You: "Oops! Let me fix that..."
✅ Problem caught before saving!
```

### The 0.01 Tolerance

**Why not check if they're EXACTLY equal?**

**The Problem:**
```javascript
0.1 + 0.2 = 0.30000000000000004  // In computer math!
```

Computers use binary (0s and 1s) which can't represent decimals perfectly.

**The Solution:**
```javascript
// Instead of:
if (total === amount)  // Might fail due to floating point!

// We do:
if (Math.abs(total - amount) < 0.01)  // Allow tiny difference
```

**What this means:**
- If difference is 0.001: ✅ Accept (rounding error)
- If difference is 0.5: ❌ Reject (real error)

### Unique IDs

**Why does every expense need an ID?**

**Without IDs:**
```javascript
expenses = [
  {date: "2024-01-15", amount: 500, ...},
  {date: "2024-01-15", amount: 500, ...}  // Same date and amount!
]

// You want to delete the first one...
// How do we know WHICH ONE to delete? They look identical!
```

**With IDs:**
```javascript
expenses = [
  {id: "abc-123", date: "2024-01-15", amount: 500, ...},
  {id: "xyz-789", date: "2024-01-15", amount: 500, ...}
]

// Delete the one with id="abc-123"
// No confusion! ✅
```

**How IDs are generated:**
```python
import uuid

id = str(uuid.uuid4())
# Result: "abc-123-def-456-ghi-789"
# Guaranteed to be unique (1 in trillion trillion chance of duplicate!)
```

---

## 🚀 Part 11: Common Operations Explained

### Operation 1: Loading Expenses on Page Load

**When:** You open the app or refresh the page

**What happens:**

```javascript
// ExcelTab-Split-2.tsx
useEffect(() => {
  // This runs when component first appears
  loadExpenses()
}, [])  // Empty array = run once on mount

async function loadExpenses() {
  // 1. Show loading spinner
  setIsLoading(true)

  // 2. Ask API for all expenses
  const expenses = await expenseAPI.getAll()

  // 3. Store in memory
  setExpenses(expenses)

  // 4. Hide loading spinner
  setIsLoading(false)

  // 5. Table automatically shows expenses!
}
```

**In the backend:**
```python
@router.get("/expenses")
def get_expenses():
    # 1. Service loads from file
    expenses = service.get_all_expenses()

    # 2. Adds missing splits to old data
    # 3. Sorts by date (newest first)
    # 4. Returns array

    return expenses
```

### Operation 2: Editing an Existing Expense

**When:** You click a cell, change it, press Enter

**What happens:**

```javascript
// In table, you change amount from 500 to 600

handleEdit(expenseId, updatedFields) {
  // updatedFields = { amount: 600 }

  // IMPORTANT: Only send what changed!
  // Don't need to send entire expense

  const updated = await expenseAPI.update(expenseId, updatedFields)

  // Find the old expense in our list
  const newExpenses = expenses.map(exp =>
    exp.id === expenseId ? updated : exp
  )

  setExpenses(newExpenses)
  // Table re-renders with new amount!
}
```

**In the backend:**
```python
@router.put("/expenses/{expense_id}")
def update_expense(expense_id, update_data):
    # 1. Get current expense from file
    current = repository.get_by_id(expense_id)

    # Current: {id: "abc", amount: 500, note: "Groceries", ...}
    # Update:  {amount: 600}

    # 2. Merge: keep old fields, override with new
    merged = {**current, **update_data}
    # Result:  {id: "abc", amount: 600, note: "Groceries", ...}

    # 3. Validate and save
    repository.update_expense(expense_id, merged)

    return merged
```

### Operation 3: Deleting an Expense

**When:** You click delete button

**What happens:**

```javascript
handleDelete(expenseId) {
  // Confirm first
  if (!confirm("Are you sure?")) return

  // Tell backend to delete
  await expenseAPI.delete(expenseId)

  // Remove from our list
  const newExpenses = expenses.filter(exp => exp.id !== expenseId)
  setExpenses(newExpenses)

  // Table re-renders without that row!
}
```

**In the backend:**
```python
@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id):
    # 1. Read all expenses
    all_expenses = repository.get_all()

    # 2. Filter out the one to delete
    remaining = [exp for exp in all_expenses if exp["id"] != expense_id]

    # 3. Save the filtered list
    repository.save_all(remaining)

    return {"message": "Deleted successfully"}
```

---

## 🎭 Part 12: Understanding React Concepts

### What is State?

**State = Memory that, when changed, updates the screen**

```javascript
const [expenses, setExpenses] = useState([])
//      ↑                ↑              ↑
//   Current value    Function to    Initial value
//                    change it
```

**How it works:**

```javascript
// Initially
expenses = []  // Empty
// Screen shows: Empty table

setExpenses([{new expense}])  // Change state!

// React says: "State changed! Re-render!"
expenses = [{new expense}]  // Updated
// Screen shows: Table with 1 row
```

**Why not just use regular variables?**

```javascript
// Regular variable (WRONG!)
let expenses = []
expenses = [{new expense}]
// Screen doesn't update! React doesn't know it changed!

// State (CORRECT!)
const [expenses, setExpenses] = useState([])
setExpenses([{new expense}])
// Screen updates automatically! ✨
```

### What is useEffect?

**useEffect = "Do something when component loads or when something changes"**

```javascript
useEffect(() => {
  // This code runs...
  loadExpenses()
}, [])
//  ↑
// "Dependency array"
// Empty = run once when component first appears
```

**Different dependency arrays:**

```javascript
// Run once on mount
useEffect(() => {
  console.log("Component loaded!")
}, [])

// Run whenever 'expenses' changes
useEffect(() => {
  console.log("Expenses changed!", expenses)
}, [expenses])

// Run on every render (usually bad!)
useEffect(() => {
  console.log("Rendered!")
})  // No dependency array
```

### What is a Component?

**Component = Reusable piece of UI**

Think of it like a blueprint:

```javascript
// SplitEditor is a component
function SplitEditor({ totalAmount, onSave }) {
  return (
    <div>
      <h3>Split {totalAmount}</h3>
      <input ... />
      <button onClick={onSave}>Save</button>
    </div>
  )
}

// You can use it many times!
<SplitEditor totalAmount={500} onSave={handleSave1} />
<SplitEditor totalAmount={300} onSave={handleSave2} />
// Each one is independent!
```

**Components can contain other components:**

```javascript
function App() {
  return (
    <div>
      <Header />           {/* Component */}
      <ExpenseTable />     {/* Component */}
      <Footer />           {/* Component */}
    </div>
  )
}
```

---

## 📊 Part 13: Complete Example End-to-End

Let me show you a COMPLETE example with actual numbers flowing through every step.

### Scenario: Adding a Restaurant Bill

**You went to dinner:**
- Total bill: ₹1000
- You paid the bill
- Split: You ordered ₹400, flatmate ordered ₹300, you shared dessert ₹300

### Step-by-Step with Data

**Step 1: Fill the form**
```
Date: 2024-01-20
Amount: 1000
Note: Dinner at Indian Restaurant
Category: Food
Paid By: Me
```

**Step 2: Click Split → Mix tab**

SplitEditor opens:
```
Total to split: ₹1000

Mine: [____]      [All]
Flatmate: [____]  [All]
Shared: [____]    [All]

Total: ₹0 / ₹1000
❌ Difference: ₹1000
[Save] (disabled)
```

**Step 3: Click "All" on Shared**

```
Mine: [0]         [All]
Flatmate: [0]     [All]
Shared: [1000]    [All] ← Active

Total: ₹1000 / ₹1000
✅ Splits match!
[Save] (enabled)
```

**Step 4: Type "400" in Mine**

Auto-adjustment kicks in!

```
Mine: [400]       [All]
Flatmate: [0]     [All]
Shared: [600]     [All] ← Auto-calculated (1000-400-0)

Total: ₹1000 / ₹1000
✅ Splits match!
```

**Step 5: Type "300" in Flatmate**

Auto-adjustment again!

```
Mine: [400]       [All]
Flatmate: [300]   [All]
Shared: [300]     [All] ← Auto-calculated (1000-400-300)

Total: ₹1000 / ₹1000
✅ Splits match!
```

**Step 6: Click Save**

SplitEditor calls:
```javascript
onSave({
  user: 400,
  flatmate: 300,
  shared: 300
})
```

Popup closes. Table now has:
```javascript
editData = {
  date: "2024-01-20",
  amount: 1000,
  note: "Dinner at Indian Restaurant",
  category: "Food",
  paidBy: "user",
  splits: { user: 400, flatmate: 300, shared: 300 }
}
```

**Step 7: Click "Add Row"**

handleAdd() prepares:
```javascript
{
  date: "2024-01-20",
  amount: 1000,
  amountFormula: null,
  note: "Dinner at Indian Restaurant",
  category: "Food",
  paidBy: "user",
  splits: {
    user: 400,
    flatmate: 300,
    shared: 300
  }
}
```

**Step 8: API translates**

```javascript
// Becomes this JSON:
{
  "date": "2024-01-20",
  "amount": 1000,
  "amount_formula": null,      // ← snake_case
  "note": "Dinner at Indian Restaurant",
  "category": "Food",
  "paid_by": "user",           // ← snake_case
  "splits": {
    "user": 400,
    "flatmate": 300,
    "shared": 300
  }
}

// POST to: http://localhost:8000/api/expenses
```

**Step 9: Backend receives**

routes.py:
```python
@router.post("/expenses")
def create_expense(expense_data: ExpenseCreate):
    # expense_data = ExpenseCreate object
    # expense_data.amount = 1000
    # expense_data.paid_by = "user"
    # expense_data.splits.user = 400
    # expense_data.splits.flatmate = 300
    # expense_data.splits.shared = 300

    return service.create_expense(expense_data)
```

**Step 10: Service validates**

service.py:
```python
def create_expense(expense_data):
    # Validate splits
    total = 400 + 300 + 300 = 1000

    if abs(1000 - 1000) > 0.01:  # abs(0) > 0.01 = False
        # Not executed - validation passed!

    # Generate ID
    expense_id = "d5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0"

    # Create full expense object
    expense = {
        "id": "d5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0",
        "date": "2024-01-20",
        "amount": 1000,
        "amount_formula": None,
        "note": "Dinner at Indian Restaurant",
        "category": "Food",
        "paid_by": "user",
        "splits": {
            "user": 400,
            "flatmate": 300,
            "shared": 300
        }
    }

    repository.add_expense(expense)
    return expense
```

**Step 11: Repository saves**

repository.py:
```python
def add_expense(expense):
    # Read current file
    with open("data/expenses.json", "r") as f:
        expenses = json.load(f)

    # expenses = [
    #   {old expense 1},
    #   {old expense 2}
    # ]

    # Add new one
    expenses.append(expense)

    # expenses = [
    #   {old expense 1},
    #   {old expense 2},
    #   {NEW expense with id="d5e6f7g8..."}
    # ]

    # Save
    with open("data/expenses.json", "w") as f:
        json.dump(expenses, f)
```

**Step 12: Response returns**

```python
# Backend sends back:
{
  "id": "d5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0",
  "date": "2024-01-20",
  "amount": 1000,
  "amount_formula": null,
  "note": "Dinner at Indian Restaurant",
  "category": "Food",
  "paid_by": "user",
  "splits": {
    "user": 400,
    "flatmate": 300,
    "shared": 300
  }
}
```

**Step 13: Frontend receives and translates**

```javascript
// API translates back to camelCase:
{
  id: "d5e6f7g8-h9i0-j1k2-l3m4-n5o6p7q8r9s0",
  date: "2024-01-20",
  amount: 1000,
  amountFormula: null,        // ← camelCase
  note: "Dinner at Indian Restaurant",
  category: "Food",
  paidBy: "user",             // ← camelCase
  splits: {
    user: 400,
    flatmate: 300,
    shared: 300
  }
}
```

**Step 14: Table updates**

```javascript
// Add to expenses list
setExpenses([newExpense, ...oldExpenses])

// Old state:
expenses = [
  {expense1},
  {expense2}
]

// New state:
expenses = [
  {NEW expense},  ← Added at top
  {expense1},
  {expense2}
]
```

**Step 15: Screen updates!**

The table now shows:

```
Date       | Amount  | Note                        | Split | Paid By | Your Share
-----------|---------|----------------------------|-------|---------|------------
2024-01-20 | ₹1,000  | Dinner at Indian Restaurant| ✂️    | Me      | ₹550
```

**Your Share calculation:**
```
user + (shared × 0.5)
= 400 + (300 × 0.5)
= 400 + 150
= ₹550
```

So you paid ₹1000 but your actual share is ₹550.
That means flatmate owes you: ₹1000 - ₹550 = ₹450 ✅

---

## 🎓 Part 14: Key Concepts Summary

### 1. Separation of Concerns

**Each part has ONE job:**
- SplitEditor: Input splits correctly
- Table: Display and manage rows
- API: Communicate with backend
- Service: Business logic
- Repository: Save/load files

**Why?**
- Easier to understand (focus on one thing)
- Easier to fix bugs (know where to look)
- Easier to change (only touch one part)

### 2. Data Transformation

**Data changes shape as it moves:**
- Browser: JavaScript objects (camelCase)
- Transit: JSON strings (snake_case)
- Backend: Python dictionaries (snake_case)
- Storage: JSON text in file

**Why translate?**
- Each language has conventions
- Following conventions makes code readable
- Automatic translation = less errors

### 3. State Management

**State = data that affects what you see**

```javascript
expenses changes → Table re-renders
isLoading changes → Spinner shows/hides
editData changes → Cell updates
```

**Why use state?**
- React automatically updates screen
- No manual DOM manipulation needed
- Declarative: "Show this when state is X"

### 4. Validation Layers

**Multiple checkpoints:**
1. Frontend: User experience (instant feedback)
2. Backend: Data integrity (final say)

**Why both?**
- Frontend can have bugs
- Users can bypass frontend (API direct access)
- Backend is source of truth

### 5. Reusable Components

**Build once, use many times:**
- EditableTable works with any data
- SplitEditor works with any amount
- Cell renderers customize display

**Why?**
- Less code duplication
- Consistent behavior
- Easier to maintain

---

## 🏁 Final Summary

### What the Split Feature Does
Tracks shared expenses between you and flatmate, distinguishing who paid vs. how to split costs.

### How It's Built
- **Frontend**: React components (table, popup editor, custom cells)
- **Backend**: Python API (routes, service, repository)
- **Communication**: HTTP requests with data translation
- **Storage**: JSON file on disk

### How Data Flows
Browser → API → Backend → File (save)
File → Backend → API → Browser (load)

### Key Smart Features
- Auto-adjustment in split editor
- Visual icons for split types
- Backward compatibility
- Multi-layer validation
- Reusable components

### Why This Architecture?
- **Organized**: Each part has clear responsibility
- **Safe**: Multiple validation layers
- **Flexible**: Reusable components
- **Maintainable**: Easy to find and fix issues
- **Scalable**: Can add features without breaking existing code

---

You now understand:
✅ What each file does
✅ How data flows through the system
✅ Why architectural decisions were made
✅ How frontend and backend communicate
✅ How React state and components work
✅ How validation keeps data safe
✅ How the complete journey works end-to-end

This is a solid, well-architected feature! 🎉
