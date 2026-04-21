import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const SplitScreen: React.FC<{
    leftContent: string;
    rightBulletPoints: string[];
    bgColor: string;
}> = ({ leftContent, rightBulletPoints, bgColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const slideIn = spring({
        frame,
        fps,
        from: -100,
        to: 0
    });

    return (
        <AbsoluteFill style={{ backgroundColor: bgColor, flexDirection: 'row' }}>
            {/* Left Side - Visual Hook */}
            <div style={{
                flex: 1,
                backgroundColor: '#222',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 80,
                transform: `translateX(${slideIn}%)`
            }}>
                {leftContent}
            </div>

            {/* Right Side - Info */}
            <div style={{
                flex: 1,
                padding: 60,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}>
                {rightBulletPoints.map((point, i) => (
                    <div key={i} style={{
                        fontSize: 40,
                        marginBottom: 30,
                        opacity: frame > (30 + i * 20) ? 1 : 0,
                        transform: `translateY(${frame > (30 + i * 20) ? 0 : 20}px)`,
                        transition: 'all 0.5s'
                    }}>
                        • {point}
                    </div>
                ))}
            </div>
        </AbsoluteFill>
    );
};
