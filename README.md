# Finance Monitor - Privacy-First Financial Tracking

A secure, privacy-focused financial monitoring application built with Next.js, shadcn/ui, and Plaid API.

## Features

✅ **End-to-End Encryption** - All financial data encrypted at rest
✅ **Secure Authentication** - Argon2id password hashing with strong requirements
✅ **Plaid Integration** - Connect bank accounts securely
✅ **Spending Analytics** - Detailed transaction analysis and visualizations
✅ **Privacy First** - No tracking, no third-party analytics
✅ **User Controls** - Full data management and account deletion

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Plaid API credentials

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo/finance-monitor.git
   cd finance-monitor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Plaid credentials and encryption key.

4. **Set up SQLite database (no server required):**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
   This will create a local `finance-monitor.db` file.

5. **Run development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Environment Variables

```env
# Database (SQLite - no server required)
DATABASE_URL="file:./finance-monitor.db"

# Plaid API
PLAID_CLIENT_ID="your_client_id"
PLAID_SECRET="your_secret"
PLAID_ENV="sandbox"

# Encryption
MASTER_ENCRYPTION_KEY="32_byte_hex_string"

# Security
NEXTAUTH_SECRET="random_secure_string"
SESSION_COOKIE_NAME="finance_monitor_session"
```

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Features

- **AES-256-GCM** encryption for all sensitive data
- **Argon2id** password hashing with configurable parameters
- **Per-user encryption keys** derived from master key
- **Secure session management** with encrypted cookies
- **Content Security Policy** to prevent XSS attacks
- **CSRF protection** on all forms
- **No logging** of sensitive financial data

## Architecture

```
User → Next.js Frontend → Next.js API Routes → Database
                          ↓
                     Plaid API
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Plaid Integration
- `POST /api/plaid/link-token` - Get Plaid link token
- `POST /api/plaid/exchange` - Exchange public token for access token
- `POST /api/plaid/sync` - Sync financial data

### Data Access
- `GET /api/analytics` - Get spending analytics
- `POST /api/accounts/disconnect` - Disconnect bank account
- `POST /api/user/delete` - Delete user account

## Password Requirements

- Minimum 14 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one symbol

## License

MIT License - See [LICENSE](LICENSE) for details.

## Support

For issues or questions, please open an issue on GitHub.