import { describe, expect, it } from "vitest";
import { isNewerVersion, parseVersion } from "@/utils/version";

describe("parseVersion", () => {
  it("解析带 v 前缀的三段版本", () => {
    expect(parseVersion("v1.0.0")).toEqual({ numbers: [1, 0, 0], prerelease: "" });
  });

  it("解析两段版本并按缺位补零比较", () => {
    expect(parseVersion("1.2")?.numbers).toEqual([1, 2]);
  });

  it("解析预发布标识", () => {
    expect(parseVersion("1.0.0-beta.2")).toEqual({ numbers: [1, 0, 0], prerelease: "beta.2" });
  });

  it("忽略构建元数据", () => {
    expect(parseVersion("1.0.0+build.5")?.numbers).toEqual([1, 0, 0]);
  });

  it("非法输入返回 null", () => {
    expect(parseVersion("")).toBeNull();
    expect(parseVersion("abc")).toBeNull();
    expect(parseVersion("1.x.0")).toBeNull();
  });
});

describe("isNewerVersion", () => {
  it("识别主版本升级", () => {
    expect(isNewerVersion("1.0.0", "0.2.0")).toBe(true);
    expect(isNewerVersion("0.2.0", "1.0.0")).toBe(false);
  });

  it("识别次版本与补丁升级", () => {
    expect(isNewerVersion("1.1.0", "1.0.9")).toBe(true);
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
  });

  it("相同版本不算更新", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("v1.0.0", "1.0.0")).toBe(false);
  });

  it("缺位按 0 处理", () => {
    expect(isNewerVersion("1.0.1", "1.0")).toBe(true);
    expect(isNewerVersion("1.0", "1.0.0")).toBe(false);
  });

  it("正式版高于同号预发布版", () => {
    expect(isNewerVersion("1.0.0", "1.0.0-beta.1")).toBe(true);
    expect(isNewerVersion("1.0.0-beta.1", "1.0.0")).toBe(false);
  });

  it("非法版本号不会误判为更新", () => {
    expect(isNewerVersion("abc", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.1", "")).toBe(false);
  });
});
