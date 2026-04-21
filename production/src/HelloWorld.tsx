import { AbsoluteFill } from 'remotion';

export const HelloWorld: React.FC = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: 100, textAlign: 'center' }}>
                Hello Penthouse Papi!
            </div>
        </AbsoluteFill>
    );
};
