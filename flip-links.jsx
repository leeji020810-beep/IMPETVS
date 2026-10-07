// Letter flip on hover. Ported from the "flip-links" component (Tailwind removed): on hover every letter slides up
// and is replaced by a copy rising from below, staggered 25ms per letter, 300ms ease-in-out.
// Only the mechanism is used: font, size, line-height and wrapping stay as they were.
// - Each word is its own clipping box, so the effect still works when a line wraps.
// - Splitting text into letters switches kerning off, so the kerning of every letter pair is measured
//   once (canvas) and put back as a margin; the text keeps exactly the width it had before.

function FlipLines({ a }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const root = ref.current; if (!root) return;
    let dead = false;
    (async () => {
      try { await document.fonts.ready; } catch (e) {}
      if (dead) return;
      const cs = getComputedStyle(root), fs = parseFloat(cs.fontSize);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      if ('fontKerning' in ctx) ctx.fontKerning = 'normal';
      const w = t => ctx.measureText(t).width;
      root.querySelectorAll('.fw').forEach(word => {
        const fa = [...word.querySelectorAll('.fa > span')], fb = [...word.querySelectorAll('.fb > span')];
        // kerning between this word's last letter and the following space / next word's first letter
        const nextWord = word.nextSibling && word.nextSibling.nextSibling;
        if (nextWord && nextWord.classList && nextWord.classList.contains('fw')) {
          const x = fa[fa.length - 1].textContent, y = nextWord.querySelector('.fa > span').textContent;
          const adj = (w(x + ' ') - w(x) - w(' ') + w(' ' + y) - w(' ') - w(y)) / fs;
          word.style.marginRight = adj ? adj + 'em' : '';
        }
        fa.forEach((s, i) => {
          if (i === fa.length - 1) return;
          const x = s.textContent, y = fa[i + 1].textContent;
          const adj = (w(x + y) - w(x) - w(y)) / fs;
          const v = adj ? adj + 'em' : '';
          s.style.marginRight = v; fb[i].style.marginRight = v;
        });
      });
    })();
    return () => { dead = true; };
  }, [a]);

  return (
    <span ref={ref} style={{ display: 'block' }}>
      {a.map((line, li) => {
        let n = 0;
        return (
          <span key={li} className="fl" aria-label={line}>
            {line.split(' ').map((w, wi) => {
              const letters = [...w];
              const base = n; n += letters.length + 1; // stagger continues across the whole line
              const mk = () => letters.map((c, i) => <span key={i} style={{ '--i': base + i }}>{c}</span>);
              return (
                <React.Fragment key={wi}>
                  {wi > 0 && ' '}
                  <span className="fw" aria-hidden="true"><span className="fa">{mk()}</span><span className="fb">{mk()}</span></span>
                </React.Fragment>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

Object.assign(window, { FlipLines });
