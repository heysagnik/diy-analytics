# DIY Analytics ✨

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-black)](https://vercel.com/new/clone?repository-url=https://github.com/heysagnik/diy-analytics)
[![GitHub Stars](https://img.shields.io/github/stars/heysagnik/diy-analytics?style=social)](https://github.com/heysagnik/diy-analytics)

> Privacy-friendly & Powerful website analytics in minutes — no coding, no complex setup , no fuss.




![localhost_3000_projects_6831e67f66e2968bb78db4ba](https://github.com/user-attachments/assets/6fd0f55d-74ea-4027-aec0-d78739fbb157)

> ⚠️ Disclaimer: This project is in alpha. Not recommended for production use yet. Expect rapid changes and bugs.


## 🚀 Instant Setup

Launch your own analytics tool in seconds:

Deploy to Vercel with one click: <br/> <br/>
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/heysagnik/diy-analytics)  <br/> 

Prefer manual setup? Follow the **Quick Setup** below.

## ✨ What Makes It Awesome

- **🔒 100% Privacy-Respecting** – No personal data, no cookies, no pop-ups.

- **⚡ Super Lightweight** – Tracking script is under 2KB. Blazing fast.

- **📈 Insightful Dashboard** – Traffic, pages, sources, campaigns, countries, devices, and browsers at a glance, with click-to-filter breakdowns and a live visitor counter.

- **🕒 Live & Historical Views** – Real-time visitor tracking plus hourly/daily/monthly granularity with per-project timezone support.

- **🎯 Goals & Funnels** – Define conversion goals, build multi-step funnels, and track retention over time.

- **🔔 Alerts** – Get notified when traffic or conversions cross a threshold you set.

- **🌐 Public Dashboards** – Optionally share a read-only, filterable analytics dashboard for a project via a public link — no login required.

- **👥 Workspaces & Team Access** – Organize projects under workspaces with role-based member access (viewer/member/admin/owner).

- **✅ GDPR & CCPA Friendly** – Compliance built-in, not bolted on.

- **🛠️ Easy Self-Hosting** – Deploy and integrate with a single line of code.

## 💻 Quick Setup


### 1. Clone the repository
```bash
git clone https://github.com/heysagnik/diy-analytics.git
cd diy-analytics
```
### 2. Set up environment variables
Create a .env file similar to the .env.local.example
Then, open .env.local and update MONGODB_URI with your actual MongoDB connection string.
For local development, the default value might work if you have MongoDB running locally.
For production, ensure you use your production database URI.

### 3. Install dependencies
```bash
npm install
```
### 4. Run the development server
```bash
npm run dev
# This will start the application on http://localhost:3000 (or the next available port).
```

## 📊 Add to Your Site

Copy the snippet from your dashboard and paste it into your site’s `<head>`.
<img src="https://github.com/user-attachments/assets/55b84635-32a3-48e5-aef4-8b9510090762" width='500'/>

## 🌐 Share a Public Dashboard

Enable public mode for a project in its settings to get a shareable, read-only dashboard at `/public/<projectId>` — visitors can change the date range and filters without needing an account.

## 🤝 Join Our Community & Contribute

We're building DIY Analytics as a community effort and welcome contributions of all kinds! Whether it's reporting a bug, suggesting a feature, improving documentation, or writing code, we'd love your help.

**How to contribute:**
- **Found a bug?** [Open an issue](https://github.com/heysagnik/diy-analytics/issues).
- **Have a feature idea?** [Start a discussion](https://github.com/heysagnik/diy-analytics/discussions) or open an issue.
- **Ready to contribute code or documentation?** Fork the repository, create your feature branch, and then submit a pull request!

Check out our [open issues](https://github.com/heysagnik/diy-analytics/issues) to see where you can help.

Let's build something amazing together!
