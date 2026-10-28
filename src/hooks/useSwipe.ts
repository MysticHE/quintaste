import type { GestureResponderEvent, ViewProps } from "react-native";

type Movement = { dx: number; dy: number; ms: number };
/** How far the touch has moved since it went down, from the responder's touch history (so nothing is kept between renders). */
function movement(event: GestureResponderEvent): Movement | null {
  const { touchBank, indexOfSingleActiveTouch } = event.touchHistory, touch = touchBank[indexOfSingleActiveTouch];
  if (!touch) return null;
  return { dx: touch.currentPageX - touch.startPageX, dy: touch.currentPageY - touch.startPageY, ms: Math.max(1, touch.currentTimeStamp - touch.startTimeStamp) };
}
const sideways = ({ dx, dy }: Movement) => Math.abs(dx) > Math.abs(dy) * 1.5;

/**
 * Responder props for a View that turns a clear sideways swipe into `onNext` (swipe left) or `onPrevious` (swipe right). It only
 * claims mostly horizontal one-finger moves, so the page still scrolls up and down and taps on buttons inside still work. Distance
 * is measured from where the finger went down, so a re-render during the swipe changes nothing.
 */
export function useSwipe(onNext: () => void, onPrevious: () => void): ViewProps {
  const settle = (event: GestureResponderEvent) => {
    const moved = movement(event);
    if (!moved || !sideways(moved)) return;
    const speed = moved.dx / moved.ms;
    if (moved.dx < -60 || (moved.dx < -20 && speed < -0.5)) onNext();
    else if (moved.dx > 60 || (moved.dx > 20 && speed > 0.5)) onPrevious();
  };
  return {
    onMoveShouldSetResponder: event => {
      const moved = movement(event);
      return event.touchHistory.numberActiveTouches === 1 && !!moved && Math.abs(moved.dx) > 12 && sideways(moved);
    },
    // Keep the swipe once it has started; if the system takes it anyway (a native scroll view), a clear sideways swipe still counts.
    onResponderTerminationRequest: () => false,
    onResponderRelease: settle,
    onResponderTerminate: settle,
  };
}
