import { onBeforeUnmount, watch, type Ref } from "vue";

/**
 * Closes a modal layer when Escape is pressed while it is open.
 * Attached to the window so the layer does not need to hold focus.
 */
export function useEscapeKey(open: Ref<boolean>, close: () => void) {
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== "Escape" || !open.value) return;
    e.preventDefault();
    close();
  }

  watch(open, (isOpen) => {
    if (isOpen) window.addEventListener("keydown", onKeydown);
    else window.removeEventListener("keydown", onKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeydown);
  });
}
