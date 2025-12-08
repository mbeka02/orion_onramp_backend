# Notification Service

### Nodemailer and React emails

All email templates can be found under /src/lib/emails/templates folder.
The email templates use react email and tailwind css is supported.

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

The environment service is incharge of managing the environments of a business. An environment has the API keys and webhook details that a business will use to integrate with Orion.

There are 2 kinds of environments: a **test** environment and a **live** environment. The test environment is for testing an integration with Orion. The money that is onramped isn't real and the tokens sent to the business' wallet are on testnet. The live environment has details of the actual integration, real funds are onramped and tokens on mainnet are sent to the business' wallet.

## Creating Environments

The logic for creating an environment has this behaviour:

| Scenario | Expected Outcome |
| --- | ---- |
| Business already has an environment of the same type as the one to be created | **Fail with error message:** Business environment already created |
| Should fail if the user calling the function is not the admin or owner of the busines | **Fail with error message:** Unauthorized|
| If a live environment is being created and business is not approved | **Fail with error message:** Business not approved |
| Otherwise should create | **Environment created successfully** with a unique public key and private key created and webhook secret: Returns id, type, public key and private key of created environment |

The public key and private key created are a ED25519 key pair, after creation the user is allowed to copy the private key only once. This private key is not stored on our database as plain text, instead we store a AES-256-GCM encrypted version and also a hash that is used to compare private keys. The webhook secret is a random string.

This logic is accessible via the `POST /api/environment/` endpoint. The endpoint is JWT authenticated and can only be called by a user who is either the owner or an admin of the business.

## Rekeying Environment

We also allow a business to generate new API key pair. This can be done if their previous private key was exposed. This follows the logic below:

| Scenario | Expected Outcome |
| --- | ---- |
| The business has not created the environment they want to rotate keys of | **Fail with error message:** Business does not have environment |
| Should fail if the user calling the function is not the admin or owner of the business | **Fail with error message:** Unauthorized  |
| Otherwise should create new key | **New keys for the environment created and the old key set to expire in 5 minutes:** Returns the new public and private keys |

The keys are created in the same way as the previous chapter. After creating the new key, we still allow the old key to be used for only 5 minutes. This is to give the business enough time to switch to the new key without the risk of other requests failing.

This logic is accessible via the `POST /api/environment/new` endpoint. The endpoint is JWT authenticated and can only be called by a user who is the owner or admin of the business

## Others

There is also the `GET /api/environment/:business` for getting the information about a business' environment that is displayed on our site. This endpoint is JWT authenticated.

# Treasury Service

## Hedera Model

# Webhook Service
