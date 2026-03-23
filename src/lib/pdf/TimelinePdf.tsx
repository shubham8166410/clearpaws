import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { TimelineRow } from "@/types/database";
import type { TimelineStep } from "@/types/timeline";
import { DAFF_RULES } from "@/lib/daff-rules";

// Use built-in Helvetica — avoids external font downloads at runtime
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#1B4F72",
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1B4F72",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#6b7280",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1B4F72",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    padding: 8,
    minWidth: 120,
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: "#9ca3af",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  stepCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  stepNumber: {
    width: 22,
    height: 22,
    backgroundColor: "#1B4F72",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  stepNumberText: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  stepTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    flex: 1,
  },
  stepDate: {
    fontSize: 9,
    color: "#6b7280",
  },
  stepDescription: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.5,
    marginTop: 3,
    marginLeft: 30,
  },
  stepCost: {
    fontSize: 8,
    color: "#E67E22",
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
    marginLeft: 30,
  },
  disclaimer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 8,
    color: "#9ca3af",
    lineHeight: 1.4,
  },
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    fontSize: 7,
    color: "#9ca3af",
    lineHeight: 1.5,
  },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    right: 48,
    fontSize: 8,
    color: "#9ca3af",
  },
});

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

interface Props {
  timeline: TimelineRow;
}

function formatTodayLong(): string {
  const now = new Date();
  return now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function formatVerifiedMonth(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export function TimelinePdf({ timeline }: Props) {
  const { generated_steps } = timeline;
  const steps: TimelineStep[] = generated_steps.steps ?? [];

  return (
    <Document title="PetBorder DAFF Compliance Timeline" author="PetBorder">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PetBorder — DAFF Compliance Timeline</Text>
          <Text style={styles.subtitle}>
            Generated {formatTodayLong()}
          </Text>
        </View>

        {/* Pet & trip details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pet &amp; Trip Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Pet</Text>
              <Text style={styles.infoValue}>{timeline.pet_breed} ({timeline.pet_type})</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Origin</Text>
              <Text style={styles.infoValue}>{timeline.origin_country}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>DAFF Group</Text>
              <Text style={styles.infoValue}>Group {timeline.daff_group}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Travel Date</Text>
              <Text style={styles.infoValue}>{formatDate(timeline.travel_date)}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Quarantine</Text>
              <Text style={styles.infoValue}>{generated_steps.quarantineDays} days at Mickleham</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Estimated Cost</Text>
              <Text style={styles.infoValue}>
                {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 })
                  .format(generated_steps.totalEstimatedCostAUD)}
              </Text>
            </View>
          </View>

          {generated_steps.summary ? (
            <Text style={{ fontSize: 9, color: "#4b5563", lineHeight: 1.5 }}>
              {generated_steps.summary}
            </Text>
          ) : null}
        </View>

        {/* Compliance steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Steps</Text>
          {steps.map((step) => (
            <View key={step.stepNumber} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1 }}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <Text style={styles.stepDate}>Due: {formatDate(step.dueDate)}</Text>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
              {step.estimatedCost && (
                <Text style={styles.stepCost}>
                  Est. cost: {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 })
                    .format(step.estimatedCost.amountAUD)} — {step.estimatedCost.description}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Page footer — fixed on every page */}
        <View style={styles.pageFooter} fixed>
          <Text>
            Generated by PetBorder on {formatTodayLong()}.{"\n"}
            Based on DAFF rules verified {formatVerifiedMonth(DAFF_RULES.lastVerified)}.{"\n"}
            This document is for planning purposes only. Verify all requirements directly with the Australian Department of Agriculture, Fisheries and Forestry at agriculture.gov.au before booking travel for your pet. Requirements are subject to change without notice.{"\n"}
            {"\n"}
            Australian Department of Agriculture, Fisheries and Forestry{"\n"}
            Phone: 1800 900 090 | Website: agriculture.gov.au | BICON: bicon.agriculture.gov.au
          </Text>
          <Text
            style={{ position: "absolute", bottom: 0, right: 0, fontSize: 7, color: "#9ca3af" }}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
