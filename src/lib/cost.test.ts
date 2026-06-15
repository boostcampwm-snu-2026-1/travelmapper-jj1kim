import { describe, it, expect } from "vitest";
import { perPerson } from "./cost";

describe("perPerson", () => {
  it("총액을 인원수로 나눠 내림한다", () => {
    expect(perPerson(10000, 3)).toBe(3333);
    expect(perPerson(10000, 2)).toBe(5000);
  });
  it("인원수가 0 이하이면 0을 반환한다 (NaN/Infinity 방지)", () => {
    expect(perPerson(10000, 0)).toBe(0);
    expect(perPerson(10000, -1)).toBe(0);
  });
  it("총액이 0이면 0", () => {
    expect(perPerson(0, 4)).toBe(0);
  });
  it("총액이 유한수가 아니면 0", () => {
    expect(perPerson(NaN, 4)).toBe(0);
    expect(perPerson(Infinity, 4)).toBe(0);
  });
});
