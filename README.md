# Bitespeed Identity Reconciliation

A web service that identifies and tracks customer identity across multiple purchases by reconciling contact information (email and phone number) for e-commerce platforms.

## Overview

Bitespeed solves the challenge of identifying the same customer across multiple orders when they use different email addresses or phone numbers. This service is designed for FluxKart.com to provide personalized customer experiences by maintaining a unified customer identity.

## Features

- **Identity Reconciliation**: Links multiple contacts belonging to the same customer
- **Flexible Contact Matching**: Matches customers by email or phone number
- **Primary/Secondary Hierarchy**: Maintains primary contact as the oldest record
- **Contact Linking**: Automatically creates relationships between related contacts
- **Real-time Processing**: Fast HTTP API for instant identity resolution

## Tech Stack

- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL
- **Runtime**: Express.js
- **Deployment**: Render.com

## API Endpoint

### POST /identify

Receives customer contact information and returns consolidated identity details.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "phoneNumber": 1234567890
}
```

**Response Body:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["customer1@example.com", "customer2@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2, 3]
  }
}
```

## Database Schema

```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  phoneNumber VARCHAR(20),
  email VARCHAR(255),
  linkedId INT,
  linkPrecedence VARCHAR(20) DEFAULT 'primary',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (linkedId) REFERENCES contacts(id)
);
```

## Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/mohanreddybusireddy/bitespeed-identity-reconciliation.git
cd bitespeed-identity-reconciliation
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup database**
```bash
# Create PostgreSQL database
createb bitespeed

# Run schema setup
psql -U postgres -d bitespeed -f database.sql
```

4. **Configure environment**
```bash
cp .env.example .env
# Update DATABASE_URL in .env
```

5. **Run development server**
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Usage Examples

### Example 1: New Customer
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "doc@fluxkart.com", "phoneNumber": 123456}'
```

### Example 2: Existing Customer with New Email
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "newemail@fluxkart.com", "phoneNumber": 123456}'
```

## Deployment

### Deploy to Render.com

1. Push code to GitHub
2. Create new Web Service on Render.com
3. Connect GitHub repository
4. Set environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NODE_ENV`: production
5. Deploy

## Project Structure

```
bitespeed-identity-reconciliation/
├── src/
│   └── index.ts           # Main application file
├── database.sql           # Database schema
├── .env.example           # Environment variables template
├── tsconfig.json          # TypeScript configuration
├── package.json           # Project dependencies
└── README.md              # This file
```

## Key Algorithms

### Identity Reconciliation Logic

1. **Search**: Find all contacts matching the incoming email or phone number
2. **Link**: If matches found, identify the primary contact (oldest)
3. **Consolidate**: Return all linked emails and phone numbers
4. **Create**: If new information provided, create secondary contact linked to primary
5. **Update**: If primary contact needs to change, update linkPrecedence

## Testing

Run test suite:
```bash
npm test
```

## License

MIT License - feel free to use this project for commercial or personal purposes.

## Support

For issues or questions, please create an issue in the GitHub repository.

---

**Developed for Bitespeed Identity Reconciliation Challenge**
