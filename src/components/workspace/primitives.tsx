"use client";
import type { ReactNode } from "react";
export type Mutate = (
  action: string,
  input: Record<string, unknown>,
) => Promise<unknown>;
export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="tf-panel">
      <div className="tf-section-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="tf-empty">{children}</div>;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="tf-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"tf-badge tf-badge-" + tone}>{children}</span>;
}
export function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="tf-table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={h + i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className={
                    /^(Investimento|Faturamento|Lucro|Valor|ROI|ROAS|Margem|CPA|CPC|CPM|Despesas)/i.test(
                      headers[j] || "",
                    )
                      ? "tf-money"
                      : undefined
                  }
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty>Nenhum registro neste recorte.</Empty>}
    </div>
  );
}
