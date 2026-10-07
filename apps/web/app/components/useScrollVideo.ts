"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** One smoothed clock for text and video; at most one decoder seek in flight. */
export function useScrollVideo(
  sectionRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
) {
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;
    gsap.registerPlugin(ScrollTrigger);
    const dissolve = section.querySelector<HTMLElement>(".film-dissolve");
    const foreground = section.querySelector<HTMLElement>(".story-content");
    const panels = Array.from(section.querySelectorAll<HTMLElement>("[data-story-step]"));
    const media = gsap.matchMedia();
    let disposed = false;
    let frame = 0;
    let target = 0;
    let progress = 0;
    let active = true;
    let reduced = false;
    let priming = false;
    let primed = false;

    const seek = () => {
      frame = 0;
      if (disposed || reduced || priming || !active || document.hidden || video.seeking || video.readyState < 1 || !Number.isFinite(video.duration)) return;
      const time = Math.min(target, Math.max(0, video.duration - 1 / 30));
      if (Math.abs(video.currentTime - time) < 1 / 60) return;
      try { video.currentTime = time; } catch { /* A later media readiness event retries the latest target. */ }
    };
    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(seek);
    };
    const ready = () => {
      target = Math.min(1, progress / 0.88) * (Number.isFinite(video.duration) ? video.duration : 0);
      section.dataset.mediaState = "ready";
      schedule();
    };
    const error = () => { section.dataset.mediaState = "error"; };
    // Safari can defer decoding a paused preload until a trusted touch starts it.
    // Retry on later gestures if low-power/autoplay policy rejects the first play.
    const prime = () => {
      if (disposed || primed || priming || reduced) return;
      priming = true;
      video.play().then(() => {
        video.pause();
        priming = false;
        if (disposed) return;
        primed = true;
        schedule();
      }).catch(() => { priming = false; schedule(); });
    };
    video.pause();
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    document.addEventListener("touchstart", prime, { passive: true });
    document.addEventListener("pointerdown", prime, { passive: true });
    video.addEventListener("loadeddata", ready);
    video.addEventListener("loadedmetadata", ready);
    video.addEventListener("durationchange", ready);
    video.addEventListener("canplay", ready);
    video.addEventListener("seeked", schedule);
    video.addEventListener("error", error);
    document.addEventListener("visibilitychange", schedule);
    section.dataset.mediaState = video.readyState >= 2 ? "ready" : "loading";

    media.add({ reduced: "(prefers-reduced-motion: reduce), (max-height: 540px)", motion: "(prefers-reduced-motion: no-preference) and (min-height: 541px)" }, (context) => {
      reduced = !!context.conditions?.reduced;
      if (reduced) {
        panels.forEach(panel => { panel.inert = false; panel.removeAttribute("aria-hidden"); });
        return;
      }
      const clock = { progress: 0 };
      let lightHeader = false;
      const render = () => {
        const p = clock.progress;
        progress = p;
        // Finish the film before the final 12% of the pin: room for decoder catch-up.
        target = Math.min(1, p / 0.88) * (Number.isFinite(video.duration) ? video.duration : 0);
        schedule();
        if (dissolve && foreground) {
          // A single exposure bloom, then a cream dissolve into the next section.
          const exit = gsap.utils.clamp(0, 1, (p - 0.88) / 0.12);
          dissolve.style.opacity = String(exit);
          dissolve.style.setProperty("--exposure", String(Math.sin(exit * Math.PI)));
          foreground.style.opacity = String(1 - exit);
          video.style.opacity = String(1 - exit * 0.85);
          video.style.transform = `scale(${1 + exit * 0.055})`;
        }
        panels.forEach((panel, index) => {
          const local = p * panels.length - index;
          const enter = index === 0 ? 1 : gsap.utils.clamp(0, 1, local / 0.18);
          const leave = index === panels.length - 1 ? 1 : gsap.utils.clamp(0, 1, (0.9 - local) / 0.18);
          const opacity = Math.min(enter, leave);
          panel.style.opacity = String(opacity);
          panel.style.visibility = opacity > 0 ? "visible" : "hidden";
          panel.style.transform = `translate3d(0, ${(1 - enter) * 14 - (1 - leave) * 10}px, 0)`;
          panel.inert = opacity < 0.95;
          panel.setAttribute("aria-hidden", String(opacity === 0));
        });
        section.style.setProperty("--story-progress", String(p));
        if (dissolve && lightHeader !== (p > .9)) {
          lightHeader = p > .9;
          window.dispatchEvent(new Event("story-theme-change"));
        }
      };
      const tween = gsap.to(clock, {
        progress: 1, ease: "none", onUpdate: render,
        scrollTrigger: {
          trigger: section, start: "top top", end: () => `+=${section.offsetHeight * 3.2}`,
          pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          onToggle: self => { active = self.isActive; if (active) schedule(); },
          onRefresh: render,
          onLeave: () => { target = video.duration; active = true; schedule(); },
          onLeaveBack: () => { target = 0; active = true; schedule(); },
        },
      });
      render();
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        if (dissolve) dissolve.style.opacity = "0";
        if (foreground) foreground.style.opacity = "";
        video.style.opacity = "";
        video.style.transform = "";
        panels.forEach(panel => {
          panel.removeAttribute("style"); panel.removeAttribute("aria-hidden"); panel.inert = false;
        });
      };
    });
    // Pin layout must exist before metadata arrives, including restored scroll positions.
    document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => {
      disposed = true;
      video.pause();
      document.removeEventListener("touchstart", prime);
      document.removeEventListener("pointerdown", prime);
      cancelAnimationFrame(frame);
      media.revert();
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("loadedmetadata", ready);
      video.removeEventListener("durationchange", ready);
      video.removeEventListener("canplay", ready);
      video.removeEventListener("seeked", schedule);
      video.removeEventListener("error", error);
      document.removeEventListener("visibilitychange", schedule);
      delete section.dataset.mediaState;
      section.style.removeProperty("--story-progress");
    };
  }, [sectionRef, videoRef]);
}
