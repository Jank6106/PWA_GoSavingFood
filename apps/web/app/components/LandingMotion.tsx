"use client";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function LandingMotion() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = document.querySelector('.landing-page');
    if (!root) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      // IntersectionObserver also covers rows mounted after an audience-tab change.
      // Default HTML stays visible when JavaScript or motion is disabled.
      const tracked = new Set<HTMLElement>();
      const selector = "[data-reveal]:not([data-reveal='words']), .journey-row, .audience-switch, .partner-window, .footer-links, .solution-instructions > .editorial-button";
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) element.classList.add('is-revealed');
          else if (entry.boundingClientRect.top > 0) element.classList.remove('is-revealed');
        });
      }, { threshold: 0, rootMargin: '0px 0px -7% 0px' });
      const collect = () => {
        tracked.forEach(element => { if (!element.isConnected) { revealObserver.unobserve(element); tracked.delete(element); } });
        root.querySelectorAll<HTMLElement>(selector).forEach(element => {
          if (tracked.has(element)) return;
          tracked.add(element);
          element.classList.add('scroll-reveal');
          if (element.getBoundingClientRect().top < innerHeight * .93) element.classList.add('is-revealed');
          revealObserver.observe(element);
        });
      };
      collect();
      const mutations = new MutationObserver(collect);
      mutations.observe(root, { childList: true, subtree: true });
      gsap.fromTo(root.querySelectorAll("[data-reveal='words'] span"), { opacity: .2 }, { opacity: 1, stagger: .13, ease: "none", scrollTrigger: { trigger: ".bridge-statement", start: "top 82%", end: "bottom 35%", scrub: .5 } });
      gsap.fromTo(".bridge-arrow", { rotate: -45, y: -25 }, { rotate: 0, y: 20, ease: "none", scrollTrigger: { trigger: ".story-bridge", start: "top bottom", end: "bottom top", scrub: 1 } });
      gsap.from(".footer-wordmark", { yPercent: 45, opacity: .25, ease: "none", scrollTrigger: { trigger: ".site-footer", start: "top bottom", end: "bottom bottom", scrub: .6 } });
      const bands = root.querySelectorAll<HTMLElement>(".partner-band");
      const bandObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        (entry.target as HTMLElement).style.animationPlayState = entry.isIntersecting ? "running" : "paused";
      }));
      bands.forEach(band => bandObserver.observe(band));
      return () => {
        mutations.disconnect(); revealObserver.disconnect(); bandObserver.disconnect();
        tracked.forEach(element => element.classList.remove('scroll-reveal', 'is-revealed'));
      };
    });
    return () => media.revert();
  }, []);
  return null;
}
