# Velora

> **Private personal finance, stored locally.**

Velora is a local-first personal budgeting app for the web. It is designed for quick everyday money tracking while keeping financial records in the browser instead of requiring a cloud account.

## Highlights

- Track income and expenses
- Organize spending with custom categories
- Manage accounts and wallet balances
- Create monthly budgets
- Track recurring expenses and subscriptions
- Set and monitor savings goals
- Review activity on a financial calendar and timeline
- View spending trends and personalized insights
- Use **Safe to Spend** for a simple available-to-spend estimate
- Export transactions to CSV
- Create and restore complete JSON backups
- Install as a Progressive Web App (PWA)
- Work offline after the app has been cached
- Light, dark, and system themes
- Responsive desktop and mobile layouts
- Restrained motion with reduced-motion support

## Privacy by design

Velora follows a local-first model.

Financial/application records are stored in the browser with **IndexedDB**. The core app does not require a user account or a Velora backend to store financial data.

The app does not automatically upload backup files. Backups are created and restored locally by the user.

### Important

Local-first storage means your browser/device is responsible for retaining the data. Clearing browser site data, removing the browser profile, or losing the device can remove local records. **Create regular backups** from:

**Settings → Data & Privacy → Export backup**

Keep backup files somewhere you control and trust.

## Backup & restore

Velora supports a versioned JSON backup format.

A backup can include:

- Transactions
- Accounts
- Categories
- Budgets
- Recurring expenses
- Savings goals
- Application settings

Restore validates the backup before replacing local data. The restore operation is performed through IndexedDB so a failed transaction can be rolled back rather than leaving the database partially restored.

CSV export is provided separately for transaction data and is intended for use with spreadsheet applications.

## Open Velora

[**→ Open Velora**](https://velora-mikael.vercel.app/)

### Install Velora as an app

Once Velora is available over HTTPS, you can install it as a PWA:

- **Desktop:** Open the website in a supported browser and choose the browser's **Install** option.
- **iPhone / iPad:** Open the website in Safari → **Share** → **Add to Home Screen**.
- **Android:** Open the website in a supported browser → choose **Install app** or **Add to Home screen** when available.


## Installing the PWA

### Desktop

Open the HTTPS production site in a supported Chromium-based browser and use the browser's **Install** option when it appears.

### iPhone / iPad

Open the HTTPS site in Safari, choose **Share → Add to Home Screen**, then launch Velora from the Home Screen.

### Android

Open the HTTPS site in a supported browser and use the browser's **Install app** / **Add to Home screen** option when available.

## Project structure

```text
velora/
├── assets/
│   ├── icons/
│   └── ...
├── components/
├── css/
│   ├── style.css
│   ├── theme.css
│   ├── responsive.css
│   ├── motion.css
│   ├── polish.css
│   └── ...
├── js/
│   ├── app.js
│   ├── db.js
│   ├── navigation.js
│   ├── transactions.js
│   ├── budgets.js
│   ├── recurring.js
│   ├── goals.js
│   ├── accounts.js
│   ├── calendar.js
│   ├── insights.js
│   ├── backup.js
│   ├── csv.js
│   ├── recovery.js
│   └── ...
├── index.html
├── manifest.json
├── sw.js
├── favicon.ico
└── README.md
└── LICENSE
```

## Tech stack

- **HTML5**
- **CSS3**
- **Vanilla JavaScript (ES modules)**
- **IndexedDB** for local application data
- **localStorage** for non-sensitive UI preferences such as theme settings
- **Service Worker + Web App Manifest** for PWA/offline behavior

No framework or package manager is required for the core application.

## Design & motion

Velora uses a restrained glass-inspired interface with a focus on readability, hierarchy, and quick interaction.

Motion is intentionally subtle rather than decorative. The interface uses short view transitions, spring-like easing, button feedback, sheet/dialog transitions, and touch-friendly navigation behavior. Users who enable **Reduce Motion** receive a reduced-animation experience.

## Data safety

Before deleting browser data, moving to another device, or changing browsers, export a Velora JSON backup.

A practical workflow is:

```text
Use Velora
    ↓
Export a backup regularly
    ↓
Keep the backup somewhere safe
    ↓
Restore it only when needed
```

Do not treat a local browser database as the only copy of important financial records.

## Release status

**Velora 1.0.0 — Release Ready**

The core product, local data model, backup/restore workflow, CSV export, responsive interface, PWA shell, accessibility improvements, and visual polish are implemented.

## Repository

https://github.com/biasedfilms/velora

## Product boundaries

Velora is a budgeting and personal-finance organization tool.

It is not a bank, payment processor, investment platform, or financial-advice service. The project intentionally avoids early feature creep such as direct bank synchronization, payments, lending, investments, or social-finance features.

