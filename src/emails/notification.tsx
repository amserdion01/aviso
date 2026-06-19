import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface NotificationEmailProps {
  heading: string;
  intro: string;
  itemLabel: string;
  itemValue: string;
  ctaLabel: string;
  ctaUrl: string;
}

/** Generic Romanian notification template for the approval workflow. */
export function NotificationEmail({ heading, intro, itemLabel, itemValue, ctaLabel, ctaUrl }: NotificationEmailProps) {
  return (
    <Html lang="ro">
      <Head />
      <Preview>{intro}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "18px", margin: "0 0 12px" }}>{heading}</Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>{intro}</Text>
          <Section style={{ margin: "16px 0", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{itemLabel}</Text>
            <Text style={{ fontSize: "15px", fontWeight: "bold", margin: "4px 0 0" }}>{itemValue}</Text>
          </Section>
          <Button
            href={ctaUrl}
            style={{ backgroundColor: "#111827", color: "#ffffff", padding: "10px 16px", borderRadius: "6px", fontSize: "14px" }}
          >
            {ctaLabel}
          </Button>
          <Text style={{ fontSize: "12px", color: "#9ca3af", marginTop: "20px" }}>
            HydroKov — flux de aprobare a referatelor de necesitate
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
