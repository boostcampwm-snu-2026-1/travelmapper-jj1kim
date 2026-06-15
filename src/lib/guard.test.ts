import { describe, it, expect, vi } from "vitest";
import { createGuard } from "./guard";

// 외부에서 resolve 시점을 제어할 수 있는 deferred promise 헬퍼
function defer() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createGuard", () => {
  it("in-flight 작업이 끝나기 전의 두 번째 호출은 무시한다", async () => {
    const guard = createGuard();
    const fn = vi.fn(() => defer().promise); // 영원히 pending

    guard(fn); // 1차: 실행되어 busy=true
    guard(fn); // 2차: busy이므로 무시
    guard(fn); // 3차: 무시

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("작업이 완료되면 다시 실행할 수 있다", async () => {
    const guard = createGuard();
    const first = defer();
    const fn = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => Promise.resolve());

    const p1 = guard(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    first.resolve();
    await p1;

    await guard(fn); // busy 해제됐으므로 재실행됨
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("작업이 throw해도 busy가 해제되어 다음 호출이 가능하다", async () => {
    const guard = createGuard();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    await expect(guard(fn)).rejects.toThrow("boom");

    await guard(fn); // finally에서 busy 해제 → 재실행 가능
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
