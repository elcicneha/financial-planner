# IDEATION

### Financial Consolidator

Centralized finance hub: investments, taxes, expenses, runway.

---


## ITERATION 0 (Your Magic Moment)

**What is the smallest working unit of your app?**

```
Given mutual fund transactions (buy/sell dates, amounts, prices) and LTCG holding period,
calculate and display short-term gains, long-term gains, and total tax liability for ITR.
```

⚠️ If you can't describe this in one sentence, your scope is too big.

--- 

# PHASED ROADMAP

## ☝️ Phase 1: TAX CALCULATIONS (Iteration 0)
**Goal:** Answer the question: "How much did I gain/lose on my investments, and what's my tax liability?"

**Why first:** Your #1 pain point. ITR filing requires this annually. Quick win with existing PDF data.

**Key Features:**
- [x] PDF extraction for mutual fund transactions
- [x] FIFO capital gains calculation (4 categories: Equity/Debt × ST/LT)
- [x] CAS Excel upload with auto financial year detection
- [x] ITR Prep page with CAS/FIFO variant views
- [x] Fund type override, caching, sortable tables, copy values
- [x] Extract data from payslips - gross pay, tds, monthly and annual breakdown
- [ ] Manual data entry for other ITR values (salary, interest, dividends, deductions)
- [ ] Unified ITR Dashboard with ALL values needed for filing

## Phase 1.5: ANALYTICS
Add posthog tracking.
Get a count of unique users, number of times used, etc.
Separate in progress sections from ready ones, and work in a separate branch. Publish on Vercel, share it with people who can come and start trying it out.

## ✌️ Phase 2: EXPENSE TRACKING
**Goal:** "Where does my money go each month?"

**Why second:** Recurring need, feeds into runway calculation, good for career break planning.

**Key Features:**
- [ ] Expense logger (web form: date, category, amount, note)
- [ ] Categories: Food, Transport, Utilities, Entertainment, Medical, Other
- [ ] Monthly summary dashboard (pie chart: % by category, total spent)
- [ ] CSV export
- [ ] (Future: PWA for mobile entry)

**Scope:** ~1-2 weeks. Straightforward CRUD.

---

## 👉 Phase 3: RUNWAY PLANNING (Refined)
**Goal:** "Given my actual spending patterns, how long can I survive?"

**Why third:** Critical during career break. Uses real data from Phase 1 (investments) + Phase 2 (expenses).

**Current Status:** Playground calculator exists ✓

**Key Features:**
- [ ] **Data Integration (NEW):**
  - Pull actual monthly expenses from Phase 2 (rolling 3-month avg burn rate)
  - Pull actual portfolio value from Phase 1
  - Runway calculation becomes **dynamic**: Updates as you log expenses
- [ ] Dashboard shows:
  - "Based on ₹X/month avg spend, you have Y months of runway"
  - Breakdown: ₹A cash + ₹B investments = ₹C total ÷ ₹X/month burn = Y months
- [ ] Scenario tester (connected to playground):
  - "What if expenses drop to ₹X/month?" → New runway
  - "If investments grow at 10%/year..." → New timeline
  - Scenarios are separate from actual tracking (don't overwrite real data)

**Scope:** 1-2 weeks. Mostly backend data wiring + minimal UI changes.

---

## 4️⃣ Phase 4: PLANNING & TRACKING (Investment Planning)

**Umbrella Goal:** Plan how much to invest, how to allocate it, and track variance from plan.

**Why fourth:** Depends on Phase 3 (runway). Once you know you can invest, you need a strategy and way to track it.

---

### **4A. Investment Amount Planning**
**Goal:** "How much should I invest monthly to hit my target corpus?"

**Key Features:**
- [ ] Input form: Target corpus (e.g., ₹50L by end of year), Current amount (₹30L), Time horizon (12 months)
- [ ] Calculation: "Invest ₹1.67L/month to reach ₹50L"
- [ ] Scenario tester:
  - "What if I invest ₹2L/month?" → Reach ₹62L
  - "What if I have only 9 months?" → Need ₹2.22L/month
- [ ] Save plan, return to it later

**Why:** Short-term precision. Know your investment target before deciding allocation.

**Scope:** 1 week.

---

### **4B. Allocation Planning**
**Goal:** "I want 40% equity, 30% bonds, 30% gold. How much rupees do I need in each?"

**Key Features:**
- [ ] Input form: Target allocation % (40/30/30), Current portfolio value (₹50L)
- [ ] Output breakdown:
  - "Need ₹20L equity (currently ₹18L, add ₹2L)"
  - "Need ₹15L bonds (currently ₹15L, balanced)"
  - "Need ₹15L gold (currently ₹17L, reduce ₹2L)"
- [ ] Rebalancing trades shown (fund recommendations TBD)
- [ ] Save plan

**Why:** Turns percentages into actionable trades. Precision for short-term portfolio decisions.

**Scope:** 1-2 weeks.

---

### **4C. Plan vs Actual Comparison**
**Goal:** "Am I staying on track with my plan?"

**Applies to:** Both 4A (investment amount) and 4B (allocation)

**Key Features:**
- [ ] User sets a plan (e.g., "Invest ₹1.67L/month in 40/30/30 split")
- [ ] YTD tracking:
  - Month 1: Planned ₹1.67L equity, Actual ₹1.5L equity
  - Month 2: Planned ₹1.67L equity, Actual ₹2L equity
  - YTD summary: Planned ₹3.34L, Actual ₹3.5L (+₹0.16L variance)
- [ ] Dashboard shows:
  - Running variance chart
  - Category breakdown (which categories off-track?)
  - Helps spot patterns
- [ ] Can update plan mid-year (adjusts baseline for comparison)

**Scope:** 1-2 weeks.

---

**Phase 4 Total Scope:** 3-4 weeks (3 sub-features).

---

## 5️⃣ Phase 5: TAX HARVESTING ANALYSIS & SCENARIOS
**Goal:** "Which funds should I harvest now, and what's the exact tax impact?"

**Why fifth:** Smart rebalancing + tax optimization. Depends on Phase 1 (tax calculations) + Phase 4 (allocation planning).

**Key Features:**

### **Part 1: Analytical Layer**
- [ ] Scan portfolio for opportunities:
  - **Loss candidates:** Flag funds with unrealized losses
    - Show holding period (ST vs LT)
    - Show if harvesting loss would drop you into lower tax bracket (e.g., stay under ₹12.5L STI slab)
    - Rank by tax efficiency
  - **Gain candidates:** Flag funds with large unrealized gains
    - Show if LTCG (20% with indexation) or STCG (slab rate)
    - Show tax liability if sold today
    - Suggest if it's a rebalancing opportunity
- [ ] Dashboard lists opportunities sorted by tax impact

### **Part 2: Scenario Builder**
- [ ] User clicks "Test this harvest" on any opportunity
- [ ] Scenario form:
  - "Sell Fund X (₹1L, loss ₹20K)"
  - "Buy Fund Y (₹1L)" (optional)
- [ ] Calculation shows:
  - Tax impact: "Loss offset ₹20K gain, tax saved ₹5K at your rate"
  - Portfolio impact: New allocation %, new tax liability YTD
  - Confirmation before applying
- [ ] Can test multiple scenarios, then pick best one to execute
- [ ] Scenarios saved (for reference, not auto-executed)

**Why:** Not just "you have losses" but "here's the exact tax consequence of acting now vs waiting."

**Scope:** 2-3 weeks (opportunity detection + scenario engine).

---

## Phase 6: MULTI-USER SUPPORT (Future)
**Goal:** Manage mom's investments alongside yours.

**Why later:** Single-user works for now; add when needed.

**Technical debt:**
- Add user accounts / auth
- Data isolation by user
- Shared vs. personal fund visibility

**Scope:** ~3-4 weeks (architectural change).

---

# TECH STACK (Confirmed)

**Frontend:** Next.js (TypeScript, Shadcn/ui, Tailwind)
**Backend:** FastAPI (Python)
**Database:** PostgreSQL (or SQLite for MVP)
**Data:** PDF → CSV pipeline (existing, working)

---

# DATABASE SCHEMA (MVP)

```
Core Tables:
- transactions (id, date, amount, category, description) — Phase 2
- funds (id, isin, ticker, name, quantity, cost_price, current_price) — Phase 1
- fund_holdings (id, fund_id, buy_date, quantity, purchase_price) — Phase 1, for tax calc

Phase 3 (Runway):
- (Uses transactions + funds tables, no new schema needed)

Phase 4 (Planning):
- plans (id, plan_type, created_date, status)
  - plan_type: "investment_amount" or "allocation"
- investment_amount_plan (id, plan_id, target_corpus, current_corpus, time_horizon_months, monthly_target)
- allocation_plan (id, plan_id, fund_id, target_percentage, notes)
- plan_tracking (id, plan_id, month, fund_id, planned_amount, actual_amount)

Phase 5 (Tax Harvesting):
- tax_events (id, fund_id, buy_date, sell_date, gain_loss, holding_period)
- harvest_scenarios (id, scenario_name, created_date, status) — "Draft", "Executed"
- harvest_scenario_trades (id, scenario_id, fund_id, action, amount, projected_tax_impact)
- harvest_analysis (id, fund_id, unrealized_gain_loss, holding_period, tax_bracket_impact) — Cache, updated periodically
```

---

# DATA FLOW DIAGRAM

```
Phase 2: EXPENSES                    Phase 1: TAX CALCS
   (daily logs)                      (PDF extraction)
         ↓                                  ↓
   Transaction DB  ←──────────────→  Fund Holdings DB
         ↓                                  ↓
   Monthly totals                    Tax calculations
         ↓                                  ↓
    Phase 3: RUNWAY ←─────────────────────┘
    (integration)
         ↓
    Avg burn rate + Portfolio value
         ↓
    "You have X months"
         ↓
    Phase 4A: Investment Amount Plan
    (How much to invest?)
         ↓
    Phase 4B: Allocation Plan
    (How to split it?)
         ↓
    Phase 4C: Plan vs Actual
    (Am I on track?)
         ↓
    Phase 5: Tax Harvesting
    (Which funds to rebalance for tax efficiency?)
```

---

# DECISION CHECKLIST

- [x] Timeline: As-needed, build features when you need them
- [x] Priority: Phase 1 (Tax) → 2 (Expenses) → 3 (Runway) → 4 (Planning) → 5 (Harvesting)
- [x] Data input: PDF for mutual funds, manual entry for expenses/plans
- [x] Users: Solo for now, multi-user later
- [x] Stack: Existing (Next.js + FastAPI)
- [x] Phase 3 integration: Connect real expense + investment data
- [x] Phase 4 split: Investment amount + Allocation + Plan vs Actual (separate tools)
- [x] Phase 5 added: Analytical layer (find opportunities) + Scenario builder (test before acting)
- [ ] Ready to start building