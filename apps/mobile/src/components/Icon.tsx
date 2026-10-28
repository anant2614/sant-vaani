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
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  color,
  size = 22,
  strokeWidth = 1.6,
}: {
  name: IconName;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
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
