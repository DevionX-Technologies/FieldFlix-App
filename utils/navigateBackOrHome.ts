import { Paths } from "@/data/paths";
import type { Href } from "expo-router";

type RouterBack = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
};

/** Pops the stack when possible; otherwise lands on Home (cold start / single-screen stack). */
export function navigateBackOrHome(router: RouterBack): void {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // canGoBack may throw on some routers — fall through
  }
  router.replace(Paths.home as Href);
}
