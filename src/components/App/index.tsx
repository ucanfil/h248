import React, { useCallback, useEffect, useState } from "react";
import clone from "ramda/es/clone";

type IQueryParams = {
  port: string;
  hostname: string;
  radius: number;
}

type IGrid = {
  id: number;
  x: number;
  y: number;
  z: number;
}

type IHex = {
  value: number;
} & IGrid;

type ISetHexes = {
  setRadius: (radius: number) => void;
  radius: number;
}

type Keys = "q" | "w" | "e" | "a" | "s" | "d";

type IAccumulator = {
  [key: string]: IHex[]
}

type IGame = {
  setHexes: (arr: IHex[]) => void;
  hexes: IHex[];
  radius: number;
}

enum Axes {
  x = "x",
  y = "y",
  z = "z",
}

export const App: React.FC = () => {
  // const [radius, setRadius] = useState(2);

  return (
    <div className="App"  onKeyDown={(e) => console.log(e.key)}>
      {/* {hexes.length === 0 ?
        <GameSettings setRadius={setRadius} radius={radius} /> : */}
        <Game />
      {/* } */}
    </div>
  );
}

const Game = () => {
  const params = new URLSearchParams(window.location.search);
  const hostname = params.get("hostname");
  const port = params.get("port") ?? "80";
  const radius = parseInt(params.get("radius") ?? "2");
  const grid = createGrid(radius);

  const [hexes, setHexes] = useState<IHex[]>(grid);
  const [status, setStatus] = useState<"playing" | "game-over" | "">("");

  const isPlaying = useCallback((hexes) => {
    let isPlaying = false;

    let clonedHexes = clone(hexes);

    outerloop:
    for (const key of ["q", "w", "e", "a", "s", "d"]){
      const axes = getAxes(key as Keys);
      let groups = groupsByAxes(clonedHexes, axes);

      for (const group in groups) {
        let column = groups[group];

        column = sortByDirection(column, key as Keys);

        if (shift(column).shifted) {
          isPlaying = true;
          break outerloop;
        }
      }
    }

    return isPlaying;
  }, []);

  const getHexesData = useCallback(async (hexes: IHex[]) => {
    const nonEmpty = hexes.filter(hex => hex.value !== 0);

    const data = await postData(`http://${hostname}:${port}/${radius}`, nonEmpty)
        .then((data: IHex[]) => {
          const hexesWithValue = clone(hexes).map(hex => {
            data.forEach((d: IHex) => {
              if (d.x === hex.x && d.y === hex.y && d.z === hex.z) {
                hex.value = d.value;
              }
            });

            return hex;
          });

          return hexesWithValue;
        });

    return data;
  }, [hostname, port, radius]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!["q", "w", "e", "a", "s", "d"].includes(e.key)) {
        return;
      }

      let shifted = false;

      const cloned: IHex[] = clone(hexes);
      const axes = getAxes(e.key as Keys);
      let groups = groupsByAxes(cloned, axes);

      for (const group in groups) {
        let column = groups[group];

        column = sortByDirection(column, e.key as Keys);
        const shiftedColumn = shift(column);

        shifted = shifted || shiftedColumn.shifted;

        shiftedColumn.data.forEach(d => {
          cloned.forEach((hex: IHex) => {
            if (hex.x === d.x && hex.y === d.y && hex.z === d.z) {
              hex.value = d.value;
            }
          });
        });
      }

      if (!shifted) {
        return;
      }

      setHexes(cloned);

      getHexesData(cloned)
        .then(hexes => {
          setHexes(hexes);
          setStatus(isPlaying(hexes) ? "playing" : "game-over");
        })
        .catch(err => console.log(err));
    };

    console.log(">>>>> handleKeydown useEffect started ");

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    }
  }, [hexes, hostname, port, radius, isPlaying, getHexesData]);

  // Initial request to server
  useEffect(() => {
    getHexesData(hexes)
      .then(hexes => {
        setHexes(hexes);
        setStatus(isPlaying(hexes) ? "playing" : "game-over");
      })
      .catch(err => console.log(err));
  }, []);

  return (
    <>
      <div className="game">
        {hexes.map(hex => {
          let left = flatHexToPixel(hex, radius).x;
          let top = flatHexToPixel(hex, radius).y;
          left += hexCenterToTopLeft(radius).x;
          top += hexCenterToTopLeft(radius).y;
          left += containerCenterToTopLeft(radius).x;
          top += containerCenterToTopLeft(radius).y;

          return (
            <Hex
              key={hex.id}
              hex={hex}
              radius={radius}
              top={top}
              left={left}
            />
          )
        })}

      </div>
      <div className="status" data-status={status}>
        <strong>Game status:</strong> {status}
      </div>
    </>
  );
}

const Hex = ({ hex, radius, top, left }: { hex: IHex, radius: number, top: number, left: number }) => (
  <div
    className="hex"
    data-x={hex.x}
    data-y={hex.y}
    data-z={hex.z}
    data-value={hex.value}
    style={{
      width: `${calcWidth(radius)}px`,
      height: `${calcHeight(radius)}px`,
      top: `${top}px`,
      left: `${left}px`
    }}
  >
    <HexBg fill={getFillColor(hex.value)}/>
    <HexValue id={hex.id} value={hex.value}/>
  </div>
);

const HexValue = ({ id, value }: {id: number, value: number}) =>
  <span key={id} className="hexvalue">{value !== 0 ? value : null}</span>

const HexBg = ({ fill }: { fill: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="173.205" viewBox="0 0 200 173.205">
    <g id="Polygon" data-name="Polygon" fill={fill}>
      <path d="M 148.5566253662109 170.7050018310547 L 51.44336700439453 170.7050018310547 L 2.886743783950806 86.60250091552734 L 51.44336700439453 2.500000953674316 L 148.5566253662109 2.500000953674316 L 197.1132507324219 86.60250091552734 L 148.5566253662109 170.7050018310547 Z" stroke="none"/>
      <path d="M 52.88673400878906 5 L 5.77349853515625 86.60250091552734 L 52.88673400878906 168.2050018310547 L 147.1132507324219 168.2050018310547 L 194.2265014648438 86.60250091552734 L 147.1132507324219 5 L 52.88673400878906 5 M 50 0 L 150 0 L 200 86.60250091552734 L 150 173.2050018310547 L 50 173.2050018310547 L 0 86.60250091552734 L 50 0 Z" stroke="none" fill="#707070"/>
    </g>
  </svg>
);

const GameSettings = ({ setRadius, radius }: ISetHexes) => {
  const [port, setPort] = useState("80");
  const [hostname, setHostname] = useState("hex2048szb9jquj-hex15.functions.fnc.fr-par.scw.cloud");

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => setPort(e.target.value);
  const handleHostnameChange = (e: React.ChangeEvent<HTMLInputElement>) => setHostname(e.target.value);
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => setRadius(parseInt(e.target.value));
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(document.location.href, generateQueryParams({ port, hostname, radius }));
    document.location.href = document.location.href + generateQueryParams({ hostname, port, radius });
    // postData(`//${hostname}&port=${port}&radius=${radius}`)
  }

  return (
    <form className="gameSettings" onSubmit={handleFormSubmit}>
      <div>
        <label htmlFor="port">
          <span>Port</span>
          <input id="port" type="text" value={port} onChange={handlePortChange} />
        </label>
        <div className="">
          <span>Example: </span>
          <span className="">80</span>, <span className="">13337</span>
        </div>
      </div>
      <div>
        <label htmlFor="hostname">
          <span>Hostname</span>
          <input id="hostname" type="text" value={hostname} onChange={handleHostnameChange} />
        </label>
        <div className="">
          <span>Example: </span>
          <span className="">hex2048szb9jquj-hex15.functions.fnc.fr-par.scw.cloud</span>, <span className="">localhost</span>
        </div>
      </div>
      <div>
        <label htmlFor="radius">
          <span>Radius {radius}</span>
          <input id="radius" type="range" min="2" max="6" value={radius} onChange={handleRadiusChange} />
        </label>
      </div>
      <button type="submit">Start</button>
    </form>
  );
}

// ============== F U N C T I O N S ==============

async function postData(url = '', data: IHex[] = []) {
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

const generateQueryParams = (obj: IQueryParams) =>
  (Object.keys(obj) as Array<keyof IQueryParams>)
    .filter(key => Boolean(obj[key]))
    .map(key => `${key}=${obj[key]}`)
    .join('&');

const createGrid = (radius: number) => {
  const hexes = [];
  let id = 0;
  const limit = radius - 1;

  for (let x = -limit; x <= limit; x++) {
    let r1 = Math.max(-limit, -x - limit);
    let r2 = Math.min(limit, -x + limit);
    for (let y = r1; y <= r2; y++) {
        id++;
        const z = -x-y;
        hexes.push({ id, x, y, z, value: 0 });
    }
  }

  return hexes;
}

function flatHexToPixel(hex: IHex, radius: number) {
  const size = 500 / (3 * radius - 1);

  const x = size * (3 / 2 * hex.x)
  const y = size * (Math.sqrt(3) / 2 * hex.x  +  Math.sqrt(3) * hex.z)
  return { x, y }
}

const hexCenterToTopLeft = (radius: number) => {
  const size = 500 / (3 * radius - 1);
  const x = size;
  const y = size * Math.sqrt(3) / 2

  return { x: 0, y: -y };
}

const containerCenterToTopLeft = (radius: number) => {
  const size = 500 / (3 * radius - 1); // 100
  const distCoefficient = 2 * radius - 1;
  const x = distCoefficient * size / 2;
  const y = distCoefficient * size * Math.sqrt(3) / 2

  return { x, y };
}

const calcWidth = (radius: number) => {
  return calcSize(radius) * 2;
}

const calcHeight = (radius: number) => {
  return calcSize(radius) * Math.sqrt(3);
}

const calcSize = (radius: number) => 500 / (3 * radius - 1);

const getAxes = (key: Keys) => {
  switch(key) {
    case "q":
    case "d":
      return Axes.z;
    case "w":
    case "s":
      return Axes.x;
    case "a":
    case "e":
      return Axes.y;
  }
}

const groupsByAxes = (hexes: IHex[], axes: Axes) => {
  return hexes.reduce((acc, hex: IHex) => {
    if (acc[`${(hex[axes])}`] !== undefined) {
        acc[`${(hex[axes])}`].push(hex);
    } else {
        acc[`${(hex[axes])}`] = [hex];
    }

    console.log(acc);
    return acc;
  }, {} as IAccumulator);
}

function sortByDirection(arr: IHex[], key: Keys) {
  let axes: Axes;
  let dir: number;

  if (["w", "s", "q", "d"].includes(key)) {
    axes = Axes.y;
  } else {
    axes = Axes.z;
  }

  if (["w", "q", "a"].includes(key)) {
    dir = -1;
  } else {
    dir = 1;
  }

  return arr.sort((a, b) => a[axes] > b[axes] ? dir : -dir);
}

const shift = (arr: IHex[]) => {
  let shifted = false;
  let j = 0;

  for (let i = 1; i < arr.length; i++) {
      if (arr[i].value === 0) {
          // move pointer
      } else if (arr[j].value === 0 && arr[i].value !== 0) {
          arr[j].value = arr[i].value;
          arr[i].value = 0;
          shifted = true;
      } else if (arr[j].value === arr[i].value) {
          arr[j].value = arr[j].value + arr[i].value;
          arr[i].value = 0;
          j++;
          shifted = true;
      } else if (arr[j].value !== arr[i].value) {
          if (arr[j+1].value === 0) {
            arr[j+1].value = arr[i].value;
            arr[i].value = 0;
            shifted = true;
          }

          j++;
      }
  }

  return { data: arr, shifted };
}

const getFillColor = (num: number) => {
  switch(num) {
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
