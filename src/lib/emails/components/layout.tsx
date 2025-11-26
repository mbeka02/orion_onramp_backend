import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  children: React.ReactNode;
  previewText: string;
  heading: string;
}

export const Layout = ({
  children,
  previewText,
  heading,
}: EmailLayoutProps) => (
  <Html>
    <Head />
    <Body className="bg-white mx-auto font-sans">
      <Preview>{previewText}</Preview>
      <Container className="mx-auto px-5">
        {/* Header Logo */}
        <Section className="mt-8">
          <Row>
            <Column>
              <Img
                src={`https://res.cloudinary.com/dra0xwf8z/image/upload/v1762321859/logo.png`}
                width="40"
                height="36"
                alt="Orion"
              />
            </Column>
          </Row>
        </Section>

        <Heading className="text-gray-900 text-4xl font-bold my-[30px] p-0 leading-[42px]">
          {heading}
        </Heading>

        {/* Main content */}
        {/* Updated text-sm (14px) and leading-6 (24px) for clarity */}
        <Section className="px-8 py-10 text-gray-800 text-sm leading-6">
          {children}
        </Section>

        {/* Footer */}
        <Section className="mb-8 px-2">
          <Row>
            {/* Column 1: Footer Logo + Name */}
            <Column>
              <Row>
                <Column>
                  <Img
                    src={`https://res.cloudinary.com/dra0xwf8z/image/upload/v1762321859/logo.png`}
                    width="40"
                    height="36"
                    alt="Orion"
                  />
                </Column>
              </Row>
            </Column>

            {/* Column 2: Social Icons */}
            {/* <Column align="right">
              <Link href="/">
                <Img
                  src={`https://upload.wikimedia.org/wikipedia/commons/5/5a/X_icon_2.svg`}
                  width="32"
                  height="32"
                  alt="X"
                  className="inline ml-2"
                />
              </Link>
              <Link href="/">
                <Img
                  src={`https://upload.wikimedia.org/wikipedia/commons/b/b9/2023_Facebook_icon.svg`}
                  width="32"
                  height="32"
                  alt="Facebook"
                  className="inline ml-2"
                />
              </Link>
              <Link href="/">
                <Img
                  src={`https://upload.wikimedia.org/wikipedia/commons/e/e9/Linkedin_icon.svg`}
                  width="32"
                  height="32"
                  alt="LinkedIn"
                  className="inline ml-2"
                />
              </Link>
            </Column> */}
          </Row>
        </Section>

        <Section>
          <Link
            className="text-[#b7b7b7] underline"
            href="https://orion.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Our blog
          </Link>
          &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          <Link
            className="text-[#b7b7b7] underline"
            href="https://orion.com/legal"
            target="_blank"
            rel="noopener noreferrer"
          >
            Policies
          </Link>
          &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          <Link
            className="text-[#b7b7b7] underline"
            href="https://orion.com/help"
            target="_blank"
            rel="noopener noreferrer"
          >
            Help center
          </Link>
          &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          <Link
            className="text-[#b7b7b7] underline"
            href="https://orion.com/community"
            target="_blank"
            rel="noopener noreferrer"
            data-auth="NotApplicable"
            data-linkindex="6"
          >
            Orion Community
          </Link>
          <Text className="text-xs text-[#b7b7b7] leading-tight text-left mb-[50px]">
            ©2025 Orion Technologies, LLC, a Salesforce company. <br />
            Nairobi, Kenya <br />
            <br />
            All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default Layout;
