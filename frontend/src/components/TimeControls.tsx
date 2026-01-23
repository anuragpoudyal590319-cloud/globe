import { useCallback } from 'react';
import styles from './TimeControls.module.css';

interface TimeControlsProps {
  minYear: number;
  maxYear: number;
  currentYear: number | null; // null means "latest"
  onYearChange: (year: number | null) => void;
  isLoading?: boolean;
}

export function TimeControls({
  minYear,
  maxYear,
  currentYear,
  onYearChange,
  isLoading = false,
}: TimeControlsProps) {
  // The year shown on slider (use currentYear or maxYear if null)
  const displayYear = currentYear ?? maxYear;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const year = parseInt(e.target.value, 10);
      // If at maxYear, treat as "latest"
      if (year === maxYear) {
        onYearChange(null);
      } else {
        onYearChange(year);
      }
    },
    [onYearChange, maxYear]
  );

  return (
    <div className={styles.container}>
      {/* Year Display */}
      <div className={styles.yearDisplay}>
        <span className={styles.yearLabel}>
          {currentYear === null ? `${maxYear} (Latest)` : currentYear}
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
    </div>
  );
}
