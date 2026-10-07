// 3D tilt + glare card. Ported from the "be-ui-tilt-card" component (motion + Tailwind removed):
// the same spring (stiffness 200 / damping 15 / mass .3) runs on requestAnimationFrame.
// The card keeps its own className/design; only a transform and a glare overlay are added.

function TiltCard({ children, className, max = 12, glare = true, enabled = true }) {
  const ref = React.useRef(null);
  const glareRef = React.useRef(null);
  const st = React.useRef({ rx: 0, ry: 0, vrx: 0, vry: 0, trx: 0, try_: 0, raf: 0, last: 0, on: false });

  const [canHover, setCanHover] = React.useState(false);
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const h = window.matchMedia('(hover: hover) and (pointer: fine)'), r = window.matchMedia('(prefers-reduced-motion: reduce)');
    const u = () => { setCanHover(h.matches); setReduce(r.matches); };
    u(); h.addEventListener?.('change', u); r.addEventListener?.('change', u);
    return () => { h.removeEventListener?.('change', u); r.removeEventListener?.('change', u); };
  }, []);
  const active = enabled && canHover && !reduce;

  const stop = () => { cancelAnimationFrame(st.current.raf); st.current.raf = 0; };
  const release = el => { el.style.transform = ''; el.style.transitionProperty = ''; el.style.willChange = ''; st.current.on = false; };

  const tick = now => {
    const s = st.current, el = ref.current; if (!el) return;
    const dt = Math.min((now - s.last) / 1000, 0.032); s.last = now;
    const K = 200, C = 15, M = 0.3; // SPRING_MOUSE
    for (const [p, v, t] of [['rx', 'vrx', 'trx'], ['ry', 'vry', 'try_']]) {
      const a = (K * (s[t] - s[p]) - C * s[v]) / M;
      s[v] += a * dt; s[p] += s[v] * dt;
    }
    el.style.transform = `perspective(1000px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg)`;
    const settled = Math.abs(s.rx - s.trx) < 0.01 && Math.abs(s.ry - s.try_) < 0.01 && Math.abs(s.vrx) < 0.01 && Math.abs(s.vry) < 0.01;
    if (settled && s.trx === 0 && s.try_ === 0) { s.rx = s.ry = s.vrx = s.vry = 0; release(el); s.raf = 0; return; }
    s.raf = requestAnimationFrame(tick);
  };

  const onMove = e => {
    const el = ref.current; if (!el || !active) return;
    const s = st.current, r = el.getBoundingClientRect();
    // measure against the untilted layout box center-based pointer position
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    s.try_ = (px - 0.5) * max; s.trx = (0.5 - py) * max;
    if (glareRef.current) glareRef.current.style.background = `radial-gradient(circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, var(--tilt-glare, #fff), transparent 50%)`;
    if (!s.on) { s.on = true; el.style.transitionProperty = 'opacity'; el.style.willChange = 'transform'; } // keep the reveal fade, drop the transform transition
    if (!s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(tick); }
  };
  const onLeave = () => {
    const s = st.current; s.trx = 0; s.try_ = 0;
    if (s.on && !s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(tick); }
  };

  React.useEffect(() => () => stop(), []);
  React.useEffect(() => { if (!active) { stop(); if (ref.current) release(ref.current); } }, [active]);

  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
      {glare && active ? <div ref={glareRef} aria-hidden="true" className="tilt-glare" /> : null}
    </div>
  );
}

Object.assign(window, { TiltCard });
