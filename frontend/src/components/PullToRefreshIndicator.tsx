import { useMemo } from 'react';

type PullToRefreshIndicatorProps = {
    pullDistance: number;
    progress: number;
    isPulling: boolean;
    isRefreshing: boolean;
};

const PullToRefreshIndicator = ({ pullDistance, progress, isPulling, isRefreshing }: PullToRefreshIndicatorProps) => {
    const shouldShow = isRefreshing || pullDistance > 6;
    const offset = isRefreshing ? 0 : Math.min(pullDistance * 0.55, 52);
    const scale = isRefreshing || isPulling ? 1 : 0.94;

    const { strokeDashoffset, circumference } = useMemo(() => {
        const radius = 10;
        const circleCircumference = 2 * Math.PI * radius;
        const clamped = Math.min(Math.max(progress, 0), 1);
        const offsetValue = circleCircumference * (1 - clamped);
        return {
            strokeDashoffset: offsetValue,
            circumference: circleCircumference,
        };
    }, [progress]);

    return (
        <div
            className="pointer-events-none fixed left-1/2 top-[calc(var(--ap-header-height,64px)+8px)] z-40 transition-all duration-200 ease-out"
            style={{ opacity: shouldShow ? 1 : 0, transform: `translate(-50%, ${shouldShow ? offset : 0}px)` }}
        >
            <div className="flex h-12 w-12 items-center justify-center transition-transform duration-150" style={{ transform: `scale(${scale})` }}>
                {isRefreshing ? (
                    <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" role="presentation">
                        <circle className="opacity-10" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path className="opacity-70" d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                ) : (
                    <svg className="h-7 w-7" viewBox="0 0 24 24" role="presentation">
                        <circle
                            className="opacity-20"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                        />
                        <circle
                            className="origin-center transition-all duration-100"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="none"
                        />
                    </svg>
                )}
            </div>
        </div>
    );
};

export default PullToRefreshIndicator;
