export const communicationSections = [
  { id: "campanas", label: "Campañas" },
  { id: "plantillas", label: "Plantillas" },
  { id: "automatizaciones", label: "Automatizaciones" },
  { id: "duenos", label: "Dueños" },
  { id: "canales", label: "Canales" },
  { id: "historial", label: "Preparados" },
] as const;
export type CommunicationSection = (typeof communicationSections)[number]["id"];
export function communicationSection(
  value: string | undefined,
): CommunicationSection {
  return communicationSections.find((s) => s.id === value)?.id ?? "campanas";
}
