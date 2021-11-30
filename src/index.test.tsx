import { buildUrl, checkIsPlaying, createGrid, shift } from "./helpers";

describe("build URL", () => {
    it("should build url with http protocol for localhost", () => {
        const url = buildUrl("localhost", 2, "13337");
        expect(url).toBe("http://localhost:13337/2");
    });

    it("should build url with https protocol for outer host", () => {
        const url = buildUrl("xxx", 2, "13337");
        expect(url).toBe("https://xxx/2");
    });
})

describe("create grid", () => {
    it("should render 7 hexes for radius 2", () => {
        const radius = 2;
        const grid = createGrid(radius);
        expect(grid.length).toBe(7);
    });

    it("should render 19 hexes for radius 3", () => {
        const radius = 3;
        const grid = createGrid(radius);
        expect(grid.length).toBe(19);
    });
});

describe("shift row", () => {
    const partialProps = {
        id: 0, x: 0, y: 0, z: 0, width: 0, height: 0, top: 0, left: 0
    }

    it("should shift row to the left 02024", () => {
        const arr = [
            { ...partialProps, value: 0 },
            { ...partialProps, value: 2 },
            { ...partialProps, value: 0 },
            { ...partialProps, value: 2 },
            { ...partialProps, value: 4 }
        ];

        const shifted = shift(arr);
        expect(shifted.data[0].value).toBe(4);
        expect(shifted.data[1].value).toBe(4);
        expect(shifted.data[2].value).toBe(0);
        expect(shifted.data[3].value).toBe(0);
        expect(shifted.data[4].value).toBe(0);
    });

    it("should shift row to the left 24024", () => {
        const arr = [
            { ...partialProps, value: 2 },
            { ...partialProps, value: 4 },
            { ...partialProps, value: 0 },
            { ...partialProps, value: 2 },
            { ...partialProps, value: 4 }
        ];

        const shifted = shift(arr);
        expect(shifted.data[0].value).toBe(2);
        expect(shifted.data[1].value).toBe(4);
        expect(shifted.data[2].value).toBe(2);
        expect(shifted.data[3].value).toBe(4);
        expect(shifted.data[4].value).toBe(0);
    });

    it("should shift row to the left 22044", () => {
        const arr = [
            { ...partialProps, value: 2 },
            { ...partialProps, value: 2 },
            { ...partialProps, value: 0 },
            { ...partialProps, value: 4 },
            { ...partialProps, value: 4 }
        ];

        const shifted = shift(arr);
        expect(shifted.data[0].value).toBe(4);
        expect(shifted.data[1].value).toBe(8);
        expect(shifted.data[2].value).toBe(0);
        expect(shifted.data[3].value).toBe(0);
        expect(shifted.data[4].value).toBe(0);
    });
});

describe("check isPlaying", () => {
    const partialProps = {
        id: 0, width: 0, height: 0, top: 0, left: 0
    }

    it("check isPlaying => game-over", () => {
        const hexes = [
            { ...partialProps, x: 0, y: 1, z: -1, value: 2 },
            { ...partialProps, x: 1, y: 0, z: -1, value: 4 },
            { ...partialProps, x: 1, y: -1, z: 0, value: 16 },
            { ...partialProps, x: 0, y: 0, z: 0, value: 128 },
            { ...partialProps, x: 0, y: -1, z: 1, value: 2 },
            { ...partialProps, x: -1, y: 0, z: 1, value: 16 },
            { ...partialProps, x: -1, y: 1, z: 0, value: 8 }
        ];

        expect(checkIsPlaying(hexes)).toBe(false);
    });

    it("check isPlaying => playing", () => {
        const hexes = [
            { ...partialProps, x: 0, y: 1, z: -1, value: 2 },
            { ...partialProps, x: 1, y: 0, z: -1, value: 4 },
            { ...partialProps, x: 1, y: -1, z: 0, value: 16 },
            { ...partialProps, x: 0, y: 0, z: 0, value: 128 },
            { ...partialProps, x: 0, y: -1, z: 1, value: 16 },
            { ...partialProps, x: -1, y: 0, z: 1, value: 16 },
            { ...partialProps, x: -1, y: 1, z: 0, value: 8 }
        ];

        expect(checkIsPlaying(hexes)).toBe(true);
    });
});
