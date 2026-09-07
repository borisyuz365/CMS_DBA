# BP Management — User Guide

A guide for product and ops editors using the CMS to build Betting Promotions: the full-screen offer comparison shown inside the 365Scores app.

---

## What a Betting Promotion is

A Betting Promotion is a **full-screen interstitial** in the mobile app that compares up to **three bookmaker welcome offers** side by side. Each offer shows a logo, a bonus headline, some description text and a tappable button that sends the user to the bookmaker.

Each entry in this section is one **version** of that screen. A version bundles three things:

- **Targeting** — who should see it: country, platform, language, attribution network, campaign, optionally a specific league.
- **Creative** — how it looks: header titles, page background, the three bookmaker cards, an optional legal footer.
- **Share of Voice** — how often this version wins when several versions match the same user.

You create a separate version for each audience. There's no way to vary copy by language *within* one version, so a Brazilian Portuguese promotion and an Italian one are two versions with different Language targeting.

---

## Before you start: two things that will surprise you

**Saving publishes immediately.** There is no Publish button and no draft state. The moment you click **Save** on a version whose **Active** toggle is on, it enters the live rotation — typically within seconds. Nothing else needs to happen, no deploy, no cache wait, no handover.

If you've also worked on **DBA Management**, note that this is the opposite of how that section behaves: DBA creative changes need a manual copy-paste into Google Ad Manager, whereas BP changes go straight out. Don't carry assumptions between the two.

The only off-switch is the **Active** toggle. Turn it off and save, and the version drops out of rotation on the next refresh.

**The environment dropdown does nothing.** The top-right corner of the CMS shows a "365 Production" selector offering Development, Staging and Production. It only changes its own label — it does not switch which database you're editing. There is no staging environment for this tool. Whatever you save goes to the live production database, from any of those three settings. Treat every edit as a production edit.

One caveat in the other direction, worth confirming with the mobile team before you promise anything to stakeholders: the deployment docs still list the mobile app integration with this new promotion API as a pending step. Your change reaching the live API within seconds is not in question; whether the app version in users' hands is reading from it is.

---

## The promotions list

**Betting → BP Management → Promotions** shows every version as a card, newest first. The subtitle counts what you're looking at, like `Betting Promotion versions — 8 of 12`.

Each card shows the version name, an Active or Inactive chip, and a row of targeting chips: country (or **All**), platform, league as `LID {number}`, language as `Lang {number}`, publisher, campaign, and the share of voice as `SOV {number}%`. Below that you get the bookmaker count and a preview of the main title in quotes. The colour strip along the top is the version's page background colour.

Three filters sit above the grid — **Geo**, **Platform** and **Status** — plus a **Clear filters ({n})** button once any are set. The Geo dropdown only lists countries that at least one promotion already targets.

A few things this screen deliberately doesn't have: no search box, no sorting, no pagination, and cards aren't clickable. Use the icons in the card footer: **Duplicate**, **Edit** and **Delete**.

If nothing matches your filters you'll see *"No promotions found."* and a **Create the first one** button. That's the same empty state you'd get if there were genuinely no promotions, so check your filters before concluding the list is empty.

**Duplicate** copies everything into a new version named `{name} (copy)`, always **Inactive**, with no confirmation step. This is the safe way to build a variant of a live promotion.

**Delete** asks to confirm and warns that it *"will permanently remove the promotion and all its bookmaker data."* There's no undo and no archive.

---

## Building a promotion

**New Promotion**, or Edit on a card, opens a two-pane editor: form on the left, live phone preview on the right. The badge in the header reads **Interstitial**, which is the only format this tool builds.

The form runs top to bottom through seven sections.

### Version info

**Name** is the internal label shown on the list card — users never see it. It's required. Something like `Brazil Android Q3` will save you pain later, since there's no search on the list.

**Active** controls whether this version is served. It defaults to **on** for new promotions, so a new version goes live the moment you save it. If you're drafting something for later, turn it off first.

### Targeting

| Field | What it does |
|---|---|
| **Geo** | Country. Defaults to **All countries** |
| **Platform** | **All platforms**, **Android** or **iOS** |
| **Language** | The user's app language. Defaults to all |
| **Network** | Attribution network, matched on the mobile `publisher` parameter |
| **Campaign** | Free text, matched on the campaign parameter. Blank matches all |
| **Share of Voice** | Slider, 0–100 |

Every targeting field left blank or set to "All" widens the audience rather than narrowing it, so a version with nothing set will match everyone.

**Share of Voice** is a weight, not a percentage cap. When several versions match the same user, one is picked at random with SOV as the weighting, so two matching versions at 100 each get roughly half the traffic each. It defaults to 100. If you launch a new version at full weight against an existing one, you've immediately taken half its traffic — set the weight deliberately.

Note that the platform list here offers only All, Android and iOS, even though the database also supports Web.

### Header, page style and the bookmaker cards

**Header** holds the main and secondary titles with their colours, plus an optional badge image above them. **Page style** sets the background as a solid colour, a two-colour gradient with an angle, or an image.

**Bookmakers** is three fixed blocks — Bookmaker 1, 2 and 3. For each: pick the bookmaker (the dropdown lists them as `{name} (BMID {id})`), then set the card's title, description, CTA text and colours, and the **Click URL**.

Two things to know here.

**All three Click URLs are required, always.** The save check looks at all three slots regardless of whether you filled anything else in, so you cannot save a two-bookmaker promotion by leaving the third blank — you'll get *"Click URL is required for bookmaker 3"*. There's no way to remove a slot. If you only want two offers, that's worth raising with the dev team rather than working around it.

**Logos and strip colours fill themselves in.** Once you pick a bookmaker, its logo and brand colour come from the database automatically. The **Logo image URL** and **Strip colour** fields are overrides — leave them blank unless you specifically need something different.

### Legal

Off by default. Switch it on for a footer disclaimer, with its own text (up to 200 characters), colour, and an optional link that makes the text tappable.

Setting **Geo** to **Italy** reveals two extra **Regulatory logos** fields. The logo images themselves are fixed; you only supply the link URL for each. Be aware the code points at `.png` files while the repo ships `.svg`, so these thumbnails may render broken — check with the dev team before relying on them for an Italian launch.

### League targeting

Off by default. Switch it on to enter a specific 365Scores **League ID** and restrict the promotion to that competition.

---

## The preview

The right pane renders the interstitial live as you type, at roughly phone proportions, with zoom controls and a **Reset** button. It opens at 140%.

Empty fields show placeholder copy — *"Biggest Signup Bonus"*, *"Bonus Offer 1"*, *"Visit Site"*, and **BK1** / **BK2** / **BK3** where logos would be. That text is preview-only and is never saved, so don't mistake a good-looking preview for a filled-in form.

Two settings don't show up in the preview even though they save correctly: the **CTA text colour**, and the fact that legal text is a working link. There's no device or theme switcher.

---

## Saving

Click **Create** on a new promotion or **Save** on an existing one. There's no confirmation dialog. You'll get a `Promotion created` or `Saved` toast, and after a moment you're returned to the list.

If anything is missing, you get a single error toast listing every problem at once, like `Name is required · Click URL is required for bookmakers 1, 2`, and nothing is sent.

**Your work is auto-saved to a local draft as you type**, which is helpful if you close the tab by accident. But it has a sharp edge: when you reopen that promotion, the CMS loads **your saved draft instead of what's actually stored on the server**. A yellow *"Unsaved draft restored"* banner appears at the top of the form with a **Discard** button. If you see that banner and don't remember what the draft contains, click **Discard** — otherwise you may be looking at a stale local copy and about to overwrite someone else's changes with it. The draft lives in your browser only; colleagues never see it.

---

## Things the tool cannot do yet

These are current limitations, not bugs:

- **No scheduling.** There are no start or end dates. A promotion runs from the moment you save it Active until someone turns it off by hand. If a campaign ends on a date, put a reminder in your calendar.
- **No image upload.** Every image — header badge, background, logo override — must be a URL to something already hosted.
- **Exactly three bookmaker slots**, all requiring a Click URL, with no way to add or remove one.
- **No per-language content.** Use separate versions targeted by Language.
- **No preview from the list**, and no way to see what a user in a given country would actually get.
- **No search, sorting or pagination** on the list.
- **No draft state on the server** — Inactive is the closest thing.
- **No login.** The CMS can't tell editors apart, and there's no audit trail of who changed what.
- **No staging environment.** The environment dropdown is decorative.
- **Deleting is permanent** and takes the bookmaker data with it.

---

## If something goes wrong

| What you see | What it means |
|---|---|
| *"Name is required"* | Give the version an internal name before saving |
| *"Click URL is required for bookmaker {n}"* | All three slots need a URL, even ones you aren't using |
| *"Unsaved draft restored"* banner | You're seeing a local browser draft, not the saved version — **Discard** it unless you know what's in it |
| *"Save failed: …"* | The CMS backend or database is unreachable, or a field is too long for the database. Retry, then escalate |
| *"Duplicate failed: …"* / *"Delete failed: …"* | Same — a backend problem rather than anything you did |
| *"No promotions found."* | Either there are none, or your filters hide them all. Click **Clear filters** to tell the difference |
| Card shows **Lang 3** rather than a language name | Expected. The list shows raw language IDs |
| Your change isn't visible in the app | Check **Active** is on and the targeting matches the test device. If both look right, it's a runtime or app-integration question for the dev team, not something you can fix here |

Confirmations appear briefly in the bottom-right corner and fade after a few seconds.
