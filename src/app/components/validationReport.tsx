"use client";

import React from "react";
import type { ValidationReport, ValidationItem } from "@/logic/validate/validateTokens";

interface Props {
  report: ValidationReport;
}

export default function ValidationReportComponent({ report }: Props) {
  const renderItems = (items: ValidationItem[]) => (
    <ul>
      {items.map((it) => (
        <li key={it.id} style={{ color: it.ok ? "inherit" : it.severity === "error" ? "red" : "orange" }}>
          {it.message}
        </li>
      ))}
    </ul>
  );

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Validation Report</h2>

      <section>
        <h3>Schema</h3>
        {report.schema.ok ? (
          <p style={{ color: "green" }}>Schema valid</p>
        ) : (
          <ul>
            {report.schema.errors.map((err) => (
              <li key={err.path} style={{ color: "red" }}>
                {err.path}: {err.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>System Checks</h3>
        <h4>Contrast</h4>
        {renderItems(report.system.contrast)}
        <h4>Typography</h4>
        {renderItems(report.system.typography)}
        <h4>Spacing</h4>
        {renderItems(report.system.spacing)}
      </section>

      <section>
        <h3>User Adherence</h3>
        {renderItems(report.userAdherence.items)}
      </section>

      <section>
        <h3>Summary</h3>
        <p>System pass: {report.summary.systemPass ? "yes" : "no"}</p>
        <p>Failures: {report.summary.systemFailures}</p>
        <p>Repairable: {report.summary.repairable ? "yes" : "no"}</p>
      </section>
    </div>
  );
}
