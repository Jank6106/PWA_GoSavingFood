"use client";
import { BrandMark } from "./BrandMark";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const links = [
  { label: "Thực trạng", href: "#reality" },
  { label: "Cách hoạt động", href: "#solution" },
  { label: "Tính tác động", href: "#calculator" },
  { label: "Cộng đồng", href: "#community" },
];
export function Navbar({
  customerUrl,
  merchantUrl,
  onInstall,
}: {
  customerUrl: string;
  merchantUrl: string;
  onInstall?: (target: "customer" | "merchant") => void;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const keyboardOpen = useRef(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (keyboardOpen.current) drawer.current?.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
    else drawer.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
      if (event.key === "Tab") {
        const elements = [toggle.current, ...Array.from(drawer.current?.querySelectorAll<HTMLElement>('a') ?? [])].filter(Boolean) as HTMLElement[];
        event.preventDefault();
        const index = elements.indexOf(document.activeElement as HTMLElement);
        const next = index < 0 ? (event.shiftKey ? elements.length - 1 : 1) : (index + (event.shiftKey ? -1 : 1) + elements.length) % elements.length;
        elements[next]?.focus();
      }
    };
    const wide = matchMedia('(min-width: 1100px)');
    const closeOnWide = () => { if (wide.matches) setOpen(false); };
    wide.addEventListener('change', closeOnWide);
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = original; document.removeEventListener('keydown', onKey); wide.removeEventListener('change', closeOnWide); };
  }, [open]);
  return <>
    <header className="site-nav" data-scrolled={scrolled || open}>
      <div className="nav-inner">
        <a href="#" className="brand-link" aria-label="GoSavingFood — Trang chủ" onClick={() => setOpen(false)}>
          <BrandMark className="brand-logo" />
          <span>GoSaving<span>Food</span></span>
        </a>
        <nav aria-label="Điều hướng chính" className="desktop-nav">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
        <div className="nav-actions">
          <a
            href={merchantUrl}
            className="nav-merchant"
            onClick={(e) => {
              e.preventDefault();
              if (onInstall) onInstall("merchant");
              else window.location.assign(merchantUrl);
            }}
          >
            Dành cho cửa hàng
          </a>
          <a
            href={customerUrl}
            className="nav-cta"
            onClick={(e) => {
              e.preventDefault();
              if (onInstall) onInstall("customer");
              else window.location.assign(customerUrl);
            }}
          >
            Mở ứng dụng <ArrowUpRight size={16} />
          </a>
        </div>
        <button ref={toggle} className="menu-toggle" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={event => { keyboardOpen.current = event.detail === 0; setOpen(!open); }}>{open ? <X /> : <Menu />}</button>
      </div>
    </header>
    {open && <div ref={drawer} id="mobile-navigation" tabIndex={-1} className="mobile-navigation" role="dialog" aria-modal="true" aria-label="Điều hướng">
      <nav>{links.map((link, i) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} style={{animationDelay:`${i * 55}ms`}}>{link.label}<ArrowUpRight /></a>)}</nav>
      <div className="mobile-actions">
        <a
          className="nav-cta"
          href={customerUrl}
          onClick={(e) => {
            e.preventDefault();
            setOpen(false);
            if (onInstall) onInstall("customer");
            else window.location.assign(customerUrl);
          }}
        >
          Mở ứng dụng <ArrowUpRight size={18} />
        </a>
        <a
          className="text-link"
          href={merchantUrl}
          onClick={(e) => {
            e.preventDefault();
            setOpen(false);
            if (onInstall) onInstall("merchant");
            else window.location.assign(merchantUrl);
          }}
        >
          Dành cho cửa hàng <ArrowUpRight size={18} />
        </a>
      </div>
    </div>}
  </>;
}



