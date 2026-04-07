"use client";

import type { ValidationReport, ValidationItem } from "@/logic/validate/validateTokens";
import styles from "@/app/components/validationReport.module.css";

interface Props {
  report: ValidationReport;
}

function severityLabel(severity: ValidationItem["severity"]) {
  if (severity === "error") return "Error";
  if (severity === "warning") return "Warning";
  return "Info";
}

function itemClass(severity: ValidationItem["severity"]) {
  if (severity === "error") return `${styles.item} ${styles.error}`;
  if (severity === "warning") return `${styles.item} ${styles.warning}`;
  return `${styles.item} ${styles.info}`;
}

export default function ValidationReportComponent({ report }: Props) {
  const allItems = [
    ...report.system.contrast,
    ...report.system.typography,
    ...report.system.spacing,
    ...report.userAdherence.items,
  ];

  const counts = {
    error: allItems.filter((item) => item.severity === "error").length,
    warning: allItems.filter((item) => item.severity === "warning").length,
  };

  const renderItems = (items: ValidationItem[]) => (
    <ul className={styles.items}>
      {items.map((item) => (
        <li key={item.id} className={itemClass(item.severity)}>
          <span>{item.message}</span>
          <em>{severityLabel(item.severity)}</em>
        </li>
      ))}
    </ul>
  );

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Validation Report</h2>
        <p>System-level checks and user-adherence signals for this generation.</p>
      </div>

      <div className={styles.summaryCards}>
        <div>
          <span>System pass</span>
          <strong>{report.summary.systemPass ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>System failures</span>
          <strong>{report.summary.systemFailures}</strong>
        </div>
        <div>
          <span>Repairable</span>
          <strong>{report.summary.repairable ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Issues</span>
          <strong>
            {counts.error} errors, {counts.warning} warnings
          </strong>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3>Schema</h3>
          {report.schema.ok ? (
            <p className={styles.ok}>Schema valid.</p>
          ) : (
            <ul className={styles.items}>
              {report.schema.errors.map((err) => (
                <li key={err.path} className={`${styles.item} ${styles.error}`}>
                  <span>
                    {err.path}: {err.message}
                  </span>
                  <em>Error</em>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.card}>
          <h3>User Adherence</h3>
          {renderItems(report.userAdherence.items)}
        </section>

        <section className={styles.card}>
          <h3>Contrast Checks</h3>
          {renderItems(report.system.contrast)}
        </section>

        <section className={styles.card}>
          <h3>Typography Checks</h3>
          {renderItems(report.system.typography)}
        </section>

        <section className={styles.card}>
          <h3>Spacing Checks</h3>
          {renderItems(report.system.spacing)}
        </section>
      </div>
    </section>
  );
}
