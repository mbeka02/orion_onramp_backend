import * as React from "react";
import {
  Button,
  Text,
  Container,
  Section,
  Link,
  Hr,
} from "@react-email/components";
import { Layout } from "../components/layout";

interface VerifyEmailProps {
  url: string;
}

export default function VerifyEmail({
  url = "https://example.com/verify-email",
}: VerifyEmailProps) {
  return (
    <Layout
      heading="Verify Your Email Address"
      previewText="Please verify your email address to complete your registration."
    >
      <Container className="mx-auto max-w-[480px] bg-white rounded-2xl shadow p-8">
        <Section className="text-center">
          <Text className="text-gray-800 text-lg leading-6 mb-4">
            Hi there 👋,
            <br />
            Thank you for signing up! To start using your account, please
            confirm your email address by clicking the button below.
          </Text>

          <Button
            href={url}
            className="bg-[#2CB015] text-white font-bold py-3 px-6 rounded-md text-center"
          >
            Verify Email Address
          </Button>

          <Text className="text-gray-600 text-sm mt-6">
            If the button doesn’t work, you can also verify your email by
            copying and pasting the link below into your browser:
          </Text>

          <Link
            href={url}
            className="text-brand text-sm break-all underline mt-2 inline-block"
          >
            {url}
          </Link>

          <Hr className="my-8 border-gray-200" />

          <Text className="text-gray-500 text-xs">
            If you didn’t create an account with us, you can safely ignore this
            email.
          </Text>
        </Section>
      </Container>
    </Layout>
  );
}
