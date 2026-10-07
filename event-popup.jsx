// Event popup: shown 1s after load, closes with X / Esc / backdrop, "오늘 하루 보지 않기" hides it for the rest of the day
// (same browser, localStorage). Locks background scroll while open.

const EVP_KEY = 'impetvs-event-popup-hidden-on';
const evpToday = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const evpStore = {
  get() { try { return localStorage.getItem(EVP_KEY); } catch (e) { return window.__evpMem || null; } },
  set(v) { try { localStorage.setItem(EVP_KEY, v); } catch (e) { window.__evpMem = v; } },
};

function EventPopup({ delay = 1000, href = '#info' }) {
  const [open, setOpen] = React.useState(false);
  const dlg = React.useRef(null), prevFocus = React.useRef(null);

  React.useEffect(() => {
    if (evpStore.get() === evpToday()) return;
    // the merged single file keeps the home page mounted (hidden) while another page is shown: don't pop up behind it
    const homeHidden = () => { const a = document.getElementById('app'); return !!a && a.style.display === 'none'; };
    const id = setTimeout(() => { if (homeHidden()) return; prevFocus.current = document.activeElement; setOpen(true); }, delay);
    const onHash = () => { if (homeHidden()) setOpen(false); };
    window.addEventListener('hashchange', onHash);
    return () => { clearTimeout(id); window.removeEventListener('hashchange', onHash); };
  }, [delay]);

  const close = React.useCallback(() => setOpen(false), []);
  const hideToday = () => { evpStore.set(evpToday()); setOpen(false); };
  const go = e => {
    // in-page section -> smooth scroll; anything else (page / route) -> let the link navigate in the same tab
    const el = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
    if (el) { e.preventDefault(); setOpen(false); setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60); }
    else setOpen(false);
  };

  React.useEffect(() => {
    if (!open) return;
    const de = document.documentElement, b = document.body;
    const prev = { bo: b.style.overflow, ho: de.style.overflow, hg: de.style.scrollbarGutter };
    de.style.scrollbarGutter = 'stable'; // keep the scrollbar's space so nothing shifts when scrolling is locked
    b.style.overflow = 'hidden'; de.style.overflow = 'hidden';
    dlg.current && dlg.current.focus({ preventScroll: true });
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab' || !dlg.current) return;
      const f = [...dlg.current.querySelectorAll('button,a[href]')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || a === dlg.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      b.style.overflow = prev.bo; de.style.overflow = prev.ho; de.style.scrollbarGutter = prev.hg;
      const p = prevFocus.current; p && p.focus && p.focus({ preventScroll: true });
    };
  }, [open, close]);

  if (!open) return null;
  const img = (window.__A && window.__A['opt/event-popup.webp']) || 'opt/event-popup.webp';
  return (
    <div className="evp-ov" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="evp" role="dialog" aria-modal="true" aria-labelledby="evp-t" aria-describedby="evp-d" tabIndex={-1} ref={dlg}>
        <button type="button" className="evp-x" aria-label="닫기" onClick={close}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="evp-im"><img src={img} alt="임페투스 샘플 키트 체험단 100인 모집" /></div>
        <div className="evp-b">
          <h2 id="evp-t">임페투스 샘플 키트 체험단 100인 모집</h2>
          <p id="evp-d">배송비 결제시 샘플 키트를 무료로 드립니다!</p>
          <a className="evp-cta" href={href} onClick={go}>자세히 보기</a>
        </div>
        <div className="evp-f"><button type="button" onClick={hideToday}>오늘 하루 보지 않기</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { EventPopup });
