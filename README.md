# Orion: Hedera On-Ramp/Off-Ramp Backend

## Project Overview

Orion is a financial services platform designed to unlock the African market for the Hedera ecosystem. We are building the essential "on-ramp and off-ramp" infrastructure that connects local African fiat currencies directly to digital assets on Hedera. Our initial launch targets Kenya and Nigeria, two of Africa's largest and most dynamic economies, which have high crypto adoption rates but are largely cut off from the global Web3 ecosystem.

## Key Features

- **Fiat On-Ramp**: Facilitates seamless conversion between local African fiat currencies and digital assets on Hedera.
- **Business Integration**: Provides services for businesses to integrate Orion's capabilities into their operations.
- **User Authentication**: Secure user management including registration, login, and session handling.
- **Environment Management**: Enables businesses to manage their API keys and webhook configurations for test and live environments.
- **Treasury Operations**: Internal services for managing treasury accounts and token liquidity.
- **Transaction Processing**: Handles payment processing, status management, and webhook updates for transactions.
- **Hedera Integration**: Direct interaction with the Hedera network for on-chain operations.
- **Webhook Notifications**: Delivers real-time event notifications to businesses.
- **Admin Management**: Tools for administrative oversight and management of the platform.

## Tech Stack

The Orion backend is built with a modern and robust tech stack to ensure scalability, security, and performance:

- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Drizzle ORM)
- **Authentication**: Better Auth
- **Email Service**: Nodemailer with React Email
- **Rate Limiting**: express-rate-limit
- **Caching/Locking**: Redis, async-lock
- **Configuration Management**: Infisical SDK
- **Logging**: Pino
- **Testing**: Jest, Supertest
- **Hedera SDK**: @hiero-ledger/sdk
- **Other Libraries**: dotenv, cors, bcrypt, jsonwebtoken, luxon, node-cron, posthog-node, zod, tailwindcss (for email templates)

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Table of Contents](#table-of-contents)
- [Authentication Service](#authentication-service)
- [Notification Service](#notification-service)
- [Business Service](#business-service)
- [Admin Service](#admin-service)
- [Environment Service](#environment-service)
- [Treasury Service](#treasury-service)
- [Hedera Model](#hedera-model)
- [Webhook Service](#webhook-service)
- [Transaction Service](#transaction-service)
- [Architecture](#architecture)

# Authentication Service

The authentication service handles user registration, login, email verification, and password resets using [Better Auth](https://www.better-auth.com/).

### Routes

1. Sign Up using Email
   `POST /api/auth/sign-up/email`

   Registers a new user.

   **Request Payload:**

   ```json
   {
     "email": "user@example.com",
     "password": "password",
     "name": "John Doe",
     "businessName": "My Business",
     "phoneNumber": "+254700000000"
   }
   ```

2. Sign In using Email
   `POST /api/auth/sign-in/email`

   Logs in an existing user.

   **Request Payload:**

   ```json
   {
     "email": "user@example.com",
     "password": "password"
   }
   ```

3. Sign Out
   `POST /api/auth/sign-out`

   Logs out the current user.

4. Forgot Password
   `POST /api/auth/forget-password`

   Sends a password reset link to the user's email.

   **Request Payload:**

   ```json
   {
     "email": "user@example.com"
   }
   ```

5. Reset Password
   `POST /api/auth/reset-password`

   Resets the user's password.

   **Request Payload:**

   ```json
   {
     "token": "verification_token",
     "password": "newPassword"
   }
   ```

### Data Model

The authentication system uses the following tables (defined in `src/lib/db/schema.ts`):

- `user`: Stores user details including `businessName`, `phoneNumber`, and `country`.
- `session`: Stores active sessions.
- `account`: Stores provider accounts (if any).
- `verification`: Stores verification tokens.

Configuration is in `src/lib/auth/index.ts`.

# Notification Service

### Nodemailer and React Emails

All email templates can be found under /src/lib/emails/templates folder.
The email templates use React Email and tailwind css is supported.

The wrapper for the email service is in email.util.ts .

` async testEmail() {
    await sendEmail({
      to: "dev@example.com",
      subject: "Test Email setup",
      react: ExampleEmail(),
    });
  }`

# Business Service

For business activities, we have the following routes

1. Creating a draft business
   `POST /api/business/create`
2. Submitting a business for approval.
   `PUT /api/business/submit/:id`
3. Getting all businesses.
   `GET /api/business/user`
4. Updating a draft business.
   `PUT /api/business/:id`
5. Inviting a user to a business.
   `POST /api/business/:id/invite`
6. Accepting an invite to a business.
   `POST /api/business/invitations/:inviteId/accept`
7. Deleting a business.
   `DELETE /api/business/:id`
8. Getting a business by ID.
   `GET /api/business/one/:id`
9. Getting all industries and categories.
   `GET /api/business/industries`
10. Listing all invitations for a business.
    `GET /api/business/:id/invitations`
11. Cancelling an invitation.
    `DELETE /api/business/invitations/:inviteId`
12. Removing a member from a business.
    `DELETE /api/business/:id/team/:memberId`
13. Getting all members of a business.
    `GET /api/business/:id/team`

- The model and controller for the business can be found under the models and controllers directory respectively.
- The structure of the request and response bodies can be found in types/business .

# Admin Service

For the admin functionalities, we have the following routes:
Authentication & Admin Management

1. Create Admin
   `POST /api/admin/create`

Create a new admin (SUPER_ADMIN only, rate-limited)

2. Admin Login
   `POST /api/admin/login`

Login as an admin (rate-limited)

### Business Management (Protected)

3. Get Businesses (Paginated & Filtered)
   `GET /api/admin/businesses`

`Query params:
status (optional): "Draft" | "Pending" | "Approved" | "Rejected" | "Suspended"
page (optional): number (default: 1)
limit (optional): number (default: 10, max: 100)`

4. Get Business by ID
   `GET /api/admin/businesses/:id`

Get a specific business by its ID

5. Approve Business
   `PUT /api/admin/businesses/:id/approve`

Approve a pending business

6. Suspend Business
   `PUT /api/admin/businesses/:id/suspend`

Suspend an active or pending business
All business management routes require admin authentication and are rate-limited.

- The model and controller for the admin functionalities can be found under the models and controllers directory respectively.
- The structure of the request and response bodies can be found in types/admin .

# Environment Service

The environment service is in charge of managing the environments of a business. An environment has the API keys and webhook details that a business will use to integrate with Orion.

There are 2 kinds of environments: a **test** environment and a **live** environment. The test environment is for testing an integration with Orion. The money that is onramped isn't real and the tokens sent to the business' wallet are on testnet. The live environment has details of the actual integration, real funds are onramped and tokens on mainnet are sent to the business' wallet.

## Creating Environments

The logic for creating an environment has this behaviour:

| Scenario                                                                               | Expected Outcome                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business already has an environment of the same type as the one to be created          | **Fail with error message:** Business environment already created                                                                                                             |
| Should fail if the user calling the function is not the admin or owner of the business | **Fail with error message:** Unauthorized                                                                                                                                     |
| If a live environment is being created and business is not approved                    | **Fail with error message:** Business not approved                                                                                                                            |
| Otherwise should create                                                                | **Environment created successfully** with a unique public key and private key created and webhook secret: Returns id, type, public key and private key of created environment |

The public key and private key created are an ED25519 key pair, after creation the user is allowed to copy the private key only once. This private key is not stored on our database as plain text, instead we store a AES-256-GCM encrypted version and also a hash that is used to compare private keys. The webhook secret is a random string.

This logic is accessible via the `POST /api/environment/` endpoint. The endpoint is JWT authenticated and can only be called by a user who is either the owner or an admin of the business.

## Rekeying Environment

We also allow a business to generate new API key pair. This can be done if their previous private key was exposed. This follows the logic below:

| Scenario                                                                               | Expected Outcome                                                                                                             |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| The business has not created the environment they want to rotate keys of               | **Fail with error message:** Business does not have environment                                                              |
| Should fail if the user calling the function is not the admin or owner of the business | **Fail with error message:** Unauthorized                                                                                    |
| Otherwise should create new key                                                        | **New keys for the environment created and the old key set to expire in 5 minutes:** Returns the new public and private keys |

The keys are created in the same way as the previous chapter. After creating the new key, we still allow the old key to be used for only 5 minutes. This is to give the business enough time to switch to the new key without the risk of other requests failing.

This logic is accessible via the `POST /api/environment/new` endpoint. The endpoint is JWT authenticated and can only be called by a user who is the owner or admin of the business

## Others

There is also the `GET /api/environment/:business` for getting the information about a business' environment that is displayed on our site. This endpoint is JWT authenticated.

# Treasury Service

The treasury service is in charge of interacting with our treasury account and onramping payments received. This service is not accessible by any endpoints and is just used internally.

## Business Onramp

This sends onramped tokens to a business' account. It only onramps if a previous transaction request was created. It has the following behaviour:

| Scenario                                                                                     | Expected Outcome                                                             |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| The SDK request has been made with a transaction reference that is not in our system         | **Fail with an error message:** Unauthorized Payment                         |
| The SDK request transaction reference exists but the transfer has already been complete      | **Fail with an error message:** Payment already onramped                     |
| The SDK request transaction reference exists but the payment is not complete or had an error | **Fail with an error message:** Payment not complete                         |
| The SDK request transaction reference exists but the amount is more than in treasury         | **The liquidity management should be triggered to source more tokens**       |
| The SDK request transaction reference exists and the treasury has the amount                 | **Tokens are sent to the DApp’s account and transaction marked as onramped** |
| An unexpected error occurs while processing transaction and treasury had enough of token     | **Optimistic deduction of treasury cache reversed**                          |

### Liquidity Management

The treasury service interacts with the LiquidityManagementController that's in charge of checking if treasury account has enough tokens for completing onramp, sourcing more tokens and transferring tokens to the business' account.

We store the balance of the treasury account in our database for faster access of account balance. We also do this so that we can do an optimistic deduction of balance when we have concurrent onramp requests, where each request optimistically deducts the balance so that the next request doesn't see the same balance. If a request fails or can't be completed this optimistic deduction is reversed.

There is also a job that updates this cached balance with the actual on-chain balance that runs periodically to avoid a case where there is a mismatch between cached balance and actual balance.

Requests to treasury balance are locked with a shared key to avoid multiple requests updating the database at the same time.

This controller uses the Hedera Model described below:

# Hedera Model

This model contains logic for on-chain operations such as checking if an account is associated to a token, transferring tokens from treasury account to another account, getting on-chain balance of treasury account.

The treasury account is a multisignature account, the Hedera model gets the keys needed to sign transactions for the account to transfer of tokens

The addresses of tokens are stored on our database.

# Webhook Service

This sends events to the business' webhook URL if they've registered one. The following events can be sent:

1. "charge_success",
2. "charge_failed",
3. "token_transfer_pending",
4. "token_transfer_success",
5. "account_not_associated",
6. "token_transfer_failed",

More information can be found in [Webhook Documentation](https://docs.orionramp.com/business-onramp/webhook/payment)

# Transaction Service

The transaction service handles payment processing (mobile money payments as well as card payments) and transaction status management. It allows businesses to initialize payments, verify statuses, and receive webhook updates.

## Transaction Management

1. Initialize a Transaction
   `POST /api/transaction/initialize`

   Initializes a new payment transaction. This endpoint requires a valid private key in the header.

   **Request Payload (JSON Body):**

   ```json
   {
     "token": "string" | "KESy_MAINNET" | "KESy_TESTNET", // Required: Type of token for the transaction.
     "amount": "number", // Required: Transaction amount in major units (e.g., KES 1000). Must be positive and not exceed 500,000.
     "email": "string", // Required: Customer email address. Must be a valid email.
     "callback_url": "string (https URL)", // Optional: URL to redirect to after payment. Must be HTTPS.
     "channels": "array of strings", // Optional: E.g., ["card", "mobile_money"]. Allowed values: "card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft", "apple_pay", "payattitude".
     "currency": "string", // Optional: 3-letter currency code (e.g., "KES"). Default is "KES".
     "metadata": { // Required: Additional data for the transaction.
       "orderID": "string" // Required: Unique identifier for the order.
     }
     // Other optional fields like plan, invoice_limit, split_code, subaccount, transaction_charge, bearer are also supported.
   }
   ```

   **Expected Response:** Returns the transaction reference, authorization URL, and access code required to complete the payment on the client side.
   [Link to Docs](https://docs.orionramp.com/business-onramp/endpoint/intialize)

2. Get All Transactions
   `GET /api/transaction`

   Retrieves a paginated list of transactions for a specific business and environment type.

   `Query params:
business_id (required): UUID of the business
environment_type (required): "Live" | "Test"
page (optional): number (default: 1)
limit (optional): number (default: 20)`

   **Expected Response:** Returns a list of transaction objects matching the criteria, along with pagination details (total items, pages, current page).

3. Get Transaction by ID
   `GET /api/transaction/:id`

   Retrieves detailed information about a specific transaction.

   **Expected Response:** Returns the specific transaction object including its current status, amount, and associated metadata.

4. Paystack Webhook
   `POST /api/transaction/webhook/paystack`

   Handles incoming webhook events from Paystack (e.g., charge.success, charge.failed).

   **Expected Response:** Updates the local transaction status based on the event. If successful, triggers the treasury service to process the crypto on-ramp.

- The model and controller for transactions can be found under the models and controllers directory respectively.
- The structure of the request and response bodies can be found in types/transactions and types/paystack.

# Architecture

The diagram below shows how the above services work together:

![Orion Architecture Diagram](/docs/Orion%20Architecture%20Diagram.jpeg)
