export const communicationSections = [
  { id: "campanas", label: "Campañas" },
  { id: "plantillas", label: "Plantillas" },
  { id: "automatizaciones", label: "Regreso al gym" },
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
