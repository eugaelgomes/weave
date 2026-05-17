import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";

export type PhoneCountry = {
  iso: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
};

const regionNames = new Intl.DisplayNames(["pt-BR", "en"], { type: "region" });

const toFlagEmoji = (countryCode: string): string => {
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
};

const toPhoneCountry = (iso: CountryCode): PhoneCountry => ({
  iso,
  name: regionNames.of(iso) || iso,
  dialCode: getCountryCallingCode(iso),
  flag: toFlagEmoji(iso),
});

export const PHONE_COUNTRIES: PhoneCountry[] = getCountries()
  .map((iso) => toPhoneCountry(iso))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

export const PHONE_COUNTRY_BY_ISO = new Map<CountryCode, PhoneCountry>(
  PHONE_COUNTRIES.map((country) => [country.iso, country])
);

const PHONE_COUNTRIES_BY_DIAL_CODE = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
);

export const buildInternationalPhone = (
  countryIso: CountryCode,
  localNumber: string
): string => {
  const country = PHONE_COUNTRY_BY_ISO.get(countryIso);
  if (!country) return "";

  const sanitizedLocal = localNumber.replace(/[^\d]/g, "");
  if (!sanitizedLocal) return "";

  return `+${country.dialCode}${sanitizedLocal}`;
};

export const splitPhoneNumberByCountry = (
  rawPhone: string | null | undefined,
  fallbackIso: CountryCode = "BR"
): { countryIso: CountryCode; localNumber: string } => {
  const normalized = String(rawPhone || "").replace(/[^\d+]/g, "");
  if (!normalized) {
    return { countryIso: fallbackIso, localNumber: "" };
  }

  const withPlus = normalized.startsWith("+") ? normalized : `+${normalized}`;

  for (const country of PHONE_COUNTRIES_BY_DIAL_CODE) {
    const prefix = `+${country.dialCode}`;
    if (withPlus.startsWith(prefix)) {
      return {
        countryIso: country.iso,
        localNumber: withPlus.slice(prefix.length),
      };
    }
  }

  return { countryIso: fallbackIso, localNumber: withPlus.replace(/^\+/, "") };
};
