import { useSwipeable } from 'react-swipeable';
import { useCallback, useEffect } from 'react';

let moveThreshold: number = 0;

interface Actions {
  ArrowLeft: () => void;
  ArrowRight: () => void;
  ArrowUp: () => void;
  ArrowDown: () => void;
  Space: () => void;
  SwipeLeft: () => void;
  SwipeRight: () => void;
  SwipeUp: () => void;
  SwipeDown: () => void;
}


export function useControls(actions: Actions) {

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Leave keys alone inside dialogs, and let Space activate focused controls
    const el = event.target instanceof Element ? event.target : null
    if (el?.closest('[role="dialog"]')) return;
    if (event.key === " " && el?.closest('a, button, input, textarea, select')) return;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        actions["ArrowLeft"]();
        break;
      case "ArrowRight":
        event.preventDefault();
        actions["ArrowRight"]();
        break;
      case "ArrowUp":
        event.preventDefault();
        actions["ArrowUp"]();
        break;
      case "ArrowDown":
        event.preventDefault();
        actions["ArrowDown"]();
        break;
      case " ":
        event.preventDefault();
        actions["Space"]();
        break;
      default: break;
    }
  }, [actions]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => { document.removeEventListener('keydown', handleKeyPress); };
  }, [handleKeyPress]);

  const successiveThresholds: number = 50;

  const gestureHandlers = useSwipeable({
    onSwiping: (SwipeEventData) => {
      if (SwipeEventData.first) { moveThreshold = 0; }
      if (SwipeEventData.absX > moveThreshold || SwipeEventData.absY > moveThreshold) {
        if (SwipeEventData.first) { moveThreshold = Math.min(150, window.innerWidth * 0.25); }
        else { moveThreshold = moveThreshold + successiveThresholds; }
        switch (SwipeEventData.dir) {
          case 'Left': actions["SwipeLeft"](); break;
          case 'Right': actions["SwipeRight"](); break;
          case 'Up': actions["SwipeUp"](); break;
          case 'Down': actions["SwipeDown"](); break;
        }
      }
    },
    swipeDuration: 500,
    preventScrollOnSwipe: true,
  });

  return gestureHandlers;
}