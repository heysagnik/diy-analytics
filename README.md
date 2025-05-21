# DIY Analytics ✨

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-black)](https://vercel.com/new/clone?repository-url=https://github.com/heysagnik/diy-analytics)
[![GitHub Stars](https://img.shields.io/github/stars/heysagnik/diy-analytics?style=social)](https://github.com/heysagnik/diy-analytics)

> **Your website stats, without the privacy headaches!** Get powerful insights in minutes, no coding required!

## 🚀 Get Started in Seconds!

Deploy to Vercel with one click:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/heysagnik/diy-analytics)
Or, follow the manual **Quick Setup** guide below for other environments.

## ✨ Why You'll Love It

- **🔒 Privacy First, Always** - Respects user privacy: no personal data collection, no cookies, and no annoying consent banners.
- **⚡ Feather-Light Script** - Tiny tracking script (under 2KB) that keeps your website fast and responsive.
- **🔍 Clear & Actionable Insights** - A simple, intuitive dashboard that shows you the website traffic metrics that matter most.
- **🚫 GDPR & CCPA Compliant by Design** - Built to be privacy-friendly, making regulatory compliance straightforward.
- **🛠️ Effortless No-Code Setup** - Get up and running in minutes. Deploy with a click and integrate with a single line of code!

## 💻 Quick Setup

```bash
# 1. Clone the repository
git clone https://github.com/heysagnik/diy-analytics.git
cd diy-analytics

# 2. Set up environment variables
# Copy the example environment file:
cp .env.local.example .env.local
# Then, open .env.local and update MONGODB_URI with your actual MongoDB connection string.
# For local development, the default value might work if you have MongoDB running locally.
# For production, ensure you use your production database URI.

# 3. Install dependencies
npm install

# 4. Run the development server
npm run dev
# This will start the application on http://localhost:3000 (or the next available port).
```

## 📊 Add to Your Site

Just paste this one line anywhere in your HTML:

```html
<script async defer src="https://your-analytics-deployment.com/script.js"></script>
```
**Important:** Replace `https://your-analytics-deployment.com` with the actual URL where you have deployed your DIY Analytics instance.

## 🤝 Join Our Community & Contribute

We're building DIY Analytics as a community effort and welcome contributions of all kinds! Whether it's reporting a bug, suggesting a feature, improving documentation, or writing code, we'd love your help.

**How to contribute:**
- **Found a bug?** [Open an issue](https://github.com/heysagnik/diy-analytics/issues).
- **Have a feature idea?** [Start a discussion](https://github.com/heysagnik/diy-analytics/discussions) or open an issue.
- **Ready to contribute code or documentation?** Fork the repository, create your feature branch, and then submit a pull request!

Check out our [open issues](https://github.com/heysagnik/diy-analytics/issues) to see where you can help.

Let's build something amazing together!
