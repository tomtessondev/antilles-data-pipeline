"use client";

import { usePathname } from "next/navigation";

import { type NavGroup, NavLinks } from "./nav-links";

/** NavLinks with the current page marked: the pathname is only known in the browser. */
export function CurrentNavLinks({ groups }: { groups: NavGroup[] }) {
  return <NavLinks groups={groups} pathname={usePathname()} />;
}
