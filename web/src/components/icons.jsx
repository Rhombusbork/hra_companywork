// 선 하나 굵기, 한 색 아이콘
const S = ({ size = 18, sw = 1.8, children }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const Star = ({ on }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
export const Search = () => <S><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></S>;
export const Gear = () => (
  <S><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></S>
);
export const Clip = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 11.5l-8.3 8.3a5 5 0 0 1-7.1-7.1l8.7-8.7a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" /></svg>
);
export const Grid = () => <S size={16}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></S>;
export const Dots = () => <S size={18} sw={2.4}><path d="M6 12h.01M12 12h.01M18 12h.01" /></S>;
export const Minus = () => <S size={14} sw={2.6}><path d="M6 12h12" /></S>;
export const Plus = () => <S size={16} sw={2.2}><path d="M12 6v12M6 12h12" /></S>;
export const Move = () => <S size={14} sw={2}><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" /></S>;
