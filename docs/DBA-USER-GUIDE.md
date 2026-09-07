# DBA Management — User Guide

A guide for product and ops editors using the CMS to set up Dynamic Betting Ads: which bookmakers run where, what the ads look like, and how to get them live.

---

## What Dynamic Betting Ads are

A Dynamic Betting Ad is an in-app betting ad that fills itself in with real upcoming matches and live odds at the moment it's shown, wrapped in a bookmaker's branding. You design the shell; the live match data arrives at display time.

You control two things in this CMS:

- **Bookmakers** — which sportsbook brands run in which countries, with the affiliate link, logo and legal licence number for each market.
- **Ad Formats** — the creative itself: size, colours, copy, call-to-action, optional welcome offer and legal footer.

A third screen, **Service**, is an operations dashboard for the live ad-serving backend.

---

## Before you start: how a change actually reaches the app

This is the most important thing to understand, because saving in the CMS is **not** the last step.

Your edits are stored in the CMS database as soon as you save. But the ads users see are served by Google Ad Manager (GAM), and the CMS does **not** push to GAM automatically. Getting a creative change live is a manual handover:

1. Make and save your change in **Bookmakers** or **Ad Formats**.
2. Open the ad format and click **View GAM code**.
3. Copy the generated HTML and paste it into the matching creative in Google Ad Manager.

Until step 3 happens, live ads keep running the previous creative. Plan for this — especially for anything time-sensitive like a promotion end date.

**A warning about the Reload button.** After you save a bookmaker, a blue banner appears saying *"Reload the service to apply changes immediately, or wait for the next automatic cache refresh."* That banner is misleading. **Reload Service** on the Service screen re-pulls the *Google Sheets* configuration into the live cache; it does not publish your CMS bookmaker or ad format edits. Clicking it will not make your affiliate-link change appear in ads. If in doubt, ask the dev team to confirm the current publishing path for your specific change.

---

## Finding your way around

In the sidebar under **Betting → DBA Management**:

| Menu item | What it's for |
|---|---|
| **Bookmakers** | Sportsbook brands and their per-country settings |
| **Ad Formats** | The creative designs |
| **Service** | Health of the live ad backend, and the config reload button |

A separate **BP Management** menu sits alongside it for Betting Promotions. That's a different feature and isn't covered here.

One thing you'll notice everywhere: every change is recorded against the name **D. Benvelgy**, regardless of who actually made it. The CMS has no login, so it can't tell editors apart. Don't read the "by" line as real attribution.

---

## Bookmakers

### How to think about the list

Each row is **one bookmaker in one country**, not one bookmaker. Bet365 running in Brazil and Bet365 running in Italy are two rows, each with its own affiliate link, licence number and Live/Draft status. The header calls these "configurations" for that reason, and the counter reads something like `12 of 24 configurations`.

Columns are **Bookmaker**, **Country**, **Affiliate Link**, **Status**, **Last Modified** and **Actions**. You can sort by Bookmaker, Country, Status and Last Modified; the list opens sorted by Last Modified, newest first.

Above the table: a search box (**Search by bookmaker or country…**, matching name or country code), an **All countries** dropdown, and an **All statuses** dropdown offering **Live only** and **Draft only**. There's no pagination — every matching row is on the page. Clicking a row does nothing; use the buttons in the Actions column.

**Live** means the bookmaker is being served in that country's ads. **Draft** means it's hidden. Sixteen markets are available, including a **Global** option for a worldwide default.

### Adding a bookmaker

Click **Add Bookmaker** to open a form panel on the right.

1. **Bookmaker** — search the pool and pick one. This pool is read from the production bookmaker database, so you're choosing an existing brand, not inventing one. Bookmakers you've already configured are hidden from the list.
2. **Logo** — the default logo loads automatically from the pool. Click a thumbnail to choose the **With background** or **Transparent** variant. A line at the bottom reads *"In ads, you'll see:"* so you can confirm which one wins.
3. **Per-country configuration** — one tab per market, starting with a single tab. For each one, fill in the **Affiliate Link** (required, must start with `http://` or `https://`), optionally a **Regulatory license number**, and set **Draft** or **Live**.
4. Click **Add country** to add more markets. With two or more tabs you get a **Copy this link to:** row, which duplicates the current tab's affiliate link into another country.
5. Save with either **Save**, which keeps each tab's Draft/Live setting as you left it, or **Save & Publish all**, which sets *every* country to Live after a confirmation.

You'll get a `{Bookmaker} saved` toast in the bottom-right corner.

A tab with a problem shows a red dot, so you can spot which market is blocking the save.

### Editing, publishing and removing

Click the pencil icon to reopen the form. Everything is editable except **which bookmaker it is** — that's locked, and the form tells you so: *"Bookmaker selection is locked when editing — create a new entry to add another"*. If you picked the wrong brand, create a new entry.

To publish or unpublish a single market quickly, use the toggle in the Status column. Going Draft → Live asks for confirmation; going Live → Draft happens immediately.

Deleting removes **one country row**, not the whole bookmaker — unless it's the last remaining country, in which case the bookmaker goes entirely. The dialog spells out which case you're in. **You cannot delete a Live row**; move it to Draft first.

### Bet365 is a special case

Bet365 has no editable affiliate link. The table shows *"managed externally"* and the field is disabled, because its link is resolved at click time rather than baked into the creative. Anyone building Bet365 creatives in GAM needs to declare `OS_Type` there; the on-screen tooltip has the details.

---

## Ad Formats

### The list

**Ad Formats** shows every creative design, as cards by default with a live thumbnail of each ad, or as a table via the view toggle. Each card shows the format name, bookmaker, target countries, size and Live/Draft status.

Filters across the top: search by name, plus dropdowns for **All sizes** (MPU 300×250, Interstitial 640×1280, Banner 320×50), **All statuses**, **All bookmakers**, and **Any features** — that last one narrows to formats with a welcome offer, a custom affiliate link, or a legal disclaimer. When filters are active a **Clear {N}** button appears. There's no pagination and no column sorting.

Each format offers four actions: **Edit**, **View GAM template code**, **Duplicate** (creates a Draft named `{name} (Copy)`), and **Delete**. As with bookmakers, Live formats can't be deleted — the tooltip reads **Move to Draft first**.

### The editor

**Create New Format**, or Edit on an existing one, opens a two-pane editor: form on the left, live preview on the right. The preview updates as you type.

The form is a single scrolling column divided into sections:

| Section | What it covers |
|---|---|
| **Identity** | Name, bookmaker, target countries, ad size |
| **Background** | Solid colour, gradient, or image with an overlay tint |
| **Foreground** | Text, CTA button and CTA text colours; date pill; odds and card colours on interstitials |
| **Bookmaker logo** | Auto, With bg, or Transparent |
| **Call to action** | Button text, up to 24 characters |
| **Typography** | Font family and size |
| **Layout** | Corner radius and odds display (Decimal, Fractional or American) |
| **Affiliate link** | Optional override of the bookmaker's default link |
| **Welcome offer** | Optional extra first slide |
| **Legal** | Optional disclaimer footer |

Two things about **Identity** are worth knowing. The **Bookmaker** dropdown only lists bookmakers that have at least one Live country variant — if it's empty you'll see *"No DBA-enabled bookmakers — add one in Bookmaker Management first."*, which means you need to go set up a bookmaker before you can design anything. And changing the bookmaker **overwrites your colour choices** with that brand's colours, confirmed by a `Colors updated to {name}'s brand` toast. Pick the bookmaker before you style the ad.

**Countries** drives both which markets serve the ad and which language its text resolves in.

### The preview

The right pane renders the ad at its real size, scaling to fit and showing the scale percentage when it isn't 100%. Use **MPU / Interstitial / Banner** to switch size — note this changes the *saved* size, not just the preview.

Ads rotate through slides: a welcome slide if you've enabled one, then match sets (two matches per slide on MPU, three on interstitial, one on banner). Step through with the arrows or hit **Animate** to auto-advance.

The matches and odds in the preview are **sample data**, not the live feed, so don't treat the specific teams or prices as real. The preview also always shows your English text, even if you've added translations.

### Translations

Text fields with a globe icon can be translated. Click it, fill in per-language values, and click **Apply** — then save the format, since Apply alone doesn't persist anything. English is the canonical fallback whenever a language has no value.

The name, CTA text and the welcome offer's headline, subtext, terms and CTA override all translate properly. Two gaps to be aware of: the welcome offer's **Pill text** has a translation button but the backend doesn't store those values, and the **Legal text** can be stored per language but has no translation button in the UI. If either matters for a campaign, raise it with the dev team rather than assuming it worked.

### Brazil

Adding **Brazil** to the target countries automatically switches the legal disclaimer on and fills it with the Ministério da Fazenda sentence, pulling the SPA/MF authorisation number from that bookmaker's Brazil variant. So set the licence number on the bookmaker first, or the disclaimer will be incomplete.

The Brazil layout reserves a band across roughly the bottom 10% of the ad and adds the 18+ badge for you. Keep important artwork out of that strip, and out of the edges generally — background images are cropped to cover the slot.

### Saving and publishing

**Save as Draft** stores your work and keeps you in the editor. **Save & Publish** asks to confirm (*"Publishing will update all live DBA ads using this format. Continue?"*), then saves as Live and returns you to the list.

Remember that "publish" here means the CMS record is marked Live. The creative in GAM still needs updating by hand — see the section at the top.

**Reset** reverts the styling to defaults. It leaves the name, bookmaker, countries and translations alone.

### The GAM code dialog

**View GAM code** shows exactly what you'd paste into Google Ad Manager: the creative HTML, the list of template variables, and a sample of the values for your first target market. Everything is copy-to-clipboard; nothing is uploaded.

This dialog is also your pre-flight check, and worth opening before every handover. It flags problems GAM would otherwise reject or silently mis-serve:

- *"Snippet not fully baked"* — placeholders are unresolved, usually because a bookmaker or country is missing. Fix and re-open before copying.
- *"Preview ↔ snippet mismatch"* — something you set in the editor didn't make it into the exported HTML. An alignment table shows which setting.
- Empty affiliate link or logo for a given bookmaker/country pair.
- A live check of the games feed, telling you whether real matches come back.

If your format targets several countries, note this warning: the HTML bakes in the branding, feed and disclaimer of the **first** market only. Every other country needs its own export.

The button is disabled on a format you haven't saved yet.

---

## Service

**Service** is a read-only health dashboard plus one button. It tells you whether the live ad backend is **Running**, **Degraded** or **Down**, along with its uptime and cache size, and lists recent activity across all three DBA screens.

**Refresh Status** re-checks health. The page also polls by itself every ten seconds.

**Reload Service** re-pulls the Google Sheets configuration into the live cache. As covered at the top, this does not publish CMS changes — use it when someone has edited the Sheets config, or when ops asks. It's confirmed by a dialog, takes effect without downtime, and then locks for a two-minute cooldown showing `Cooldown: {N}s remaining`.

Ignore the **Active ad slots** figure. It's hardcoded to `1,284` and isn't reading anything real.

If the whole card shows **Down**, the ad backend is unreachable from the CMS. That's expected on a local dev machine when the service isn't running; on production it's worth telling the dev team.

---

## Things the tool cannot do yet

These are current limitations, not bugs:

- **Nothing publishes to Google Ad Manager automatically.** Every creative change needs a manual copy-paste into GAM.
- **Logo upload doesn't really work.** The **Upload** and **Replace** buttons on a dedicated bookmaker logo generate a coloured placeholder from the bookmaker's initials. There is no file picker and your image is never stored. Don't rely on this for anything real.
- **No login and no real attribution.** Every action is logged as *D. Benvelgy*.
- **Live records can't be deleted** — move them to Draft first.
- **A bookmaker can't be changed** on an existing configuration, and the same bookmaker can't be added twice.
- **One bookmaker per ad format.** To run the same design for another brand, duplicate the format.
- **Multi-country formats export one market at a time.**
- **No pagination or column sorting** on the Ad Formats list; no pagination on Bookmakers.
- **The preview uses sample matches** and always shows English text.
- **Welcome offer pill text doesn't save translations**, and legal text has no translation UI.

---

## If something goes wrong

| What you see | What it means |
|---|---|
| *"Pick a bookmaker from the pool"* | Choose a bookmaker before saving |
| *"Affiliate link required"* | The highlighted country tab has no link — check the tabs with red dots |
| *"Must start with http:// or https://"* | Add the protocol to the affiliate URL |
| *"Bookmaker selection is locked when editing…"* | Expected — create a new entry if you need a different brand |
| *"DB unreachable — showing {N} mock entries"* | The production bookmaker pool is down; the names you're seeing are fake, so stop and tell the dev team |
| *"No DBA-enabled bookmakers — add one in Bookmaker Management first."* | No bookmaker has a Live country yet — set one up before designing a format |
| *"Move to Draft first"* on a disabled delete | Set the record to Draft, then delete |
| *"Snippet not fully baked"* in the GAM dialog | Assign a bookmaker and countries, then re-open the dialog before copying |
| *"Preview ↔ snippet mismatch"* | Something you configured isn't in the exported HTML — check the alignment table before handing over |
| *"Reload failed — BettingAdsService unreachable"* | The ad backend is down; check the Service status pill and tell the dev team |
| *"Save failed: …"* or *"Failed to load…"* | The CMS backend or its database is unreachable — retry, then escalate |
| Service shows **Down** or **Degraded** | The live ad backend is unhealthy. Expected locally, worth reporting in production |

Confirmations appear briefly in the bottom-right corner and fade after a few seconds.
