import Svg, { Circle, Path } from 'react-native-svg';

/** Line icons drawn for Sant Vaani, on a 24-unit grid with round ends. */
const ICONS = {
  today: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </>
  ),
  ask: (
    <>
      <Path d="M4 5h16v11H9l-5 4z" />
      <Path d="M10 9.5a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9v.3M12 14.3h.01" />
    </>
  ),
  scriptures: (
    <>
      <Path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1z" />
      <Path d="M12 6.5V20" />
    </>
  ),
  saints: (
    <>
      <Circle cx="12" cy="10" r="3.2" />
      <Path d="M5.5 21c1.2-3.4 3.6-5 6.5-5s5.3 1.6 6.5 5" />
      <Path d="M8 4.6c1.1-.8 2.5-1.2 4-1.2s2.9.4 4 1.2" />
    </>
  ),
  paths: (
    <>
      <Path d="M7 21c0-4.5 10-3.5 10-8.5S7 8 7 3" />
      <Circle cx="7" cy="3" r="0.6" />
    </>
  ),
  person: (
    <>
      <Circle cx="12" cy="8.5" r="3.5" />
      <Path d="M5 20c1.3-3.6 3.9-5.5 7-5.5s5.7 1.9 7 5.5" />
    </>
  ),
  chevron: <Path d="M9 5l7 7-7 7" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  bookmark: <Path d="M6.5 3.5h11v17L12 16.2l-5.5 4.3z" />,
  share: (
    <>
      <Path d="M12 3.5v11M7.5 8L12 3.5 16.5 8" />
      <Path d="M5 12.5v7h14v-7" />
    </>
  ),
  mic: (
    <>
      <Path d="M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3z" />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3" />
    </>
  ),
  phone: (
    <Path d="M6.6 3.5h2.9l1.5 4.3-2 1.4a11.5 11.5 0 0 0 5.8 5.8l1.4-2 4.3 1.5v2.9a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />
  ),
  bell: (
    <>
      <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
      <Path d="M10 20.5h4" />
    </>
  ),
  note: (
    <>
      <Path d="M4.5 19.5l1-4.2L16 4.8a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5z" />
      <Path d="M14 6.8l3.2 3.2" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  color,
  size = 22,
  strokeWidth = 1.6,
  filled = false,
}: {
  name: IconName;
  color: string;
  size?: number;
  strokeWidth?: number;
  /** Fills the shape too, for a chosen state such as a saved bookmark. */
  filled?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {ICONS[name]}
    </Svg>
  );
}

/** The solid triangle on play buttons. */
export function PlayIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d="M7 4.5v15l12.5-7.5z" fill={color} />
    </Svg>
  );
}
