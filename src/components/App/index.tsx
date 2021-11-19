import React, { useCallback, useEffect, useState } from "react";

type IQueryParams = {
  port: string;
  hostname: string;
  radius: number;
}

type IGrid = {
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

type IGame = {
  setHexes: (arr: IHex[]) => void;
  hexes: IHex[];
  radius: number;
}

type Keys = "q" | "w" | "e" | "a" | "s" | "d";

enum Axes {
  x = "x",
  y = "y",
  z = "z",
}

export const App: React.FC = () => {
  // const [radius, setRadius] = useState(2);

  return (
    <div className="App">
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
  const port = params.get("port");
  const radius = parseInt(params.get("radius") ?? "2");
  const grid = createGrid(radius);

  const [hexes, setHexes] = useState<IHex[]>(grid);
  const [status, setStatus] = useState<"playing" | "game-over" | "">("");

  const handleKeydown = useCallback((e: KeyboardEvent) => {
    let shifted = false;

    if (!["q", "w", "e", "a", "s", "d"].includes(e.key)) {
      return;
    }

    const axes = getAxes(e.key as Keys);
    const clone = [...hexes];
    let group = groupByAxes(hexes, axes);

    for (const g in group) {
      console.log(g, group[g])
      let column = group[g];

      column = sortByDirection(column, e.key as Keys);
      const shiftedColumn = shift(column);

      shifted = shifted || shiftedColumn.shifted;

      shiftedColumn.data.forEach(hex => {
        clone.forEach((d: IHex) => {
          if (d.x === hex.x && d.y === hex.y && d.z === hex.z) {
            d.value = hex.value;
          }
        });
      });
    }

    const nonEmpty = clone.filter(hex => hex.value !== 0);
    console.log(shifted)

    if (!shifted) {
      return;
    }

    setHexes(clone);

    postData(`http://${hostname}:${port}/${radius}`, nonEmpty)
      .then((data: IHex[]) => {
        const clone: IHex[] = [];

        data.forEach(d => {
          hexes.forEach(hex => {
            if (d.x === hex.x && d.y === hex.y && d.z === hex.z) {
              hex.value = d.value;
            }

            clone.push(hex);
          });
        });

        // FIXME:
        // if (empty.length) return;
        setHexes(clone);
      });
  }, []);

  useEffect(() => {
    console.log(">>>>> useEffect started ");
    // const grid = createGrid(radius);

    // Initial request to server
    postData(`http://${hostname}:${port}/${radius}`)
      .then((data: IHex[]) => {
        console.log(" Initial request to server");

        const hexesWithValue = hexes.map(hex => {
          data.forEach((d: IHex) => {
            if (d.x === hex.x && d.y === hex.y && d.z === hex.z) {
              hex.value = d.value;
            }
          });

          return hex;
        });

        setHexes(hexesWithValue);
        setStatus("playing");
      })
      .catch(err => console.log(err));
    // console.log(">>>>> useEffect finished ", { grid });
    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    }
  }, [handleKeydown]);

  return (
    <>
      <div className="game">
        {hexes.map((hex, i) => {
          let x = flat_hex_to_pixel(hex, radius).x;
          let y = flat_hex_to_pixel(hex, radius).y;
          x += hexCenterToTopLeft(radius).x;
          y += hexCenterToTopLeft(radius).y;
          x += containerCenterToTopLeft(radius).x;
          y += containerCenterToTopLeft(radius).y;

          return (
            <div
            // FIXME:
              key={`${new Date().getTime() * i}`}
              className="hex"
              data-x={hex.x}
              data-y={hex.y}
              data-z={hex.z}
              data-value={hex.value}
              style={{
                width: `${calcWidth(radius)}px`,
                height: `${calcHeight(radius)}px`,
                top: `${y}px`,
                left: `${x}px`
              }}
            >
              <HexBg fill={getFillColor(hex.value)}/>
              <span className="hexvalue">{hex.value !== 0 ? hex.value : null}</span>
            </div>
          )
        })}

      </div>
      <div data-status={status}>
        <strong>Game status:</strong> {status}
      </div>
    </>
  );
}

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
  const coords = [];
  // FIXME:
  radius = radius - 1;

  for (let x = -radius; x <= radius; x++) {
    let r1 = Math.max(-radius, -x - radius);
    let r2 = Math.min(radius, -x + radius);
    for (let y = r1; y <= r2; y++) {
        const z = -x-y;
        coords.push({ x, y, z, value: 0 });
    }
  }

  return coords;
}

function flat_hex_to_pixel(hex: IHex, radius: number) {
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
  const size = 500 / (3 * radius - 1);
  return size * 2;
}

const calcHeight = (radius: number) => {
  const size = 500 / (3 * radius - 1);
  return size * Math.sqrt(3);
}

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

const groupByAxes = (hexes: IHex[], axes: Axes) => {
  return hexes.reduce((acc, hex) => {
    if (acc[`${(hex[axes])}`] !== undefined) {
        acc[`${(hex[axes])}`].push(hex);
    } else {
        acc[`${(hex[axes])}`] = [hex];
    }

    return acc;
    // FIXME:
  }, {} as any);
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
