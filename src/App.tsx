import { useState } from "react";
import { LedgerProvider, useLedger } from "./store";
import { Sidebar, type View } from "./components/Sidebar";
import { Modal } from "./components/Modal";
import { AddCustomerForm } from "./forms/AddCustomerForm";
import { Dashboard } from "./screens/Dashboard";
import { CustomerDirectory } from "./screens/CustomerDirectory";
import { CustomerProfile } from "./screens/CustomerProfile";
import { IconBank } from "./components/Icon";

function AppShell() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  // Cloud-sync state lives inside LedgerProvider
  const { lastSync, pushing, pulling, pushToCloud, pullFromCloud } = useLedger();

  const openCustomer = (id: string) => {
    setSelectedCustomer(id);
    setView("customers");
  };

  const backToList = () => setSelectedCustomer(null);

  const handlePush = async () => {
    try {
      await pushToCloud();
    } catch { /* error surfaced via store */ }
  };

  const handlePull = async () => {
    await pullFromCloud();
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar view={view} onView={(v) => { setView(v); setSelectedCustomer(null); }} />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <IconBank size={16} className="text-white" />
          </div>
          <div className="text-sm font-semibold">Ledger</div>
          <div className="ml-auto flex gap-1">
            {[
              { id: "dashboard" as View, label: "Home" },
              { id: "customers" as View, label: "Customers" },
            ].map((it) => (
              <button
                key={it.id}
                onClick={() => { setView(it.id); setSelectedCustomer(null); }}
                className={`text-xs px-2.5 py-1 rounded-md ${
                  view === it.id ? "bg-slate-800 text-white" : "text-slate-400"
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {selectedCustomer ? (
            <CustomerProfile
              customerId={selectedCustomer}
              onBack={backToList}
            />
          ) : view === "dashboard" ? (
            <Dashboard
              onOpenCustomer={openCustomer}
              onAddCustomer={() => setAddCustomerOpen(true)}
              onNavigateCustomers={() => setView("customers")}
              lastSync={lastSync}
              pushing={pushing}
              pulling={pulling}
              onPush={handlePush}
              onPull={handlePull}
            />
          ) : (
            <CustomerDirectory
              onOpenCustomer={openCustomer}
              onAddCustomer={() => setAddCustomerOpen(true)}
            />
          )}
        </div>
      </main>

      <Modal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        title="Add New Customer"
        description="Create a customer record to start tracking loans."
        size="md"
      >
        <AddCustomerForm
          onDone={() => {
            setAddCustomerOpen(false);
            setView("customers");
          }}
          onCancel={() => setAddCustomerOpen(false)}
        />
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <LedgerProvider>
      <AppShell />
    </LedgerProvider>
  );
}
