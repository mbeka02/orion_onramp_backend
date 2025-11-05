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
} from '@react-email/components';
import * as React from "react";
interface EmailLayoutProps {
    children: React.ReactNode;
    previewText: string;
    heading: string;
}
export const Layout = ({ children, previewText, heading }: EmailLayoutProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>{previewText}</Preview>
      <Container style={container}>
        <Section style={logoContainer}>
          <Img
            src={`https://res.cloudinary.com/dra0xwf8z/image/upload/v1762321859/logo.png`}
            width="120"
            height="36"
            alt="Orion"
          />
        </Section>
        <Heading style={h1}>{heading}</Heading>
        {/* Main content */}
        <Section className="px-8 py-10 text-gray-800 leading-relaxed">
          {children}
        </Section>
        <Section>
          <Row style={footerLogos}>
            <Column style={{ width: '66%' }}>
              <Img
                src={`https://res.cloudinary.com/dra0xwf8z/image/upload/v1762321859/logo.png`}
                width="120"
                height="36"
                alt="Orion"
              />
            </Column>
            <Column align="right">
              <Link href="/">
                <Img
                  src={`https://upload.wikimedia.org/wikipedia/commons/5/5a/X_icon_2.svg`}
                  width="32"
                  height="32"
                  alt="Orion"
                  style={socialMediaIcon}
                />
              </Link>
              <Link href="/">
                <Img
                  src={`https://upload.wikimedia.org/wikipedia/commons/b/b9/2023_Facebook_icon.svg`}
                  width="32"
                  height="32"
                  alt="Orion"
                  style={socialMediaIcon}
                />
              </Link>
              <Link href="/">
                <Img
                  src={`https://upload.wikimedia.org/wikipedia/commons/e/e9/Linkedin_icon.svg`}
                  width="32"
                  height="32"
                  alt="Orion"
                  style={socialMediaIcon}
                />
              </Link>
            </Column>
          </Row>
        </Section>

        <Section>
          <Link
            style={footerLink}
            href="https://orion.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Our blog
          </Link>
          &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          <Link
            style={footerLink}
            href="https://orion.com/legal"
            target="_blank"
            rel="noopener noreferrer"
          >
            Policies
          </Link>
          &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          <Link
            style={footerLink}
            href="https://orion.com/help"
            target="_blank"
            rel="noopener noreferrer"
          >
            Help center
          </Link>
          &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
          <Link
            style={footerLink}
            href="https://orion.com/community"
            target="_blank"
            rel="noopener noreferrer"
            data-auth="NotApplicable"
            data-linkindex="6"
          >
            Orion Community
          </Link>
          <Text style={footerText}>
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

const footerText = {
  fontSize: '12px',
  color: '#b7b7b7',
  lineHeight: '15px',
  textAlign: 'left' as const,
  marginBottom: '50px',
};

const footerLink = {
  color: '#b7b7b7',
  textDecoration: 'underline',
};

const footerLogos = {
  marginBottom: '32px',
  paddingLeft: '8px',
  paddingRight: '8px',
};

const socialMediaIcon = {
  display: 'inline',
  marginLeft: '8px',
};

const main = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '0px 20px',
};

const logoContainer = {
  marginTop: '32px',
};

const h1 = {
  color: '#1d1c1d',
  fontSize: '36px',
  fontWeight: '700',
  margin: '30px 0',
  padding: '0',
  lineHeight: '42px',
};

const heroText = {
  fontSize: '20px',
  lineHeight: '28px',
  marginBottom: '30px',
};

const codeBox = {
  background: 'rgb(245, 244, 245)',
  borderRadius: '4px',
  marginBottom: '30px',
  padding: '40px 10px',
};

const confirmationCodeText = {
  fontSize: '30px',
  textAlign: 'center' as const,
  verticalAlign: 'middle',
};

const text = {
  color: '#000',
  fontSize: '14px',
  lineHeight: '24px',
};