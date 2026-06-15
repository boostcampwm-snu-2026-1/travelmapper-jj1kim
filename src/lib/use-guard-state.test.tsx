// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGuardState } from "./guard";

function defer() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useGuardState", () => {
  it("작업 동안 busy=true, 완료 후 busy=false로 돌아온다", async () => {
    const { result } = renderHook(() => useGuardState());
    const d = defer();

    expect(result.current[1]).toBe(false); // 초기 busy=false

    let pending!: Promise<void>;
    act(() => {
      pending = result.current[0](() => d.promise);
    });
    expect(result.current[1]).toBe(true); // 실행 중 busy=true

    await act(async () => {
      d.resolve();
      await pending;
    });
    expect(result.current[1]).toBe(false); // 완료 후 busy=false
  });

  it("in-flight 중 두 번째 호출은 무시된다", async () => {
    const { result } = renderHook(() => useGuardState());
    const d = defer();
    const fn = vi.fn(() => d.promise);

    let pending!: Promise<void>;
    act(() => {
      pending = result.current[0](fn);
    });
    act(() => {
      result.current[0](fn); // busy이므로 무시
    });
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve();
      await pending;
    });
  });
});
