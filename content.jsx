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
  testHead: ['향도 피부에 닿으니까', '까다롭게 신경썼습니다.'],
  test: { title: '피부 자극 테스트 완료', lines: ['시험기간 : 2022.09.06-2022.09.08', '시험인원 : 만 19세 이상의 성인 남녀 30명 이상', '시험기간 : (주)휴먼에틱 임상시험센터'] },
  revHead: ['임페투스 리치맨', '리얼 리뷰'],
  reviews: ['01', '02', '03'].map(n => ({ n, who: '이** (25세, 디자이너)', lines: ['처음엔 향이 진한가 걱정했는데,오히려 그게 장점이에요!', '한번만 뿌려도 저녁까지 향이 그대로라서 너무만족하면서 쓰고 있어요.'] })),
  stmtHead: ['향으로 완성되는', '당신의 존재감'],
  stmt: [['IMPETVS는 향을 넘어,'], ['당신만의 분위기와 인상을 완성합니다.', 1], null, ['조용히 스며들지만'], ['쉽게 잊히지 않는 깊은 여운으로'], ['평범한 일상에도'], ['당신만의 특별한 존재감을 더해보세요.', 1], null, ['이제,'], ['IMPETVS로 오래 기억 될', 1], ['당신의 향을 만나보세요.', 1]],
  how: [[['귀 뒤와 손목처럼'], ['체온이 느껴지는 곳에', 1], ['가볍게 분사', 1, '해주세요.']], [['헤어 끝에도 은은하게 더하면,', 1], ['IMPETVS의 깊은 잔향을'], ['더욱 오래 느낄 수 있습니다.']]],
  quotes: [['THE SCENT OF QUIET CONFIDENCE.', 'DEEP, REFINED, UNSHAKEN.', 'MADE FOR A MAN OF PRESENCE.'], ['NEVER LOUD. ALWAYS NOTICED.', 'DEEP WOODS, SOFTENED BY SMOKE.', 'THE ESSENCE OF QUIET LUXURY.']],
  info: [
    ['제품명', '임페투스 리치맨'], ['용량', '30ml'], ['사용기한 및 제조일자', '별도표기'],
    ['화장품제조업자', '(주)임페투스/서울 강남구 압구정로10길 30-122F'], ['화장품책임판매업자', '(주)임페투스/서울 강남구 압구정로10길 30-122F'], ['제조국', '대한민국'],
    ['사용방법', '향을 원하는 부위에 10~15cm 거리를 두고 가볍게 분사해 주세요.\n문지르지 않고 그대로 두면 은은한 향을 오래 즐길 수 있습니다.'],
    ['전성분', '변성알코올, 향료, 정제수, 다이프로필렌글라이콜, 부틸렌글라이콜, 벤조트라이아졸릴도데실p-크레솔, 헥실신남알, 리날룰, 시트로넬올, 제라니올, 리모넨, 벤질살리실레이트,하이드록시시트로넬알, 알파-아이소메틸아이오논, 벤질알코올, 아이소유제놀'],
    ['사용시 주의사항', '1. 화장품 사용 시 또는 사용 후 직사광선에 의하여 사용부위가 붉은 반점, 부어오름 또는 가려움증 등의 이상 증상이나 부작용이 있는 경우에는 전문의 등과 상담할 것\n2. 상처가 있는 부위 등에는 사용을 자제할 것\n3. 보관 및 취급시 주의사항\n가. 어린이의 손이 닿지 않는 곳에 보관할 것\n나. 직사광선을 피해서 보관할 것\n다. 사용후에는 반드시 마개를 닫아둘 것'],
    ['품질보증기준', '본 제품에 이상이 있을 경우 공정거래위원회고시\n소비자분쟁해결기준에 의거 보상해 드립니다.'],
    ['고객센터', '0507-1372-9152']],
  company: ['(주)임페투스 · 서울 강남구 압구정로10길 30-122F', '고객센터 0507-1372-9152'],
  ceo: '한동남', biz: '822-27-01430',
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
