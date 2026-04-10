/** Serializable schedule annotation for client components (manager grid, employee views). */
export type ScheduleAnnotationDTO = {
  id: string;
  locationId: string;
  locationName: string;
  startsOnYmd: string;
  endsOnYmd: string;
  title: string;
  message: string | null;
  highlightHex: string | null;
  showAnnouncement: boolean;
  businessClosed: boolean;
  blockTimeOffRequests: boolean;
};

export const ANNOTATION_HIGHLIGHT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default" },
  { value: "#dbeafe", label: "Sky" },
  { value: "#fef3c7", label: "Amber" },
  { value: "#fecaca", label: "Rose" },
  { value: "#e9d5ff", label: "Violet" },
  { value: "#d1fae5", label: "Emerald" },
  { value: "#e5e7eb", label: "Slate" },
];
