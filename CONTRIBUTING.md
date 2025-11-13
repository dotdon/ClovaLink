# Contributing to ClovaLink

Thank you for your interest in contributing to ClovaLink! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the project and community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 20.x or later
- PostgreSQL 15.x or later (or use Podman)
- Git
- Basic understanding of Next.js, React, and TypeScript

### Setting Up Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ClovaLink.git
   cd ClovaLink
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/dotdon/ClovaLink.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   node generate-encryption-key.js
   # Add the generated ENCRYPTION_KEY to .env
   ```

6. **Set up database**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

7. **Start development server**:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or updates

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, readable code
   - Follow existing code style and conventions
   - Add comments for complex logic
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   npm run lint
   npm run build
   # Test manually in the browser
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Test additions or updates
   - `chore:` - Maintenance tasks

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

### Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues (e.g., "Fixes #123")
- Include screenshots for UI changes
- Ensure all tests pass
- Keep PRs focused on a single feature or fix
- Be responsive to feedback and review comments

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for type safety
- Use meaningful variable and function names
- Keep functions small and focused
- Use async/await instead of promise chains
- Handle errors appropriately

### React Components

- Use functional components with hooks
- Keep components small and reusable
- Use proper prop typing with TypeScript
- Follow naming conventions (PascalCase for components)
- Use React Bootstrap components when possible

### Database

- Use Prisma schema for database changes
- Write migrations for schema changes
- Test database changes thoroughly
- Document complex queries

### Security

- Never commit sensitive data (.env, keys, passwords)
- Validate all user inputs
- Use parameterized queries (Prisma does this automatically)
- Follow security best practices
- Report security issues privately to the maintainers

## Testing

- Test your changes thoroughly in different browsers
- Test with different user roles (Admin, Manager, User)
- Test with different companies for multi-tenant scenarios
- Test edge cases and error conditions
- Test the features you changed and related features

## Documentation

- Update README.md for major feature changes
- Add inline code comments for complex logic
- Update API documentation for endpoint changes
- Update environment variable documentation
- Add FAQ entries for common user questions

## Project Structure

```
ClovaLink/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   └── dashboard/         # Dashboard pages
│   ├── components/            # React components
│   │   ├── ui/               # UI components
│   │   ├── modals/           # Modal components
│   │   └── viewers/          # Document viewers
│   ├── lib/                   # Utility functions and services
│   └── types/                 # TypeScript type definitions
├── prisma/                    # Database schema and migrations
├── public/                    # Static assets
├── rust-core/                 # Rust native module (optional)
└── scripts/                   # Utility scripts
```

## Feature Development Guidelines

### Adding a New Feature

1. Discuss the feature in an issue first
2. Design the API endpoints needed
3. Update the database schema if needed
4. Implement the backend API
5. Implement the frontend UI
6. Add proper error handling
7. Update documentation
8. Test thoroughly

### Adding a New API Endpoint

1. Create the route file in `src/app/api/`
2. Implement proper authentication and authorization
3. Validate input data
4. Use Prisma for database operations
5. Return consistent error responses
6. Add proper logging
7. Document the endpoint

## Common Tasks

### Adding a New Database Model

1. Update `prisma/schema.prisma`
2. Run `npx prisma db push` (development)
3. Update seed data if needed
4. Generate Prisma client: `npx prisma generate`

### Adding a New Component

1. Create the component in appropriate directory
2. Use TypeScript for props
3. Follow existing component patterns
4. Import and use in parent component
5. Test the component

### Updating Dependencies

1. Check for breaking changes
2. Update package.json
3. Run `npm install`
4. Test thoroughly
5. Update documentation if needed

## Troubleshooting

### Build Errors

- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build`

### Database Issues

- Reset database: `npx prisma db push --force-reset`
- Regenerate Prisma client: `npx prisma generate`
- Check DATABASE_URL in .env

### Rust Core Issues

- Rebuild: `cd rust-core && npm run build`
- Check Rust installation: `rustc --version`
- Fallback to JS crypto: `USE_RUST_CRYPTO=false`

## Getting Help

- Check existing issues and discussions
- Read the documentation (README.md, Wiki)
- Ask questions in GitHub Discussions
- Join community channels (if available)

## License

By contributing to ClovaLink, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, please:
- Open a GitHub Discussion
- Comment on relevant issues
- Contact the maintainers

Thank you for contributing to ClovaLink! 🎉
