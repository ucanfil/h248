import { createGrid } from "./helpers";

describe("should render correct grid based on radius value", () => {
    const radius1 = 2
    const radius2 = 3

    it("should render 7 hexes for radius 2", () => {
        const grid1 = createGrid(radius1);
        expect(grid1.length).toBe(7);
    });

    it("should render 19 hexes for radius 3", () => {
        const grid2 = createGrid(radius2);
        expect(grid2.length).toBe(19);
    });
});
