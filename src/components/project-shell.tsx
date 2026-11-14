"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  BarChart3,
  LayoutDashboard,
  ChartNoAxesCombined,
  ShoppingBag,
  Waypoints,
  Plug,
  Wallet,
  Settings,
  Bell,
  FileChartColumn,
  Workflow,
  Link2,
  Radio,
  Menu,
  Sun,
  Moon,
  Eye,
  EyeOff,
  ArrowUpRight,
} from "lucide-react";
import { deferEffect } from "@/lib/defer-effect";
import type { Project } from "@/lib/workspace/types";
const sections = [
  ["dashboard", "Resumo", LayoutDashboard],
  ["utms", "UTMs", Link2],
  ["integrations", "Integrações", Plug],
  ["reports", "Relatórios", FileChartColumn],
  ["rules", "Regras", Workflow],
  ["events", "Eventos", Waypoints],
  ["notifications", "Notificações", Bell],
  ["campaigns", "Gestão de Tráfego", ChartNoAxesCombined],
  ["sales", "Vendas", ShoppingBag],
  ["finance", "Gestão Financeira", Wallet],
  ["live", "Ao Vivo", Radio],
  ["tracking", "Tracking Avançado", Waypoints],
  ["settings", "Configurações", Settings],
] as const;
export default function ProjectShell({
  children,
  project,
  projects,
  preferences,
}: {
  children: React.ReactNode;
  project: Project;
  projects: Project[];
  preferences: Record<string, unknown>;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const [light, setLight] = useState(preferences.theme === "light"),
    [privacy, setPrivacy] = useState(preferences.privacy === true),
    [menu, setMenu] = useState(false),
    [message, setMessage] = useState("");
  useEffect(
    () =>
      deferEffect(() => {
        setLight(
          preferences.theme
            ? preferences.theme === "light"
            : localStorage.getItem("tf-theme") === "light",
        );
        setPrivacy(
          typeof preferences.privacy === "boolean"
            ? preferences.privacy
            : localStorage.getItem("tf-privacy") === "true",
        );
      }),
    [preferences.theme, preferences.privacy],
  );
  async function preference(key: string, value: unknown) {
    if (key === "theme") {
      setLight(value === "light");
      localStorage.setItem("tf-theme", String(value));
    } else {
      setPrivacy(Boolean(value));
      localStorage.setItem("tf-privacy", String(value));
    }
    try {
      const response = await fetch("/api/workspace/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          action: "preferences",
          input: { [key]: value },
        }),
      });
      if (!response.ok) throw new Error();
      setMessage("");
    } catch {
      setMessage(
        "Preferência aplicada neste dispositivo. Não foi possível sincronizar com o servidor.",
      );
    }
  }
  return (
    <div
      className={`tf-shell ${light ? "tf-light" : ""} ${privacy ? "tf-private" : ""} ${menu ? "tf-menu-open" : ""}`}
    >
      <aside className="tf-sidebar">
        <Link className="tf-brand" href="/projects">
          <span>
            <BarChart3 />
          </span>
          Traffic<span className="tf-brand-accent">Flow</span>
        </Link>
        <label className="tf-eyebrow" htmlFor="tf-project">
          DASHBOARD / OFERTA
        </label>
        <select
          id="tf-project"
          value={project.id}
          onChange={(e) => {
            setMenu(false);
            router.push(
              `/project/${e.target.value}/${pathname.split("/")[3] || "dashboard"}`,
            );
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Link className="tf-portfolio-link" href="/projects">
          Visão da operação <ArrowUpRight size={14} />
        </Link>
        <nav aria-label="Navegação da dashboard">
          {sections.map(([route, label, Icon]) => (
            <Link
              key={route}
              href={`/project/${project.id}/${route}`}
              aria-current={pathname.endsWith("/" + route) ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="tf-sidebar-bottom">
          <span>Uma oferta. Toda a operação.</span>
          <small>Traffic Flow</small>
        </div>
      </aside>
      {menu && (
        <button
          className="tf-menu-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="tf-body">
        <header className="tf-topbar">
          <div className="tf-topbar-left">
            <button
              className="tf-mobile-toggle"
              aria-label="Abrir menu"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <div>
              <small>Dashboard da oferta</small>
              <strong>{project.name}</strong>
            </div>
          </div>
          <div className="tf-topbar-actions">
            <span className="tf-timezone">
              {project.base_currency} ·{" "}
              {project.timezone.replace("America/", "")}
            </span>
            <button
              title="Alternar tema"
              aria-label="Alternar tema"
              onClick={() => void preference("theme", light ? "dark" : "light")}
            >
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              title="Ocultar valores"
              aria-label="Ocultar valores"
              onClick={() => void preference("privacy", !privacy)}
            >
              {privacy ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <Link
              aria-label="Notificações"
              href={`/project/${project.id}/notifications`}
            >
              <Bell size={18} />
            </Link>
            <button
              aria-label="Sair da conta"
              title="Sair da conta"
              onClick={async () => {
                const response = await fetch("/auth/signout", {
                  method: "POST",
                });
                if (response.ok) {
                  router.replace("/login");
                  router.refresh();
                } else setMessage("Não foi possível sair. Tente novamente.");
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {message && (
          <p role="status" className="tf-banner">
            {message}
          </p>
        )}
        <div className="tf-page-body">{children}</div>
        <footer className="tf-footer">
          Traffic Flow <span>Tráfego · Vendas · Inteligência</span>
        </footer>
      </div>
    </div>
  );
}
