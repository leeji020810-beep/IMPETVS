const PIDX = [['intro', 'INTRO'], ['story', 'STORY'], ['notes', 'NOTES'], ['mood', 'MOOD'], ['keypoint', 'KEY POINT'], ['care', 'PRODUCT SAFETY'], ['review', 'REAL REVIEW'], ['presence', 'PRESENCE'], ['howto', 'HOW TO USE'], ['lookbook', 'LOOKBOOK'], ['info', 'INFORMATION']];

function useScrollFX(motion) {
  React.useEffect(() => {
    let raf;
    const tick = () => {
      const vh = window.innerHeight;
      document.querySelectorAll('[data-p]').forEach(el => {
        const r = el.getBoundingClientRect();
        const m = el.dataset.p;
        let p = m === 'sticky' ? -r.top / Math.max(1, r.height - vh) : m === 'exit' ? -r.top / r.height : (vh - r.top) / (vh + r.height);
        p = Math.max(0, Math.min(1, p));
        el.style.setProperty('--p', p.toFixed(4));
        if (el.dataset.steps) {
          const n = +el.dataset.steps, a = String(Math.min(n - 1, Math.floor(p * n)));
          if (el.dataset.active !== a) el.dataset.active = a;
          el.querySelectorAll('.kp-bar i').forEach((b, i) => b.style.setProperty('--f', Math.max(0, Math.min(1, p * n - i)).toFixed(3)));
        }
        if (el.hasAttribute('data-words')) {
          const ws = el.querySelectorAll('.w'), n = ws.length;
          const q = Math.max(0, Math.min(1, (p - .18) / .42));
          ws.forEach((w, i) => { w.style.opacity = motion === 'rich' ? Math.max(.16, Math.min(1, q * n - i + 1)) : 1; });
        }
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [motion]);
}

function useReveal(dep) {
  React.useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
    document.querySelectorAll('.rv:not(.in)').forEach(e => io.observe(e));
    return () => io.disconnect();
  }, [dep]);
}

function useActiveSection() {
  const [a, setA] = React.useState('intro');
  React.useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setA(e.target.id)), { rootMargin: '-50% 0px -50% 0px' });
    PIDX.forEach(([id]) => { const el = document.getElementById(id); el && io.observe(el); });
    return () => io.disconnect();
  }, []);
  return a;
}

const Words = ({ lines }) => lines.map((ln, li) => (
  <React.Fragment key={li}>{li > 0 && <br />}{ln.split(' ').map((w, i) => <span key={i} className="w">{w} </span>)}</React.Fragment>
));
const cx = (...a) => a.filter(Boolean).join(' ');

function PBtn({ href = 'product.html', ...p }) {
  return <a href={href} style={{ display: 'inline-flex' }}><PBtnInner {...p} /></a>;
}
function PBtnInner({ t, on = 'dark', label = '구매하기', size = 'lg' }) {
  const r = t.btnShape === 'rect' ? 0 : 999;
  if (t.accent === 'blue') return <DBtn size={size} label={label} style={{ borderRadius: r }} />;
  if (t.btnStyle === 'outline') return <span className={on === 'dark' ? 'dark' : ''}><DBtn variant="outlined" color="assistive" size={size} label={label} style={{ borderRadius: r, boxShadow: `inset 0 0 0 1px ${on === 'dark' ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.7)'}` }} /></span>;
  const s = on === 'dark' ? { backgroundColor: 'var(--common-100)', borderRadius: r } : { backgroundColor: 'var(--common-0)', borderRadius: r };
  return <DBtn size={size} label={label} style={s} className={on === 'dark' ? 'btn-w' : 'btn-k'} />;
}

function Accordion({ items, t }) {
  const [a, setA] = React.useState(0);
  return (
    <div className={cx('acc', !t.accVert && 'novert', t.noteList === 'col' && 'ncol')}>
      {items.map((it, i) => (
        <div key={i} className={`acc-p ${a === i ? 'on' : ''}`} onMouseEnter={() => t.accTrigger === 'hover' && setA(i)} onClick={() => setA(i)}>
          <img src={it.img} alt="" />
          <div className="acc-shade"></div>
          {t.accIndex && <span className="acc-k">{it.k}</span>}
          <span className="acc-v">{it.v}</span>
          <div className="acc-c">{it.body}</div>
        </div>
      ))}
    </div>
  );
}

function useCartCount() {
  const [n, setN] = React.useState(() => (window.IMShop ? window.IMShop.cart.count() : 0));
  React.useEffect(() => {
    if (!window.IMShop) return;
    setN(window.IMShop.cart.count());
    return window.IMShop.subscribe(setN);
  }, []);
  return n;
}

function PNav({ t }) {
  const n = useCartCount();
  return (
    <header className={cx('pn', t.navStyle, !t.navLinks && 'nolinks')}>
      <nav className="lbl"><a href="#story">Story</a><a href="#notes">Notes</a><a href="#keypoint">Key Point</a></nav>
      <a href="#intro" className="logo">IMPETVS</a>
      <div className="pn-r">
        <nav className="lbl"><a href="#review">Review</a><a href="#howto">How to use</a><a href="product.html">Buy</a></nav>
        <div className="hd-ics">
          <a className="hd-ic" href="login.html" aria-label="로그인" data-tip="로그인" data-user-icon>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>
          </a>
          <a className="hd-ic hd-cart" href="cart.html" aria-label={`장바구니, 총 ${n}개`} data-tip="장바구니">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
            <b>{n}</b>
          </a>
        </div>
      </div>
    </header>
  );
}

function PIndex({ active, t }) {
  return <aside className={cx('pidx', active === 'intro' && 'hide', t.idxLabel === 'all' && 'all', t.idxLabel === 'hover' && 'hov')}>{PIDX.map(([id, l]) => <a key={id} href={'#' + id} className={active === id ? 'on' : ''}><i></i><span>{l}</span></a>)}</aside>;
}

function PHero({ t }) {
  const word = t.heroWord === 'richman' ? 'RICH MAN' : 'IMPETVS';
  return (
    <section id="intro" className={cx('ps hero', `w-${t.heroWordPos}`, !t.heroMeta && 'nometa')} data-p="exit" data-screen-label="01 Intro">
      <div className="hero-bg" style={{ left: 1, top: 0 }}><img src={`opt/p/${t.heroImg}.webp`} alt="임페투스 리치맨" style={{ objectFit: 'cover', position: 'static', objectPosition: `50% ${t.heroPosY}%` }} /></div>
      <div className="hero-meta lbl"><span><b>{IM.tag}</b>{IM.edp}</span><span style={{ textAlign: 'right' }}><b>Quiet confidence</b>Deep, refined, unshaken.</span></div>
      <div className="hero-mid">
        <h1><span className="l">{IM.heroSub[0]}</span><span>{IM.heroSub[1]}</span></h1>
        {t.heroCta && <PBtn t={t} />}
      </div>
      <h2 className={cx('hero-word gx', word.length > 7 && 'long')}><ShimmerText>{word}</ShimmerText></h2>
    </section>
  );
}

function PStory({ t }) {
  return (
    <section key={String(t.storyFill)} id="story" className={cx('ps story', t.storyBg)} data-p="through" {...(t.storyFill ? { 'data-words': '' } : {})} data-screen-label="02 Story">
      <div className="story-in" style={t.storyLabel ? null : { gridTemplateColumns: 'minmax(0,1fr)' }}>
        {t.storyLabel && <span className="lbl">( The Story )</span>}
        <div>{IM.story.map((s, i) => <p key={i} className="story-t"><Words lines={s} /></p>)}</div>
      </div>
    </section>
  );
}

function PBand({ t }) {
  const row = Array(6).fill(0).map((_, i) => <span key={i} className="gx">IMPETVS RICH MAN — Quiet luxury —</span>);
  const row2 = Array(6).fill(0).map((_, i) => <span key={i} className="gx">Never loud — Always noticed —</span>);
  return (
    <section className={cx('ps band-only', t.bandColor === 'black' ? 'dark' : 'lite')} data-p="through" data-screen-label="Band">
      <div className={cx('band-strip', t.bandColor === 'black' && 'blk')}><div className="mq">{row}</div>{t.bandRows === 2 && <div className="mq rev">{row2}</div>}</div>
    </section>
  );
}

function PNotes({ t }) {
  const imgs = { TOP: `opt/p/${t.noteTop}.webp`, MIDDLE: `opt/p/${t.noteMid}.webp`, BASE: `opt/p/${t.noteBase}.webp` };
  return (
    <section id="notes" className="ps dark" data-screen-label="03 Notes">
      <div className="sh rv"><h2 className="gx">Notes</h2><div className="side"><span className="lbl">( Top · Middle · Base )</span></div></div>
      <Accordion t={t} items={IM.notes.map(([k, , list], i) => ({ img: imgs[k], k: `0${i + 1} / 03`, v: k, body: <><span className="big gx">{k}</span><ul>{list.map(n => <li key={n}>{n}</li>)}</ul></> }))} />
      <div className="notes-tail"></div>
    </section>
  );
}

function PMood({ t }) {
  return (
    <section key={String(t.storyFill)} id="mood" className={cx('ps story', t.storyBg)} data-p="through" {...(t.storyFill ? { 'data-words': '' } : {})} data-screen-label="04 Mood">
      <div className="story-in" style={t.storyLabel ? null : { gridTemplateColumns: 'minmax(0,1fr)' }}>
        {t.storyLabel && <span className="lbl">( Rich Man )</span>}
        <div>{IM.mood.map((s, i) => <p key={i} className="story-t"><Words lines={s} /></p>)}</div>
      </div>
    </section>
  );
}

function PKeyPoint({ t }) {
  const ims = [`opt/p/${t.kpImg1}.webp`, `opt/p/${t.kpImg2}.webp`, `opt/p/${t.kpImg3}.webp`];
  return (
    <section id="keypoint" className={cx('ps dark kp', t.kpSide === 'right' && 'flip', t.kpNum === 'sans' && 'nsans', !t.kpBar && 'nobar')} data-p="sticky" data-steps="3" data-active="0" data-screen-label="05 Key Point">
      <div className="kp-stick">
        <div className="kp-ims">{ims.map((s, i) => <div key={i} className="kp-im" data-i={i}><img src={s} alt="" /></div>)}</div>
        <div className="kp-txt">
          <div><span className="lbl" style={{ display: 'block', marginBottom: 20, color: 'var(--label-alternative)' }}>( Key Point )</span><h2 className="kp-h"><span className="l">{IM.kpHead[0]}</span><span>{IM.kpHead[1]}</span></h2></div>
          <div>
            <div className="kp-blocks">{IM.kp.map(([n, h, d], i) => <div key={n} className="kp-b" data-i={i}><div className="kp-inl"><img src={ims[i]} alt="" /></div><span className="kp-n">{n}</span><h3>{h}</h3><p>{d}</p></div>)}</div>
            <div className="kp-bar"><i></i><i></i><i></i></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// PRODUCT SAFETY: the 안전기준 적합확인 신고증명서 and what it says, nothing more (no skin / cosmetics claim, no "government guaranteed")
function SafetyViewer({ s, onClose }) {
  const [zoom, setZoom] = React.useState(false);
  const closeRef = React.useRef(null), boxRef = React.useRef(null);
  React.useEffect(() => {
    const prev = document.activeElement, ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current && closeRef.current.focus();
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = [...boxRef.current.querySelectorAll('button,[tabindex="0"]')], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ov; prev && prev.focus && prev.focus(); };
  }, []);
  const src = (window.__A && window.__A[s.img]) || s.img;
  return ReactDOM.createPortal(
    <div className="safe-ov" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="safe-dlg" ref={boxRef} role="dialog" aria-modal="true" aria-label="안전기준 적합확인 신고증명서 크게 보기">
        <div className="safe-bar">
          <span className="lbl">Product Safety</span>
          <span className="safe-btns">
            <button type="button" onClick={() => setZoom(z => !z)} aria-pressed={zoom}>{zoom ? '화면에 맞추기' : '더 크게'}</button>
            <button type="button" ref={closeRef} onClick={onClose} aria-label="닫기">닫기 ✕</button>
          </span>
        </div>
        <div className={cx('safe-scroll', zoom && 'zoom')} tabIndex={0} aria-label="신고증명서 이미지 (방향키로 스크롤)"><img src={src} alt={s.alt} width={s.imgW} height={s.imgH} /></div>
      </div>
    </div>, document.body);
}
function PCare({ t }) {
  const s = IM.safety, [open, setOpen] = React.useState(false), btnRef = React.useRef(null);
  const src = (window.__A && window.__A[s.img]) || s.img;
  return (
    <section id="care" className={cx('ps care safe', t.careBg)} data-screen-label="06 Product Safety">
      <div className="safe-in">
        <div className="safe-tx">
          <span className="lbl rv safe-lbl">{s.name}</span>
          <h2 className="care-h rv"><span className="l">{s.head[0]}</span><span>{s.head[1]}</span></h2>
          <p className="safe-desc rv">{s.desc}</p>
          <p className="safe-note rv">{s.note}</p>
          <button type="button" className="safe-open rv" ref={btnRef} onClick={() => setOpen(true)} aria-haspopup="dialog">신고 자료 크게 보기</button>
        </div>
        <figure className="safe-doc rv">
          <button type="button" className="safe-pic" onClick={() => setOpen(true)} aria-label="신고증명서를 크게 보기"><img src={src} alt={s.alt} width={s.imgW} height={s.imgH} loading="lazy" /></button>
          <figcaption>{s.cap}</figcaption>
        </figure>
      </div>
      {open && <SafetyViewer s={s} onClose={() => { setOpen(false); setTimeout(() => btnRef.current && btnRef.current.focus(), 0); }} />}
    </section>
  );
}

function PReview({ t }) {
  return (
    <section id="review" className="ps dark" data-screen-label="07 Review">
      <div className="sh rv"><h2 className="gx">Real Review</h2></div>
      <div className={cx('rev-rows', t.revLayout === 'cards' && 'rev-cards', !t.revHover && 'nohover')}>{IM.reviews.map(r => <article key={r.n} className="rev-r rv"><span className="serif">Review {r.n}</span><span className="who">{r.who}</span><p><Ln a={r.lines} /></p></article>)}</div>
    </section>
  );
}

function PPresence({ t }) {
  return (
    <section id="presence" className={cx('ps lite pres', t.presSide === 'right' && 'flip')} data-screen-label="08 Presence">
      <div className="pres-im"><img src={`opt/p/${t.presImg}.webp`} alt="" style={{ objectFit: 'fill' }} /></div>
      <div className="pres-tx">
        <span className="lbl rv" style={{ marginBottom: 24, color: 'var(--label-alternative)' }}>( Presence )</span>
        <h2 className="rv"><Ln a={IM.stmtHead} /></h2>
        {IM.stmt.map((r, i) => r ? <p key={i} className={`rv ${r[1] ? 'b' : ''}`} style={{ transitionDelay: `${(i % 4) * .08}s` }}>{r[0]}</p> : <p key={i} className="g"></p>)}
      </div>
    </section>
  );
}

function PHow({ t }) {
  return (
    <section id="howto" className={cx('ps how', !t.howWord && 'noword')} data-p="through" data-screen-label="09 How to use">
      <div className="how-bg"><img src={`opt/p/${t.howImg}.webp`} alt="향수를 분사하는 모습" /></div>
      <h2 className="how-word gx">How to use</h2>
      <TiltCard className={cx('how-card tilt-ui rv', t.howPos, t.howCard)} enabled={t.motion !== 'off'}><span className="lbl">( How to use )</span>{IM.how.map((p, i) => <HowP key={i} p={p} />)}</TiltCard>
    </section>
  );
}

function PLook({ t }) {
  const all = ['p01', 'p29', 'p30', 'p31', 'p32', 'p16'];
  const ims = all.slice(0, t.lookCount);
  return (
    <section id="lookbook" className="ps dark" data-screen-label="10 Lookbook">
      <div className="look-q rv"><p className="serif" style={{ margin: 0 }}><FlipLines a={IM.quotes[0]} /></p><span className="lbl">( Lookbook )</span></div>
      <div className="look-pad"><Accordion t={{ ...t, noteList: 'row' }} items={ims.map((s, i) => ({ img: `opt/p/${s}.webp`, k: `0${i + 1} / 0${ims.length}`, v: 'IMPETVS', body: <span className="acc-cap lbl">IMPETVS RICH MAN<br />{IM.edp}</span> }))} /></div>
    </section>
  );
}

function PInfo({ t }) {
  return (
    <section id="info" className={cx('ps info', t.infoBg, t.infoLayout === 'stack' && 'stack')} data-screen-label="11 Info">
      <div className="info-h"><h2>상품 정보 제공고시</h2><p className="info-note">{IM.infoNote}</p></div>
      <dl>{IM.info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </section>
  );
}

function PFoot({ t }) {
  const word = t.footWord === 'richman' ? 'RICH MAN' : 'IMPETVS';
  const ks = [3, 5, 2, 6, 4, 7, 3, 5];
  return (
    <footer className={cx('ps dark pf', !t.footRise && 'norise', !t.footMeta && 'nometa')} data-p="through" data-screen-label="Footer">
      <div className="pf-top">
        <div><span className="lbl">Company</span><Ln a={[IM.co.name, IM.co.hosting, IM.co.address, `대표자 ${IM.co.ceo}`, `사업자등록번호 ${IM.co.biz}`, `통신판매업신고번호 ${IM.co.mailOrder}`]} /></div>
        <div><span className="lbl">Contact</span>고객센터 {IM.co.tel}<br /><a href={`mailto:${IM.co.email}`}>{IM.co.email}</a></div>
        <div><span className="lbl">고객 서비스</span><ul className="pf-links">{IM.footService.map(([l, h]) => <li key={h}><a href={h}>{l}</a></li>)}</ul></div>
        <div><span className="lbl">법적 고지</span><ul className="pf-links">{IM.footLegal.map(([l, h]) => <li key={h}><a href={h}>{l}</a></li>)}</ul></div>
        <div><span className="lbl">SNS</span><a href="https://www.instagram.com/impetvs.official/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ display: 'inline-flex' }}><DIc n="LogoInstagram" size={24} color="var(--common-100)" /></a></div>
      </div>
      <h2 className={cx('pf-word gx', word.length > 7 && 'long', t.footRise && 'rv')}>{word === 'RICH MAN' ? 'RICH\u00a0MAN' : word}</h2>
      <div className="pf-bot lbl"><span>IMPETVS RICH MAN</span><span>{IM.edp}</span></div>
    </footer>
  );
}

Object.assign(window, { useScrollFX, useReveal, useActiveSection, PNav, PIndex, PHero, PStory, PBand, PNotes, PMood, PKeyPoint, PCare, PReview, PPresence, PHow, PLook, PInfo, PFoot, PBtn });
