"use client";

import React from "react";
import { validatePassword } from "@/lib/passwordValidation";
import { Check, X } from "lucide-react";

interface Props {
  password?: string;
  showDetails?: boolean;
}

export function PasswordStrengthMeter({ password = "", showDetails = true }: Props) {
  const result = validatePassword(password);
  const { score, checks } = result;

  // Determine strength label & color
  let strengthLabel = "";
  let barColor = "#ef4444"; // red
  let barWidth = "0%";

  if (!password) {
    strengthLabel = "";
    barWidth = "0%";
  } else if (score <= 1) {
    strengthLabel = "Weak";
    barColor = "#ef4444"; // red
    barWidth = "25%";
  } else if (score === 2) {
    strengthLabel = "Fair";
    barColor = "#f59e0b"; // amber/orange
    barWidth = "50%";
  } else if (score === 3) {
    strengthLabel = "Good";
    barColor = "#eab308"; // yellow
    barWidth = "75%";
  } else {
    strengthLabel = "Strong (Enterprise)";
    barColor = "#10b981"; // emerald green
    barWidth = "100%";
  }

  const badgeItems = [
    { key: "minLength", label: "8+ characters", met: checks.minLength },
    { key: "hasUppercase", label: "Uppercase (A-Z)", met: checks.hasUppercase },
    { key: "hasLowercase", label: "Lowercase (a-z)", met: checks.hasLowercase },
    { key: "hasNumber", label: "Number (0-9)", met: checks.hasNumber },
    { key: "hasSpecial", label: "Symbol (!@#$)", met: checks.hasSpecial },
  ];

  return (
    <div style={{ marginTop: "8px", width: "100%" }}>
      {/* Strength Bar */}
      {password.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
              Password Strength:
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: barColor }}>
              {strengthLabel}
            </span>
          </div>
          <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: barWidth,
                backgroundColor: barColor,
                transition: "all 0.3s ease",
                borderRadius: "2px"
              }}
            />
          </div>
        </div>
      )}

      {/* Requirement Badges */}
      {showDetails && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
          {badgeItems.map((item) => (
            <span
              key={item.key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                padding: "3px 8px",
                borderRadius: "12px",
                fontWeight: 500,
                transition: "all 0.2s ease",
                backgroundColor: item.met ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                color: item.met ? "#34d399" : "rgba(255, 255, 255, 0.4)",
                border: item.met ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {item.met ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2} style={{ opacity: 0.5 }} />}
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
