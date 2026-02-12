"use client";
import { useState, useEffect, useCallback } from "react";

const DENOMINATIONS = [
  { key: "hundreds", label: "$100", value: 100, color: "#2D6A4F" },
  { key: "fifties", label: "$50", value: 50, color: "#40916C" },
  { key: "twenties", label: "$20", value: 20, color: "#52B788" },
  { key: "tens", label: "$10", value: 10, color: "#74C69D" },
  { key: "fives", label: "$5", value: 5, color: "#95D5B2" },
  { key: "twos", label: "$2", value: 2, color: "#A7D8BD" },
  { key: "ones", label: "$1", value: 1, color: "#B7E4C7" },
];

const STORAGE_KEYS = {
  cash: "cash-safe-denominations",
  log: "cash-safe-log",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage save error:", e);
  }
}

function DenomCard({ denom, count, onChange }) {
  const total = count * denom.value;
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      border: "1px solid rgba(255,255,255,0.08)",
      transition: "all 0.2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `linear-gradient(135deg, ${denom.color}, ${denom.color}88)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 14,
          color: "#1B1B1B", letterSpacing: -0.5,
        }}>{denom.label}</div>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 600, color: "#E8E8E8" }}>
            {formatCurrency(total)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {count} bill{count !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => onChange(Math.max(0, count - 1))} style={{
          width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)", color: "#aaa", fontSize: 20,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>−</button>
        <input
          type="number"
          min="0"
          value={count}
          onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          style={{
            width: 56, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)", color: "#E8E8E8", fontSize: 16, textAlign: "center",
            fontFamily: "'DM Mono', monospace", outline: "none",
          }}
        />
        <button onClick={() => onChange(count + 1)} style={{
          width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)", color: "#aaa", fontSize: 20,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>+</button>
      </div>
    </div>
  );
}

function WithdrawModal({ cash, onClose, onWithdraw }) {
  const [note, setNote] = useState("");
  const [amounts, setAmounts] = useState(() => {
    const init = {};
    DENOMINATIONS.forEach(d => init[d.key] = 0);
    return init;
  });

  const withdrawTotal = DENOMINATIONS.reduce((sum, d) => sum + amounts[d.key] * d.value, 0);
  const hasError = DENOMINATIONS.some(d => amounts[d.key] > cash[d.key]);
  const canSubmit = withdrawTotal > 0 && !hasError && note.trim();

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#1E1E1E", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440,
        border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh", overflowY: "auto",
      }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, color: "#E8E8E8", margin: "0 0 6px" }}>
          Log a Withdrawal
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>
          Select how many bills to remove from each denomination.
        </p>
        <input
          type="text"
          placeholder="What's this for? (e.g., Haircut)"
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)", color: "#E8E8E8", fontSize: 15,
            fontFamily: "'DM Sans', sans-serif", outline: "none", marginBottom: 16,
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DENOMINATIONS.map(d => {
            const over = amounts[d.key] > cash[d.key];
            return (
              <div key={d.key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 12,
                background: over ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                border: over ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: d.color, fontWeight: 600, width: 44 }}>{d.label}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>({cash[d.key]} avail)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setAmounts(p => ({ ...p, [d.key]: Math.max(0, p[d.key] - 1) }))} style={{
                    width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent", color: "#aaa", fontSize: 18, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>−</button>
                  <input
                    type="number" min="0" value={amounts[d.key]}
                    onChange={e => setAmounts(p => ({ ...p, [d.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{
                      width: 44, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.06)", color: "#E8E8E8", fontSize: 14,
                      textAlign: "center", fontFamily: "'DM Mono', monospace", outline: "none",
                    }}
                  />
                  <button onClick={() => setAmounts(p => ({ ...p, [d.key]: p[d.key] + 1 }))} style={{
                    width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent", color: "#aaa", fontSize: 18, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          marginTop: 20, padding: "14px 18px", borderRadius: 12,
          background: withdrawTotal > 0 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Withdrawal Total</span>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700,
            color: withdrawTotal > 0 ? "#EF4444" : "rgba(255,255,255,0.3)",
          }}>
            −{formatCurrency(withdrawTotal)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent", color: "#aaa", fontSize: 15, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Cancel</button>
          <button disabled={!canSubmit} onClick={() => onWithdraw(amounts, note, withdrawTotal)} style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "none",
            background: canSubmit ? "linear-gradient(135deg, #EF4444, #DC2626)" : "rgba(255,255,255,0.06)",
            color: canSubmit ? "#fff" : "rgba(255,255,255,0.2)", fontSize: 15, cursor: canSubmit ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, transition: "all 0.2s",
          }}>Withdraw</button>
        </div>
      </div>
    </div>
  );
}

function DepositModal({ onClose, onDeposit }) {
  const [note, setNote] = useState("");
  const [amounts, setAmounts] = useState(() => {
    const init = {};
    DENOMINATIONS.forEach(d => init[d.key] = 0);
    return init;
  });

  const depositTotal = DENOMINATIONS.reduce((sum, d) => sum + amounts[d.key] * d.value, 0);
  const canSubmit = depositTotal > 0 && note.trim();

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#1E1E1E", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440,
        border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh", overflowY: "auto",
      }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, color: "#E8E8E8", margin: "0 0 6px" }}>
          Add Cash
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>
          Enter the bills you're adding to the safe.
        </p>
        <input
          type="text"
          placeholder="Source (e.g., ATM withdrawal, birthday gift)"
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)", color: "#E8E8E8", fontSize: 15,
            fontFamily: "'DM Sans', sans-serif", outline: "none", marginBottom: 16,
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DENOMINATIONS.map(d => (
            <div key={d.key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)",
            }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: d.color, fontWeight: 600, width: 44 }}>{d.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => setAmounts(p => ({ ...p, [d.key]: Math.max(0, p[d.key] - 1) }))} style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent", color: "#aaa", fontSize: 18, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>−</button>
                <input
                  type="number" min="0" value={amounts[d.key]}
                  onChange={e => setAmounts(p => ({ ...p, [d.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                  style={{
                    width: 44, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.06)", color: "#E8E8E8", fontSize: 14,
                    textAlign: "center", fontFamily: "'DM Mono', monospace", outline: "none",
                  }}
                />
                <button onClick={() => setAmounts(p => ({ ...p, [d.key]: p[d.key] + 1 }))} style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent", color: "#aaa", fontSize: 18, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 20, padding: "14px 18px", borderRadius: 12,
          background: depositTotal > 0 ? "rgba(45,106,79,0.15)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Deposit Total</span>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700,
            color: depositTotal > 0 ? "#52B788" : "rgba(255,255,255,0.3)",
          }}>
            +{formatCurrency(depositTotal)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent", color: "#aaa", fontSize: 15, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Cancel</button>
          <button disabled={!canSubmit} onClick={() => onDeposit(amounts, note, depositTotal)} style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "none",
            background: canSubmit ? "linear-gradient(135deg, #2D6A4F, #40916C)" : "rgba(255,255,255,0.06)",
            color: canSubmit ? "#fff" : "rgba(255,255,255,0.2)", fontSize: 15, cursor: canSubmit ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600, transition: "all 0.2s",
          }}>Deposit</button>
        </div>
      </div>
    </div>
  );
}

function LogEntry({ entry }) {
  const isWithdraw = entry.type === "withdraw";
  return (
    <div style={{
      padding: "14px 18px", borderRadius: 14, background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between",
      alignItems: "flex-start",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isWithdraw ? "#EF4444" : "#52B788",
          }} />
          <span style={{ fontSize: 15, fontWeight: 500, color: "#E8E8E8" }}>{entry.note}</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 16 }}>
          {formatDate(entry.date)}
          {entry.breakdown && <span> · {entry.breakdown}</span>}
        </div>
      </div>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600,
        color: isWithdraw ? "#EF4444" : "#52B788", whiteSpace: "nowrap",
      }}>
        {isWithdraw ? "−" : "+"}{formatCurrency(entry.amount)}
      </span>
    </div>
  );
}

export default function CashSafeTracker() {
  const [cash, setCash] = useState(null);
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [activeTab, setActiveTab] = useState("safe");
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState(null);
  const [exportCopied, setExportCopied] = useState(false);

  const defaultCash = () => {
    const c = {};
    DENOMINATIONS.forEach(d => c[d.key] = 0);
    return c;
  };

  useEffect(() => {
    const savedCash = loadData(STORAGE_KEYS.cash, defaultCash());
    const savedLog = loadData(STORAGE_KEYS.log, []);
    setCash(savedCash);
    setLog(savedLog);
    setLoading(false);
  }, []);

  const updateCash = useCallback((newCash) => {
    setCash(newCash);
    saveData(STORAGE_KEYS.cash, newCash);
  }, []);

  const addLogEntry = useCallback((entry) => {
    setLog(prev => {
      const newLog = [entry, ...(prev || [])];
      saveData(STORAGE_KEYS.log, newLog);
      return newLog;
    });
  }, []);

  const handleDenomChange = useCallback((key, count) => {
    const newCash = { ...cash, [key]: count };
    updateCash(newCash);
  }, [cash, updateCash]);

  const handleWithdraw = useCallback((amounts, note, total) => {
    const newCash = { ...cash };
    const parts = [];
    DENOMINATIONS.forEach(d => {
      if (amounts[d.key] > 0) {
        newCash[d.key] -= amounts[d.key];
        parts.push(`${amounts[d.key]}×${d.label}`);
      }
    });
    updateCash(newCash);
    addLogEntry({
      type: "withdraw", note, amount: total,
      breakdown: parts.join(", "), date: new Date().toISOString(),
    });
    setShowWithdraw(false);
  }, [cash, updateCash, addLogEntry]);

  const handleDeposit = useCallback((amounts, note, total) => {
    const newCash = { ...cash };
    const parts = [];
    DENOMINATIONS.forEach(d => {
      if (amounts[d.key] > 0) {
        newCash[d.key] += amounts[d.key];
        parts.push(`${amounts[d.key]}×${d.label}`);
      }
    });
    updateCash(newCash);
    addLogEntry({
      type: "deposit", note, amount: total,
      breakdown: parts.join(", "), date: new Date().toISOString(),
    });
    setShowDeposit(false);
  }, [cash, updateCash, addLogEntry]);

  const getExportData = useCallback(() => {
    return JSON.stringify({ cash, log, exportedAt: new Date().toISOString() });
  }, [cash, log]);

  const handleExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getExportData());
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2500);
    } catch {
      setExportCopied(false);
    }
  }, [getExportData]);

  const handleImport = useCallback(() => {
    try {
      const data = JSON.parse(importText.trim());
      if (!data.cash || !data.log) throw new Error("Invalid format");
      updateCash(data.cash);
      setLog(data.log);
      saveData(STORAGE_KEYS.log, data.log);
      setImportStatus("success");
      setImportText("");
      setTimeout(() => setImportStatus(null), 1500);
    } catch {
      setImportStatus("error");
      setTimeout(() => setImportStatus(null), 3000);
    }
  }, [importText, updateCash]);

  if (loading || !cash || !log) {
    return (
      <div style={{
        minHeight: "100vh", background: "#141414", display: "flex",
        alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)",
        fontFamily: "'DM Sans', sans-serif",
      }}>Loading...</div>
    );
  }

  const grandTotal = DENOMINATIONS.reduce((sum, d) => sum + (cash[d.key] || 0) * d.value, 0);
  const totalBills = DENOMINATIONS.reduce((sum, d) => sum + (cash[d.key] || 0), 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0F0F0F 0%, #1A1A1A 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#E8E8E8",
      padding: "0 0 100px",
    }}>
      <div style={{ padding: "40px 24px 0", textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
          background: "linear-gradient(135deg, #2D6A4F, #52B788)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, boxShadow: "0 8px 32px rgba(45,106,79,0.3)",
        }}>🔒</div>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700,
          margin: "0 0 4px", letterSpacing: -0.5,
        }}>Cash Safe</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>
          {totalBills} bill{totalBills !== 1 ? "s" : ""} in safe
        </p>
      </div>

      <div style={{
        margin: "24px 20px 0", padding: "28px 24px", borderRadius: 20,
        background: "linear-gradient(135deg, rgba(45,106,79,0.15), rgba(82,183,136,0.08))",
        border: "1px solid rgba(82,183,136,0.2)", textAlign: "center",
      }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5 }}>
          Total Cash
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 44, fontWeight: 700,
          color: "#52B788", letterSpacing: -1,
          textShadow: "0 0 40px rgba(82,183,136,0.3)",
        }}>
          {formatCurrency(grandTotal)}
        </div>
      </div>

      <div style={{
        display: "flex", margin: "24px 20px 0", background: "rgba(255,255,255,0.04)",
        borderRadius: 14, padding: 4,
      }}>
        {[{ key: "safe", label: "My Safe" }, { key: "log", label: "Activity Log" }, { key: "backup", label: "Backup" }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
            background: activeTab === tab.key ? "rgba(255,255,255,0.1)" : "transparent",
            color: activeTab === tab.key ? "#E8E8E8" : "rgba(255,255,255,0.35)",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        {activeTab === "safe" ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {DENOMINATIONS.map(d => (
                <DenomCard key={d.key} denom={d} count={cash[d.key] || 0} onChange={v => handleDenomChange(d.key, v)} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={() => setShowDeposit(true)} style={{
                flex: 1, padding: "14px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #2D6A4F, #40916C)",
                color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 4px 20px rgba(45,106,79,0.3)",
              }}>+ Add Cash</button>
              <button onClick={() => setShowWithdraw(true)} style={{
                flex: 1, padding: "14px", borderRadius: 14, border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)",
                color: "#EF4444", fontSize: 15, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>− Withdraw</button>
            </div>
          </>
        ) : activeTab === "backup" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              padding: "20px", borderRadius: 16, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#E8E8E8", marginBottom: 4 }}>Export Your Data</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 14px" }}>
                Copy your safe data to your clipboard. Paste it into a note to save it.
              </p>
              <button onClick={handleExport} style={{
                width: "100%", padding: "12px", borderRadius: 12, border: "none",
                background: exportCopied ? "linear-gradient(135deg, #2D6A4F, #40916C)" : "rgba(255,255,255,0.08)",
                color: exportCopied ? "#fff" : "#E8E8E8", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.3s",
              }}>
                {exportCopied ? "Copied to Clipboard!" : "Copy Backup to Clipboard"}
              </button>
            </div>
            <div style={{
              padding: "20px", borderRadius: 16, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#E8E8E8", marginBottom: 4 }}>Restore From Backup</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 14px" }}>
                Paste a previously exported backup below to restore your data.
              </p>
              <textarea
                placeholder="Paste your backup data here..."
                value={importText}
                onChange={e => { setImportText(e.target.value); setImportStatus(null); }}
                style={{
                  width: "100%", minHeight: 100, padding: "12px 16px", borderRadius: 12,
                  border: importStatus === "error" ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)", color: "#E8E8E8", fontSize: 13,
                  fontFamily: "'DM Mono', monospace", outline: "none", resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              {importStatus === "error" && (
                <div style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>
                  Invalid backup data. Make sure you pasted the full export text.
                </div>
              )}
              {importStatus === "success" && (
                <div style={{ fontSize: 12, color: "#52B788", marginTop: 8 }}>
                  Data restored successfully!
                </div>
              )}
              <button
                disabled={!importText.trim()}
                onClick={handleImport}
                style={{
                  width: "100%", padding: "12px", borderRadius: 12, border: "none", marginTop: 12,
                  background: importText.trim() ? "linear-gradient(135deg, #2D6A4F, #40916C)" : "rgba(255,255,255,0.06)",
                  color: importText.trim() ? "#fff" : "rgba(255,255,255,0.2)", fontSize: 14, fontWeight: 600,
                  cursor: importText.trim() ? "pointer" : "default",
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                }}>
                Restore Data
              </button>
            </div>
          </div>
        ) : (
          <>
            {log.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                color: "rgba(255,255,255,0.25)", fontSize: 14,
              }}>
                No transactions yet. Add or withdraw cash to see activity here.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {log.map((entry, i) => <LogEntry key={i} entry={entry} />)}
              </div>
            )}
          </>
        )}
      </div>

      {showWithdraw && <WithdrawModal cash={cash} onClose={() => setShowWithdraw(false)} onWithdraw={handleWithdraw} />}
      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} onDeposit={handleDeposit} />}
    </div>
  );
}
