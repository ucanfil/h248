export type IGrid = {
    id: number;
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    top: number;
    left: number;
}

export type IHex = {
    value: number;
} & IGrid;

export type Keys = "q" | "w" | "e" | "a" | "s" | "d";

export type IAccumulator = {
    [key: string]: IHex[]
}
