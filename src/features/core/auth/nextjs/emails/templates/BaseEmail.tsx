import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

export type BaseEmailProps = {
  preview: string;
  subject: string;
  greeting: string;
  intro: string;
  ctaLabel?: string;
  ctaUrl?: string;
  codeBlock?: string;
  notice: string;
  signature: string;
  extra?: ReactNode;
};

export function BaseEmail(props: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview> {props.preview} </Preview>
      <Body style={{ backgroundColor: "#ffffff", margin: 0, padding: 0 }}>
        <Container
          style={{ maxWidth: "560px", margin: "0 auto", padding: "24px" }}
        >
          <Section>
            <Text style={{ fontSize: "16px", margin: "0 0 16px" }}>
              {" "}
              {props.greeting}{" "}
            </Text>
            <Text style={{ fontSize: "16px", margin: "0 0 16px" }}>
              {" "}
              {props.intro}{" "}
            </Text>

            {props.extra}

            {props.ctaUrl && props.ctaLabel ? (
              <Section style={{ textAlign: "center", margin: "24px 0" }}>
                <Button
                  href={props.ctaUrl}
                  style={{
                    backgroundColor: "#111111",
                    color: "#ffffff",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontWeight: 600,
                    display: "inline-block",
                  }}
                >
                  {props.ctaLabel}
                </Button>
              </Section>
            ) : null}

            {props.codeBlock ? (
              <Section style={{ textAlign: "center", margin: "24px 0" }}>
                <Text
                  style={{
                    display: "inline-block",
                    backgroundColor: "#111111",
                    color: "#ffffff",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    fontSize: "20px",
                    letterSpacing: "6px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {props.codeBlock}
                </Text>
              </Section>
            ) : null}

            <Text
              style={{ fontSize: "14px", color: "#444444", margin: "0 0 16px" }}
            >
              {props.notice}
            </Text>

            <Hr style={{ margin: "24px 0", borderColor: "#eeeeee" }} />
            <Text
              style={{
                fontSize: "14px",
                color: "#444444",
                margin: 0,
                whiteSpace: "pre-line",
              }}
            >
              {props.signature}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
