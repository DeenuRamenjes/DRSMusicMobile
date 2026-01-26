import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ViewShot from 'react-native-view-shot';
import { COLORS, FONT_SIZES } from '../constants/theme';
import { ArtworkData } from '../constants/artworkConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH * 0.45, 180);

interface ArtworkPreviewProps {
    data: ArtworkData;
    size?: number;
}

// HSL to hex conversion helper
const hslToHex = (h: number, s: number, l: number): string => {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const ArtworkPreview = forwardRef<ViewShot, ArtworkPreviewProps>(({ data, size = ARTWORK_SIZE }, ref) => {
    const { title, artist, style, baseHue, primaryColor, accentColor } = data;

    // Generate colors based on style and hue
    let color1: string, color2: string, textPrimary: string, textSecondary: string, decorationColor: string;

    switch (style) {
        case 'minimal':
            color1 = primaryColor || '#121212';
            color2 = '#1a1a1a';
            textPrimary = '#ffffff';
            textSecondary = accentColor || hslToHex(baseHue, 70, 65);
            decorationColor = textSecondary;
            break;
        case 'geometric':
            color1 = primaryColor || hslToHex(baseHue, 60, 15);
            color2 = hslToHex((baseHue + 40) % 360, 50, 25);
            textPrimary = '#ffffff';
            textSecondary = accentColor || hslToHex((baseHue + 180) % 360, 70, 75);
            decorationColor = textSecondary;
            break;
        case 'waves':
            color1 = primaryColor || hslToHex(baseHue, 80, 20);
            color2 = hslToHex((baseHue + 60) % 360, 60, 35);
            textPrimary = '#ffffff';
            textSecondary = accentColor || hslToHex((baseHue + 30) % 360, 80, 80);
            decorationColor = textSecondary;
            break;
        case 'neon':
            color1 = primaryColor || '#0a0014';
            color2 = '#1a0028';
            textPrimary = '#ffffff';
            textSecondary = accentColor || hslToHex(baseHue, 100, 60);
            decorationColor = textSecondary;
            break;
        case 'vintage':
            color1 = primaryColor || '#3d2b1f';
            color2 = '#261b13';
            textPrimary = '#f5e6d3';
            textSecondary = accentColor || '#d4a373';
            decorationColor = textSecondary;
            break;
        default: // gradient
            color1 = primaryColor || hslToHex(baseHue, 70, 20);
            color2 = hslToHex((baseHue + 45) % 360, 70, 45);
            textPrimary = '#ffffff';
            textSecondary = accentColor || hslToHex((baseHue + 20) % 360, 60, 80);
            decorationColor = textSecondary;
    }

    const renderDecorations = () => {
        switch (style) {
            case 'geometric':
                return (
                    <>
                        <View style={[styles.decoration, styles.triangle, { borderBottomColor: decorationColor, top: '5%', left: '10%', opacity: 0.3 }]} />
                        <View style={[styles.decoration, styles.diamond, { backgroundColor: decorationColor, top: '45%', right: '5%', opacity: 0.2 }]} />
                        <View style={[styles.decoration, styles.hexLine, { backgroundColor: decorationColor, bottom: '25%', left: '10%', opacity: 0.4 }]} />
                    </>
                );
            case 'waves':
                return (
                    <View style={styles.wavesContainer}>
                        <View style={[styles.wave, { backgroundColor: decorationColor, top: '25%', opacity: 0.2, height: 2 }]} />
                        <View style={[styles.wave, { backgroundColor: decorationColor, top: '45%', opacity: 0.15, height: 2 }]} />
                        <View style={[styles.wave, { backgroundColor: decorationColor, top: '65%', opacity: 0.1, height: 2 }]} />
                    </View>
                );
            case 'minimal':
                return (
                    <>
                        <View style={[styles.minimalLine, { backgroundColor: decorationColor, top: '15%', left: 15, width: '40%', height: 2, opacity: 0.5 }]} />
                        <View style={[styles.minimalLine, { backgroundColor: decorationColor, bottom: '15%', right: 15, width: '30%', height: 2, opacity: 0.5 }]} />
                    </>
                );
            case 'neon':
                return (
                    <View style={[styles.neonBorder, { borderColor: decorationColor, shadowColor: decorationColor }]} />
                );
            case 'vintage':
                return (
                    <View style={[styles.vintageBorder, { borderColor: decorationColor }]} />
                );
            default: // gradient
                return (
                    <>
                        <View style={[styles.circle, { backgroundColor: decorationColor, top: '10%', right: '5%', width: 60, height: 60, opacity: 0.1 }]} />
                        <View style={[styles.circle, { backgroundColor: decorationColor, bottom: '20%', left: '10%', width: 80, height: 80, opacity: 0.05 }]} />
                    </>
                );
        }
    };

    return (
        <ViewShot
            ref={ref}
            options={{ format: 'jpg', quality: 0.9, result: 'tmpfile' }}
            style={{ width: size, height: size }}
        >
            <LinearGradient
                colors={[color1, color2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                {renderDecorations()}

                <View style={styles.textWrapper}>
                    <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>
                        {title || 'New Track'}
                    </Text>
                    <Text style={[styles.artist, { color: textSecondary }]} numberOfLines={1}>
                        {artist || 'Unknown Artist'}
                    </Text>
                </View>
            </LinearGradient>
        </ViewShot>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    textWrapper: {
        alignItems: 'center',
        zIndex: 10,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    artist: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
        textAlign: 'center',
    },
    decoration: {
        position: 'absolute',
    },
    triangle: {
        width: 0,
        height: 0,
        borderLeftWidth: 30,
        borderRightWidth: 30,
        borderBottomWidth: 50,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    diamond: {
        width: 40,
        height: 40,
        transform: [{ rotate: '45deg' }],
    },
    hexLine: {
        width: 50,
        height: 4,
        borderRadius: 2,
    },
    wavesContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    wave: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
    minimalLine: {
        position: 'absolute',
        borderRadius: 1,
    },
    neonBorder: {
        ...StyleSheet.absoluteFillObject,
        margin: 15,
        borderWidth: 2,
        borderRadius: 4,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
    },
    vintageBorder: {
        ...StyleSheet.absoluteFillObject,
        margin: 10,
        borderWidth: 1,
        opacity: 0.3,
    },
    circle: {
        position: 'absolute',
        borderRadius: 100,
    },
});
