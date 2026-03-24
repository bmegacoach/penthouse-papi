"use client";

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";

// ── HelloWorld ──────────────────────────────────────────────────────

export const HelloWorld: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontSize: 100, textAlign: "center" }}>
        Hello Penthouse Papi!
      </div>
    </AbsoluteFill>
  );
};

// ── DynamicKinetic ──────────────────────────────────────────────────

export interface DynamicKineticProps {
  title: string;
  subtitle: string;
  accentColor: string;
}

export const DynamicKinetic: React.FC<DynamicKineticProps> = ({ title, subtitle, accentColor }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 30], [0.8, 1], {
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
      <div style={{
        color: "white",
        fontSize: 120,
        fontWeight: "bold",
        textAlign: "center",
        transform: `scale(${scale})`,
        opacity,
      }}>
        {title.toUpperCase()}
      </div>
      <div style={{
        color: accentColor,
        fontSize: 60,
        marginTop: 40,
        opacity: interpolate(frame, [15, 45], [0, 1]),
      }}>
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};

// ── SplitScreen ─────────────────────────────────────────────────────

export interface SplitScreenProps {
  leftContent: string;
  rightBulletPoints: string[];
  bgColor: string;
}

export const SplitScreen: React.FC<SplitScreenProps> = ({ leftContent, rightBulletPoints, bgColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({
    frame,
    fps,
    from: -100,
    to: 0,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, flexDirection: "row" }}>
      <div style={{
        flex: 1,
        backgroundColor: "#222",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 80,
        transform: `translateX(${slideIn}%)`,
      }}>
        {leftContent}
      </div>
      <div style={{
        flex: 1,
        padding: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        {rightBulletPoints.map((point, i) => (
          <div key={i} style={{
            fontSize: 40,
            marginBottom: 30,
            opacity: frame > (30 + i * 20) ? 1 : 0,
            transform: `translateY(${frame > (30 + i * 20) ? 0 : 20}px)`,
          }}>
            {point}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Composition Registry ────────────────────────────────────────────

export interface CompositionConfig {
  id: string;
  label: string;
  component: React.FC<any>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: Record<string, any>;
  editableProps: {
    key: string;
    label: string;
    type: "text" | "color" | "number" | "textarea";
    default: any;
  }[];
}

export const COMPOSITIONS: CompositionConfig[] = [
  {
    id: "HelloWorld",
    label: "Hello World",
    component: HelloWorld,
    durationInFrames: 150,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: {},
    editableProps: [],
  },
  {
    id: "DynamicKinetic",
    label: "Dynamic Kinetic (Vertical)",
    component: DynamicKinetic,
    durationInFrames: 90,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: {
      title: "MARKET CRASH?",
      subtitle: "Real Estate Holds Strong",
      accentColor: "#FFD700",
    },
    editableProps: [
      { key: "title", label: "Title", type: "text", default: "MARKET CRASH?" },
      { key: "subtitle", label: "Subtitle", type: "text", default: "Real Estate Holds Strong" },
      { key: "accentColor", label: "Accent Color", type: "color", default: "#FFD700" },
    ],
  },
  {
    id: "SplitScreen",
    label: "Split Screen",
    component: SplitScreen,
    durationInFrames: 300,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: {
      leftContent: "12% APY",
      rightBulletPoints: ["Backed by Assets", "Monthly Payouts", "No Lock-in"],
      bgColor: "#f0f0f0",
    },
    editableProps: [
      { key: "leftContent", label: "Left Content", type: "text", default: "12% APY" },
      { key: "bgColor", label: "Background Color", type: "color", default: "#f0f0f0" },
    ],
  },
];
