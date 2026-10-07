// Shimmer sweep for a piece of text. Ported from the "shimmer-text" component (motion + Tailwind removed):
// a lighter band sweeps across the text (background-clip:text), same timing model as the original
// (initial delay, sweep `duration`, then `repeatDelay` pause, repeating). The text keeps its own font/size/position.

function ShimmerText({ children, duration = 1.5, delay = 1.5, repeatDelay = 1.5 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !el.animate) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cycle = duration + repeatDelay;
    const anim = el.animate(
      [
        { backgroundPositionX: '-100%', offset: 0 },
        { backgroundPositionX: '250%', offset: duration / cycle },
        { backgroundPositionX: '250%', offset: 1 },
      ],
      { duration: cycle * 1000, delay: delay * 1000, iterations: Infinity, easing: 'linear' }
    );
    return () => anim.cancel();
  }, [duration, delay, repeatDelay]);
  return <span ref={ref} className="shimmer">{children}</span>;
}

Object.assign(window, { ShimmerText });
