const IM = {
  edp: 'Eau De Perfume | 30ml', tag: '임페투스 리치맨 섬유향수', heroSub: ['조용하지만', '분명한 존재감'],
  story: [['한 번쯤 소장하고 싶었던', '명품 향수의 깊고 매력적인 향,'], ['그 고급스러운 향의 결부터', '오래 머무는 여운까지 섬세하게 재현했습니다.', '매일 부담 없이 즐길 수 있는', 'IMPETVS만의 퍼퓸을 만나보세요.']],
  mood: [['짙은 우디 향 사이로 은은한', '스모키 무드가 깊게 번져갑니다.'], ['차분하게 가라앉은 나무의 결, 묵직한 온기,', '가까이 다가갈수록 선명해지는 깊이.'], ['과하지 않은 강인함과 함께 성숙하고', '단단한 존재감이 오래도록 남습니다.']],
  notes: [['TOP', 'top', ['BERGAMOT', 'SICILIAN LEMON', 'BLACKCURRANT']], ['MIDDLE', 'middle', ['PINEAPPLE', 'PINK PEPPER', 'JASMINE']], ['BASE', 'base', ['BIRCH', 'PATCHOULI', 'MUSK']]],
  kpHead: ['이 모든 기준에 해당되는', '품격있는 향기'],
  kp: [
    ['01', '감각을 더하는 오브제', '절제된 디자인과 클래식한 무드로 어디에 두어도 자연스럽게 어우러지는 하나의 감각적인 오브제가 됩니다.'],
    ['02', '깊이를 더하는 섬세한 설계', '첫 향부터 마지막 잔향까지 섬세하게 이어져 시간이 흐를수록 더욱 깊이 스며드는 리치맨만의 시그니처 무드를 완성합니다.'],
    ['03', '존재감을 완성하는 퍼퓸', '단순히 좋은 향을 머무르게 하는 것을 넘어 나만의 이미지와 분위기를 자연스럽게 표현해 오래 기억되는 존재감을 완성합니다.']],
  // PRODUCT SAFETY: only what the 안전기준 적합확인 신고증명서 (신고번호 HB26-12-0386) states. Not a skin / cosmetics certification and not a government guarantee of safety.
  safety: {
    name: 'Product Safety', head: ['일상에 더하는 향,', '믿고 쓰실 수 있도록'],
    desc: '임페투스 리치맨은 안전기준 적합확인 신고를 완료한 실내·섬유용 방향제입니다.',
    note: '사용 전 제품에 표시된 사용방법과 주의사항을 확인하고 준수해 주세요.',
    img: 'opt/safety-report.webp', imgW: 1476, imgH: 2080,
    alt: '안전기준 적합확인 신고증명서. 신고번호 HB26-12-0386, 제품명 임페투스 리치맨(IMPETVS RICH MAN), 품목 방향제, 2026년 10월 02일 한국환경산업기술원 발급',
    cap: '안전기준 적합확인 신고증명서 (신고번호 HB26-12-0386) · 담당자 개인 연락처는 가림 처리했습니다.',
  },
  // Home-page intro reviews supplied by the brand. They are NOT member reviews from the database (those live on the product page) and carry no purchase proof, rating or date.
  reviews: [
    { n: '01', who: '이** (25세, 디자이너)', lines: ['처음엔 향이 진한가 걱정했는데, 오히려 그게 장점이에요!', '한번만 뿌려도 저녁까지 향이 그대로라서 너무 만족하면서 쓰고 있어요.'] },
    { n: '02', who: '이** (31세, 마케터)', lines: ['맨날 쓰던 향이 좀 질려서 바꿔봤는데 생각보다 마음에 들어요.', '처음엔 약속 있는 날만 썼는데 요즘은 그냥 출근할 때도 쓰고 있어요.'] },
    { n: '03', who: '김** (32세, 영상PD)', lines: ['너무 달달한 향은 별로 안 좋아하는데 이건 그런 느낌이 덜해서 좋아요.', '많이 뿌리면 저한텐 좀 진해서 양을 줄여 쓰고 있는데 그 정도가 딱 맞네요.'] },
  ],
  stmtHead: ['향으로 완성되는', '당신의 존재감'],
  stmt: [['IMPETVS는 향을 넘어,'], ['당신만의 분위기와 인상을 완성합니다.', 1], null, ['조용히 스며들지만'], ['쉽게 잊히지 않는 깊은 여운으로'], ['평범한 일상에도'], ['당신만의 특별한 존재감을 더해보세요.', 1], null, ['이제,'], ['IMPETVS로 오래 기억 될', 1], ['당신의 향을 만나보세요.', 1]],
  how: [[['귀 뒤와 손목처럼'], ['체온이 느껴지는 곳에', 1], ['가볍게 분사', 1, '해주세요.']], [['헤어 끝에도 은은하게 더하면,', 1], ['IMPETVS의 깊은 잔향을'], ['더욱 오래 느낄 수 있습니다.']]],
  quotes: [['THE SCENT OF QUIET CONFIDENCE.', 'DEEP, REFINED, UNSHAKEN.', 'MADE FOR A MAN OF PRESENCE.'], ['NEVER LOUD. ALWAYS NOTICED.', 'DEEP WOODS, SOFTENED BY SMOKE.', 'THE ESSENCE OF QUIET LUXURY.']],
  // 상품 정보 제공고시: the owner's 30ml notice, verbatim. It is NOT stated for the 50ml option (no 50ml data supplied yet).
  infoNote: '※ 아래 고시는 30ml 제품 기준입니다.',
  info: [
    ['품목 및 제품명', '방향제 / 임페투스 리치맨(IMPETVS RICH MAN)'], ['용량', '30ml'], ['용도 및 제형', '일반용(실내공간용, 섬유용) / 분무기형'],
    ['제조연월', '개별 제품의 제조연월은 제품에 별도 표시되어 있습니다.'], ['유통기한', '제조일로부터 36개월'], ['제조자 및 제조국', '열정의시간 / 대한민국'],
    ['어린이보호포장 대상 제품 유무', '비대상'],
    ['사용방법', '의류 및 섬유에 20~30cm 정도 거리를 두고 적당량 분사하여 사용하십시오.'],
    ['사용 물질', '주요물질: 베이스(에탄올 등), 향료(리날로올 등)\n알레르기물질: 리날로올, 부틸페닐메틸프로피오날, 시트랄, 시트로넬롤, 제라니올'],
    ['사용상 주의사항 및 응급처치', '피부가 민감하거나 손상된 사람은 제품을 장기간 접촉하지 않도록 주의하시오. 용기를 던지거나 떨어뜨리지 마시오.\n피부자극 반응 또는 붉은 반점이 나타나면 의학적 조치를 받으시오.'],
    ['안전기준 적합확인 신고번호', 'HB26-12-0386'], ['소비자상담 전화번호', '0507-1372-9152'],
    ['품질보증기준', '본 제품에 이상이 있을 경우 공정거래위원회 고시에 의거 보상해 드립니다.']],
  co: window.IMShop.company,  // business details live in shop.js (one source for the home page and every shop page)
  footService: [['비회원 주문 조회', 'guest-order.html'], ['교환 및 반품', 'returns.html'], ['자주 묻는 질문', 'faq.html'], ['1:1 문의하기', 'contact.html']],
  footLegal: [['공지사항', 'notices.html'], ['이용약관', 'terms.html'], ['개인정보처리방침', 'privacy.html']],
};

const Ln = ({ a }) => a.map((x, i) => <React.Fragment key={i}>{i > 0 && <br />}{x}</React.Fragment>);
const HowP = ({ p, className }) => <p className={className}>{p.map(([t, b, rest], i) => <React.Fragment key={i}>{i > 0 && <br />}{b ? <b>{t}</b> : t}{rest || ''}</React.Fragment>)}</p>;
const _DS = window.WantedDesignSystem_beb8d1 || {};
function DBtn({ label = '구매하기', variant = 'solid', color = 'primary', size = 'lg', style, className }) {
  const B = _DS.ButtonButton;
  return B ? <B variant={variant} color={color} size={size} label={label} style={style} className={className} /> : <button>{label}</button>;
}
function DIc({ n, size = 24, color = 'currentColor' }) {
  const C = _DS['IconNormal' + n];
  return C ? <C style={{ color, width: size, height: size }} /> : null;
}
Object.assign(window, { IM, Ln, HowP, DBtn, DIc });
