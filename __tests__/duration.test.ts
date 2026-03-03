import { parseDuration, formatDuration, getDurationInSeconds } from '../src/utils/duration';

describe('Duration Utils', () => {
    describe('parseDuration', () => {
        it('should return 0 for null and undefined', () => {
            expect(parseDuration(null)).toBe(0);
            expect(parseDuration(undefined)).toBe(0);
        });

        it('should handle numeric values', () => {
            expect(parseDuration(130)).toBe(130);
            expect(parseDuration(3750.5)).toBe(3750);
            expect(parseDuration(NaN)).toBe(0);
            expect(parseDuration(0)).toBe(0);
        });

        it('should handle string values', () => {
            expect(parseDuration("130")).toBe(130);
            expect(parseDuration(" 130 ")).toBe(130);
            expect(parseDuration("2:10")).toBe(130);
            expect(parseDuration("1:02:30")).toBe(3750);
            expect(parseDuration("abc")).toBe(0);
            expect(parseDuration("")).toBe(0);
        });
    });

    describe('formatDuration', () => {
        it('should return 0:00 for null and undefined', () => {
            expect(formatDuration(null)).toBe("0:00");
            expect(formatDuration(undefined)).toBe("0:00");
        });

        it('should return already formatted strings as-is', () => {
            expect(formatDuration("2:10")).toBe("2:10");
            expect(formatDuration("1:02:30")).toBe("1:02:30");
        });

        it('should format numeric seconds correctly', () => {
            expect(formatDuration(45)).toBe("0:45");
            expect(formatDuration(130)).toBe("2:10");
            expect(formatDuration(3600)).toBe("1:00:00");
            expect(formatDuration(3750)).toBe("1:02:30");
        });
    });

    describe('getDurationInSeconds', () => {
        it('should correctly wrap parseDuration', () => {
            expect(getDurationInSeconds(130)).toBe(130);
            expect(getDurationInSeconds("2:10")).toBe(130);
            expect(getDurationInSeconds("1:02:30")).toBe(3750);
            expect(getDurationInSeconds(null)).toBe(0);
        });
    });
});
