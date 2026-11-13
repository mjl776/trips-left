"use client";

import { FC, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./page.module.css";
import { LogoIcon } from "../Icons/LogoIcon";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/lineup-management", label: "Lineup" },
  { href: "/trade-simulator", label: "Trade Simulator" },
  { href: "/about", label: "About" },
];

/** Home matches exactly; every other link is active on its own route and anything nested under it. */
const isLinkActive = (pathname: string | null, href: string): boolean => {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const Navbar: FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link
          href="/"
          aria-label="Trips Left, home"
          className={styles.logo}
          onClick={() => setIsOpen(false)}
        >
          <LogoIcon className={styles.logoMark} />
          <span className={styles.wordmark}>
            Trips <span className={styles.wordmarkAccent}>Left</span>
          </span>
        </Link>

        <ul className={styles.desktopLinks}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = isLinkActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? `${styles.link} ${styles.linkActive}` : styles.link}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className={styles.menuButton}
        >
          <span className={styles.iconWrapper}>
            <span
              className={`${styles.iconBar} ${styles.iconBarTop} ${isOpen ? styles.iconBarTopOpen : ""}`}
            />
            <span
              className={`${styles.iconBar} ${styles.iconBarMiddle} ${isOpen ? styles.iconBarMiddleOpen : ""}`}
            />
            <span
              className={`${styles.iconBar} ${styles.iconBarBottom} ${isOpen ? styles.iconBarBottomOpen : ""}`}
            />
          </span>
        </button>
      </nav>

      {isOpen && (
        <ul className={styles.mobileMenu}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = isLinkActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                  className={isActive ? `${styles.mobileLink} ${styles.mobileLinkActive}` : styles.mobileLink}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
};

export default Navbar;
