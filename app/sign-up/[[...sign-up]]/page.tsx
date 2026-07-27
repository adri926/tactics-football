import { SignUp } from "@clerk/nextjs"
import FootboardMark from "@/components/FootboardMark"
import AttributionTracker from "@/components/AttributionTracker"

export default function SignUpPage() {
  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#17160f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 32,
      padding: "24px 16px",
    }}>
      <AttributionTracker />

      {/* Logo + titre */}
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <FootboardMark size={36} />
        </div>
        <p style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.20em",
          color: "rgba(122,154,130,0.6)",
          textTransform: "uppercase", marginBottom: 10,
        }}>
          PLATEFORME COACH
        </p>
        <h1 style={{
          fontFamily: "var(--font-display), system-ui, sans-serif",
          fontWeight: 900, fontSize: 42, lineHeight: 0.95,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}>
          FOOT<span style={{ color: "#7A9A82" }}>BOARD</span>
        </h1>
      </div>

      {/* Widget Clerk */}
      <SignUp
        routing="hash"
        appearance={{
          variables: {
            colorBackground: "#1e1c14",
            colorText: "rgba(255,255,255,0.88)",
            colorPrimary: "#7A9A82",
            colorTextSecondary: "rgba(255,255,255,0.40)",
            colorInputBackground: "rgba(255,255,255,0.04)",
            colorInputText: "rgba(255,255,255,0.85)",
            borderRadius: "10px",
            fontFamily: "var(--font-body), sans-serif",
          },
          elements: {
            card: {
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              border: "1px solid rgba(122,154,130,0.18)",
              width: "340px",
              padding: "28px",
            },
            headerTitle: {
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 900,
              fontSize: "20px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.90)",
            },
            headerSubtitle: {
              color: "rgba(255,255,255,0.35)",
              fontSize: "12px",
            },
            socialButtonsBlockButton: {
              border: "1px solid rgba(122,154,130,0.30)",
              backgroundColor: "rgba(122,154,130,0.08)",
              color: "#7A9A82",
              fontWeight: 700,
              padding: "13px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              letterSpacing: "0.06em",
              transition: "all 0.2s",
            },
            socialButtonsBlockButtonText: {
              color: "#7A9A82",
              fontWeight: 700,
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              letterSpacing: "0.06em",
            },
            formFieldLabel: {
              color: "rgba(122,154,130,0.6)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "9px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            },
            formFieldInput: {
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(122,154,130,0.18)",
              color: "rgba(255,255,255,0.85)",
            },
            dividerLine: { backgroundColor: "rgba(122,154,130,0.12)" },
            dividerText: { color: "rgba(255,255,255,0.20)", fontSize: "10px" },
            formButtonPrimary: {
              backgroundColor: "#7A9A82",
              color: "#17160f",
              fontWeight: 700,
              fontFamily: "var(--font-mono), monospace",
              letterSpacing: "0.06em",
            },
            footerActionText: {
              color: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
            },
            footerActionLink: {
              color: "#7A9A82",
              fontWeight: 700,
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
            },
          },
        }}
      />

      <p style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: 9, letterSpacing: "0.08em",
        color: "rgba(255,255,255,0.18)",
        textAlign: "center", maxWidth: 280, lineHeight: 1.7,
      }}>
        DIGIBOARD · DONNÉES · MON CLUB
      </p>
    </main>
  )
}
