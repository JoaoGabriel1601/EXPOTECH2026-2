import { memo } from "react";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  G,
  Path,
  Line,
  Circle,
} from "react-native-svg";

const ARM_LINES = [
  { x1: 0, y1: 8, x2: 0, y2: 230, sw: 13 },
  { x1: 0, y1: 80, x2: 44, y2: 120, sw: 11 },
  { x1: 0, y1: 80, x2: -44, y2: 120, sw: 11 },
  { x1: 0, y1: 155, x2: 36, y2: 190, sw: 10 },
  { x1: 0, y1: 155, x2: -36, y2: 190, sw: 10 },
  { x1: 0, y1: 205, x2: 22, y2: 234, sw: 9 },
  { x1: 0, y1: 205, x2: -22, y2: 234, sw: 9 },
];

function Arm({ color, rotate }) {
  return (
    <G transform={`rotate(${rotate})`}>
      {ARM_LINES.map((l, i) => (
        <Line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={color}
          strokeWidth={l.sw}
          strokeLinecap="round"
        />
      ))}
    </G>
  );
}

const TICKS_MAJOR = [
  [-285, 0, -312, 0],
  [-275, -74, -301, -81],
  [-247, -142, -270, -156],
  [-202, -202, -220, -220],
  [-142, -247, -156, -270],
  [-74, -275, -81, -301],
  [0, -285, 0, -312],
  [74, -275, 81, -301],
  [142, -247, 156, -270],
  [202, -202, 220, -220],
  [247, -142, 270, -156],
  [275, -74, 301, -81],
  [285, 0, 312, 0],
];

function LogoComponent({ size = 96, withBackground = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="logoBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1e2330" />
          <Stop offset="100%" stopColor="#0a0e15" />
        </LinearGradient>
      </Defs>

      {withBackground && (
        <Rect width="1024" height="1024" rx="200" ry="200" fill="url(#logoBg)" />
      )}

      {/* Gauge ring */}
      <G transform="translate(512 520)">
        <Circle r="300" stroke="#a855f7" strokeWidth="14" fill="none" />
        {TICKS_MAJOR.map(([x1, y1, x2, y2], i) => (
          <Line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#a855f7"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        <Line
          x1="0"
          y1="-322"
          x2="0"
          y2="-292"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </G>

      {/* Snowflake */}
      <G transform="translate(512 520)">
        <Arm color="#38bdf8" rotate={30} />
        <Arm color="#38bdf8" rotate={90} />
        <Arm color="#38bdf8" rotate={150} />
        <Arm color="#fb923c" rotate={210} />
        <Arm color="#fb923c" rotate={270} />
        <Arm color="#fb923c" rotate={330} />
      </G>

      {/* Thermometer */}
      <G transform="translate(512 520)">
        <Path
          d="M -28 -210 Q -28 -222 -16 -222 L 16 -222 Q 28 -222 28 -210 L 28 105 A 50 50 0 1 1 -28 105 Z"
          stroke="#fb923c"
          strokeWidth="12"
          fill="#0a0e15"
          strokeLinejoin="round"
        />
        <Rect x="-12" y="-185" width="24" height="325" rx="12" fill="#fb923c" />
        <Circle cx="0" cy="150" r="34" fill="#fb923c" />
      </G>

      {/* Green leaf */}
      <G transform="translate(512 520)">
        <Circle r="22" fill="#0a0e15" stroke="#22c55e" strokeWidth="3" />
        <Path
          d="M -10 8 Q -2 -14 14 -7 Q 14 9 -2 13 Z"
          fill="#22c55e"
        />
      </G>
    </Svg>
  );
}

export const Logo = memo(LogoComponent);
