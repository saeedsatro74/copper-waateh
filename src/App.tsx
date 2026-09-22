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
import { CalculatorModal } from './components/CalculatorModal';
import { Invoice, Category } from './types';

function MainAppContent() {
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

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
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
