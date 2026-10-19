import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { StationKind } from "../content/dishes";
import type * as sim from "../sim/engine";
import { computeLayout, type Layout } from "./layout";
import type { Playfield, SceneHooks } from "./scene";

export type PlayfieldInput = Omit<SceneHooks, "ready">;
/**
 * Measures the container, boots Phaser lazily (game code only loads on this screen), keeps the scene's layout in step
 * with resizes (including ones during asset loading) and destroys the game on unmount or reboot.
 */
export function usePlayfield(runRef: MutableRefObject<sim.Run>, seats: number, stations: StationKind[], art: Record<string, string>,
  look: { reduced: boolean; tapOnly: boolean }, input: MutableRefObject<PlayfieldInput>, onReady: () => void) {
  const rootRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Playfield | null>(null), gameRef = useRef<{ destroy(b: boolean): void } | null>(null);
  const [L, setL] = useState<Layout | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const [boot, setBoot] = useState(0);
  const key = stations.join(",");
  // Reduce motion and tap only can change from the pause menu; the running scene follows them.
  const lookRef = useRef(look);
  useEffect(() => { lookRef.current = look; const sc = sceneRef.current; if (sc) { sc.reduced = look.reduced; sc.tapOnly = look.tapOnly; } }, [look.reduced, look.tapOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { layoutRef.current = L; }, [L]);
  useEffect(() => {
    const el = rootRef.current; if (!el) return;
    const measure = () => setL(computeLayout(el.clientWidth, el.clientHeight, seats, stations));
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, [seats, key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!layoutRef.current || gameRef.current || !stageRef.current) return;
    let cancelled = false;
    (async () => {
      const Phaser = await import("phaser"), { Playfield: Scene } = await import("./scene");
      const lay = layoutRef.current;
      if (cancelled || !stageRef.current || !lay) return;
      const hooks: SceneHooks = {
        ready: () => { const sc = sceneRef.current, now = layoutRef.current; if (sc && now && sc.L !== now) sc.setLayout(now); onReady(); },
        onStation: (k: StationKind) => input.current.onStation(k), onPlate: (i: number) => input.current.onPlate(i), onGuest: (id: string) => input.current.onGuest(id),
        onServeDrag: (i: number, id: string) => input.current.onServeDrag(i, id), onPlateDrag: (k: StationKind) => input.current.onPlateDrag(k),
      };
      const game = new Phaser.Game({ type: Phaser.AUTO, parent: stageRef.current, width: lay.w, height: lay.h, transparent: true, banner: false,
        scale: { mode: Phaser.Scale.NONE }, render: { antialias: true }, input: { activePointers: 2 } });
      game.scene.add("playfield", Scene, true, { run: runRef.current, layout: lay, art, hooks, reduced: lookRef.current.reduced, tapOnly: lookRef.current.tapOnly });
      sceneRef.current = game.scene.getScene("playfield") as Playfield; gameRef.current = game;
      if (process.env.NODE_ENV !== "production") (globalThis as { __rushHour?: unknown }).__rushHour = { game, run: () => runRef.current, layout: () => layoutRef.current };
    })();
    return () => { cancelled = true; };
  }, [L !== null, boot]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (L && sceneRef.current?.sys?.isActive()) sceneRef.current.setLayout(L); }, [L]);
  useEffect(() => () => { gameRef.current?.destroy(true); gameRef.current = null; }, []);

  /** Destroys the current game and boots a fresh one for a new run. */
  const reboot = () => { gameRef.current?.destroy(true); gameRef.current = null; sceneRef.current = null; setBoot(b => b + 1); };
  return { rootRef, stageRef, sceneRef, layoutRef, L, reboot };
}
