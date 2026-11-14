"use client";
import { useState, type ReactNode, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plug,
  Target,
  Radio,
  Code2,
  Waypoints,
  Link2,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import {
  Section,
  Field,
  Badge,
  Empty,
  SimpleTable,
  type Mutate,
} from "./primitives";
import {
  text as s,
  object,
  strings,
  type Row,
  type WorkspaceData,
} from "@/lib/workspace/types";
import TrackingSourceConfig from "@/components/tracking-source-config";
import TrackingE2ETest from "@/components/tracking-e2e-test";
const providerNames: Record<string, string> = {
  applyfy: "Applyfy",
  hotmart: "Hotmart",
  cakto: "Cakto",
  kiwify: "Kiwify",
  kirvano: "Kirvano",
  perfectpay: "PerfectPay",
  cartpanda: "Cartpanda",
  greenn: "Greenn",
  payt: "Payt",
  mundpay: "Mundpay",
  wiven: "Wiven",
  ticto: "Ticto",
};
const tabs = [
  ["Anúncios", Radio],
  ["Webhooks", Plug],
  ["Pixel", Target],
  ["UTMs", Link2],
  ["API", Code2],
  ["Testes", Waypoints],
] as const;
export function IntegrationWorkspace({
  data,
  mutate,
  saving,
  onInfo,
  onRefresh,
}: {
  data: WorkspaceData;
  mutate: Mutate;
  saving: boolean;
  onInfo: (title: string, body: ReactNode) => void;
  onRefresh: () => Promise<void>;
}) {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "Webhooks"),
    [search, setSearch] = useState(""),
    [provider, setProvider] = useState(""),
    [available, setAvailable] = useState<Row[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [apiEnabled, setApiEnabled] = useState(false),
    [formError, setFormError] = useState("");
  const projectId = data.project.id;
  const type =
    tab === "Pixel" ? "pixel" : tab === "Anúncios" ? "ads" : "checkout";
  const connected = data.integrations.filter(
    (i) => i.integration_type === type,
  );
  const allowed = new Set(["applyfy", "hotmart", "cakto"]);
  async function meta(action: string, accountId?: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workspace/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action,
          accountId,
          start: data.period.start,
          end: data.period.end,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await onRefresh();
      setMessage(
        action === "sync"
          ? "Estrutura e métricas sincronizadas. Atualize os dados para conferir."
          : action === "unlink"
            ? "Conta desvinculada desta dashboard."
            : "Conta vinculada. Sincronize a estrutura e escolha as campanhas em Configurações.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha na Meta.");
    } finally {
      setBusy(false);
    }
  }
  async function loadAccounts() {
    setBusy(true);
    try {
      const response = await fetch(
        "/api/workspace/meta?" + new URLSearchParams({ projectId }),
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAvailable(result.accounts);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Não foi possível consultar as contas.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.currentTarget);
    const credentials =
      tab === "Pixel"
        ? { access_token: f.get("access_token") }
        : apiEnabled
          ? {
              client_id: f.get("client_id"),
              client_secret: f.get("client_secret"),
              basic: f.get("basic"),
            }
          : {};
    try {
      const result = await mutate("integration", {
        provider,
        type: tab === "Pixel" ? "pixel" : "checkout",
        name: f.get("name"),
        product_ids: String(f.get("product_ids") || "")
          .split(/[\n,]/)
          .map((v) => v.trim())
          .filter(Boolean),
        offer_code: f.get("offer_code"),
        webhookToken: f.get("webhookToken"),
        pixel_id: f.get("pixel_id"),
        credentials,
      });
      setProvider("");
      onInfo(
        "Configuração salva",
        <>
          <p>
            As credenciais foram armazenadas no servidor. O recebimento e a
            entrega serão confirmados por eventos reais.
          </p>
          {tab === "Webhooks" && (
            <Field label="URL do Webhook">
              <input
                readOnly
                value={String(object(result).webhookUrl || "")}
                onFocus={(e) => e.target.select()}
              />
            </Field>
          )}
        </>,
      );
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }
  return (
    <>
      <div className="tf-tabs tf-integration-tabs">
        {tabs.map(([t, Icon]) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setProvider("");
              setApiEnabled(false);
              setFormError("");
            }}
          >
            <Icon size={16} />
            {t}
          </button>
        ))}
      </div>
      {message && (
        <p className="tf-banner" role="status">
          {message}
        </p>
      )}
      {tab === "Anúncios" ? (
        <>
          <Section
            title="Meta Ads"
            description="Uma dashboard pode ter várias contas; o vínculo de campanha define a oferta"
            actions={
              <a
                className="tf-button tf-primary"
                href={
                  "/api/integrations/meta/connect?" +
                  new URLSearchParams({ projectId })
                }
              >
                Conectar / renovar Meta <ArrowUpRight size={15} />
              </a>
            }
          >
            <div className="tf-actions">
              <button disabled={busy} onClick={() => void loadAccounts()}>
                Consultar contas autorizadas
              </button>
              <button disabled={busy} onClick={() => void meta("sync")}>
                Sincronizar contas vinculadas
              </button>
            </div>
            <SimpleTable
              headers={["Conta", "Moeda", "Sincronização", ""]}
              rows={data.accounts
                .filter((a) => a.is_active)
                .map((a) => [
                  s(a, "name"),
                  s(a, "currency"),
                  "Vinculada",
                  <button
                    key={a.id}
                    disabled={busy}
                    onClick={() => void meta("unlink", a.id)}
                  >
                    Desativar sincronização
                  </button>,
                ])}
            />
            {available.length > 0 && (
              <>
                <h3>Contas disponíveis na autorização Meta</h3>
                <SimpleTable
                  headers={["Conta", "Moeda", ""]}
                  rows={available.map((a) => [
                    s(a, "name"),
                    s(a, "currency"),
                    <button
                      key={a.id}
                      disabled={busy}
                      onClick={() => void meta("link", a.id)}
                    >
                      Vincular à oferta
                    </button>,
                  ])}
                />
              </>
            )}
            <p className="tf-note">
              Após sincronizar, selecione as campanhas desta oferta em
              Configurações. Uma campanha importada não entra automaticamente
              nos resultados.
            </p>
          </Section>
        </>
      ) : tab === "UTMs" ? (
        <Section
          title="Instalação nas páginas"
          description="Script e domínio da oferta"
        >
          <TrackingSourceConfig projectId={projectId} />
        </Section>
      ) : tab === "Testes" ? (
        <Section
          title="Laboratório de tracking"
          description="Validação controlada de sessão, evento, token e atribuição"
        >
          <TrackingE2ETest projectId={projectId} />
        </Section>
      ) : tab === "API" ? (
        <Section
          title="Credenciais de API"
          description="Acesso de leitura a relatórios desta dashboard"
          actions={
            <button
              className="tf-primary"
              onClick={() =>
                onInfo(
                  "Criar credencial",
                  <form
                    className="tf-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const name = new FormData(e.currentTarget).get("name");
                      try {
                        const result = await mutate("createApiKey", { name });
                        onInfo(
                          "Guarde sua chave",
                          <>
                            <p>
                              A chave é exibida somente agora. Não compartilhe
                              com ferramentas que não precisem acessar os
                              relatórios.
                            </p>
                            <Field label="Chave de API">
                              <input
                                value={String(object(result).token || "")}
                                readOnly
                                onFocus={(e) => e.target.select()}
                              />
                            </Field>
                            <p>
                              Endpoint:{" "}
                              <code>
                                /api/v1/reports?projectId={projectId}
                                &amp;start=AAAA-MM-DD&amp;end=AAAA-MM-DD
                              </code>
                            </p>
                            <p>
                              Envie a chave no cabeçalho Authorization: Bearer.
                            </p>
                          </>,
                        );
                      } catch {}
                    }}
                  >
                    <Field label="Nome da credencial">
                      <input name="name" required maxLength={160} />
                    </Field>
                    <button className="tf-primary" disabled={saving}>
                      Criar credencial
                    </button>
                  </form>,
                )
              }
            >
              + Criar credencial
            </button>
          }
        >
          <SimpleTable
            headers={["Nome", "Escopo", "Estado", ""]}
            rows={data.apiKeys.map((k) => [
              s(k, "name"),
              strings(k.scopes).join(", "),
              k.revoked_at ? "Revogada" : "Ativa",
              <button
                key="r"
                disabled={saving || !!k.revoked_at}
                onClick={() =>
                  void mutate("revokeApiKey", { id: k.id }).catch(() => {})
                }
              >
                Revogar
              </button>,
            ])}
          />
        </Section>
      ) : (
        <>
          <Section
            title={
              tab === "Pixel" ? "Pixel e conversões" : "Webhooks dos checkouts"
            }
            description={
              tab === "Pixel"
                ? "Configuração por oferta e diagnóstico de entrega"
                : "Configuração e recebimento de pedidos da oferta atual"
            }
            actions={
              <button
                onClick={() => {
                  setProvider(tab === "Pixel" ? "meta" : "applyfy");
                  setApiEnabled(false);
                }}
              >
                <Plus size={15} /> Adicionar{" "}
                {tab === "Pixel" ? "Pixel" : "Webhook"}
              </button>
            }
          >
            {connected.map((i) => (
              <article className="tf-connection" key={i.id}>
                <span className="tf-connection-icon">
                  <Plug size={21} />
                </span>
                <div>
                  <h3>{s(i, "name", s(i, "provider"))}</h3>
                  <p>
                    {providerNames[s(i, "provider")] || s(i, "provider")} ·{" "}
                    {data.project.name}
                  </p>
                  <Badge tone={i.status === "connected" ? "green" : "default"}>
                    {i.status === "connected"
                      ? "Eventos confirmados"
                      : i.status === "disabled"
                        ? "Desativada"
                        : "Aguardando validação"}
                  </Badge>
                  {!!i.last_synced_at && (
                    <small>
                      Última atividade:{" "}
                      {new Date(s(i, "last_synced_at")).toLocaleString(
                        "pt-BR",
                        { timeZone: data.project.timezone },
                      )}
                    </small>
                  )}
                </div>
                <div className="tf-actions">
                  <button
                    onClick={() => {
                      setProvider(s(i, "provider"));
                      setApiEnabled(false);
                    }}
                  >
                    Configurar
                  </button>
                  {tab === "Webhooks" && (
                    <button
                      onClick={() =>
                        onInfo(
                          "URL do Webhook",
                          <Field label="Cadastre esta URL no checkout">
                            <input
                              readOnly
                              value={
                                window.location.origin +
                                "/api/webhooks/" +
                                s(i, "provider") +
                                "/" +
                                i.id
                              }
                              onFocus={(e) => e.target.select()}
                            />
                          </Field>,
                        )
                      }
                    >
                      Ver URL
                    </button>
                  )}
                  {((i.provider === "hotmart" &&
                    object(i.config).api_configured === true) ||
                    i.integration_type === "pixel") && (
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const r = await fetch(
                            "/api/workspace/integration-test",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ projectId, id: i.id }),
                            },
                          );
                          const d = await r.json();
                          setMessage(r.ok ? d.message : d.error);
                          await onRefresh();
                        } catch {
                          setMessage("Não foi possível testar a conexão.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Testar acesso à API
                    </button>
                  )}
                  <button
                    disabled={saving}
                    onClick={() =>
                      void mutate("disableIntegration", { id: i.id }).catch(
                        () => {},
                      )
                    }
                  >
                    Desativar
                  </button>
                </div>
              </article>
            ))}
            {!connected.length && (
              <Empty>
                Nenhuma configuração neste grupo. Adicione uma conexão para esta
                oferta.
              </Empty>
            )}
          </Section>
          {provider && (
            <Section
              title={
                "Configurar " + (providerNames[provider] || "Meta Pixel / CAPI")
              }
              actions={<button onClick={() => setProvider("")}>Fechar</button>}
            >
              {tab === "Webhooks" && (
                <>
                  <Field label="Buscar plataforma">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nome do checkout"
                    />
                  </Field>
                  <div className="tf-provider-picker">
                    {Object.entries(providerNames)
                      .filter(([, v]) =>
                        v.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map(([key, label]) => (
                        <button
                          key={key}
                          aria-pressed={provider === key}
                          onClick={() => {
                            setProvider(key);
                            setApiEnabled(false);
                            setFormError("");
                          }}
                        >
                          {label}
                          {!allowed.has(key) && <small>Em validação</small>}
                        </button>
                      ))}
                  </div>
                </>
              )}
              {tab === "Webhooks" && !allowed.has(provider) ? (
                <p className="tf-banner">
                  O adapter de {providerNames[provider]} ainda não passou pela
                  validação de autenticidade e ciclo de pedidos. Não pode ser
                  ativado por esta tela.
                </p>
              ) : (
                <form key={provider} className="tf-form" onSubmit={save}>
                  <div className="tf-form-grid">
                    <Field label="Nome da integração">
                      <input
                        name="name"
                        defaultValue={
                          s(
                            connected.find((i) => i.provider === provider) ||
                              {},
                            "name",
                          ) ||
                          (providerNames[provider] || "Meta Pixel") +
                            " · " +
                            data.project.name
                        }
                        required
                        maxLength={160}
                      />
                    </Field>
                    <Field label="Oferta de destino">
                      <input readOnly value={data.project.name} />
                    </Field>
                  </div>
                  {tab === "Pixel" ? (
                    <>
                      <Field label="ID do Pixel">
                        <input
                          name="pixel_id"
                          pattern="[0-9]{5,30}"
                          defaultValue={s(
                            object(
                              connected.find((i) => i.provider === provider)
                                ?.config,
                            ),
                            "pixel_id",
                          )}
                          required
                        />
                      </Field>
                      <Field label="Token de acesso CAPI">
                        <input
                          type="password"
                          name="access_token"
                          required
                          autoComplete="off"
                        />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="IDs dos produtos do checkout">
                        <textarea
                          name="product_ids"
                          defaultValue={strings(
                            object(
                              connected.find((i) => i.provider === provider)
                                ?.config,
                            ).product_ids,
                          ).join("\n")}
                          placeholder="Um ID por linha"
                          required
                        />
                      </Field>
                      <Field label="Código da oferta (opcional)">
                        <input
                          name="offer_code"
                          defaultValue={s(
                            object(
                              connected.find((i) => i.provider === provider)
                                ?.config,
                            ),
                            "offer_code",
                          )}
                        />
                      </Field>
                      <Field
                        label={
                          provider === "hotmart"
                            ? "Token do Webhook · Hottok"
                            : provider === "cakto"
                              ? "Secret do Webhook"
                              : "Token do Webhook"
                        }
                      >
                        <input
                          type="password"
                          name="webhookToken"
                          autoComplete="new-password"
                          placeholder={
                            connected.some((i) => i.provider === provider)
                              ? "Deixe vazio para manter o token atual"
                              : ""
                          }
                          required={
                            !connected.some((i) => i.provider === provider)
                          }
                        />
                      </Field>
                      {provider === "hotmart" && (
                        <div className="tf-credential-block">
                          <label className="tf-toggle-row">
                            <span>Adicionar consulta pela API Hotmart</span>
                            <input
                              type="checkbox"
                              role="switch"
                              checked={apiEnabled}
                              onChange={(e) => setApiEnabled(e.target.checked)}
                            />
                          </label>
                          {apiEnabled && (
                            <>
                              <Field label="Client ID">
                                <input
                                  name="client_id"
                                  required
                                  autoComplete="off"
                                />
                              </Field>
                              <Field label="Client Secret">
                                <input
                                  type="password"
                                  name="client_secret"
                                  required
                                  autoComplete="off"
                                />
                              </Field>
                              <Field label="Token Basic">
                                <input
                                  type="password"
                                  name="basic"
                                  required
                                  autoComplete="off"
                                />
                              </Field>
                            </>
                          )}
                          <p className="tf-note">
                            Hottok valida o webhook. As credenciais OAuth são
                            usadas apenas nas consultas à API.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {formError && (
                    <p role="alert" className="tf-error">
                      {formError}
                    </p>
                  )}
                  <p className="tf-note">
                    Os segredos ficam no servidor. Não serão devolvidos ao
                    navegador depois de salvar.
                  </p>
                  <button className="tf-primary" disabled={saving}>
                    Salvar configuração
                  </button>
                </form>
              )}
            </Section>
          )}
        </>
      )}
    </>
  );
}
