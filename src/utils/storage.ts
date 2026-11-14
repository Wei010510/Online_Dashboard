import { BoardTableDataset, DataBoardId, DatasetBundle } from '../types/bi';
import { OrdersAdsDataset } from '../types/ordersAds';
import { SupervisorDataset } from '../types/supervisor';
import { ORDERS_ADS_SAMPLE_DATASET } from '../data/ordersAdsSample';
import { SUPERVISOR_SAMPLE_DATASET } from '../data/supervisorSample';

const DB_NAME = 'NexusBI_PersistentStore';
const DB_VERSION = 1;
const STORE_NAME = 'board_datasets';

export const DEFAULT_ORDERS_ADS_DATA: OrdersAdsDataset = ORDERS_ADS_SAMPLE_DATASET;

export const DEFAULT_SUPERVISOR_DATA: SupervisorDataset = SUPERVISOR_SAMPLE_DATASET;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePersistedBoardData<T extends DatasetBundle | BoardTableDataset | OrdersAdsDataset | SupervisorDataset>(
  boardId: DataBoardId,
  data: T
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, boardId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn(`Failed to persist dataset for ${boardId}:`, err);
  }
}

export async function loadPersistedBoardData<T>(boardId: DataBoardId): Promise<T | null> {
  try {
    const db = await openDB();
    const result = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(boardId);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (err) {
    console.warn(`Failed to load persisted dataset for ${boardId}:`, err);
    return null;
  }
}

function isOrdersAdsDataset(value: unknown): value is OrdersAdsDataset {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<OrdersAdsDataset>;
  return candidate.boardId === 'orders_ads'
    && Array.isArray(candidate.productRecords)
    && Array.isArray(candidate.tlRecords)
    && Array.isArray(candidate.skuMappings)
    && Array.isArray(candidate.fileNames)
    && typeof candidate.sourceLabel === 'string'
    && typeof candidate.updatedAt === 'string';
}

export async function loadPersistedOrdersAdsData(): Promise<OrdersAdsDataset | null> {
  const saved = await loadPersistedBoardData<unknown>('orders_ads');
  return isOrdersAdsDataset(saved) ? saved : null;
}

function isSupervisorDataset(value: unknown): value is SupervisorDataset {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SupervisorDataset>;
  return candidate.boardId === 'supervisor'
    && Array.isArray(candidate.accountingDetails)
    && Array.isArray(candidate.skuMappings)
    && Array.isArray(candidate.fileNames)
    && typeof candidate.sourceLabel === 'string'
    && typeof candidate.updatedAt === 'string';
}

export async function loadPersistedSupervisorData(): Promise<SupervisorDataset | null> {
  const saved = await loadPersistedBoardData<unknown>('supervisor');
  return isSupervisorDataset(saved) ? saved : null;
}

export async function clearPersistedBoardData(boardId: DataBoardId): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(boardId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn(`Failed to clear persisted dataset for ${boardId}:`, err);
  }
}
