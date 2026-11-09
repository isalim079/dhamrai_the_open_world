import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore.js';
import { useGameStore } from '../state/useGameStore.js';
import type { InventoryItem } from '@dhamrai/shared-contracts';

export const InventoryModal: React.FC = () => {
  const isInventoryOpen = useUIStore((s) => s.isInventoryOpen);
  const toggleInventory = useUIStore((s) => s.toggleInventory);

  const inventoryItems = useGameStore((s) => s.inventoryItems);
  const cashFormatted = useGameStore((s) => s.cashFormattedBdt);
  const engine = useGameStore((s) => s.engine);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  if (!isInventoryOpen) return null;

  const totalSlots = 20;
  const slots: (InventoryItem | null)[] = Array(totalSlots).fill(null);
  inventoryItems.forEach((item, idx) => {
    if (idx < totalSlots) slots[idx] = item;
  });

  const ledger = engine?.economy.ledger.slice(-5).reverse() ?? [];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(6px)',
      }}
      onClick={toggleInventory}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '640px',
          maxHeight: '80vh',
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          color: '#c9d1d9',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #21262d',
            backgroundColor: '#161b22',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#f0f6fc' }}>
              রিকশাচালকের থলে (Inventory)
            </h2>
            <div style={{ fontSize: '13px', color: '#7ee787', marginTop: 2, fontWeight: 'bold' }}>
              নগদ তহবিল: {cashFormatted} BDT
            </div>
          </div>
          <button
            onClick={toggleInventory}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content: Inventory Grid + Item Detail */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, padding: '20px', overflowY: 'auto' }}>
          {/* Left: 4x5 Slots Grid */}
          <div>
            <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
              আইটেম স্লট (Items: {inventoryItems.length}/{totalSlots})
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
              }}
            >
              {slots.map((item, index) => {
                const isSelected = selectedItem?.id === item?.id && item !== null;
                return (
                  <div
                    key={index}
                    onClick={() => item && setSelectedItem(item)}
                    style={{
                      aspectRatio: '1',
                      backgroundColor: item ? '#161b22' : 'rgba(22, 27, 34, 0.4)',
                      border: isSelected
                        ? '2px solid #58a6ff'
                        : item
                        ? '1px solid #30363d'
                        : '1px dashed #21262d',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: item ? 'pointer' : 'default',
                      position: 'relative',
                      padding: 4,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {item ? (
                      <>
                        <div style={{ fontSize: '20px' }}>
                          {item.category === 'DOCUMENT' ? '📄' : item.category === 'CARGO' ? '📦' : '🔧'}
                        </div>
                        <div
                          style={{
                            fontSize: '9px',
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            color: '#c9d1d9',
                            marginTop: 2,
                          }}
                        >
                          {item.nameBn}
                        </div>
                        {item.quantity > 1 && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 4,
                              fontSize: '10px',
                              color: '#7ee787',
                              fontWeight: 'bold',
                            }}
                          >
                            x{item.quantity}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#30363d', fontSize: '11px' }}>{index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Item Details & Recent Ledger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Detail Box */}
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '14px',
                minHeight: '140px',
              }}
            >
              {selectedItem ? (
                <>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#58a6ff' }}>
                    {selectedItem.nameBn}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: 8 }}>
                    {selectedItem.nameEn} · [{selectedItem.category}]
                  </div>
                  <div style={{ fontSize: '13px', color: '#c9d1d9', lineHeight: '1.4' }}>
                    {selectedItem.descriptionBn}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e', marginTop: 4, fontStyle: 'italic' }}>
                    "{selectedItem.descriptionEn}"
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#8b949e', padding: '30px 0', fontSize: '13px' }}>
                  বিস্তারিত দেখতে যেকোনো আইটেমে ক্লিক করুন
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#8b949e', textTransform: 'uppercase', marginBottom: 6 }}>
                সাম্প্রতিক লেনদেন (Recent Ledger)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ledger.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#8b949e' }}>কোনো লেনদেন রেকর্ড নেই</div>
                ) : (
                  ledger.map((tx) => {
                    const isCredit = tx.deltaMinorUnits >= 0;
                    return (
                      <div
                        key={tx.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          color: '#c9d1d9',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {tx.description}
                        </span>
                        <span style={{ color: isCredit ? '#7ee787' : '#f85149', fontWeight: 'bold' }}>
                          {isCredit ? '+' : ''}৳{(tx.deltaMinorUnits / 100).toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
