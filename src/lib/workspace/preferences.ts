import { object, strings } from "./types";
export function validatePreferences(input: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  if ("theme" in input) {
    if (!["light", "dark"].includes(String(input.theme)))
      throw Error("Tema inválido.");
    result.theme = input.theme;
  }
  if ("privacy" in input) {
    if (typeof input.privacy !== "boolean")
      throw Error("Privacidade inválida.");
    result.privacy = input.privacy;
  }
  if ("columns" in input) {
    const cols = object(input.columns);
    if (Object.keys(cols).length > 15)
      throw Error("Configuração de colunas inválida.");
    for (const list of Object.values(cols))
      if (
        !Array.isArray(list) ||
        list.length > 60 ||
        strings(list).length !== list.length ||
        strings(list).some((v) => v.length > 80)
      )
        throw Error("Configuração de colunas inválida.");
    result.columns = cols;
  }
  if ("notifications" in input) {
    const p = object(input.notifications);
    for (const k of [
      "approved",
      "pending",
      "product",
      "campaign",
      "dashboard",
      "sound",
    ])
      if (k in p && typeof p[k] !== "boolean")
        throw Error("Preferência de notificação inválida.");
    if (
      "value" in p &&
      !["gross", "commission", "hidden"].includes(String(p.value))
    )
      throw Error("Valor da notificação inválido.");
    if (
      "style" in p &&
      !["profit", "detail", "creative"].includes(String(p.style))
    )
      throw Error("Estilo de notificação inválido.");
    if (
      "hours" in p &&
      (!Array.isArray(p.hours) ||
        p.hours.length > 24 ||
        strings(p.hours).length !== p.hours.length ||
        strings(p.hours).some((h) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)))
    )
      throw Error("Horários inválidos.");
    result.notifications = Object.fromEntries(
      Object.entries(p).filter(([k]) =>
        [
          "approved",
          "pending",
          "product",
          "campaign",
          "dashboard",
          "sound",
          "value",
          "style",
          "hours",
        ].includes(k),
      ),
    );
  }
  return result;
}
