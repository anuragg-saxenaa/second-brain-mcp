# Contributing to Second Brain MCP

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Collect relevant information (logs, environment, steps to reproduce)
3. Test with the latest version

When creating a bug report, include:
- Clear, descriptive title
- Detailed steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
1. Check if the feature already exists or is planned
2. Clearly describe the use case and benefits
3. Provide examples of how it would work
4. Consider implementation complexity

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/second-brain-mcp.git
   cd second-brain-mcp
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the code style guidelines
   - Add tests for new functionality
   - Update documentation as needed
   - Keep commits focused and atomic

4. **Test your changes**
   ```bash
   npm run build
   npm test
   npm run lint
   ```

5. **Commit with clear messages**
   ```bash
   git commit -m "feat: add hybrid search functionality"
   ```

   Use conventional commit format:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

   Then create a pull request on GitHub with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots/examples if applicable

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Setup Steps

1. **Clone and install**
   ```bash
   git clone https://github.com/your-username/second-brain-mcp.git
   cd second-brain-mcp
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run migrations**
   - Copy `supabase/migrations/001_initial_schema.sql`
   - Run in Supabase SQL Editor

4. **Build and test**
   ```bash
   npm run build
   npm test
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

## Code Style Guidelines

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use explicit return types for public functions
- Avoid `any` type (use `unknown` if needed)
- Use meaningful variable and function names

Example:
```typescript
// Good
async function generateEmbedding(text: string): Promise<number[]> {
  // implementation
}

// Avoid
async function gen(t: any) {
  // implementation
}
```

### Error Handling

- Use custom error classes
- Provide meaningful error messages
- Log errors with context
- Handle errors at appropriate levels

Example:
```typescript
try {
  await someOperation();
} catch (error) {
  this.logger.error('Operation failed', { error, context });
  throw new DatabaseError('Failed to perform operation');
}
```

### Logging

- Use appropriate log levels (debug, info, warn, error)
- Include relevant context
- Don't log sensitive information

Example:
```typescript
this.logger.info('Memory added', { id, keywordCount: keywords.length });
this.logger.debug('Generating embedding', { textLength: text.length });
```

### Testing

- Write tests for new features
- Test edge cases and error conditions
- Use descriptive test names
- Mock external dependencies

Example:
```typescript
describe('MemoryService', () => {
  it('should add memory with embedding and keywords', async () => {
    const id = await memoryService.addMemory({
      content: 'test',
      auto_extract_keywords: true,
    });
    expect(id).toBeDefined();
  });
});
```

## Project Structure

```
second-brain-mcp/
├── src/
│   ├── config/          # Configuration (env, logger)
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types and schemas
│   └── index.ts         # Entry point
├── scripts/             # CLI and utility scripts
├── supabase/
│   ├── migrations/      # Database migrations
│   └── functions/       # Edge functions
├── tests/               # Test files
├── dist/                # Compiled output
└── docs/                # Additional documentation
```

## Documentation

When adding features:
- Update README.md if user-facing
- Add JSDoc comments for public APIs
- Update DEPLOYMENT.md for setup changes
- Add examples to documentation

Example:
```typescript
/**
 * Searches memories using semantic similarity
 * @param query - Search query object with text and parameters
 * @returns Array of matching memories with similarity scores
 * @throws {ValidationError} If query is invalid
 * @throws {DatabaseError} If search fails
 */
async searchMemories(query: SearchQuery): Promise<SearchResult[]> {
  // implementation
}
```

## Testing Guidelines

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Cover edge cases and error conditions

### Integration Tests
- Test service interactions
- Use test database or mocks
- Verify end-to-end workflows

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/services.test.ts

# Watch mode
npm test -- --watch
```

## Performance Considerations

- Batch operations when possible
- Use database indexes appropriately
- Cache frequently accessed data
- Monitor memory usage
- Profile slow operations

## Security Guidelines

- Never commit secrets or API keys
- Validate all user input
- Use parameterized queries
- Implement rate limiting
- Follow principle of least privilege
- Keep dependencies updated

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Build and test
5. Create GitHub release
6. Publish to npm (if applicable)

## Getting Help

- Check existing documentation
- Search closed issues
- Ask in discussions
- Join community chat (if available)

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Second Brain MCP! 🧠✨
