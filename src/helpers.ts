import clone from "ramda/es/clone";
import { Axises } from "./enums";
import { IHex, Keys, IAccumulator } from "./interfaces";

export const buildUrl = (hostname: string, radius: number, port: string | null) => {
    let url = "http";
    const isLocalhost = hostname.includes("localhost");

    if (!isLocalhost) {
      url = `${url}s`;
    }

    url = `${url}://${hostname}`;

    if (isLocalhost && port) {
      url = `${url}:${port}`;
    }

    url = `${url}/${radius}`;

    return url;
}

export const postData = async (url = '', data: IHex[] = []) => {
    // Default options are marked with *
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data)
    });

    return response.json();
}

export const createGrid = (radius: number) => {
    const hexes = [];
    let id = 0;
    const limit = radius - 1;

    for (let x = -limit; x <= limit; x++) {
        let r1 = Math.max(-limit, -x - limit);
        let r2 = Math.min(limit, -x + limit);
        for (let y = r1; y <= r2; y++) {
            id++;
            const z = -x - y;
            hexes.push({ id, x, y, z, width: 0, height: 0, left: 0, top: 0, value: 0 });
        }
    }

    return hexes;
}

export const positionGrid = (hexes: IHex[], radius: number) => {
    const normalizer = normalizeLeft(hexes, radius);

    return hexes.map(hex => {
        let left = flatHexToPixel(hex, radius).x;
        let top = flatHexToPixel(hex, radius).y;
        left += hexCenterToTopLeft(radius).x;
        top += hexCenterToTopLeft(radius).y;
        left += containerCenterToTopLeft(radius).x;
        top += containerCenterToTopLeft(radius).y;
        left += normalizer;

        hex.width = calcWidth(radius);
        hex.height = calcHeight(radius);
        hex.left = left;
        hex.top = top;

        return hex;
    });
}

export const flatHexToPixel = (hex: IHex, radius: number) => {
    const size = 500 / (3 * radius - 1);

    const x = size * (3 / 2 * hex.x)
    const y = size * (Math.sqrt(3) / 2 * hex.x + Math.sqrt(3) * hex.z)
    return { x, y }
}

export const hexCenterToTopLeft = (radius: number) => {
    const size = calcSize(radius);
    const y = size * Math.sqrt(3) / 2

    return { x: 0, y: -y };
}

export const containerCenterToTopLeft = (radius: number) => {
    const size = calcSize(radius);
    const distCoefficient = 2 * radius - 1;
    const x = distCoefficient * size / 2;
    const y = distCoefficient * size * Math.sqrt(3) / 2

    return { x, y };
}

export const normalizeLeft = (hexes: IHex[], radius: number) => {
    const farLeftHex = hexes.find(hex => hex.x === -(radius - 1) && hex.y === radius - 1)!;
    let shift = flatHexToPixel(farLeftHex, radius).x;
    shift += hexCenterToTopLeft(radius).x;
    shift += containerCenterToTopLeft(radius).x;

    return -shift;
}

export const calcWidth = (radius: number) => {
    return calcSize(radius) * 2;
}

export const calcHeight = (radius: number) => {
    return calcSize(radius) * Math.sqrt(3);
}

export const calcSize = (radius: number) => 500 / (3 * radius - 1);

export const getAxis = (key: Keys) => {
    switch (key) {
        case "q":
        case "d":
            return Axises.z;
        case "w":
        case "s":
            return Axises.x;
        case "a":
        case "e":
            return Axises.y;
    }
}

export const getGroupsByAxis = (hexes: IHex[], axis: Axises) => {
    return hexes.reduce((acc, hex: IHex) => {
        if (acc[`${(hex[axis])}`] !== undefined) {
            acc[`${(hex[axis])}`].push(hex);
        } else {
            acc[`${(hex[axis])}`] = [hex];
        }

        return acc;
    }, {} as IAccumulator);
}

export const sortByDirection = (arr: IHex[], key: Keys) => {
    let axis: Axises;
    let dir: number;

    if (["w", "s", "q", "d"].includes(key)) {
        axis = Axises.y;
    } else {
        axis = Axises.z;
    }

    if (["w", "q", "a"].includes(key)) {
        dir = -1;
    } else {
        dir = 1;
    }

    return arr.sort((a, b) => a[axis] > b[axis] ? dir : -dir);
}

/**
 * Shifts given row/column to the left, aggregates neighbouring values if they're equal
 *
 * | before shift < |   after |
 * |            2 2 | 4       |
 * |          2 2 2 | 4 2     |
 * |          2 2 4 | 4 4     |
 * |          4 2 2 | 4 4     |
 * |        2 4 2 4 | 2 4 2 4 |
 * |        2 2 4 4 | 4 8     |
 */
export const shiftLeftAndAggregate = (arr: IHex[]): { data: IHex[]; isShifted: boolean; } => {
    let isShifted = false;
    let j = 0;

    for (let i = 1; i < arr.length; i++) {
        if (arr[i].value === 0) {
            // move pointer
        } else if (arr[j].value === 0 && arr[i].value !== 0) {
            arr[j].value = arr[i].value;
            arr[i].value = 0;
            isShifted = true;
        } else if (arr[j].value === arr[i].value) {
            arr[j].value = arr[j].value + arr[i].value;
            arr[i].value = 0;
            j++;
            isShifted = true;
        } else if (arr[j].value !== arr[i].value) {
            if (arr[j + 1].value === 0) {
                arr[j + 1].value = arr[i].value;
                arr[i].value = 0;
                isShifted = true;
            }

            j++;
        }
    }

    return { data: arr, isShifted };
}

export const checkIsPlaying = (hexes: IHex[]) => {
    let isPlaying = false;
    let clonedHexes = clone(hexes);

    outerloop:
    for (const key of ["q", "w", "e", "a", "s", "d"]){
      const axis = getAxis(key as Keys);
      let groups = getGroupsByAxis(clonedHexes, axis);

      for (const group in groups) {
        let column = groups[group];

        column = sortByDirection(column, key as Keys);

        if (shiftLeftAndAggregate(column).isShifted) {
          isPlaying = true;
          break outerloop;
        }
      }
    }

    return isPlaying;
}

export const getFillColor = (num: number) => {
    switch (num) {
        case 2:
            return "#efe5db";
        case 4:
            return "#ece0c8";
        case 8:
            return "#fdb375";
        case 16:
            return "#fe975c";
        case 32:
            return "#fe7b5c";
        case 64:
            return "#fe5a34";
        case 128:
            return "#ffcc4e";
        case 256:
            return "#facc59";
        case 512:
            return "#fdc932";
        case 1024:
            return "#eeb601";
        case 2048:
            return "#fe921a";
        case 4096:
            return "#fe8601";
        default:
            return "none";
    }
}
