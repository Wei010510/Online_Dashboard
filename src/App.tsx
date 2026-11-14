import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DataImportModal } from './components/DataImportModal';
import { DirectorDashboard } from './components/DirectorDashboard';
import { OrdersAdsDashboard } from './components/ordersAds/OrdersAdsDashboard';
import { SupervisorDashboard } from './components/supervisor/SupervisorDashboard';
import { PortalHome } from './components/PortalHome';
import { TopNav } from './components/TopNav';
import { SAMPLE_DATASET } from './data/sampleData';
import { BoardId, DataBoardId, DatasetBundle } from './types/bi';
import { OrdersAdsDataset } from './types/ordersAds';
import { SupervisorDataset } from './types/supervisor';
import { buildEnrichedRecords } from './utils/biEngine';
import { buildOrdersAdsRecords } from './utils/ordersAdsEngine';
import { buildSupervisorRecords } from './utils/supervisorEngine';
import {
  clearPersistedBoardData,
  DEFAULT_ORDERS_ADS_DATA,
  DEFAULT_SUPERVISOR_DATA,
  loadPersistedBoardData,
  loadPersistedOrdersAdsData,
  loadPersistedSupervisorData,
  savePersistedBoardData,
} from './utils/storage';

export default function App() {
  const [activeBoard, setActiveBoard] = useState<BoardId>('home');
  const [isDark, setIsDark] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Three completely independent datasets — one per dashboard
  const [directorDataset, setDirectorDataset] = useState<DatasetBundle>(SAMPLE_DATASET);
  const [ordersAdsDataset, setOrdersAdsDataset] = useState<OrdersAdsDataset>(
    DEFAULT_ORDERS_ADS_DATA
  );
  const [supervisorDataset, setSupervisorDataset] = useState<SupervisorDataset>(
    DEFAULT_SUPERVISOR_DATA
  );

  // Hydrate all 3 boards independently from IndexedDB on initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [savedDirector, savedOrdersAds, savedSupervisor] = await Promise.all([
        loadPersistedBoardData<DatasetBundle>('director'),
        loadPersistedOrdersAdsData(),
        loadPersistedSupervisorData(),
      ]);
      if (!mounted) return;
      if (savedDirector) setDirectorDataset(savedDirector);
      if (savedOrdersAds) setOrdersAdsDataset(savedOrdersAds);
      if (savedSupervisor) setSupervisorDataset(savedSupervisor);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const { records: enrichedRecords, stats: joinStats } = useMemo(
    () =>
      buildEnrichedRecords(
        directorDataset.accountingDetails,
        directorDataset.tlRecords,
        directorDataset.skuMappings
      ),
    [directorDataset]
  );

  const { records: supervisorRecords } = useMemo(
    () => buildSupervisorRecords(supervisorDataset.accountingDetails, supervisorDataset.skuMappings),
    [supervisorDataset]
  );

  const { records: ordersAdsRecords } = useMemo(
    () => buildOrdersAdsRecords(
      ordersAdsDataset.productRecords,
      ordersAdsDataset.tlRecords,
      ordersAdsDataset.skuMappings,
      enrichedRecords
    ),
    [ordersAdsDataset, enrichedRecords]
  );

  const handleUpdateDirector = (next: DatasetBundle) => {
    setDirectorDataset(next);
    void savePersistedBoardData('director', next);
  };

  const handleUpdateOrdersAds = (next: OrdersAdsDataset) => {
    setOrdersAdsDataset(next);
    void savePersistedBoardData('orders_ads', next);
  };

  const handleUpdateSupervisor = (next: SupervisorDataset) => {
    setSupervisorDataset(next);
    void savePersistedBoardData('supervisor', next);
  };

  const handleResetBoard = (boardId: DataBoardId) => {
    void clearPersistedBoardData(boardId);
    if (boardId === 'director') {
      setDirectorDataset(SAMPLE_DATASET);
    } else if (boardId === 'orders_ads') {
      setOrdersAdsDataset(DEFAULT_ORDERS_ADS_DATA);
    } else {
      setSupervisorDataset(DEFAULT_SUPERVISOR_DATA);
    }
  };

  const handleSelectBoard = (board: BoardId) => {
    setActiveBoard(board);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentBoardRecordCount =
    activeBoard === 'orders_ads'
      ? ordersAdsDataset.productRecords.length
      : activeBoard === 'supervisor'
      ? supervisorDataset.accountingDetails.length
      : enrichedRecords.length;

  return (
    <>
      <AnimatePresence mode="wait">
        {activeBoard === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <PortalHome
              onSelectBoard={handleSelectBoard}
              isDark={isDark}
              onToggleTheme={() => setIsDark((d) => !d)}
              onOpenImport={() => setImportOpen(true)}
              sourceLabel={directorDataset.sourceLabel}
              recordCount={enrichedRecords.length}
            />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100"
          >
            <TopNav
              activeBoard={activeBoard}
              onSelectBoard={handleSelectBoard}
              isDark={isDark}
              onToggleTheme={() => setIsDark((d) => !d)}
              onOpenImport={() => setImportOpen(true)}
              recordCount={currentBoardRecordCount}
            />

            <main className="flex-1 w-full">
              <AnimatePresence mode="wait">
                {activeBoard === 'director' && (
                  <motion.div
                    key="director"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <DirectorDashboard allRecords={enrichedRecords} joinStats={joinStats} />
                  </motion.div>
                )}
                {activeBoard === 'orders_ads' && (
                  <motion.div
                    key="orders_ads"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <OrdersAdsDashboard
                      allRecords={ordersAdsRecords}
                      sourceLabel={ordersAdsDataset.sourceLabel}
                      updatedAt={ordersAdsDataset.updatedAt}
                      isCustom={ordersAdsDataset.isCustom}
                      onOpenImport={() => setImportOpen(true)}
                      onResetData={() => handleResetBoard('orders_ads')}
                    />
                  </motion.div>
                )}
                {activeBoard === 'supervisor' && (
                  <motion.div
                    key="supervisor"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <SupervisorDashboard
                      allRecords={supervisorRecords}
                      sourceLabel={supervisorDataset.sourceLabel}
                      updatedAt={supervisorDataset.updatedAt}
                      isCustom={supervisorDataset.isCustom}
                      onOpenImport={() => setImportOpen(true)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <DataImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        activeBoard={activeBoard}
        directorDataset={directorDataset}
        ordersAdsDataset={ordersAdsDataset}
        supervisorDataset={supervisorDataset}
        onUpdateDirector={handleUpdateDirector}
        onUpdateOrdersAds={handleUpdateOrdersAds}
        onUpdateSupervisor={handleUpdateSupervisor}
        onResetBoard={handleResetBoard}
        joinStats={joinStats}
      />
    </>
  );
}
