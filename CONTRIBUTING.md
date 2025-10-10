# Contributing to DIY Analytics

First off, thank you for considering contributing to DIY Analytics! 🎉

It's people like you that make DIY Analytics a great tool for privacy-focused web analytics.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)
- [Issue Labels](#issue-labels)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (v6 or higher)
- **Git**

### First Time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/diy-analytics.git
   cd diy-analytics
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/heysagnik/diy-analytics.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/diy-analytics
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots)
- **Describe the behavior you observed** and what you expected
- **Include your environment details** (OS, Node version, browser)

**Use the bug report template** when creating a new issue.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **Include mockups or examples** if applicable

### Your First Code Contribution

Unsure where to begin? You can start by looking through these issues:

- **good-first-issue** - issues that should only require a few lines of code
- **help-wanted** - issues that need more involvement

### Pull Requests

Follow these steps to submit a contribution:

1. **Create a new branch** from `master`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our [coding guidelines](#coding-guidelines)

3. **Write or update tests** if needed

4. **Run tests** to ensure everything passes:
   ```bash
   npm test
   ```

5. **Run linting**:
   ```bash
   npm run lint
   ```

6. **Commit your changes** with a descriptive message:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for formatting changes
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Reference to related issues (e.g., "Fixes #123")
   - Screenshots/GIFs for UI changes
   - List of changes made

## 🛠️ Development Setup

### Project Structure

```
diy-analytics/
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   ├── projects/        # Project pages
│   └── ...
├── components/          # React components
│   ├── analytics/       # Analytics-specific components
│   ├── common/          # Shared components
│   ├── ui/              # UI components
│   └── ...
├── lib/                 # Utility functions
├── models/              # MongoDB models
├── types/               # TypeScript types
└── public/              # Static assets
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Database Setup

For local development, you need a MongoDB instance:

**Option 1: Local MongoDB**
```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option 2: MongoDB Atlas**
- Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Copy the connection string to your `.env.local` file

## ✅ Pull Request Process

1. **Update the README.md** with details of changes if applicable
2. **Update tests** to reflect your changes
3. **Ensure all tests pass** and the linter has no errors
4. **Update documentation** if you're changing functionality
5. **Wait for review** - a maintainer will review your PR
6. **Address review comments** if any
7. **Squash commits** if requested before merging

### PR Review Criteria

Your PR will be reviewed based on:

- ✅ Code quality and style
- ✅ Test coverage
- ✅ Documentation
- ✅ Performance impact
- ✅ Security considerations
- ✅ Breaking changes (if any)

## 📝 Coding Guidelines

### TypeScript

- **Use TypeScript** for all new files
- **Define proper types** - avoid `any` type
- **Export types** that might be reused

### React Components

- **Use functional components** with hooks
- **Keep components small** and focused
- **Use meaningful names** for variables and functions
- **Add comments** for complex logic

### Code Style

- **Use 2 spaces** for indentation
- **Use single quotes** for strings
- **Add semicolons** at the end of statements
- **Follow existing patterns** in the codebase

### Naming Conventions

- **Components**: PascalCase (`MyComponent.tsx`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`UserData`)

### Best Practices

- ✅ Write meaningful commit messages
- ✅ Keep PRs focused and small
- ✅ Add tests for new features
- ✅ Update documentation
- ✅ Follow existing code patterns
- ✅ Consider performance implications
- ✅ Think about accessibility
- ✅ Ensure mobile responsiveness

## 🏷️ Issue Labels

We use several labels to categorize issues:

### Type Labels
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `question` - Further information is requested

### Priority Labels
- `priority: high` - Critical issues
- `priority: medium` - Important but not critical
- `priority: low` - Nice to have

### Status Labels
- `good-first-issue` - Good for newcomers
- `help-wanted` - Extra attention is needed
- `wontfix` - This will not be worked on
- `duplicate` - This issue already exists
- `invalid` - This doesn't seem right

### Hacktoberfest Labels
- `hacktoberfest` - Issues eligible for Hacktoberfest
- `hacktoberfest-accepted` - PRs that count for Hacktoberfest

## 🌍 Community

### Getting Help

- 💬 **GitHub Discussions** - Ask questions and share ideas
- 🐛 **GitHub Issues** - Report bugs and request features
- 📧 **Email** - Contact maintainers directly

### Code Reviews

All submissions require review. We aim to:
- Review PRs within 48 hours
- Provide constructive feedback
- Help you improve your contribution

### Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes (for significant contributions)
- Project README (for major contributors)

## 🎉 Hacktoberfest

We participate in Hacktoberfest! Here's how to get involved:

1. **Register** for Hacktoberfest
2. **Find issues** labeled `hacktoberfest`
3. **Submit PRs** during October
4. **Get your PRs merged** to count toward Hacktoberfest

### Hacktoberfest Tips

- Start with `good-first-issue` if you're new
- Read issue descriptions carefully
- Ask questions if unclear
- Test your changes thoroughly
- Be patient - maintainers are volunteers

## ❓ Questions?

Don't hesitate to ask! You can:
- Open an issue with the `question` label
- Start a discussion on GitHub
- Reach out to maintainers

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to DIY Analytics!** 🚀

We appreciate your time and effort in making this project better for everyone.

*Happy Coding!* 💻
