import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useIconsLayoutStore } from "@/stores/IconsLayout";
import { defaultLayout } from "@/config/dock-layout";

describe("icons layout store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts from the default layout", () => {
    const store = useIconsLayoutStore();
    expect(store.iconsAt("top-left")).toEqual(defaultLayout["top-left"]);
  });

  it("moves an icon to another dock at the requested index", () => {
    const store = useIconsLayoutStore();
    store.setIcons("top-left", ["a", "b", "c"]);
    store.setIcons("top-right", ["x"]);

    store.moveIcon("b", "top-left", "top-right", 1);

    expect(store.iconsAt("top-left")).toEqual(["a", "c"]);
    expect(store.iconsAt("top-right")).toEqual(["x", "b"]);
  });

  it("appends when no insert index is given", () => {
    const store = useIconsLayoutStore();
    store.setIcons("bottom", ["a", "b"]);

    store.moveIcon("a", "bottom", "bottom");

    expect(store.iconsAt("bottom")).toEqual(["b", "a"]);
  });

  it("keeps the requested position when reordering inside one dock", () => {
    const store = useIconsLayoutStore();
    store.setIcons("top", ["a", "b", "c"]);

    store.moveIcon("a", "top", "top", 3);
    expect(store.iconsAt("top")).toEqual(["b", "c", "a"]);

    store.moveIcon("a", "top", "top", 0);
    expect(store.iconsAt("top")).toEqual(["a", "b", "c"]);
  });

  it("ignores unknown icons and empty clears", () => {
    const store = useIconsLayoutStore();
    store.setIcons("bottom-right", ["only"]);

    store.moveIcon("missing", "bottom-right", "bottom-left");
    expect(store.iconsAt("bottom-right")).toEqual(["only"]);
    expect(store.iconsAt("bottom-left")).toEqual(defaultLayout["bottom-left"]);

    store.clearIcons("bottom-right");
    expect(store.iconsAt("bottom-right")).toEqual([]);
  });

  it("restores the default layout", () => {
    const store = useIconsLayoutStore();
    store.clearIcons("top-left");
    store.clearIcons("top-right");

    store.resetLayout();

    expect(store.iconsAt("top-left")).toEqual(defaultLayout["top-left"]);
    expect(store.iconsAt("top-right")).toEqual(defaultLayout["top-right"]);
  });
});
