import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const DynamicKinetic: React.FC<{
    title: string;
    subtitle: string;
    accentColor: string;
}> = ({ title, subtitle, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = interpolate(frame, [0, 30], [0.8, 1], {
        extrapolateRight: 'clamp',
    });

    const opacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: 'clamp',
    });

    return (
        <AbsoluteFill style={{ backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
                color: 'white',
                fontSize: 120,
                fontWeight: 'bold',
                textAlign: 'center',
                transform: `scale(${scale})`,
                opacity
            }}>
                {title.toUpperCase()}
            </div>
            <div style={{
                color: accentColor,
                fontSize: 60,
                marginTop: 40,
                opacity: interpolate(frame, [15, 45], [0, 1])
            }}>
                {subtitle}
            </div>
        </AbsoluteFill>
    );
};
