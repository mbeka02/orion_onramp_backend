import * as React from "react";
import { Container } from "@react-email/components";
import { Layout } from "../components/layout";
export default function ExampleEmail() {
  return (
    <Layout heading="Example Email" previewText="This is an example email.">
      <Container>
        <p>Hello, this is an example email!</p>
      </Container>
    </Layout>
  );
}
