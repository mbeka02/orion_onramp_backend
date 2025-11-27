import * as React from "react";
import { Text, Container, Section } from "@react-email/components";
import { Layout } from "../components/layout";

interface TopUpTokenProps {
  token: string;
  amount?: number;
}

export default function TopUpToken({ token, amount }: TopUpTokenProps) {
  return (
    <Layout
      heading={`Top up ${token}`}
      previewText={`Treasury does not have enough of ${token}`}
    >
      <Container className="mx-auto max-w-[480px] bg-white rounded-2xl shadow p-8">
        <Section className="text-center">
          <Text className="text-gray-800 text-lg leading-6 mb-4">
            {amount
              ? `A request for ${amount} of ${token} has been made but treasury does not have enough! Top up immediately`
              : `Treasury account does not have enough of ${token}`}
          </Text>
        </Section>
      </Container>
    </Layout>
  );
}
