import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Header } from './components/Header';
import { InventoryView } from './components/InventoryView';
import { TransactionsView } from './components/TransactionsView';
import { InvoicesView } from './components/InvoicesView';
import { CustomerStatementsView } from './components/CustomerStatementsView';
import { PartnerPanelsView } from './components/PartnerPanelsView';
import { ConsignmentsView } from './components/ConsignmentsView';
import { SettingsView } from './components/SettingsView';
import { InvoiceModal } from './components/InvoiceModal';
import { StockEntryModal } from './components/StockEntryModal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { CalculatorModal } from './components/CalculatorModal';
import { Invoice, Category } from './types';
import { Loader2 } from 'lucide-react';

function MainAppContent() {
  const { currentUser, isOperationLoading, isCloudSyncing, lastActionDescription } = useInventory();
  const [activeTab, setActiveTab] = useState<'inventory' | 'partners' | 'transactions' | 'statements' | 'invoices' | 'consignments' | 'settings'>('inventory');

  // Modals state
  const [isStockEntryModalOpen, setIsStockEntryModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null);

  const [stockEntryInitialData, setStockEntryInitialData] = useState<{
    category?: Category;
    diameter?: string;
    thickness?: string;
    weightKg?: number;
    lengthMeters?: number;
  } | null>(null);

  const handleOpenStockEntryModal = (initialData?: any) => {
    setStockEntryInitialData(initialData || null);
    setIsStockEntryModalOpen(true);
  };

  const handleCloseStockEntryModal = () => {
    setIsStockEntryModalOpen(false);
    setStockEntryInitialData(null);
  };

  const handleOpenInvoiceToView = (inv: Invoice) => {
    setInvoiceToView(inv);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setInvoiceToView(null);
  };

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans relative">
      {/* Top Global Loading Bar */}
      {(isOperationLoading || isCloudSyncing) && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-amber-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 animate-pulse w-full" />
        </div>
      )}

      {/* Floating Global Saving Feedback */}
      {(isOperationLoading || isCloudSyncing) && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900/90 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{lastActionDescription || 'در حال ذخیره‌سازی و به‌روزرسانی اطلاعات...'}</span>
        </div>
      )}

      {/* Top Header with Word-style Undo/Redo arrows */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenStockEntryModal={() => handleOpenStockEntryModal()}
        onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenCalculatorModal={() => setIsCalculatorModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 pt-2.5 sm:pt-6">
        {activeTab === 'inventory' && (
          <InventoryView
            onOpenStockEntryModal={() => handleOpenStockEntryModal()}
            onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
            onOpenCalculatorModal={() => setIsCalculatorModalOpen(true)}
            onViewInvoice={handleOpenInvoiceToView}
          />
        )}

        {activeTab === 'partners' && (
          <PartnerPanelsView onViewInvoice={handleOpenInvoiceToView} />
        )}

        {activeTab === 'transactions' && <TransactionsView />}

        {activeTab === 'statements' && (
          <CustomerStatementsView onViewInvoice={handleOpenInvoiceToView} />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            onViewInvoice={handleOpenInvoiceToView}
            onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
          />
        )}

        {activeTab === 'consignments' && (
          <ConsignmentsView onViewInvoice={handleOpenInvoiceToView} />
        )}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Modals */}
      <StockEntryModal
        isOpen={isStockEntryModalOpen}
        onClose={handleCloseStockEntryModal}
        initialData={stockEntryInitialData}
      />

      <CalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => setIsCalculatorModalOpen(false)}
        onOpenStockEntryWithData={(data) => handleOpenStockEntryModal(data)}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={handleCloseInvoiceModal}
        invoiceToView={invoiceToView}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <MainAppContent />
    </InventoryProvider>
  );
}
