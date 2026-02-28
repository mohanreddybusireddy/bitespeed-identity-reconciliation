-- Database schema for Bitespeed Identity Reconciliation
-- PostgreSQL database

-- Create contacts table to store customer contact information
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  phoneNumber VARCHAR(20),
  email VARCHAR(255),
  linkedId INTEGER,
  linkPrecedence VARCHAR(20) DEFAULT 'primary',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (linkedId) REFERENCES contacts(id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phoneNumber ON contacts(phoneNumber);
CREATE INDEX IF NOT EXISTS idx_contacts_linkedId ON contacts(linkedId);
CREATE INDEX IF NOT EXISTS idx_contacts_linkPrecedence ON contacts(linkPrecedence);
CREATE INDEX IF NOT EXISTS idx_contacts_deletedAt ON contacts(deletedAt);

-- Sample data for testing (optional)
-- INSERT INTO contacts (email, phoneNumber, linkedId, linkPrecedence) VALUES
-- ('lorraine@hillvalley.edu', '123456', NULL, 'primary'),
-- ('mcfly@hillvalley.edu', '123456', 1, 'secondary');
