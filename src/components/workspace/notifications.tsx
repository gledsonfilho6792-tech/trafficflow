"use client";
import { useState } from "react";
import { ShoppingBag, FileChartColumn } from "lucide-react";
import { Section, Field, SimpleTable, type Mutate } from "./primitives";
import { object, text as s, type WorkspaceData } from "@/lib/workspace/types";
import { aggregate } from "@/lib/workspace/analytics";
import { brl, percent } from "./visuals";
type Preferences = {
  approved: boolean;
  pending: boolean;
  value: "gross" | "commission" | "hidden";
  product: boolean;
  campaign: boolean;
  dashboard: boolean;
  sound: boolean;
  hours: string[];
  style: "profit" | "detail" | "creative";
};
const defaults: Preferences = {
  approved: true,
  pending: false,
  value: "gross",
  product: true,
  campaign: false,
  dashboard: true,
  sound: false,
  hours: ["08:00", "12:00", "18:00", "23:00"],
  style: "creative",
};
export function NotificationSettings({
  data,
  mutate,
  saving,
}: {
  data: WorkspaceData;
  mutate: Mutate;
  saving: boolean;
}) {
  const [prefs, setPrefs] = useState<Preferences>(() => ({
      ...defaults,
      ...object(data.preferences.notifications),
    })),
    [tab, setTab] = useState("Personalização"),
    [message, setMessage] = useState("");
  const summary = aggregate(data);
  const saleText = [
    prefs.product ? s(data.settings, "product_name", data.project.name) : "",
    prefs.value === "hidden"
      ? ""
      : prefs.value === "commission"
        ? "Comissão: exibida quando informada pelo checkout"
        : "Valor da venda: " + brl(17.9),
    prefs.campaign ? "Campanha da venda" : "",
    prefs.dashboard ? data.project.name : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const reportText =
    prefs.style === "detail"
      ? `Faturamento ${brl(summary.revenue)} · Lucro ${brl(summary.profit)} · ROI ${percent(summary.roi)}`
      : prefs.style === "profit"
        ? `Lucro: ${brl(summary.profit)}`
        : `Sua operação já gerou ${brl(summary.profit)} de lucro neste período.`;
  const toggle = (key: keyof Preferences, label: string) => (
    <label className="tf-toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={Boolean(prefs[key])}
        onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
      />
    </label>
  );
  return (
    <>
      <div className="tf-tabs">
        {["Personalização", "Histórico"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Histórico" ? (
        <Section
          title="Suas notificações"
          actions={
            <button
              disabled={saving}
              onClick={() =>
                void mutate("readNotifications", {}).catch(() => {})
              }
            >
              Marcar todas como lidas
            </button>
          }
        >
          <SimpleTable
            headers={["Quando", "Aviso", "Mensagem", "Estado"]}
            rows={data.notifications.map((r) => [
              new Date(s(r, "created_at")).toLocaleString("pt-BR", {
                timeZone: data.project.timezone,
              }),
              s(r, "title"),
              s(r, "body"),
              r.read_at ? "Lida" : "Não lida",
            ])}
          />
        </Section>
      ) : (
        <>
          <div className="tf-grid-2">
            <Section
              title="Notificações de Venda"
              description="Escolha o conteúdo dos avisos de novos pedidos"
            >
              {toggle("approved", "Vendas aprovadas")}
              {toggle("pending", "Vendas pendentes")}
              <Field label="Valor exibido">
                <select
                  value={prefs.value}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      value: e.target.value as Preferences["value"],
                    })
                  }
                >
                  <option value="gross">Valor da venda</option>
                  <option value="commission">Comissão</option>
                  <option value="hidden">Ocultar</option>
                </select>
              </Field>
              {toggle("product", "Mostrar nome do produto")}
              {toggle("campaign", "Mostrar UTM Campaign")}
              {toggle("dashboard", "Mostrar nome da dashboard")}
              {toggle("sound", "Som de nova venda")}
              <h3 className="tf-eyebrow">PRÉVIA DA NOTIFICAÇÃO</h3>
              <div className="tf-push">
                <span>
                  <ShoppingBag size={20} />
                </span>
                <div>
                  <strong>Venda aprovada!</strong>
                  <p>{saleText}</p>
                  <small>Prévia ilustrativa da mensagem</small>
                </div>
              </div>
            </Section>
            <Section
              title="Notificações de Relatório"
              description={"Horários no fuso " + data.project.timezone}
            >
              {["08:00", "12:00", "18:00", "23:00"].map((hour) => (
                <label className="tf-toggle-row" key={hour}>
                  <span>Relatório das {hour}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={prefs.hours.includes(hour)}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        hours: e.target.checked
                          ? [...prefs.hours, hour]
                          : prefs.hours.filter((v) => v !== hour),
                      })
                    }
                  />
                </label>
              ))}
              <Field label="Estilo da mensagem">
                <select
                  value={prefs.style}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      style: e.target.value as Preferences["style"],
                    })
                  }
                >
                  <option value="profit">Status de Lucro</option>
                  <option value="detail">Resumo Detalhado</option>
                  <option value="creative">Criativa</option>
                </select>
              </Field>
              <h3 className="tf-eyebrow">PRÉVIA DO RELATÓRIO</h3>
              <div className="tf-push">
                <span>
                  <FileChartColumn size={20} />
                </span>
                <div>
                  <strong>Resumo da operação</strong>
                  <p>{reportText}</p>
                  <small>Valores do período selecionado</small>
                </div>
              </div>
            </Section>
          </div>
          <div className="tf-savebar">
            <span>
              {message ||
                "As notificações ficam no app e respeitam o fuso da oferta."}
            </span>
            <button
              className="tf-primary"
              disabled={saving}
              onClick={async () => {
                try {
                  await mutate("preferences", { notifications: prefs });
                  setMessage("Preferências sincronizadas.");
                } catch {}
              }}
            >
              Salvar preferências
            </button>
          </div>
        </>
      )}
    </>
  );
}
