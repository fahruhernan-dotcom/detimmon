import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';

const ConfirmContext = createContext(null);

/**
 * ConfirmProvider
 * Menyediakan dialog konfirmasi asinkron berbasis Promise (useConfirm).
 * Menghilangkan kebutuhan window.confirm native secara menyeluruh di level aplikasi.
 */
export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    description: '',
    note: null,
    confirmText: 'Lanjutkan',
    cancelText: 'Batalkan',
    variant: 'warning', // 'warning' | 'danger' | 'info'
    isLoading: false
  });

  const resolverRef = useRef(null);

  /**
   * confirm(options)
   * @param {Object} options
   * @param {string} options.title Judul dialog konfirmasi
   * @param {string} options.description Deskripsi rincian aksi
   * @param {string} [options.note] Catatan tambahan (misal info pemulihan)
   * @param {string} [options.confirmText] Teks tombol konfirmasi
   * @param {string} [options.cancelText] Teks tombol batal
   * @param {'warning'|'danger'|'info'} [options.variant] Warna & tema ikon
   * @returns {Promise<boolean>} Resolves true jika ditekan Konfirmasi, false jika Dibatalkan
   */
  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        title: options.title || 'Konfirmasi Tindakan',
        description: options.description || 'Apakah Anda yakin ingin melanjutkan?',
        note: options.note || null,
        confirmText: options.confirmText || 'Lanjutkan',
        cancelText: options.cancelText || 'Batalkan',
        variant: options.variant || 'warning',
        isLoading: false
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={modalState.title}
        description={modalState.description}
        note={modalState.note}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
        isLoading={modalState.isLoading}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Hook useConfirm
 * Contoh pemakaian:
 * const confirm = useConfirm();
 * const ok = await confirm({ title: 'Hapus Peserta?', variant: 'warning' });
 * if (ok) { ... }
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm harus digunakan di dalam cakupan ConfirmProvider.');
  }
  return context.confirm;
}
