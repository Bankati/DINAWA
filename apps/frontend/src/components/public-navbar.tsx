'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './public-navbar.css';

export default function PublicNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = (active: boolean) => `nl${active ? ' nl-active' : ''}`;

  return (
    <nav className={`nav${scrolled ? ' nav-scrolled' : ''}`}>
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <img src="/WARAH-logo.png" alt="WARAH" className="logo-img" />
        </Link>

        <ul className="nav-links">
          <li><Link href="/" className={linkClass(pathname === '/')}>Accueil</Link></li>
          <li><Link href="/annonces" className={linkClass(pathname.startsWith('/annonces'))}>Annonces</Link></li>
          <li><Link href="/a-propos" className={linkClass(pathname.startsWith('/a-propos'))}>À propos</Link></li>
          <li><Link href="/#tarifs" className="nl">Tarifs</Link></li>
          <li><Link href="/contact" className={linkClass(pathname.startsWith('/contact'))}>Contact</Link></li>
        </ul>

        <div className="nav-cta">
          <Link href="/auth/login" className="nav-login">Connexion</Link>
          <Link href="/auth/register" className="nav-pill">S&apos;inscrire</Link>
        </div>

        <button className="hamburger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>

      {menuOpen && (
        <div className="m-menu" onClick={() => setMenuOpen(false)}>
          <Link href="/" className="mm-link">Accueil</Link>
          <Link href="/annonces" className="mm-link">Annonces</Link>
          <Link href="/a-propos" className="mm-link">À propos</Link>
          <Link href="/#tarifs" className="mm-link">Tarifs</Link>
          <Link href="/contact" className="mm-link">Contact</Link>
          <div className="mm-sep" />
          <Link href="/auth/login" className="mm-link">Connexion</Link>
          <Link href="/auth/register" className="mm-cta">S&apos;inscrire gratuitement</Link>
        </div>
      )}
    </nav>
  );
}
