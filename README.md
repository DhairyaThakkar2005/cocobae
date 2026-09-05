# 🍨 CocoBae — Dessert Café POS App

A self-contained, high-performance Point-of-Sale (POS) and ordering app for **CocoBae Dessert Café**.
Built for Android phones and tablets with on-device SQLite database, automated daily backups, and thermal printer integration.

---

## ✨ Features

- **📱 Fully Responsive**: Seamlessly adapts from 320px compact phones to 1024px tablets (2-column on phones, 3–4 columns with persistent cart panel on tablets).
- **🎨 Dark Moody Luxury Theme**: Rich deep espresso background with amber/gold accents and smooth gradient placeholder cards.
- **📄 Single Source of Truth (`globals.css`)**: All colors, typography, spacing, and design tokens live in `globals.css` with zero hardcoding.
- **🛍️ Reference-Accurate Product Detail Card**: Modal / Bottom sheet with quantity pill selector `[ – 1 + ]`, optional special cooking request note, and dynamic `[ Add item ₹XXX ]` button.
- **💳 Flexible Checkout**: Supports **Cash**, **UPI**, and **Card / POS** with highlighting selection.
- **🧾 Instant Receipt & UPI QR Code**: Itemized bill with GST calculation, dynamic UPI QR scanner (`upi://pay`), Bluetooth thermal printing, and PDF sharing via WhatsApp.
- **📊 Sales Reports & Analytics**: Live dashboard tracking today's, this week's, and this month's revenue, 7-day visual bar chart, top-selling desserts, and payment method splits.
- **⏰ Automated Daily Backup (Cron Job)**: WorkManager schedules automated daily `.db` backups (runs at 2:00 AM even when the app is closed), auto-prunes files older than 7 days, and issues local notifications.
- **🔄 Zero-Server Portability**: Transfer database snapshots to any Android device via WhatsApp, Drive, or Bluetooth with one-tap restore.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd C:\Users\dhair\.gemini\antigravity\scratch\cocobae
npm install
```

### 2. Run in Development

```bash
npx expo start
```

Scan the displayed QR code with the **Expo Go** app on your Android phone or tablet.

### 3. Build Standalone Android APK (Free)

```bash
npm install -g eas-cli
eas build -p android --profile preview
```

Download the resulting `.apk` file and install it directly onto any Android device.
