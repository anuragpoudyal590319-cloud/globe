import { Routes, Route, NavLink } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import styles from './App.module.css';

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.brand}>
            <img src="/globe.svg" alt="Globe" className={styles.logo} />
            <h1 className={styles.title}>World Economic Map</h1>
          </div>

          <nav className={styles.mainNav}>
            <NavLink 
              to="/" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              end
            >
              <span className={styles.navIcon}>🗺️</span>
              <span className={styles.navLabel}>Map</span>
            </NavLink>
            <NavLink 
              to="/analytics" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              <span className={styles.navIcon}>📊</span>
              <span className={styles.navLabel}>Analytics</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </main>
    </div>
  );
}
