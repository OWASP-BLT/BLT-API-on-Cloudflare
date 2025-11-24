# Contributing to OWASP BLT API

Thank you for your interest in contributing to the OWASP BLT API!

## How to Contribute

### Reporting Bugs

- Use the GitHub Issues tab
- Describe the bug clearly
- Include steps to reproduce
- Mention your environment (Node version, OS, etc.)

### Suggesting Enhancements

- Open a GitHub Issue
- Describe the enhancement clearly
- Explain why it would be useful

### Code Contributions

1. **Fork the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OWASP-BLT-API.git
   cd OWASP-BLT-API
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the existing code style
   - Add comments where necessary
   - Update documentation if needed

4. **Test Your Changes**
   ```bash
   npm run dev
   # Test the endpoints manually
   ```

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "Add: brief description of your changes"
   ```

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

## Development Setup

### Prerequisites

- Node.js 18 or higher
- A PostgreSQL database (Neon, Supabase, or local)
- Cloudflare account (for deployment)

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your database connection
# DATABASE_URL=postgres://...

# Start development server
npm run dev

# API will be available at http://localhost:8787
```

### Project Structure

```
src/
├── index.ts              # Main application entry
├── types/                # TypeScript types
├── middleware/           # Middleware functions
├── routes/               # API route handlers
├── db/                   # Database connection
└── utils/                # Utility functions
```

## Code Style

- Use TypeScript
- Follow existing naming conventions
- Add JSDoc comments for functions
- Keep functions focused and small
- Use meaningful variable names

## Areas Needing Improvement

### High Priority

1. **Type Safety Improvements**
   - Fix TypeScript errors related to dynamic SQL queries
   - Add proper types for Hono context with user data
   - Improve type inference for database query results

2. **Testing**
   - Add unit tests for utility functions
   - Add integration tests for API endpoints
   - Set up CI/CD pipeline with automated testing

3. **Error Handling**
   - Improve error messages
   - Add more specific error types
   - Better handling of database connection errors

### Medium Priority

4. **Performance Optimization**
   - Add response caching for frequently accessed data
   - Optimize database queries
   - Implement query result caching

5. **Security Enhancements**
   - Add request validation using Zod
   - Implement SQL injection prevention checks
   - Add security headers middleware

6. **Documentation**
   - Add OpenAPI/Swagger documentation
   - Create more code examples
   - Add architecture diagrams

### Low Priority

7. **Features**
   - Add webhook support
   - Implement real-time updates
   - Add bulk operations endpoints
   - Create admin panel endpoints

## Testing Guidelines

Currently, the project needs a comprehensive test suite. When adding tests:

- Use a testing framework compatible with Cloudflare Workers (e.g., Vitest)
- Test both success and error cases
- Mock database connections for unit tests
- Use a test database for integration tests

Example test structure:
```typescript
describe('Issues API', () => {
  it('should return paginated issues', async () => {
    // Test implementation
  });

  it('should filter issues by status', async () => {
    // Test implementation
  });
});
```

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the API_EXAMPLES.md if you add new endpoints
3. The PR will be reviewed by maintainers
4. Address any requested changes
5. Once approved, your PR will be merged

## Database Schema

The API connects to the existing OWASP BLT PostgreSQL database. The schema is defined in the main BLT project. Do not modify the schema through this API.

Key tables:
- `auth_user` - Django user accounts
- `authtoken_token` - Authentication tokens
- `website_issue` - Bug reports
- `website_domain` - Registered domains
- `website_organization` - Organizations
- `website_userprofile` - User profiles and stats
- `website_points` - Points awarded to users
- `website_hunt` - Bug bounty hunts
- And many more...

## Communication

- GitHub Issues for bugs and feature requests
- Pull Requests for code contributions
- Link to main OWASP BLT project for general discussions

## Code of Conduct

This project follows the [OWASP Code of Conduct](https://owasp.org/www-policy/operational/code-of-conduct). Please be respectful and professional in all interactions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue or reach out to the maintainers!

## Recognition

Contributors will be recognized in the project README. Thank you for helping improve OWASP BLT API!
