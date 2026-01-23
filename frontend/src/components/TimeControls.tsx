import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './TimeControls.module.css';

interface TimeControlsProps {
  minYear: number;
  maxYear: number;
  currentYear: number | null; // null means "latest"
  onYearChange: (year: number | null) => void;
  isLoading?: boolean;
}

type PlaySpeed = 'slow' | 'normal' | 'fast';

const SPEED_INTERVALS: Record<PlaySpeed, number> = {
  slow: 1500,
  normal: 800,
  fast: 300,
};

const SPEED_LABELS: Record<PlaySpeed, string> = {
  slow: '0.5x',
  normal: '1x',
  fast: '2x',
};

export function TimeControls({
  minYear,
  maxYear,
  currentYear,
  onYearChange,
  isLoading = false,
}: TimeControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>('normal');
  const intervalRef = useRef<number | null>(null);
  const currentYearRef = useRef(currentYear);

  // Keep ref in sync
  useEffect(() => {
    currentYearRef.current = currentYear;
  }, [currentYear]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle animation
  useEffect(() => {
    if (isPlaying) {
      // Start from minYear if at latest or beyond maxYear
      if (currentYearRef.current === null || currentYearRef.current >= maxYear) {
        onYearChange(minYear);
        currentYearRef.current = minYear;
      }

      intervalRef.current = window.setInterval(() => {
        const year = currentYearRef.current ?? minYear;
        if (year >= maxYear) {
          setIsPlaying(false);
          onYearChange(null); // Go back to "latest"
          return;
        }
        const nextYear = year + 1;
        currentYearRef.current = nextYear;
        onYearChange(nextYear);
      }, SPEED_INTERVALS[speed]);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, speed, minYear, maxYear, onYearChange]);

  // The year shown on slider (use currentYear or maxYear if null)
  const displayYear = currentYear ?? maxYear;

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const year = parseInt(e.target.value, 10);
      setIsPlaying(false);
      onYearChange(year);
    },
    [onYearChange]
  );

  const handleSpeedChange = useCallback(() => {
    setSpeed((prev) => {
      if (prev === 'slow') return 'normal';
      if (prev === 'normal') return 'fast';
      return 'slow';
    });
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    onYearChange(null); // Go back to latest
  }, [onYearChange]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    const year = currentYear ?? maxYear;
    if (year > minYear) {
      onYearChange(year - 1);
    }
  }, [currentYear, minYear, maxYear, onYearChange]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    const year = currentYear ?? minYear;
    if (year < maxYear) {
      onYearChange(year + 1);
    } else {
      onYearChange(null); // Go to latest
    }
  }, [currentYear, minYear, maxYear, onYearChange]);

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        {/* Play/Pause Button */}
        <button
          className={`${styles.controlButton} ${styles.playButton}`}
          onClick={handlePlayPause}
          disabled={isLoading}
          title={isPlaying ? 'Pause' : 'Play animation'}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Step Back */}
        <button
          className={styles.controlButton}
          onClick={handleStepBack}
          disabled={isLoading || (currentYear !== null && currentYear <= minYear)}
          title="Previous year"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Step Forward */}
        <button
          className={styles.controlButton}
          onClick={handleStepForward}
          disabled={isLoading || currentYear === null}
          title="Next year"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        {/* Speed Button */}
        <button
          className={styles.speedButton}
          onClick={handleSpeedChange}
          title={`Speed: ${SPEED_LABELS[speed]}`}
        >
          {SPEED_LABELS[speed]}
        </button>

        {/* Reset to Latest */}
        <button
          className={`${styles.controlButton} ${currentYear === null ? styles.active : ''}`}
          onClick={handleReset}
          disabled={isLoading || currentYear === null}
          title="Show latest data"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Year Display */}
      <div className={styles.yearDisplay}>
        <span className={styles.yearLabel}>
          {currentYear === null ? 'Latest' : currentYear}
        </span>
        {isLoading && <span className={styles.loadingDot}>●</span>}
      </div>

      {/* Year Slider */}
      <div className={styles.sliderContainer}>
        <span className={styles.yearBound}>{minYear}</span>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={displayYear}
          onChange={handleSliderChange}
          className={styles.slider}
          disabled={isLoading}
        />
        <span className={styles.yearBound}>{maxYear}</span>
      </div>

      {/* Progress indicator */}
      {isPlaying && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${((displayYear - minYear) / (maxYear - minYear)) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
