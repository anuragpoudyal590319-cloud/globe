import { useState } from 'react';
import { CorrelationPanel } from '../components/analytics/CorrelationPanel';
import { ForecastPanel } from '../components/analytics/ForecastPanel';
import { StatisticsPanel } from '../components/analytics/StatisticsPanel';
import { ScatterPanel } from '../components/analytics/ScatterPanel';
import { HeatmapPanel } from '../components/analytics/HeatmapPanel';
import { AdvancedChartsPanel } from '../components/analytics/AdvancedChartsPanel';
import styles from './AnalyticsPage.module.css';

type AnalyticsTab = 'correlation' | 'forecast' | 'statistics' | 'scatter' | 'heatmap' | 'advanced';

const TABS: { id: AnalyticsTab; label: string; icon: string }[] = [
  { id: 'correlation', label: 'Correlation', icon: '🔗' },
  { id: 'forecast', label: 'Forecast', icon: '📈' },
  { id: 'statistics', label: 'Statistics', icon: '📊' },
  { id: 'scatter', label: 'Scatter Plot', icon: '⚬' },
  { id: 'heatmap', label: 'Heatmaps', icon: '🗺️' },
  { id: 'advanced', label: 'Advanced', icon: '🎯' },
];

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('correlation');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'correlation':
        return <CorrelationPanel />;
      case 'forecast':
        return <ForecastPanel />;
      case 'statistics':
        return <StatisticsPanel />;
      case 'scatter':
        return <ScatterPanel />;
      case 'heatmap':
        return <HeatmapPanel />;
      case 'advanced':
        return <AdvancedChartsPanel />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.analyticsPage}>
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {renderTabContent()}
      </div>
    </div>
  );
}
