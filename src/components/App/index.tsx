import React, { useCallback, useEffect, useState } from "react";
import clone from "ramda/es/clone";
import { IHex, Keys } from "../../interfaces";
import {
  buildUrl,
  checkIsPlaying,
  createGrid,
  getAxis,
  getFillColor,
  getGroupsByAxis,
  positionGrid,
  postData,
  shiftLeftAndAggregate,
  sortByDirection
} from "../../helpers";

export const App: React.FC = () => (
  <div className="App">
    <Game />
  </div>
);

const Game = () => {
  const params = new URLSearchParams(window.location.search);
  const hostname = params.get("hostname") ?? "hex2048szb9jquj-hex15.functions.fnc.fr-par.scw.cloud";
  const radius = parseInt(params.get("radius") ?? "2");
  const port = params.get("port");
  const grid = createGrid(radius);
  const positionedGrid = positionGrid(grid, radius);

  const [hexes, setHexes] = useState<IHex[]>(positionedGrid);
  const [status, setStatus] = useState<"playing" | "game-over" | "">("");

  const isPlaying = useCallback(checkIsPlaying, []);

  const getHexesData = useCallback(async (hexes: IHex[]) => {
    const nonEmpty = hexes.filter(hex => hex.value !== 0);

    const data = await postData(buildUrl(hostname, radius, port), nonEmpty)
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

  const initializeRound = useCallback((hexes: IHex[]) => {
    getHexesData(hexes)
      .then(hexes => {
        setHexes(hexes);
        setStatus(isPlaying(hexes) ? "playing" : "game-over");
      })
      .catch(err => console.log(err));
  }, [getHexesData, isPlaying]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!["q", "w", "e", "a", "s", "d"].includes(e.key)) {
        return;
      }

      let isShifted = false;

      const cloned: IHex[] = clone(hexes);
      const axes = getAxis(e.key as Keys);
      let groups = getGroupsByAxis(cloned, axes);

      for (const group in groups) {
        let column = groups[group];

        column = sortByDirection(column, e.key as Keys);
        const shiftedColumn = shiftLeftAndAggregate(column);

        isShifted = isShifted || shiftedColumn.isShifted;

        shiftedColumn.data.forEach(d => {
          cloned.forEach((hex: IHex) => {
            if (hex.x === d.x && hex.y === d.y && hex.z === d.z) {
              hex.value = d.value;
            }
          });
        });
      }

      if (!isShifted) {
        return;
      }

      setHexes(cloned);

      initializeRound(cloned);
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    }
  }, [hexes, hostname, port, radius, isPlaying, getHexesData, initializeRound]);

  // Initial request to server
  useEffect(() => {
    initializeRound(hexes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="game">
        {hexes.map(hex => (
          <Hex
            key={hex.id}
            id={hex.id}
            x={hex.x}
            y={hex.y}
            z={hex.z}
            value={hex.value}
            width={hex.width}
            height={hex.height}
            top={hex.top}
            left={hex.left}
          />
        ))}
      </div>
      <div className="status" data-status={status}>
        <strong>Game status:</strong> {status}
      </div>
    </>
  );
}

const Hex = ({ id, x, y, z, value, width, height, top, left }: IHex ) => (
  <div
    className="hex"
    data-x={x}
    data-y={y}
    data-z={z}
    data-value={value}
    style={{
      width: `${width}px`,
      height: `${height}px`,
      top: `${top}px`,
      left: `${left}px`
    }}
  >
    <HexBg fill={getFillColor(value)}/>
    <HexValue id={id} value={value}/>
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
