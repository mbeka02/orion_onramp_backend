# Notification Service

### Nodemailer and React emails

All email templates can be found under /src/lib/emails/templates folder.
The email templates use react email and tailwind css is supported.

The wrapper for the email service is in email.util.ts .

` async testEmail() {
    await sendEmail({
      to: "pashrick237@gmail.com",
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

Create a new admin (SUPER_ADMIN only, rate-limited) 2. Admin Login
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
