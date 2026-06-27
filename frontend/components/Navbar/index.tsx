"use client";

import { FC, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./page.module.css";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/leagues", label: "Leagues" },
  { href: "/lineup", label: "Lineup" },
];

const Navbar: FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo} onClick={() => setIsOpen(false)}>
          Trips Left
        </Link>

        <ul className={styles.desktopLinks}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
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
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
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
