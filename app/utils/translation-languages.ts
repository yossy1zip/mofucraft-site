export const SUPPORTED_LANGUAGES = [
  { code: "EN", label: "English" },
] as const;

export type SupportedLangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
