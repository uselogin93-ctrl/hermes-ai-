import { describe, expect, it } from "vitest";
import { diffLines, countWords } from "@/lib/diff";

describe("diffLines", () => {
  it("marks identical lines as unchanged", () => {
    const result = diffLines("a\nb", "a\nb");
    expect(result.every((line) => line.type === "same")).toBe(true);
  });

  it("marks inserted lines as added", () => {
    const result = diffLines("a", "a\nb");
    expect(result.filter((line) => line.type === "added").map((line) => line.value)).toEqual(["b"]);
  });

  it("marks deleted lines as removed", () => {
    const result = diffLines("a\nb", "a");
    expect(result.filter((line) => line.type === "removed").map((line) => line.value)).toEqual(["b"]);
  });

  it("keeps the original order of unchanged lines", () => {
    const result = diffLines("one\ntwo\nthree", "one\ntwo\nthree");
    expect(result.map((line) => line.value)).toEqual(["one", "two", "three"]);
  });
});

describe("countWords", () => {
  it("counts whitespace separated words", () => {
    expect(countWords("  hello   brave  new world ")).toBe(4);
  });

  it("returns zero for empty text", () => {
    expect(countWords("   ")).toBe(0);
  });
});
