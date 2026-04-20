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

// ── ClipCard ────────────────────────────────────────────────────────

export interface ClipCardProps {
  hook: string;
  brand: string;
  accentColor: string;
  platform: string;
}

export const ClipCard: React.FC<ClipCardProps> = ({ hook, brand, accentColor, platform }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideUp = spring({ frame, fps, from: 60, to: 0, config: { damping: 12 } });
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const accentWidth = interpolate(frame, [10, 40], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0F", justifyContent: "center", alignItems: "center", padding: 60 }}>
      <div style={{
        opacity: fadeIn,
        transform: `translateY(${slideUp}px)`,
        textAlign: "center",
        maxWidth: "90%",
      }}>
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 4,
          color: accentColor,
          marginBottom: 30,
          textTransform: "uppercase",
        }}>
          {brand}
        </div>
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: "white",
          lineHeight: 1.1,
          marginBottom: 40,
        }}>
          {hook}
        </div>
        <div style={{
          width: `${accentWidth}%`,
          height: 4,
          backgroundColor: accentColor,
          margin: "0 auto",
          borderRadius: 2,
          boxShadow: `0 0 20px ${accentColor}66`,
        }} />
        <div style={{
          marginTop: 30,
          fontSize: 18,
          color: "#666",
          textTransform: "uppercase",
          letterSpacing: 3,
        }}>
          {platform}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── TalkingPoints ───────────────────────────────────────────────────

export interface TalkingPointsProps {
  headline: string;
  points: string[];
  accentColor: string;
}

export const TalkingPoints: React.FC<TalkingPointsProps> = ({ headline, points, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0F", padding: 80, justifyContent: "center" }}>
      <div style={{
        opacity: headlineOpacity,
        fontSize: 56,
        fontWeight: 900,
        color: "white",
        marginBottom: 50,
        lineHeight: 1.2,
      }}>
        {headline}
      </div>
      {points.map((point, i) => {
        const pointFrame = 25 + i * 18;
        const show = frame >= pointFrame;
        const slideX = show
          ? spring({ frame: frame - pointFrame, fps, from: -30, to: 0, config: { damping: 10 } })
          : -30;
        const opacity = show ? interpolate(frame - pointFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" }) : 0;

        return (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            opacity,
            transform: `translateX(${slideX}px)`,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: accentColor,
              boxShadow: `0 0 12px ${accentColor}88`,
              flexShrink: 0,
            }} />
            <div style={{ fontSize: 36, color: "#E0E0E0", fontWeight: 500 }}>
              {point}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── HookOpener ──────────────────────────────────────────────────────

export interface HookOpenerProps {
  text: string;
  accentColor: string;
}

export const HookOpener: React.FC<HookOpenerProps> = ({ text, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, from: 0.3, to: 1, config: { damping: 8, mass: 0.6 } });
  const glowOpacity = interpolate(frame, [0, 15, 60, 90], [0, 0.8, 0.8, 0], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      backgroundColor: "#0A0A0F",
      justifyContent: "center",
      alignItems: "center",
    }}>
      {/* Glow burst */}
      <div style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}44 0%, transparent 70%)`,
        opacity: glowOpacity,
        transform: `scale(${scale * 2})`,
      }} />
      {/* Text */}
      <div style={{
        fontSize: 96,
        fontWeight: 900,
        color: "white",
        textAlign: "center",
        transform: `scale(${scale})`,
        opacity: textOpacity,
        textShadow: `0 0 40px ${accentColor}66`,
        maxWidth: "85%",
        lineHeight: 1.1,
      }}>
        {text}
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
  {
    id: "ClipCard",
    label: "Clip Card (Vertical)",
    component: ClipCard,
    durationInFrames: 90,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: {
      hook: "Gold just hit $3,200",
      brand: "GBB",
      accentColor: "#FFD700",
      platform: "TikTok",
    },
    editableProps: [
      { key: "hook", label: "Hook Text", type: "text", default: "Gold just hit $3,200" },
      { key: "brand", label: "Brand", type: "text", default: "GBB" },
      { key: "accentColor", label: "Accent", type: "color", default: "#FFD700" },
      { key: "platform", label: "Platform", type: "text", default: "TikTok" },
    ],
  },
  {
    id: "TalkingPoints",
    label: "Talking Points",
    component: TalkingPoints,
    durationInFrames: 180,
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: {
      headline: "Why Gold Outperforms in 2026",
      points: ["Central banks buying record amounts", "Inflation hedge proven over 50 years", "Supply constrained by mining costs"],
      accentColor: "#FFD700",
    },
    editableProps: [
      { key: "headline", label: "Headline", type: "text", default: "Why Gold Outperforms in 2026" },
      { key: "accentColor", label: "Accent", type: "color", default: "#FFD700" },
    ],
  },
  {
    id: "HookOpener",
    label: "Hook Opener (Vertical)",
    component: HookOpener,
    durationInFrames: 90,
    fps: 30,
    width: 1080,
    height: 1920,
    defaultProps: {
      text: "STOP SCROLLING",
      accentColor: "#6C63FF",
    },
    editableProps: [
      { key: "text", label: "Hook Text", type: "text", default: "STOP SCROLLING" },
      { key: "accentColor", label: "Accent", type: "color", default: "#6C63FF" },
    ],
  },
];
