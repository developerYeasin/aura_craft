const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const make = (paths) => (props) => (
  <svg {...base} {...props}>
    {paths}
  </svg>
);

/* ---------------------------------------------------------------- nav / ui */
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </>
);
export const IconCart = make(
  <>
    <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 8H6" />
    <circle cx="10" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
  </>
);
export const IconUser = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>
);
export const IconHeart = make(<path d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.6C19 15.4 12 20 12 20Z" />);
export const IconMenu = make(
  <>
    <path d="M4 7h16" />
    <path d="M4 12h11" />
    <path d="M4 17h16" />
  </>
);
export const IconClose = make(
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>
);
export const IconArrowRight = make(
  <>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </>
);
export const IconChevronUp = make(<path d="m6 15 6-6 6 6" />);
export const IconChevronRight = make(<path d="m9 6 6 6-6 6" />);
export const IconPlus = make(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
);
export const IconMinus = make(<path d="M5 12h14" />);
export const IconFilter = make(
  <>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </>
);
export const IconGrid = make(
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.6" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" />
  </>
);

/* ------------------------------------------------------------ admin / crud */
export const IconEdit = make(
  <>
    <path d="M4 20h4l10-10-4-4L4 16v4Z" />
    <path d="m14 6 4 4" />
  </>
);
export const IconTrash = make(
  <>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7l1 13h10l1-13" />
  </>
);
export const IconEye = make(
  <>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.6" />
  </>
);
export const IconLogout = make(
  <>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 8 6 12l4 4" />
    <path d="M6 12h10" />
  </>
);
export const IconDashboard = make(
  <>
    <rect x="4" y="4" width="7" height="9" rx="1.6" />
    <rect x="13" y="4" width="7" height="5" rx="1.6" />
    <rect x="13" y="11" width="7" height="9" rx="1.6" />
    <rect x="4" y="15" width="7" height="5" rx="1.6" />
  </>
);
export const IconFolder = make(<path d="M4 7a2 2 0 0 1 2-2h3l2 2.4h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />);
export const IconReceipt = make(
  <>
    <path d="M6 3h12v18l-2.4-1.6L13.2 21l-2.4-1.6L8.4 21 6 19.4V3Z" />
    <path d="M9.5 8h5" />
    <path d="M9.5 12h5" />
  </>
);
export const IconUsers = make(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9" />
    <path d="M17.5 14.2A5.6 5.6 0 0 1 21 20" />
  </>
);
export const IconSettings = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.3-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>
);
export const IconInfinity = make(
  <path d="M7.5 9a3 3 0 1 0 0 6c2 0 3-1.5 4.5-3s2.5-3 4.5-3a3 3 0 1 1 0 6c-2 0-3-1.5-4.5-3S9.5 9 7.5 9Z" />
);
export const IconStore = make(
  <>
    <path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" />
    <path d="M4 9 5.6 4.6A1 1 0 0 1 6.5 4h11a1 1 0 0 1 .9.6L20 9" />
    <path d="M9 20v-5h6v5" />
  </>
);

/* ----------------------------------------------------------- value / trust */
export const IconShield = make(
  <>
    <path d="M12 3l7 3v5.5c0 4.3-2.9 8.1-7 9.5-4.1-1.4-7-5.2-7-9.5V6l7-3Z" />
    <path d="m9.2 12 2 2 3.6-3.8" />
  </>
);
export const IconGem = make(
  <>
    <path d="m12 20 8-11-3-5H7L4 9l8 11Z" />
    <path d="M4 9h16" />
    <path d="m9 4 3 5 3-5" />
  </>
);
export const IconLock = make(
  <>
    <rect x="5" y="10" width="14" height="10" rx="2.4" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
  </>
);
export const IconTruck = make(
  <>
    <path d="M3 6h10v10H3z" />
    <path d="M13 9h4l3 3v4h-7" />
    <circle cx="7" cy="18" r="1.7" />
    <circle cx="16.5" cy="18" r="1.7" />
  </>
);
export const IconHeadset = make(
  <>
    <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
    <rect x="3" y="13" width="4" height="6" rx="1.6" />
    <rect x="17" y="13" width="4" height="6" rx="1.6" />
    <path d="M20 19v.6a2.4 2.4 0 0 1-2.4 2.4H13" />
  </>
);
export const IconAward = make(
  <>
    <circle cx="12" cy="9" r="5" />
    <path d="m8.5 13.5-1.3 7L12 18l4.8 2.5-1.3-7" />
  </>
);
export const IconHandshake = make(
  <>
    <path d="m11 17-3-3 3.5-3.5a2 2 0 0 1 2.8 0L17 13" />
    <path d="M3 10.5 7 7l4 3.5" />
    <path d="M21 10.5 17 7l-2.5 2" />
    <path d="m13 15 2.5 2.5" />
  </>
);
export const IconChat = make(
  <>
    <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.6A7.5 7.5 0 1 1 20 12Z" />
    <path d="M9 11.5h6" />
    <path d="M9 14.5h3.5" />
  </>
);
export const IconWallet = make(
  <>
    <rect x="3" y="6" width="18" height="13" rx="2.4" />
    <path d="M3 10h18" />
    <circle cx="17" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
  </>
);
export const IconRefresh = make(
  <>
    <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5" />
    <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M20 20v-4.5h-4.5" />
  </>
);
export const IconSparkle = make(
  <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
);
export const IconBadgeCheck = make(
  <>
    <path d="m12 3 2.2 1.7 2.8-.2.5 2.7 2.3 1.6-1.2 2.5 1.2 2.5-2.3 1.6-.5 2.7-2.8-.2L12 21l-2.2-1.7-2.8.2-.5-2.7L4.2 15l1.2-2.5L4.2 10l2.3-1.6.5-2.7 2.8.2L12 3Z" />
    <path d="m9.4 12 1.9 1.9 3.4-3.6" />
  </>
);
export const IconTag = make(
  <>
    <path d="M4 11.5V5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 .7.3l7.5 7.5a1 1 0 0 1 0 1.4l-6.5 6.5a1 1 0 0 1-1.4 0L4.3 12.2a1 1 0 0 1-.3-.7Z" />
    <circle cx="8.5" cy="8.5" r="1.4" />
  </>
);
export const IconBox = make(
  <>
    <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z" />
    <path d="m4 7.2 8 4.3 8-4.3" />
    <path d="M12 11.5V21" />
  </>
);

/* --------------------------------------------------------------- contact */
export const IconPhone = make(
  <path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 12l5 2v4a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 3 5.2 2 2 0 0 1 5 3Z" />
);
export const IconMail = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.4" />
    <path d="m3 7.5 9 6 9-6" />
  </>
);
export const IconPin = make(
  <>
    <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </>
);

/* ---------------------------------------------------------------- social */
export const IconFacebook = make(<path d="M14 8h2V5h-2a4 4 0 0 0-4 4v2H8v3h2v6h3v-6h2.2l.8-3H13V9c0-.6.4-1 1-1Z" />);
export const IconInstagram = make(
  <>
    <rect x="4" y="4" width="16" height="16" rx="5" />
    <circle cx="12" cy="12" r="3.4" />
    <circle cx="17" cy="7" r="0.9" fill="currentColor" />
  </>
);
export const IconYoutube = make(
  <>
    <rect x="3" y="6" width="18" height="12" rx="4" />
    <path d="m11 9.8 4 2.2-4 2.2V9.8Z" fill="currentColor" />
  </>
);
export const IconTwitter = make(<path d="m4 4 7 9-7 7h2.5l5.7-5.7L17 20h3l-7.3-9.4L19.4 4H17l-5.2 5.2L8 4H4Z" />);
export const IconWhatsapp = make(
  <>
    <path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12Z" />
    <path d="M9.2 9.4c-.2 1.6 2.6 5 4.4 5.2.6.1 1.4-.6 1.5-1.2l-1.6-.8-.8.8c-.9-.4-1.7-1.2-2.1-2.1l.8-.8-.8-1.6c-.6.1-1.3.4-1.4.5Z" />
  </>
);

/* ------------------------------------------------------------------ misc */
export const IconStar = (props) => (
  <svg {...base} fill="currentColor" stroke="none" {...props}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
  </svg>
);
export const IconCheck = make(<path d="m5 13 4.5 4.5L19 7" />);
export const IconAlert = make(
  <>
    <path d="M12 4.5 21 20H3l9-15.5Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </>
);
export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>
);
export const IconTrendUp = make(
  <>
    <path d="m4 16 5-5 3.5 3.5L20 7" />
    <path d="M15 7h5v5" />
  </>
);

export const IconBell = make(
  <>
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.4 5.6 2 6.4H4c.6-.8 2-2.4 2-6.4Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </>
);
export const IconBellOff = make(
  <>
    <path d="M8.6 5.6A6 6 0 0 1 18 9c0 4 1.4 5.6 2 6.4H9" />
    <path d="M6.3 9.7C6.1 13 5 14.6 4 15.4h3" />
    <path d="M10 19a2 2 0 0 0 4 0" />
    <path d="m4 4 16 16" />
  </>
);
export const IconVolume = make(
  <>
    <path d="M4 9.5h3L11 6v12l-4-3.5H4Z" />
    <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
    <path d="M17.5 7a7 7 0 0 1 0 10" />
  </>
);
export const IconVolumeOff = make(
  <>
    <path d="M4 9.5h3L11 6v12l-4-3.5H4Z" />
    <path d="m15.5 10 4 4" />
    <path d="m19.5 10-4 4" />
  </>
);

/* Category icon resolver — maps a slug to a real icon, with a sensible default */
const CATEGORY_ICONS = {
  rings: IconGem,
  bracelets: IconInfinity,
  perfume: IconSparkle,
  earrings: IconAward,
  keyring: IconTag,
};
export const categoryIcon = (slug) => CATEGORY_ICONS[slug] || IconBox;

/* ------------------------------------------------------------------- theme */
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" />
  </>,
);
export const IconMoon = make(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />);
