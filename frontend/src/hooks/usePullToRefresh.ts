import { useEffect, useRef, useState } from 'react';

type UsePullToRefreshOptions = {
    onRefresh: () => void | Promise<void>;
    isRefreshing?: boolean;
    threshold?: number;
    disabled?: boolean;
};

type UsePullToRefreshResult = {
    pullDistance: number;
    progress: number;
    isPulling: boolean;
};

const SCROLL_ROOT_SELECTOR = '[data-scroll-root]';
const MAX_PULL_DISTANCE = 180;
const PULL_START_BUFFER = 24;
const ACTIVATION_HOLD_MS = 300;

export const usePullToRefresh = ({
    onRefresh,
    isRefreshing = false,
    threshold = 110,
    disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshResult => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        if (disabled || typeof window === 'undefined') {
            return undefined;
        }
        const container = document.querySelector(SCROLL_ROOT_SELECTOR) as HTMLElement | null;
        if (!container) {
            return undefined;
        }

        let startY: number | null = null;
        let shouldTrigger = false;
        let thresholdReachedAt: number | null = null;
        let active = true;

        const setDistance = (distance: number) => {
            if (!active) return;
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
            frameRef.current = window.requestAnimationFrame(() => {
                setPullDistance(distance);
                setIsPulling(distance > 0);
            });
        };

        const handleTouchStart = (event: TouchEvent) => {
            if (isRefreshing) {
                startY = null;
                return;
            }
            if (container.scrollTop > 0) {
                startY = null;
                return;
            }
            startY = event.touches[0]?.clientY ?? null;
            shouldTrigger = false;
            thresholdReachedAt = null;
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (startY === null) {
                if (container.scrollTop > 0) {
                    return;
                }
                startY = event.touches[0]?.clientY ?? null;
                shouldTrigger = false;
                thresholdReachedAt = null;
                return;
            }
            if (container.scrollTop > 0) {
                startY = null;
                shouldTrigger = false;
                thresholdReachedAt = null;
                setDistance(0);
                return;
            }
            if (isRefreshing) {
                return;
            }
            const currentY = event.touches[0]?.clientY ?? startY;
            const rawDistance = currentY - startY;
            if (rawDistance <= 0) {
                shouldTrigger = false;
                thresholdReachedAt = null;
                setDistance(0);
                return;
            }
            if (rawDistance <= PULL_START_BUFFER) {
                shouldTrigger = false;
                thresholdReachedAt = null;
                setDistance(0);
                return;
            }
            const effectiveDistance = rawDistance - PULL_START_BUFFER;
            const dampenedDistance = Math.min(effectiveDistance / 1.35, MAX_PULL_DISTANCE);
            setDistance(dampenedDistance);
            shouldTrigger = dampenedDistance >= threshold;
            if (shouldTrigger) {
                thresholdReachedAt = thresholdReachedAt ?? Date.now();
            } else {
                thresholdReachedAt = null;
            }
        };

        const finishPull = () => {
            const heldLongEnough =
                thresholdReachedAt !== null && Date.now() - thresholdReachedAt >= ACTIVATION_HOLD_MS;
            if (startY !== null && shouldTrigger && heldLongEnough && !isRefreshing) {
                void onRefresh();
            }
            startY = null;
            shouldTrigger = false;
            thresholdReachedAt = null;
            setDistance(0);
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', finishPull);
        container.addEventListener('touchcancel', finishPull);

        return () => {
            active = false;
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', finishPull);
            container.removeEventListener('touchcancel', finishPull);
        };
    }, [disabled, isRefreshing, onRefresh, threshold]);

    useEffect(() => {
        if (!isRefreshing) {
            setPullDistance(0);
            setIsPulling(false);
        }
    }, [isRefreshing]);

    useEffect(() => {
        if (disabled) {
            setPullDistance(0);
            setIsPulling(false);
        }
    }, [disabled]);

    const progress = threshold > 0 ? Math.min(pullDistance / threshold, 1) : 0;

    return {
        pullDistance,
        progress,
        isPulling,
    };
};

export default usePullToRefresh;
