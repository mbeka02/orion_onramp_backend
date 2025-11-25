CREATE TYPE "public"."business_registration_type" AS ENUM('Sole Proprietorship', 'Registered Company');--> statement-breakpoint
CREATE TYPE "public"."business_status" AS ENUM('Draft', 'Pending', 'Approved', 'Rejected', 'Suspended');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('Starter business', 'Registered Business');--> statement-breakpoint
CREATE TYPE "public"."chain_enum" AS ENUM('hedera_mainnet', 'hedera_testnet');--> statement-breakpoint
CREATE TYPE "public"."environment_types" AS ENUM('live', 'test');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('Pending', 'Accepted', 'Rejected', 'Expired', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('Admin', 'Developer', 'Finance', 'Support');--> statement-breakpoint
CREATE TYPE "public"."token" AS ENUM('KESy_TESTNET', 'KESy_MAINNET');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'successful', 'failed', 'offramped', 'onramped');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'ADMIN' NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "business_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "user_role",
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_user_unique" UNIQUE("business_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "business" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"trading_name" text,
	"description" text,
	"staff_size" text,
	"annual_sales_volume" text,
	"businessType" "business_type",
	"industry_id" uuid,
	"category_id" uuid,
	"legal_business_name" text,
	"registrationtype" "business_registration_type",
	"general_email" text,
	"support_email" text,
	"disputes_email" text,
	"phone_number" text,
	"website" text,
	"twitter_handle" text,
	"facebook_page" text,
	"instagram_handle" text,
	"country" text,
	"city" text,
	"street_address" text,
	"building" text,
	"postal_code" text,
	"crypto_wallet_address" text,
	"revenue_pin" text,
	"registration_certificate" text,
	"registration_number" text,
	"status" "business_status" DEFAULT 'Draft',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "business_crypto_wallet_address_unique" UNIQUE("crypto_wallet_address"),
	CONSTRAINT "business_revenue_pin_unique" UNIQUE("revenue_pin"),
	CONSTRAINT "business_registration_certificate_unique" UNIQUE("registration_certificate"),
	CONSTRAINT "business_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environment_keys" (
	"environment_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"private_key_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "environment_keys_environment_id_encrypted_private_key_public_key_pk" PRIMARY KEY("environment_id","encrypted_private_key","public_key"),
	CONSTRAINT "environment_keys_public_key_unique" UNIQUE("public_key"),
	CONSTRAINT "environment_keys_encrypted_private_key_unique" UNIQUE("encrypted_private_key")
);
--> statement-breakpoint
CREATE TABLE "environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "environment_types" NOT NULL,
	"business_id" uuid NOT NULL,
	"webhook_url" text,
	"callback_url" text,
	CONSTRAINT "environments_business_id_type_unique" UNIQUE("business_id","type")
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "industries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"invited_by" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "invitation_status" DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"environment_id" uuid NOT NULL,
	"reference" varchar(100) NOT NULL,
	"token" "token" NOT NULL,
	"amount" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"transactionStatus" "transaction_status" DEFAULT 'pending' NOT NULL,
	"authorization_url" varchar(500),
	"access_code" varchar(100),
	"paystack_response_raw" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "treasury_token_balances" (
	"token" "token" PRIMARY KEY NOT NULL,
	"token_address" text NOT NULL,
	"chain" "chain_enum" NOT NULL,
	"treasury_account" text NOT NULL,
	"token_decimals" integer NOT NULL,
	"balance" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"business_name" text NOT NULL,
	"phone_number" text NOT NULL,
	"country" text DEFAULT 'Kenya',
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_users" ADD CONSTRAINT "business_users_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_users" ADD CONSTRAINT "business_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_keys" ADD CONSTRAINT "environment_keys_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;