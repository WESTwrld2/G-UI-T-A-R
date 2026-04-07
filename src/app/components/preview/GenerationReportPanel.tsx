"use client";

import type { GenerationReport } from "@/logic/schema/generationReport.types";
import type { ThemeDescriptionAssessment } from "@/logic/llm/themeDescriptionAssessment";
import styles from "@/app/components/preview/generationReportPanel.module.css";

const DESCRIPTION_SUGGESTION_CHIPS = [
  "warm or cool color direction",
  "bold or muted intensity",
  "serif or sans typography style",
  "compact or spacious density",
  "accessibility or readability intent",
];

type Props = {
  generationReport: GenerationReport | null;
  descriptionAssessment: ThemeDescriptionAssessment | null;
};

export default function GenerationReportPanel({
  generationReport,
  descriptionAssessment,
}: Props) {
  if (!generationReport && !descriptionAssessment) return null;

  return (
    <section className={styles.panel}>
      <h3 className={styles.heading}>Generation Report</h3>

      {generationReport?.inferred?.length ? (
        <div className={styles.section}>
          <strong>Inferred values</strong>
          <ul>
            {generationReport.inferred.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {generationReport?.defaults?.length ? (
        <div className={styles.section}>
          <strong>Defaults used</strong>
          <ul>
            {generationReport.defaults.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {generationReport?.repairDiffs?.length ? (
        <div className={styles.section}>
          <strong>Repairs applied (before to after)</strong>
          <ul className={styles.diffList}>
            {generationReport.repairDiffs.map((change) => (
              <li key={`${change.path}-${change.before}-${change.after}`}>
                <code>{change.path}</code>
                <span>{change.before}</span>
                <span>{change.after}</span>
                <small>{change.reason}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : generationReport?.repairs?.length ? (
        <div className={styles.section}>
          <strong>Repairs applied</strong>
          <ul>
            {generationReport.repairs.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {generationReport?.sources?.length ? (
        <details className={styles.section}>
          <summary title="Shows token path + source for each assigned value in this generation">
            Sources (token origin)
          </summary>
          <p className={styles.sourceHelp}>
            This list explains where key values came from: user input, model suggestion, derived defaults,
            or repair.
          </p>
          <ul className={styles.sourceList}>
            {generationReport.sources.map((item) => (
              <li key={`${item.path}-${item.source}-${item.detail ?? ""}`}>
                <code>{item.path}</code>
                <span>{item.source}</span>
                {item.detail ? <small>{item.detail}</small> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {descriptionAssessment ? (
        <div className={styles.section}>
          <strong>Theme description fit</strong>
          <p>{descriptionAssessment.guidance}</p>

          {descriptionAssessment.supportedSignals.length > 0 ? (
            <ul>
              {descriptionAssessment.supportedSignals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <div className={styles.warning} role="status">
              <p>
                No clear mapped signals were detected from your description. The model still receives your
                text, but the system cannot strongly enforce it yet.
              </p>
              <p>Try including one or more explicit signals:</p>
              <ul>
                {DESCRIPTION_SUGGESTION_CHIPS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {descriptionAssessment.unsupportedSignals.length > 0 && (
            <div className={styles.limitations}>
              <strong>Not directly enforceable yet</strong>
              <ul>
                {descriptionAssessment.unsupportedSignals.map((item) => (
                  <li key={item.request}>
                    <span>{item.request}:</span> {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
