import * as React from "react";
import {
  Container,
  Section,
  Text,
  Button,
  Link,
  Hr,
  Img,
} from "@react-email/components";
import { Layout } from "../components/layout";

interface ResetPasswordEmailProps {
  url: string;
}

export default function ResetPasswordEmail({ url }: ResetPasswordEmailProps) {
  return (
    <Layout
      heading="Reset Your Password"
      previewText="Reset your password — action required"
    >
      <Container className="mx-auto max-w-[480px] bg-white rounded-2xl shadow p-8">
        <Section className="text-center">
          <Text className="text-gray-800 text-lg leading-6 mb-4">
            We received a request to reset your password. Click the button below
            to choose a new one. This link will expire in 1 hour.
          </Text>

          <Button
            href={url}
            className="bg-brand text-white font-semibold text-base rounded-lg py-3 px-6 inline-block mt-4 no-underline hover:opacity-90"
          >
            Reset Password
          </Button>

          <Text className="text-gray-600 text-sm mt-6">
            If the button doesn’t work, copy and paste the link below into your
            browser:
          </Text>

          <Link
            href={url}
            className="text-brand text-sm break-all underline mt-2 inline-block"
          >
            {url}
          </Link>

          <Hr className="my-8 border-gray-200" />

          <Text className="text-gray-500 text-xs leading-5">
            If you didn’t request a password reset, please ignore this email.
            Your password will remain unchanged.
          </Text>
        </Section>
      </Container>
    </Layout>
  );
}
