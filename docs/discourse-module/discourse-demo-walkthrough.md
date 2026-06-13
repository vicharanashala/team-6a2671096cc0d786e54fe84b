# Discourse Module — Click-by-Click Demo Walkthrough

> Anyone can follow this — no coding knowledge required. It walks through every feature working in the browser, top to bottom.

---

## What this module does (in one sentence)

It looks at a Discourse forum your organization already runs, finds questions people keep asking over and over, and turns those recurring questions into draft FAQs that an admin can review and publish.

---

## Step 0 — Log in

1. Open the app's homepage (typically `http://localhost:5173`)
2. Click **Login** in the top nav
3. Enter the **admin** credentials (the first user with the `ADMIN_EMAIL` env value)
4. Click **Login**
5. You should see "Welcome, `<your name>`" in the top nav and a new **Discourse** link in the admin section

> 💡 Non-admin users do **not** see the Discourse link. Manually navigating to `/admin/discourse` as a non-admin redirects to the homepage.

---

## Step 1 — Sources tab (the home base)

Click **Discourse** in the nav. You land on the **Sources** tab.

### 1a. Test a saved source (if any exist)
- Click **Test** next to any source row
- After a few seconds, a green toast: "Connected. Found N posts in the last 7 days."
- The **Last Synced** column updates with the current date+time

### 1b. Add a brand new source
1. Click **+ Add Source**
2. Fill in the form:
   - **Name:** `Discourse Meta (test)` *(anything that helps you remember it)*
   - **Base URL:** `https://meta.discourse.org`
   - **API Key:** *(leave blank)*
   - **API Username:** *(leave blank)*
   - **Category Slug:** one of these verified-working public slugs — `support`, `dev`, `community-building`, `general`, `marketplace`, or `news-and-events`
3. Click **Add Source**
4. The new row appears in the table

### 1c. Test the new source
1. Click **Test** on the row you just added
2. After a few seconds: "Connected. Found N posts in the last 7 days."

### 1d. Edit a source
1. Click **Edit** on any source
2. Change the **Name** field
3. Click **Save Changes**
4. The table updates

### 1e. Delete a source
1. Click **Delete** on any source
2. Confirm in the dialog
3. The row disappears (and all its suggestions are removed)

---

## Step 2 — Analyze tab

Click the **Analyze** tab.

### 2a. Quick run
1. Pick a source from the **Source** dropdown
2. Choose **Last 7 days** (the default)
3. Click **Run Analysis**
4. A blue progress box appears with a **live progress bar** that updates per step:
   - *"Fetching posts from Discourse…"* (10%)
   - *"Clustering posts with AI…"* (60%)
   - *"Saving suggestions…"* (90%)
   - *"Done"* (100%)
5. After 10–30 seconds, a green toast: *"Analysis complete. N suggestion(s) generated."*
6. **The page automatically jumps to the Review Queue tab**, pre-filtered to your just-completed run. You see exactly the suggestions you just generated.

### 2b. Custom date range
1. Pick a source
2. Change the range to **Custom**
3. Two date pickers appear
4. Pick a custom range
5. Click **Run Analysis**

### 2c. Cache behavior
- Run the same Analyze again within 5 minutes → you get the same suggestions back almost instantly
- The toast will say *"(from 5-min cache)"* if applicable

---

## Step 3 — Review Queue tab

The Review Queue has sub-tabs: **Pending / Approved / Rejected / Edited**. You auto-land on Pending after an Analyze.

### 3a. The filter row
At the top of the tab, you see:
- **Status sub-tabs** — Pending / Approved / Rejected / Edited
- **Source filter** — pick any saved Discourse source or "All sources"
- **Run filter** — pick a specific Analyze run (e.g. *"2026-06-13 14:34 — Discourse Meta — 7d — 7 sugg"*) or "All runs"
- **Clear filters** button — appears when any filter is active

### 3b. Review a pending suggestion
1. Click any row to expand it
2. You see:
   - **Proposed Question** (bold heading)
   - **Proposed Answer** (full text)
   - **Source name** — which Discourse forum this came from
   - **📊 X discussions** — how many posts on the forum this question appeared in
   - **Category** — e.g. "programs"
   - **⚠️ Similar Existing FAQs** (yellow box, if any) — links to existing FAQs that say something similar
   - **📚 Source References** — clickable links to the actual Discourse posts
   - **Generated at** timestamp
3. The status badge shows **pending** (yellow)

### 3c. Approve
1. Click **✅ Approve**
2. Green toast: *"Suggestion approved."*
3. The row moves from Pending → **Approved** sub-tab
4. A real FAQ was added to the `FAQ` collection with `status: 'draft'` and `isAiGenerated: true`

**Verify it really landed:**
1. Go to **FAQs** in the top nav (the existing FAQ management page)
2. Filter by **Draft**
3. You'll see the newly approved FAQ in the list, ready to be promoted through the existing draft → approved → published flow

### 3d. Edit + Approve
1. On a different pending row, click **✏️ Edit**
2. A modal opens with prefilled Q/A/Category
3. Change the question, answer, or category
4. Click **Save + Approve as Draft**
5. The row moves to **Edited** sub-tab
6. A new FAQ appears in the existing FAQ list with your edited content

### 3e. Reject
1. On another pending row, click **❌ Reject**
2. Confirm in the dialog
3. The row moves to **Rejected** sub-tab
4. **No FAQ is created** — that's the safety net

### 3f. Switch between sub-tabs
- Click **Pending** → see the new suggestions waiting for review
- Click **Approved** → see the ones you already approved (with a link to the created FAQ)
- Click **Rejected** → see the ones you dismissed
- Click **Edited** → see the ones you modified + approved

### 3g. Filter by specific run
- Use the **Run** dropdown to see only the suggestions from a specific Analyze click
- This is the answer to *"wait, which run were these from?"* — every suggestion has a unique `runId` tying it to one specific Analyze click

### 3h. Export CSV
- Click **Export CSV** at the top right of the Review Queue
- A CSV file downloads with all suggestions across all statuses

---

## Step 4 — Promote drafts to live

This shows the **composability** of the module with the rest of the app:

1. Go to **FAQs** in the top nav (existing FAQ management page)
2. Filter by **Draft** — you'll see the drafts you just approved
3. Use the existing UI to change status to `Approved`, then to `Published`
4. Visit the **homepage** — the Discourse-sourced FAQ is now **live** alongside any hand-written ones

---

## Step 5 — Auth guard (security check)

Open a private/incognito window and:
- Try to visit `/admin/discourse` directly → redirected to login
- Log in as a **non-admin** user
- Manually visit `/admin/discourse` → redirected to homepage (server returns 403)
- The **Discourse** link is **not** visible in the nav for non-admins

---

## A real example suggestion (from a test run)

> **Source:** Discourse Meta
> **Q:** How do I schedule recurring events like "last Monday of each month" or "every second Tuesday" with the improved RSVP feature?
> **A:** For recurring events such as "every second Tuesday," the "every month on this weekday" option is available. However, there is currently no specific built-in option to schedule events that occur on patterns like "the last Monday of each month."
> **Category:** programs · **3 discussions clustered** · Source: `meta.discourse.org/t/improved-events-…`

Click **Approve** → becomes a real draft FAQ → promote to published → live on the homepage. ✨

---

## What's NOT in the demo (intentionally)

- Nothing is ever published automatically. Every publish needs your click.
- The module never writes to your Discourse forum — read-only.
- The module never modifies existing FAQ workflows — your existing draft → approved → published pipeline still works exactly as before.

---

## Troubleshooting

### "Test failed: 404"
- The category slug is wrong. Use one of the verified slugs: `support`, `dev`, `community-building`, `general`, `marketplace`, `news-and-events`.

### "Test failed: 401"
- You're using a private Discourse forum and didn't provide an API key. Either provide one, or use a public forum.

### "Test failed: 429"
- Discourse is rate-limiting. Wait 60 seconds and try again.

### "No suggestions found"
- The date range is too narrow, or the category doesn't have many posts. Try "Last 90 days" or pick a more active category.

### "Analysis runs forever"
- The backend isn't running. Check the dev server.

### I can't see the Discourse link in the nav
- You're not logged in as admin. Log in with the `ADMIN_EMAIL` credentials.
