import { registerRoot } from 'remotion';
import { Composition } from 'remotion';
import { HelloWorld } from './HelloWorld';
import { DynamicKinetic } from './DynamicKinetic';
import { SplitScreen } from './SplitScreen';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="HelloWorld"
                component={HelloWorld}
                durationInFrames={150}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="DynamicKinetic"
                component={DynamicKinetic}
                durationInFrames={90}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{
                    title: "MARKET CRASH?",
                    subtitle: "Real Estate Holds Strong",
                    accentColor: "#FFD700"
                }}
            />
            <Composition
                id="SplitScreen"
                component={SplitScreen}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{
                    leftContent: "📈 12% APY",
                    rightBulletPoints: ["Backed by Assets", "Monthly Payouts", "No Lock-in"],
                    bgColor: "#f0f0f0"
                }}
            />
        </>
    );
};
