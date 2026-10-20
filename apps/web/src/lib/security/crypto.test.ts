import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/security/crypto";

describe("token encryption", () => {
  it("round trips a token", () => {
    const token = "gho_abcdefghijklmnopqrstuvwxyz012345";
    const encrypted = encryptSecret(token);
    expect(encrypted).not.toContain(token);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("produces a different envelope every time", () => {
    expect(encryptSecret("same-token")).not.toBe(encryptSecret("same-token"));
  });

  it("rejects a tampered payload", () => {
    const encrypted = encryptSecret("token-value");
    const [iv, tag, data] = encrypted.split(".");
    const tampered = `${iv}.${tag}.${data?.slice(0, -2)}xy`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("rejects a malformed envelope", () => {
    expect(() => decryptSecret("not-an-envelope")).toThrow(/Malformed/);
  });
});

describe("maskSecret", () => {
  it("hides the middle of a token", () => {
    const masked = maskSecret("gho_abcdefghijklmnop");
    expect(masked.startsWith("gho_")).toBe(true);
    expect(masked).not.toContain("abcdefghijkl");
  });
});
