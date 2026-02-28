import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/bitespeed',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Interfaces
interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface IdentifyRequest {
  email?: string;
  phoneNumber?: number;
}

interface IdentifyResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

/**
 * Identity Reconciliation Algorithm
 * 
 * This function implements the core logic for identifying and linking customer contacts:
 * 1. Search for existing contacts matching the incoming email or phone number
 * 2. If no match found, create a new primary contact
 * 3. If matches found, identify the primary contact (oldest createdAt)
 * 4. Check if new information is provided (new email or phone)
 * 5. If new info, create a secondary contact linked to the primary
 * 6. Return consolidated contact information
 */
async function identifyCustomer(email?: string, phoneNumber?: number): Promise<IdentifyResponse> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Find all contacts matching email or phoneNumber
    let existingContacts: Contact[] = [];
    
    if (email || phoneNumber) {
      const searchQuery = `
        SELECT * FROM contacts 
        WHERE (email = $1 OR phoneNumber = $2) 
        AND deletedAt IS NULL
        ORDER BY createdAt ASC
      `;
      const result = await client.query(searchQuery, [email || null, phoneNumber?.toString() || null]);
      existingContacts = result.rows;
    }
    
    // Step 2: If no matches, create new primary contact
    if (existingContacts.length === 0) {
      const insertQuery = `
        INSERT INTO contacts (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
        VALUES ($1, $2, NULL, 'primary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const result = await client.query(insertQuery, [email || null, phoneNumber?.toString() || null]);
      const newContact = result.rows[0];
      
      await client.query('COMMIT');
      
      return {
        contact: {
          primaryContactId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber.toString()] : [],
          secondaryContactIds: []
        }
      };
    }
    
    // Step 3: Identify primary contact (oldest one)
    const primaryContact = existingContacts[0];
    let allLinkedContacts: Contact[] = [primaryContact];
    
    // Get all secondary contacts linked to this primary
    const getLinkedQuery = `
      SELECT * FROM contacts 
      WHERE linkedId = $1 AND deletedAt IS NULL
      ORDER BY createdAt ASC
    `;
    const linkedResult = await client.query(getLinkedQuery, [primaryContact.id]);
    allLinkedContacts.push(...linkedResult.rows);
    
    // Step 4: Check if new information is provided
    const hasNewEmail = email && !allLinkedContacts.some(c => c.email === email);
    const hasNewPhone = phoneNumber && !allLinkedContacts.some(c => c.phoneNumber === phoneNumber?.toString());
    
    // Step 5: If new info, create secondary contact
    if (hasNewEmail || hasNewPhone) {
      const insertSecondaryQuery = `
        INSERT INTO contacts (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
        VALUES ($1, $2, $3, 'secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const result = await client.query(insertSecondaryQuery, [
        email || null,
        phoneNumber?.toString() || null,
        primaryContact.id
      ]);
      allLinkedContacts.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    
    // Step 6: Consolidate and return results
    const emails = [...new Set(
      allLinkedContacts
        .filter((c): c is Contact & { email: string } => c.email !== null)
        .map(c => c.email)
    )];
    
    const phoneNumbers = [...new Set(
      allLinkedContacts
        .filter((c): c is Contact & { phoneNumber: string } => c.phoneNumber !== null)
        .map(c => c.phoneNumber)
    )];
    
    const secondaryContactIds = allLinkedContacts
      .filter(c => c.id !== primaryContact.id)
      .map(c => c.id);
    
    return {
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds
      }
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in identifyCustomer:', error);
    throw error;
  } finally {
    client.release();
  }
}

// POST /identify endpoint
app.post('/identify', async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber }: IdentifyRequest = req.body;
    
    // Validate input
    if (!email && !phoneNumber) {
      return res.status(400).json({ 
        error: 'At least one of email or phoneNumber is required' 
      });
    }
    
    // Process identity reconciliation
    const result = await identifyCustomer(email, phoneNumber);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error in /identify endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GET /identify endpoint (for testing via browser)
app.get('/identify', (req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'Use POST method with JSON body containing email and/or phoneNumber',
    example: {
      email: 'customer@example.com',
      phoneNumber: 1234567890
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bitespeed Identity Reconciliation Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Identify endpoint: POST http://localhost:${PORT}/identify`);
});

export default app;
