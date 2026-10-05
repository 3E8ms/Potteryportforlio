import { describe, expect, it } from "vitest";
import { isoToTorontoInput, torontoInputToIso } from "./time";
import { normalizePhone, normalizePostal, validateCustomer } from "./validation";
import { detectLang, pick, translate } from "../i18n/LanguageContext";
import { money, shortMoney } from "./format";

describe("time", () => {
  it("round-trips Toronto wall time in summer and winter", () => {
    expect(torontoInputToIso("2026-10-17T10:00")).toBe("2026-10-17T14:00:00.000Z");
    expect(torontoInputToIso("2026-12-05T10:00")).toBe("2026-12-05T15:00:00.000Z");
    expect(isoToTorontoInput("2026-10-17T14:00:00.000Z")).toBe("2026-10-17T10:00");
    expect(isoToTorontoInput(null)).toBe("");
    expect(torontoInputToIso("")).toBeNull();
  });
});

describe("validation", () => {
  const ok = { name: "Lily Chen", email: "lily@example.com", phone: "(613) 555-0123", address: "123 Bank St",
    city: "Ottawa", province: "ON", postal_code: "k1p1j1", note: "" };
  it("accepts a good address", () => expect(validateCustomer(ok)).toEqual({}));
  it("flags each bad field", () => {
    const e = validateCustomer({ ...ok, name: "L", email: "x@y", phone: "555", address: "1", city: "", postal_code: "D1A1A1" });
    expect(Object.keys(e).sort()).toEqual(["address", "city", "email", "name", "phone", "postal_code"]);
  });
  it("normalizes", () => {
    expect(normalizePhone("1 613 555 0123")).toBe("613-555-0123");
    expect(normalizePostal("k1p-1j1")).toBe("K1P 1J1");
  });
});

describe("i18n", () => {
  it("detects language", () => {
    expect(detectLang(null, ["zh-CN"])).toBe("hans");
    expect(detectLang(null, ["zh-TW"])).toBe("hant");
    expect(detectLang(null, ["zh"])).toBe("hant");
    expect(detectLang("en", ["zh-CN"])).toBe("en");
    expect(detectLang(null, ["fr-CA"])).toBe("en");
  });
  it("falls back when a translation is missing", () => {
    expect(pick({ en: "Mug", hant: "馬克杯" }, "hans")).toBe("馬克杯");
    expect(pick({ hans: "马克杯" }, "en")).toBe("马克杯");
  });
  it("fills placeholders", () => expect(translate("en", "stock_low", 3)).toBe("Only 3 left"));
  it("formats money", () => {
    expect(money(1800)).toBe("$18.00");
    expect(shortMoney(1800)).toBe("$18");
    expect(shortMoney(1850)).toBe("$18.50");
  });
});
