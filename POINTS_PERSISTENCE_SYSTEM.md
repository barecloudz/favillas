# Robust Points Persistence System

## Overview

This document describes the comprehensive points persistence system implemented to ensure users never lose their earned points. The system provides multiple layers of protection, backup mechanisms, and recovery capabilities.

## Key Features

### 🔒 **Atomic Operations**
- All point changes are wrapped in database transactions
- Row-level locking prevents race conditions
- Rollback on any failure ensures data consistency

### 📊 **Transaction Logging**
- Every point change is recorded in `points_transactions` table
- Complete audit trail with timestamps and descriptions
- Support for different transaction types (earned, redeemed, bonus, etc.)

### 🔄 **Data Integrity Checks**
- Multiple data sources for verification
- Automatic synchronization between tables
- Discrepancy detection and reporting

### 💾 **Backup & Recovery**
- Comprehensive backup system for all points data
- Point recovery from transaction history
- Data synchronization tools for administrators

## Database Schema

### Core Tables

#### `user_points`
```sql
- id (serial, primary key)
- user_id (integer, foreign key to users)
- points (integer, current points balance)
- total_earned (integer, lifetime earned points)
- total_redeemed (integer, lifetime redeemed points)
- last_earned_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `points_transactions`
```sql
- id (serial, primary key)
- user_id (integer, foreign key to users)
- order_id (integer, foreign key to orders, nullable)
- type (text: 'earned', 'redeemed', 'bonus', 'signup', 'first_order')
- points (integer, points amount)
- description (text, transaction description)
- order_amount (decimal, order amount if applicable)
- created_at (timestamp)
```

#### `user_points_redemptions`
```sql
- id (serial, primary key)
- user_id (integer, foreign key to users)
- points_reward_id (integer, foreign key to points_rewards)
- order_id (integer, foreign key to orders, nullable)
- points_spent (integer, points spent)
- is_used (boolean, redemption status)
- used_at (timestamp, nullable)
- expires_at (timestamp)
- created_at (timestamp)
```

## API Endpoints

### 1. Earn Points (`/api/earn-points`)

**Method:** POST  
**Authentication:** Required  
**Description:** Safely earn points with atomic operations and transaction logging

**Request Body:**
```json
{
  "points": 100,
  "orderId": 123,
  "description": "Order completion bonus",
  "orderAmount": 25.99
}
```

**Response:**
```json
{
  "success": true,
  "pointsEarned": 100,
  "currentPoints": 150,
  "transactionId": 456,
  "message": "Successfully earned 100 points! Your new total is 150 points."
}
```

**Features:**
- ✅ Atomic transaction wrapping
- ✅ Input validation (positive integers, max 10,000)
- ✅ Automatic user creation if needed
- ✅ Transaction logging
- ✅ Legacy rewards column sync
- ✅ Comprehensive error handling

### 2. Redeem Points (`/api/redeem-points`)

**Method:** POST  
**Authentication:** Required  
**Description:** Safely redeem points with integrity checks

**Request Body:**
```json
{
  "points": 50,
  "rewardId": 789,
  "description": "Free delivery reward"
}
```

**Response:**
```json
{
  "success": true,
  "pointsRedeemed": 50,
  "currentPoints": 100,
  "transactionId": 457,
  "message": "Successfully redeemed 50 points! Your new total is 100 points."
}
```

**Features:**
- ✅ Row-level locking with `FOR UPDATE`
- ✅ Sufficient points validation
- ✅ Atomic transaction wrapping
- ✅ Redemption tracking
- ✅ Transaction logging
- ✅ Legacy rewards column sync

### 3. Points Audit (`/api/points-audit`)

**Method:** GET/POST  
**Authentication:** Required  
**Description:** Comprehensive points audit with data integrity checks

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 100)
- `includeRecoveryData` (optional): Include recovery recommendations (admin only)

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_points_earned": 500,
    "total_points_redeemed": 200,
    "current_points": 300,
    "total_transactions": 15,
    "first_transaction": "2024-01-01T10:00:00Z",
    "last_transaction": "2024-01-15T14:30:00Z"
  },
  "transactions": [...],
  "userPointsRecord": {...},
  "legacyRewards": {...},
  "dataIntegrity": {
    "transactionsMatchUserPoints": true,
    "legacyRewardsMatch": true,
    "discrepancies": []
  },
  "recoveryData": {
    "redemptions": [...],
    "recoveryRecommendations": [...]
  }
}
```

**Features:**
- ✅ Complete transaction history
- ✅ Data integrity verification
- ✅ Discrepancy detection
- ✅ Recovery recommendations
- ✅ Admin-level recovery data

### 4. Points Recovery (`/api/points-recovery`)

**Method:** POST  
**Authentication:** Admin Required  
**Description:** Data synchronization and recovery operations

**Request Body:**
```json
{
  "action": "sync",
  "userId": 123
}
```

**Available Actions:**
- `sync`: Synchronize user_points with transaction history
- `recover`: Recover points from transaction history

**Features:**
- ✅ Admin-only access
- ✅ Data synchronization
- ✅ Transaction-based recovery
- ✅ Comprehensive error handling

### 5. Points Backup (`/api/points-backup`)

**Method:** POST  
**Authentication:** Admin Required  
**Description:** Create and restore comprehensive points backups

**Request Body (Create):**
```json
{
  "action": "create",
  "userId": 123
}
```

**Request Body (Restore):**
```json
{
  "action": "restore",
  "backupData": {...}
}
```

**Features:**
- ✅ Complete data backup
- ✅ Selective user backup
- ✅ Full system backup (admin)
- ✅ Safe restore operations
- ✅ Error tracking and reporting

## Data Integrity Features

### 1. **Multi-Table Consistency**
- Points stored in `user_points` table
- Legacy `rewards` column in `users` table kept in sync
- Transaction history in `points_transactions` table
- All tables updated atomically

### 2. **Automatic Synchronization**
- Regular integrity checks
- Automatic sync when discrepancies detected
- Recovery from transaction history
- Legacy column updates

### 3. **Discrepancy Detection**
- Compare calculated points vs stored points
- Verify legacy rewards column consistency
- Report discrepancies with details
- Generate recovery recommendations

## Backup & Recovery Strategies

### 1. **Transaction-Based Recovery**
- Rebuild points from transaction history
- Verify against stored values
- Handle missing transaction records
- Create initial transactions if needed

### 2. **Comprehensive Backups**
- Full system backup for administrators
- User-specific backup for individual recovery
- Include all related tables
- Versioned backup format

### 3. **Data Synchronization**
- Sync user_points with transaction totals
- Update legacy rewards column
- Verify data consistency
- Report synchronization results

## Error Handling

### 1. **Input Validation**
- Positive integer validation
- Maximum points per transaction (10,000)
- Required field validation
- Type checking

### 2. **Database Errors**
- Transaction rollback on failure
- Detailed error logging
- Graceful error responses
- Recovery recommendations

### 3. **Authentication Errors**
- Token validation
- Role-based access control
- Admin operation protection
- Clear error messages

## Security Features

### 1. **Authentication**
- JWT token validation
- Supabase token support
- Cookie-based authentication
- Role-based access control

### 2. **Authorization**
- Admin-only recovery operations
- User-specific data access
- Operation logging
- Audit trail maintenance

### 3. **Data Protection**
- Atomic transactions
- Row-level locking
- Input sanitization
- SQL injection prevention

## Monitoring & Logging

### 1. **Transaction Logging**
- All point changes logged
- Detailed transaction records
- Timestamp tracking
- Description fields

### 2. **Error Logging**
- Comprehensive error messages
- Stack trace logging
- Operation context
- Recovery recommendations

### 3. **Audit Trail**
- Complete transaction history
- Data integrity checks
- Discrepancy reports
- Recovery operations log

## Usage Examples

### Earning Points
```javascript
const response = await fetch('/api/earn-points', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    points: 50,
    orderId: 123,
    description: 'Order completion bonus',
    orderAmount: 25.99
  })
});

const result = await response.json();
console.log(`Earned ${result.pointsEarned} points. Total: ${result.currentPoints}`);
```

### Redeeming Points
```javascript
const response = await fetch('/api/redeem-points', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    points: 25,
    rewardId: 456,
    description: 'Free delivery reward'
  })
});

const result = await response.json();
console.log(`Redeemed ${result.pointsRedeemed} points. Remaining: ${result.currentPoints}`);
```

### Getting Points Audit
```javascript
const response = await fetch('/api/points-audit?includeRecoveryData=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const audit = await response.json();
console.log(`Current points: ${audit.summary.current_points}`);
console.log(`Total transactions: ${audit.summary.total_transactions}`);
```

## Best Practices

### 1. **Always Use Transactions**
- Wrap all point operations in database transactions
- Use atomic operations for consistency
- Implement proper rollback handling

### 2. **Validate Input**
- Check for positive integers
- Implement reasonable limits
- Sanitize all inputs
- Validate required fields

### 3. **Monitor Data Integrity**
- Regular audit checks
- Automatic synchronization
- Discrepancy reporting
- Recovery procedures

### 4. **Backup Regularly**
- Create system backups
- Test restore procedures
- Monitor backup integrity
- Document recovery processes

## Conclusion

This robust points persistence system ensures that users never lose their earned points through:

- **Atomic Operations**: All changes are transaction-wrapped
- **Transaction Logging**: Complete audit trail of all changes
- **Data Integrity**: Multiple verification mechanisms
- **Backup Systems**: Comprehensive backup and recovery
- **Error Handling**: Graceful failure and recovery
- **Security**: Authentication and authorization controls

The system provides multiple layers of protection and recovery mechanisms to ensure point data is always safe and recoverable.
