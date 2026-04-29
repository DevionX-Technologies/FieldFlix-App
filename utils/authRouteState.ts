import { Paths } from "@/data/paths";

let currentPathname = "";

const PUBLIC_PATHS = new Set([
  Paths.root,
  Paths.login,
  Paths.signup,
  Paths.otp,
  Paths.accountType,
]);

export function setCurrentPathname(pathname: string): void {
  currentPathname = pathname;
}

export function isPublicRoutePath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname as typeof Paths[keyof typeof Paths]) ||
    pathname.startsWith("/shared/media/") ||
    pathname.startsWith("/shared-recording/")
  );
}

export function shouldSuppressGlobalAuthRedirect(): boolean {
  return isPublicRoutePath(currentPathname);
}
