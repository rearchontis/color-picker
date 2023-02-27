export class ColorConverter {
    red: number;
    green: number;
    blue: number;

    constructor({ red, green, blue }: Record<string, number>) {
        this.red = red;
        this.green = green;
        this.blue = blue;
    }

    hsl2rgb({ hue, saturation, lightness }: Record<string, number>) {
        saturation /= 100;
        lightness /= 100;
        const k = (n: number) => (n + hue / 30) % 12;
        const a = saturation * Math.min(lightness, 1 - lightness);

        const f = (n: number) => {
            return lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        }

        return {
            red: Math.round(255 * f(0)),
            green: Math.round(255 * f(8)),
            blue: Math.round(255 * f(4)),
        };
    }

    
}