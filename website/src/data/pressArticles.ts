import coverBocaMagazine from '@/assets/press/cover-boca-magazine.webp';
import coverWallpaper from '@/assets/press/cover-wallpaper.webp';
import coverMonocle from '@/assets/press/cover-monocle.webp';
import coverDezeen from '@/assets/press/cover-dezeen.webp';
import coverKinfolk from '@/assets/press/cover-kinfolk.webp';
import coverCereal from '@/assets/press/cover-cereal.webp';

export interface PressArticle {
  id: string;
  publication: string;
  date: string;
  readTime: string;
  headline: string;
  excerpt: string;
  cover: string;
  body: readonly string[];
}

export const PRESS_ARTICLES: readonly PressArticle[] = [
  {
    id: 'boca-magazine-quiet-architecture',
    publication: 'BOCA Magazine',
    date: 'November 2026',
    readTime: '4 min read',
    headline: 'The Quiet Architecture of Clear Water',
    excerpt:
      'Born in Boca Raton, BOCA Water strips away sleeves, flavors, and ornament—leaving a crystal-clear sparkling mineral vessel built for calm focus.',
    cover: coverBocaMagazine,
    body: [
      'Few hometown launches feel this restrained. Crafted in Boca Raton, BOCA Water arrives without fruit essences, without metallic branding, and without a paper label wrapping the can.',
      'Instead, a 12 fl oz crystal-clear PET cylinder crowned with a solid matte-white seamed lid puts the cold sparkling water directly on display. Tall editorial lettering runs vertically along the transparent wall—BOCA on one side, WATER on the other.',
      'Inside is spring water filtered slowly through deep basalt stone for naturally soft silica texture, paired with 150 mg of Suntheanine L-Theanine calibrated strictly below the threshold of taste. There is zero caffeine and zero bitterness—only crisp carbonation and an unhurried, steady calm.',
      'Offered cleanly as a Single, Six-Pack, or twenty-four can Case, BOCA Water feels less like a passing beverage trend and more like a permanent fixture on the modern South Florida table.',
    ],
  },
  {
    id: 'wallpaper-stripping-everything-off',
    publication: 'Wallpaper*',
    date: 'November 2026',
    readTime: '3 min read',
    headline: 'The Case for Stripping Everything Off the Bottle',
    excerpt:
      'Removing paper labels, tinted glass, and decorative noise lets pure refraction, rising bubbles, and one vertical wordmark define the object.',
    cover: coverWallpaper,
    body: [
      'Most beverage packaging competes by raising its voice. Boca Water arrived at the opposite conclusion: take away the paper sleeve, take away the adhesive, take away the color tint, and let the liquid carry the room.',
      'Housed in a sleek 12 fl oz crystal-clear cylinder beneath an architectural matte-white lid, the vessel reads less like a grocery aisle beverage and more like a studio light study.',
      'Hold it in daylight and fine carbonation suspends light across the entire body. Set it on limestone or dark oak and the silhouette settles effortlessly into its surroundings.',
      'In a category crowded with loud flavors and busy illustrations, radical editorial restraint feels startlingly fresh.',
    ],
  },
  {
    id: 'monocle-quiet-stillness',
    publication: 'Monocle',
    date: 'October 2026',
    readTime: '4 min read',
    headline: 'Quiet Stillness from Boca Raton’s Newest Mineral House',
    excerpt:
      'Designed for the morning desk and the long dinner table, this basalt-filtered sparkling water pairs silky silica with 150 mg of calm L-Theanine.',
    cover: coverMonocle,
    body: [
      'Walk into design studios from Miami to New York this autumn and you will notice a quiet change on the conference table. Replacing the afternoon double espresso is a tall, transparent cylinder chilled to near-freezing.',
      'Filtered slowly through basalt rock for round mineral softness, each 355 mL can delivers 150 mg of pure Suntheanine L-Theanine with zero caffeine and zero synthetic botanicals.',
      'The first sip is pure crisp effervescence; twenty minutes later, the room simply feels quieter and easier to focus in.',
      'Three packs, one formula, and zero clutter—Boca Water treats hydration with the discipline of fine industrial design.',
    ],
  },
  {
    id: 'dezeen-transparent-vessel-white-crown',
    publication: 'Dezeen',
    date: 'October 2026',
    readTime: '3 min read',
    headline: 'How Boca Water Engineered a Transparent Can with a White Crown',
    excerpt:
      'A 2.65-to-1 silhouette, domed optical punt, and crisp matte-white seamed lid turn an everyday sparkling can into a tactile studio object.',
    cover: coverDezeen,
    body: [
      'Industrial designers rarely get a chance to rethink the proportions of a 355 mL beverage can from first principles. Boca Water spent fourteen months refining wall clarity, shoulder radius, and lid contrast.',
      'Rather than defaulting to opaque aluminum that conceals what is inside, the body is molded in crystal-clear recyclable PET with an optically smooth domed base punt.',
      'Topping the transparent cylinder is an architectural matte-white seamed lid and matching pull-tab—providing a decisive horizontal crown above the rising carbonation.',
      'The result bridges two worlds rarely seen together: the chilled ease of a slim can and the optical honesty of fine table glassware.',
    ],
  },
  {
    id: 'kinfolk-living-in-the-clear',
    publication: 'Kinfolk',
    date: 'September 2026',
    readTime: '3 min read',
    headline: 'Living in the Clear: The Return of Unflavored Sparkling Water',
    excerpt:
      'When every drink promises botanical blends and fruit notes, Boca Water makes a quiet argument for tasting nothing but cold mineral clarity.',
    cover: coverKinfolk,
    body: [
      'Over the past decade, sparkling water drifted steadily toward perfume. Berry essences, floral extracts, and sharp citrus aromas began competing with the meals they were meant to accompany.',
      'Boca Water returns sparkling water to its role as a calm palate cleanser. Drawn through basalt layers rich in natural silica, the finish is soft and round rather than metallic.',
      'Paired with delicate fine-bead carbonation and zero sweeteners or flavorings, it sits effortlessly beside morning pastry, a quiet afternoon read, or a late-evening dinner.',
      'Nothing announces itself loudly—which is precisely why it stays within reach all day.',
    ],
  },
  {
    id: 'cereal-basalt-silica-calm-focus',
    publication: 'Cereal',
    date: 'August 2026',
    readTime: '4 min read',
    headline: 'Basalt, Silica, and Calm Focus: Inside the Boca Formula',
    excerpt:
      'Slow geological filtration meets measured clinical L-Theanine in a crystal-clear sparkling mineral water formulated for unhurried concentration.',
    cover: coverCereal,
    body: [
      'Clarity is both an optical quality and a mental state. Boca Water built its formula around bridging the two without borrowing the noisy language of supplements.',
      'Every vessel begins with mineral-balanced spring water shaped by basalt filtration, preserving smooth natural silica that gives the sparkling pour a clean, weightless finish.',
      'To that mineral canvas they add 150 mg of pure Suntheanine L-Theanine—long prized in ceremonial green tea for calm focus—completely decoupled from caffeine, bitterness, or color.',
      'The result tastes unmistakably like pure cold sparkling water while quietly smoothing the sharp edges of a long day.',
    ],
  },
];
