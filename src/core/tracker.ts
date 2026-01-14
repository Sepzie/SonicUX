import type { SelectorInput, PointerHandlers, HoverHandlers } from '../types';

export class Tracker {
  private listeners: Map<HTMLElement, Map<string, EventListener>> = new Map();
  private touchOnly: boolean;

  constructor() {
    this.touchOnly = this.detectTouchOnly();
  }

  // ============================================================================
  // Selector Normalization
  // ============================================================================

  /**
   * Normalize various selector inputs to an array of HTMLElements
   */
  normalizeSelector(selector: SelectorInput): HTMLElement[] {
    if (typeof selector === 'string') {
      return Array.from(document.querySelectorAll<HTMLElement>(selector));
    }

    if (selector instanceof Element) {
      return [selector as HTMLElement];
    }

    if (selector instanceof NodeList) {
      return Array.from(selector) as HTMLElement[];
    }

    if (Array.isArray(selector)) {
      return selector;
    }

    return [];
  }

  // ============================================================================
  // Touch Detection
  // ============================================================================

  /**
   * Detect if device is touch-only (no mouse/pointer)
   */
  private detectTouchOnly(): boolean {
    // Check if device has coarse pointer (touch) and no fine pointer (mouse)
    if (window.matchMedia) {
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      return hasCoarsePointer && !hasFinePointer;
    }

    // Fallback: check for touch support
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  isTouchDevice(): boolean {
    return this.touchOnly;
  }

  // ============================================================================
  // Pointer Events (Click, Drag, Touch)
  // ============================================================================

  /**
   * Attach pointer event handlers to elements
   */
  attachPointerBehavior(elements: HTMLElement[], handlers: PointerHandlers): void {
    elements.forEach(element => {
      const elementListeners = this.listeners.get(element) || new Map();

      // Pointer down
      if (handlers.onDown) {
        const downListener = (event: Event) => {
          const pointerEvent = event as PointerEvent;
          handlers.onDown?.(pointerEvent, element);
        };

        element.addEventListener('pointerdown', downListener);
        elementListeners.set('pointerdown', downListener);
      }

      // Pointer move
      if (handlers.onMove) {
        const moveListener = (event: Event) => {
          const pointerEvent = event as PointerEvent;
          handlers.onMove?.(pointerEvent, element);
        };

        element.addEventListener('pointermove', moveListener);
        elementListeners.set('pointermove', moveListener);
      }

      // Pointer up
      if (handlers.onUp) {
        const upListener = (event: Event) => {
          const pointerEvent = event as PointerEvent;
          handlers.onUp?.(pointerEvent, element);
        };

        element.addEventListener('pointerup', upListener);
        elementListeners.set('pointerup', upListener);

        // Also listen on window to catch releases outside element
        const windowUpListener = (event: Event) => {
          const pointerEvent = event as PointerEvent;
          handlers.onUp?.(pointerEvent, element);
        };
        window.addEventListener('pointerup', windowUpListener);
        elementListeners.set('window:pointerup', windowUpListener);
      }

      this.listeners.set(element, elementListeners);
    });
  }

  // ============================================================================
  // Hover Events (Mouse Enter/Leave)
  // ============================================================================

  /**
   * Attach hover event handlers to elements
   * Automatically disabled on touch-only devices
   */
  attachHoverBehavior(elements: HTMLElement[], handlers: HoverHandlers): void {
    // Skip hover behaviors on touch-only devices
    if (this.touchOnly) {
      return;
    }

    elements.forEach(element => {
      const elementListeners = this.listeners.get(element) || new Map();

      // Mouse enter
      if (handlers.onEnter) {
        const enterListener = (event: Event) => {
          const mouseEvent = event as MouseEvent;
          handlers.onEnter?.(mouseEvent, element);
        };

        element.addEventListener('mouseenter', enterListener);
        elementListeners.set('mouseenter', enterListener);
      }

      // Mouse leave
      if (handlers.onLeave) {
        const leaveListener = (event: Event) => {
          const mouseEvent = event as MouseEvent;
          handlers.onLeave?.(mouseEvent, element);
        };

        element.addEventListener('mouseleave', leaveListener);
        elementListeners.set('mouseleave', leaveListener);
      }

      this.listeners.set(element, elementListeners);
    });
  }

  // ============================================================================
  // Scroll Events
  // ============================================================================

  /**
   * Attach scroll event handler
   */
  attachScrollBehavior(callback: (scrollY: number) => void): void {
    const scrollListener = () => {
      callback(window.scrollY);
    };

    window.addEventListener('scroll', scrollListener, { passive: true });

    // Store in a special key for global listeners
    const globalListeners = this.listeners.get(document.body) || new Map();
    globalListeners.set('scroll', scrollListener as EventListener);
    this.listeners.set(document.body, globalListeners);
  }

  // ============================================================================
  // Global Mouse Tracking
  // ============================================================================

  /**
   * Track global mouse position
   */
  attachGlobalMouseTracking(
    callback: (x: number, y: number, velocityX: number, velocityY: number) => void
  ): void {
    let lastX = 0;
    let lastY = 0;
    let lastTime = Date.now();
    let rafId: number | null = null;

    const mouseMoveListener = (event: MouseEvent) => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000; // seconds

      // Calculate velocity
      const velocityX = deltaTime > 0 ? (event.clientX - lastX) / deltaTime : 0;
      const velocityY = deltaTime > 0 ? (event.clientY - lastY) / deltaTime : 0;

      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = currentTime;

      // Throttle to 60fps using RAF
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          callback(event.clientX, event.clientY, velocityX, velocityY);
          rafId = null;
        });
      }
    };

    window.addEventListener('mousemove', mouseMoveListener);

    const globalListeners = this.listeners.get(document.body) || new Map();
    globalListeners.set('mousemove', mouseMoveListener as EventListener);
    this.listeners.set(document.body, globalListeners);
  }

  // ============================================================================
  // Intersection Observer (for scroll-based behaviors)
  // ============================================================================

  /**
   * Observe elements entering/leaving viewport
   */
  attachIntersectionObserver(
    elements: HTMLElement[],
    callback: (element: HTMLElement, isIntersecting: boolean) => void,
    options?: IntersectionObserverInit
  ): IntersectionObserver {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        callback(entry.target as HTMLElement, entry.isIntersecting);
      });
    }, options);

    elements.forEach(element => {
      observer.observe(element);
    });

    return observer;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Remove all listeners from specific elements
   */
  cleanup(elements?: HTMLElement[]): void {
    if (elements) {
      // Clean up specific elements
      elements.forEach(element => {
        const elementListeners = this.listeners.get(element);
        if (elementListeners) {
          elementListeners.forEach((listener, eventType) => {
            if (eventType.startsWith('window:')) {
              const actualEventType = eventType.replace('window:', '');
              window.removeEventListener(actualEventType, listener);
            } else {
              element.removeEventListener(eventType, listener);
            }
          });
          this.listeners.delete(element);
        }
      });
    } else {
      // Clean up all listeners
      this.listeners.forEach((elementListeners, element) => {
        elementListeners.forEach((listener, eventType) => {
          if (eventType.startsWith('window:')) {
            const actualEventType = eventType.replace('window:', '');
            window.removeEventListener(actualEventType, listener);
          } else if (element === document.body && (eventType === 'scroll' || eventType === 'mousemove')) {
            window.removeEventListener(eventType, listener);
          } else {
            element.removeEventListener(eventType, listener);
          }
        });
      });
      this.listeners.clear();
    }
  }
}
