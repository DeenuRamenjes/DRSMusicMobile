// Type declarations for modules without types

declare module 'react-native-vector-icons/Ionicons' {
    import { Component } from 'react';
    import { TextStyle, ViewStyle } from 'react-native';

    export interface IconProps {
        name: string;
        size?: number;
        color?: string;
        style?: TextStyle | ViewStyle;
    }

    export default class Icon extends Component<IconProps> {
        static getImageSource(
            name: string,
            size?: number,
            color?: string,
        ): Promise<any>;
        static loadFont(file?: string): Promise<void>;
        static hasIcon(name: string): boolean;
    }
}

declare module 'react-native-vector-icons/MaterialIcons' {
    import { Component } from 'react';
    import { TextStyle, ViewStyle } from 'react-native';

    export interface IconProps {
        name: string;
        size?: number;
        color?: string;
        style?: TextStyle | ViewStyle;
    }

    export default class Icon extends Component<IconProps> { }
}

declare module 'react-native-vector-icons/FontAwesome' {
    import { Component } from 'react';
    import { TextStyle, ViewStyle } from 'react-native';

    export interface IconProps {
        name: string;
        size?: number;
        color?: string;
        style?: TextStyle | ViewStyle;
    }

    export default class Icon extends Component<IconProps> { }
}

declare module 'react-native-linear-gradient' {
    import { Component } from 'react';
    import { ViewProps, ViewStyle } from 'react-native';

    interface LinearGradientProps extends ViewProps {
        colors: (string | number)[];
        start?: { x: number; y: number };
        end?: { x: number; y: number };
        locations?: number[];
        useAngle?: boolean;
        angle?: number;
        angleCenter?: { x: number; y: number };
        style?: ViewStyle;
        children?: React.ReactNode;
    }

    export default class LinearGradient extends Component<LinearGradientProps> { }
}

declare module 'react-native-sound' {
    export default class Sound {
        static setCategory(category: string, mixWithOthers?: boolean): void;

        constructor(
            filename: string,
            basePath: string | undefined,
            onError?: (error: any) => void
        );

        play(onEnd?: (success: boolean) => void): this;
        pause(callback?: () => void): this;
        stop(callback?: () => void): this;
        release(): void;

        getDuration(): number;
        getCurrentTime(callback: (seconds: number, isPlaying: boolean) => void): void;
        setCurrentTime(seconds: number): this;

        setVolume(value: number): this;
        getVolume(): number;

        setNumberOfLoops(loops: number): this;
        setSpeed(speed: number): this;
        setPan(pan: number): this;

        isLoaded(): boolean;
        isPlaying(): boolean;
    }
}
