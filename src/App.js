import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ReactComponent as LovwIcon } from './lovwteaecg.svg';
import OrderDetails from './OrderDetails';

const POLLING_INTERVAL = 5000;
const COST_LOOKBACK_MONTHS = 2;
const COST_TAB_PASSWORD = '259333';

const getOrderTimestamp = (order) => {
  return order?.closedAt || order?.createdAt || order?.updatedAt || null;
};

const isCompletedInLookbackWindow = (order, monthsBack) => {
  if (order?.state !== 'COMPLETED') return false;
  const timestamp = getOrderTimestamp(order);
  if (!timestamp) return false;

  const orderDate = new Date(timestamp);
  if (Number.isNaN(orderDate.getTime())) return false;

  const earliestDate = new Date();
  earliestDate.setMonth(earliestDate.getMonth() - monthsBack);
  return orderDate >= earliestDate;
};

const initialAddresses = [
  
];

const App = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [addresses, setAddresses] = useState(() => {
    const saved = localStorage.getItem('addresses');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate legacy string addresses to structured format
      return parsed.map(addr => {
        if (typeof addr.address === 'string') {
          const parts = addr.address.split(',').map(part => part.trim());
          if (parts.length < 3) {
            console.warn('Invalid legacy address format:', addr.address);
            return addr; // Skip invalid addresses or handle differently
          }
          const [street, city, stateZip] = parts;
          const stateZipParts = stateZip.split(' ');
          const state = stateZipParts[0];
          const zip = stateZipParts[1] || '';
          return {
            ...addr,
            address: {
              address_line_1: street,
              address_line_2: '',
              locality: city,
              administrative_district_level_1: state,
              postal_code: zip,
              country: 'US'
            }
          };
        }
        return addr;
      });
    }
    return initialAddresses;
  });
  const [newAddressName, setNewAddressName] = useState('');
  const [newAddressText, setNewAddressText] = useState('');
  const [removedOrders, setRemovedOrders] = useState([]);
  const [costOrders, setCostOrders] = useState([]);
  const [isLoadingCostOrders, setIsLoadingCostOrders] = useState(false);
  const [costOrdersLoaded, setCostOrdersLoaded] = useState(false);
  const [costTabError, setCostTabError] = useState(null);
  const [costTabUnlocked, setCostTabUnlocked] = useState(false);
  const [costTabPasswordInput, setCostTabPasswordInput] = useState('');
  const [showCostPasswordModal, setShowCostPasswordModal] = useState(false);
  const [costMap, setCostMap] = useState(() => {
    const saved = localStorage.getItem('costMap');
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  });

  // Save addresses to localStorage when they change
  useEffect(() => {
    localStorage.setItem('addresses', JSON.stringify(addresses));
  }, [addresses]);

  useEffect(() => {
    localStorage.setItem('costMap', JSON.stringify(costMap));
  }, [costMap]);

  const getClearedOrderIds = () => {
    const clearedOrders = localStorage.getItem('clearedOrders');
    return clearedOrders ? JSON.parse(clearedOrders) : [];
  };

  const addClearedOrderId = (id) => {
    const clearedOrders = getClearedOrderIds();
    const updatedClearedOrders = [...clearedOrders, id];
    localStorage.setItem('clearedOrders', JSON.stringify(updatedClearedOrders));
  };

  const removeClearedOrderId = (id) => {
    const clearedOrders = getClearedOrderIds();
    const updatedClearedOrders = clearedOrders.filter((orderId) => orderId !== id);
    localStorage.setItem('clearedOrders', JSON.stringify(updatedClearedOrders));
  };

  const undoLastRemoval = () => {
    if (removedOrders.length === 0) return;
    const [lastRemoved, ...remainingRemoved] = removedOrders;
    removeClearedOrderId(lastRemoved.id);
    setOrders((prevOrders) => [lastRemoved, ...prevOrders]);
    setRemovedOrders(remainingRemoved);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        console.log('Raw API orders count:', data.length);
        console.log('Raw API orders:', data.map(o => ({ id: o.id, state: o.state, source: o.source?.name })));
        
        const clearedOrderIds = getClearedOrderIds();
        console.log('Cleared order IDs:', clearedOrderIds);
        
        const filteredOrders = data.filter((order) => {
          const isCleared = clearedOrderIds.includes(order.id);
          const isCompletedOrOpen =  order.state === 'COMPLETED' ||   order.state === 'OPEN';
    
          return !isCleared && isCompletedOrOpen;
        });
        console.log('Filtered orders after clearing:', filteredOrders.length);
        setOrders(filteredOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err.message);
      }
    };

    fetchOrders();
    const intervalId = setInterval(fetchOrders, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  const setRandomSeed = () => {
    const turbulence = document.getElementById('dissolve-filter-turbulence');
    if (turbulence) {
      turbulence.setAttribute('seed', Math.random() * 1000);
    }
  };

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const maxDisplacementScale = 2000;

  const applyThanosSnap = (element) => {
    if (element.getAttribute('data-being-destroyed') === 'true') return;
    const displacement = document.getElementById('dissolve-filter-displacement');
    setRandomSeed();
    element.style.filter = 'url(#dissolve-filter)';
    const duration = 1000;
    const startTime = performance.now();
    element.setAttribute('data-being-destroyed', 'true');

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const displacementScale = easeOutCubic(progress) * maxDisplacementScale;
      if (displacement) displacement.setAttribute('scale', displacementScale);
      element.style.transform = `scale(${1 + 0.1 * progress})`;
      element.style.opacity = progress < 0.5 ? 1 : 1 - ((progress - 0.5) * 2);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (displacement) displacement.setAttribute('scale', 0);
        // Do not manually remove the DOM node here.
        // React will remove it when the order is removed from state.
        element.style.opacity = '0';
      }
    };

    requestAnimationFrame(animate);
  };

  const handleDoubleClick = (id) => {
    const orderToRemove = orders.find((order) => order.id === id);
    if (!orderToRemove) return;

    const element = document.querySelector(`[data-order-id="${id}"]`);
    if (element) {
      try {
        applyThanosSnap(element);

        setTimeout(() => {
          addClearedOrderId(id);
          setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
          setRemovedOrders((prevRemoved) => [orderToRemove, ...prevRemoved]);
        }, 1000);
      } catch (error) {
        console.error('Error during order removal animation:', error);
        // Fallback: just remove without animation
        addClearedOrderId(id);
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
        setRemovedOrders((prevRemoved) => [orderToRemove, ...prevRemoved]);
      }
    }
  };

  const formatCurrency = (amount) => `$${(amount / 100).toFixed(2)}`;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const isWebOrder = (order) => {
    return !!order?.source?.name?.toLowerCase().includes('online');
  };

  const getOrderName = (order) => {
    if (!order || !isWebOrder(order)) return null;

    const recipientName = order.fulfillments?.flatMap((fulfillment) => {
      const recipient = fulfillment?.pickupDetails?.recipient || fulfillment?.shipmentDetails?.recipient;
      if (!recipient) return [];
      return recipient.displayName ? [recipient.displayName] : [];
    })?.[0];

    if (recipientName) return recipientName;

    return order.customerId || null;
  };

  const getPrimaryModifier = (item) => {
    if (!item.modifiers || item.modifiers.length === 0) return null;
    const sizeModifier = item.modifiers.find((mod) => ['Regular', 'Large'].includes(mod.name));
    return sizeModifier ? sizeModifier.name : null;
  };

  const getAdditionalModifiers = (item) => {
    if (!item.modifiers || item.modifiers.length === 0) return [];
    return item.modifiers.filter((mod) => !['Regular', 'Large'].includes(mod.name));
  };

  const fetchCompletedOrdersForCosting = useCallback(async () => {
    setIsLoadingCostOrders(true);
    setCostTabError(null);

    try {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch completed orders');

      const data = await response.json();
      const filteredOrders = data
        .filter((order) => isCompletedInLookbackWindow(order, COST_LOOKBACK_MONTHS))
        .sort((a, b) => {
          const dateA = new Date(getOrderTimestamp(a) || 0).getTime();
          const dateB = new Date(getOrderTimestamp(b) || 0).getTime();
          return dateB - dateA;
        });

      setCostOrders(filteredOrders);
      setCostOrdersLoaded(true);
    } catch (err) {
      console.error('Error fetching completed cost orders:', err);
      setCostTabError(err.message);
    } finally {
      setIsLoadingCostOrders(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'costs' && !costOrdersLoaded) {
      fetchCompletedOrdersForCosting();
    }
  }, [activeTab, costOrdersLoaded, fetchCompletedOrdersForCosting]);

  const costReferenceData = useMemo(() => {
    const lineItemCountMap = new Map();
    const modifierCountMap = new Map();
    const noteCountMap = new Map();

    costOrders.forEach((order) => {
      (order.lineItems || []).forEach((item) => {
        const itemName = (item.name || '').trim();
        const quantity = Number(item.quantity) || 1;

        if (itemName) {
          lineItemCountMap.set(itemName, (lineItemCountMap.get(itemName) || 0) + quantity);
        }

        (item.modifiers || []).forEach((mod) => {
          const name = (mod?.name || '').trim();
          if (!name) return;
          modifierCountMap.set(name, (modifierCountMap.get(name) || 0) + quantity);
        });

        const noteText = (item.note || '').trim();
        if (noteText) {
          noteCountMap.set(noteText, (noteCountMap.get(noteText) || 0) + quantity);
        }
      });
    });

    const lineItems = Array.from(lineItemCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const modifiers = Array.from(modifierCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const notes = Array.from(noteCountMap.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));

    return { lineItems, modifiers, notes };
  }, [costOrders]);

  const getCostKey = (type, value) => `${type}::${value}`;

  const handleCostInputChange = (key, value) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setCostMap((prev) => ({ ...prev, [key]: sanitized }));
  };

  const getNumericCost = (key) => {
    const parsed = Number(costMap[key]);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatDollars = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const getEstimatedOrderCost = (order) => {
    let totalCost = 0;

    (order.lineItems || []).forEach((item) => {
      const itemName = (item.name || '').trim();
      const quantity = Number(item.quantity) || 1;

      if (itemName) {
        totalCost += quantity * getNumericCost(getCostKey('lineItem', itemName));
      }

      (item.modifiers || []).forEach((mod) => {
        const name = (mod?.name || '').trim();
        if (!name) return;
        totalCost += quantity * getNumericCost(getCostKey('modifier', name));
      });

      const noteText = (item.note || '').trim();
      if (noteText) {
        totalCost += quantity * getNumericCost(getCostKey('note', noteText));
      }
    });

    return totalCost;
  };

  const getEstimatedItemCost = (item) => {
    let itemCost = 0;
    const itemName = (item.name || '').trim();
    const quantity = Number(item.quantity) || 1;

    if (itemName) {
      itemCost += quantity * getNumericCost(getCostKey('lineItem', itemName));
    }

    (item.modifiers || []).forEach((mod) => {
      const name = (mod?.name || '').trim();
      if (!name) return;
      itemCost += quantity * getNumericCost(getCostKey('modifier', name));
    });

    const noteText = (item.note || '').trim();
    if (noteText) {
      itemCost += quantity * getNumericCost(getCostKey('note', noteText));
    }

    return itemCost;
  };

  const handleCostTabClick = () => {
    if (!costTabUnlocked) {
      // Show password modal when trying to access locked tab
      setShowCostPasswordModal(true);
      return;
    }
    setActiveTab('costs');
  };

  const handleCostPasswordSubmit = (e) => {
    e.preventDefault();
    if (costTabPasswordInput === COST_TAB_PASSWORD) {
      setCostTabUnlocked(true);
      setCostTabPasswordInput('');
      setShowCostPasswordModal(false);
      setActiveTab('costs');
    } else {
      alert('Incorrect passcode. Please try again.');
      setCostTabPasswordInput('');
    }
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (newAddressName && newAddressText) {
      const parts = newAddressText.split(',').map(part => part.trim());
      if (parts.length < 3) {
        alert('Please enter address in format: Street, City, State ZIP');
        return;
      }
      const [street, city, stateZip] = parts;
      const stateZipParts = stateZip.split(' ');
      const state = stateZipParts[0];
      const zip = stateZipParts[1] || '';

      const newAddress = {
        id: `${Date.now()}`,
        name: newAddressName,
        address: {
          address_line_1: street,
          address_line_2: '',
          locality: city,
          administrative_district_level_1: state,
          postal_code: zip,
          country: 'US'
        }
      };
      setAddresses([...addresses, newAddress]);
      setNewAddressName('');
      setNewAddressText('');
    }
  };

  const handleSelectAddress = async (address) => {
    try {
      // Log the address being sent for debugging
      console.log('Sending address to server:', address);
      const response = await fetch('/api/locations/LQADAKKDZFZJC', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.address })
      });
      if (!response.ok) throw new Error('Failed to set location in Square');
      await response.json();
      alert(`Location set to ${address.name}`);
    } catch (err) {
      console.error('Error setting Square location:', err);
      setError(err.message);
    }
  };

  return (
    <div style={styles.appContainer}>
      <h1 style={styles.heading}>Blonde Shot Coffee</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <button
          style={activeTab === 'orders' ? styles.activeTab : styles.inactiveTab}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button
          style={activeTab === 'addresses' ? styles.activeTab : styles.inactiveTab}
          onClick={() => setActiveTab('addresses')}
        >
          Addresses
        </button>
        <button
          style={activeTab === 'costs' ? styles.activeTab : styles.inactiveTab}
          onClick={handleCostTabClick}
        >
          Cost Builder
        </button>
        <button
          style={activeTab === 'trade' ? styles.activeTab : styles.inactiveTab}
          onClick={() => setActiveTab('trade')}
        >
          Order Details
        </button>
      </div>

      {activeTab === 'trade' && (
        <div style={{ marginBottom: '-20px' }}>
          <OrderDetails />
        </div>
      )}

      {/* Undo Button */}
      {removedOrders.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <button style={styles.undoTopButton} onClick={undoLastRemoval}>
            Undo Last Removal ({removedOrders.length})
          </button>
        </div>
      )}

      {/* SVG Filter */}
      <svg style={{ display: 'none' }}>
        <filter id="dissolve-filter">
          <feTurbulence
            id="dissolve-filter-turbulence"
            type="turbulence"
            baseFrequency="0.01"
            numOctaves="3"
            result="turbulence"
          />
          <feDisplacementMap
            id="dissolve-filter-displacement"
            in="SourceGraphic"
            in2="turbulence"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {error && <p style={styles.errorText}>{error}</p>}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
          {orders && orders.length > 0 ? (
            orders.map((order) => (
              <div
                key={order.id}
                style={styles.card}
                onDoubleClick={() => handleDoubleClick(order.id)}
                data-order-id={order.id}
              >
                <nav style={styles.nav}>
                  <div style={styles.navContent}>
                    <div style={styles.heartIconWrap}>
                      <LovwIcon style={styles.heartIcon} />
                    </div>
                  </div>
                  <span style={styles.orderDateNav}>{formatDate(order.createdAt)}</span>
                </nav>
                {getOrderName(order) && (
                  <div style={styles.customerNameBox}>
                    <span style={styles.customerNameText}>{getOrderName(order)}</span>
                  </div>
                )}
                <div style={styles.description}>
                  {(order.lineItems || []).map((item, index) => {
                    const primaryModifier = getPrimaryModifier(item);
                    const additionalModifiers = getAdditionalModifiers(item);
                    const visibleModifiers = primaryModifier ? additionalModifiers : (item.modifiers || []);
                    return (
                      <div key={index} style={styles.lineItem}>
                        <h2 style={styles.orderTitle}>
                          {item.name} <strong>({item.quantity})</strong>
                        </h2>
                        {primaryModifier && (
                          <h4 style={styles.variationName}>{primaryModifier}</h4>
                        )}
                        {(primaryModifier && additionalModifiers.length > 0) || (!primaryModifier && item.modifiers && item.modifiers.length > 0) || item.note ? (
                          <div style={styles.modifiers}>
                            {visibleModifiers.map((mod, idx) => (
                              <p key={idx} style={styles.modifier}>{mod.name}</p>
                            ))}
                            {item.note && <p style={styles.note}>{item.note}</p>}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  <h1 style={styles.orderTotal}>
                    Total: {formatCurrency(order.totalMoney?.amount)}
                  </h1>
                </div>
              </div>
            ))
          ) : (
            <p style={styles.noOrdersText}>No orders available.</p>
          )}
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Add Address Form */}
          <div style={styles.card}>
            <h2 style={{ color: '#515151', fontSize: '20px', marginBottom: '10px' }}>
              Add New Address
            </h2>
            <form onSubmit={handleAddAddress}>
              <input
                type="text"
                placeholder="Location Name"
                value={newAddressName}
                onChange={(e) => setNewAddressName(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Address"
                value={newAddressText}
                onChange={(e) => setNewAddressText(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.button}>Add Address</button>
            </form>
          </div>

          {/* Address List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', marginTop: '20px' }}>
            {addresses.map((address) => (
              <div
                key={address.id}
                style={styles.card}
                onClick={() => handleSelectAddress(address)}
              >
                <h3 style={{ color: '#515151', fontSize: '18px' }}>{address.name}</h3>
                <p style={{ color: '#727272' }}>
                  {address.address.address_line_1}, {address.address.locality}, {address.address.administrative_district_level_1} {address.address.postal_code}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Tab Password Modal */}
      {showCostPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalHeading}>Enter Passcode</h2>
            <p style={styles.modalSubtext}>This feature is password protected.</p>
            <form onSubmit={handleCostPasswordSubmit} style={styles.passwordForm}>
              <input
                type="password"
                placeholder="Enter passcode"
                value={costTabPasswordInput}
                onChange={(e) => setCostTabPasswordInput(e.target.value)}
                style={styles.passwordInput}
                autoFocus
              />
              <button type="submit" style={styles.passwordButton}>
                Unlock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cost Builder Tab */}
      {activeTab === 'costs' && costTabUnlocked && (
        <div style={styles.costBuilderContainer}>
          <div style={styles.costToolbar}>
            <div>
              <h2 style={styles.costHeading}>Completed Orders (Last {COST_LOOKBACK_MONTHS} Months)</h2>
              <p style={styles.costSubHeading}>Build your make-cost list from unique modifiers and notes.</p>
            </div>
            <button
              type="button"
              style={styles.refreshButton}
              onClick={fetchCompletedOrdersForCosting}
              disabled={isLoadingCostOrders}
            >
              {isLoadingCostOrders ? 'Loading...' : 'Refresh Orders'}
            </button>
          </div>

          {costTabError && <p style={styles.errorText}>{costTabError}</p>}

          <div style={styles.costSummaryGrid}>
            <div style={styles.summaryCard}>
              <strong>{costOrders.length}</strong>
              <span>Completed Orders</span>
            </div>
            <div style={styles.summaryCard}>
              <strong>{costReferenceData.lineItems.length}</strong>
              <span>Unique Line Items</span>
            </div>
            <div style={styles.summaryCard}>
              <strong>{costReferenceData.modifiers.length}</strong>
              <span>Unique Modifiers</span>
            </div>
            <div style={styles.summaryCard}>
              <strong>{costReferenceData.notes.length}</strong>
              <span>Unique Notes</span>
            </div>
          </div>

          <div style={styles.costColumns}>
            <div style={styles.costColumn}>
              <h3 style={styles.costColumnHeading}>Line Item Costs</h3>
              {costReferenceData.lineItems.length === 0 ? (
                <p style={styles.noOrdersText}>No line items found in this date range.</p>
              ) : (
                costReferenceData.lineItems.map((lineItem) => {
                  const key = getCostKey('lineItem', lineItem.name);
                  return (
                    <div key={key} style={styles.costRow}>
                      <div style={styles.costLabelBlock}>
                        <span style={styles.costLabel}>{lineItem.name}</span>
                        <span style={styles.costCount}>Used {lineItem.count}x</span>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={costMap[key] || ''}
                        onChange={(event) => handleCostInputChange(key, event.target.value)}
                        style={styles.costInput}
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div style={styles.costColumn}>
              <h3 style={styles.costColumnHeading}>Modifier Costs</h3>
              {costReferenceData.modifiers.length === 0 ? (
                <p style={styles.noOrdersText}>No modifiers found in this date range.</p>
              ) : (
                costReferenceData.modifiers.map((modifier) => {
                  const key = getCostKey('modifier', modifier.name);
                  return (
                    <div key={key} style={styles.costRow}>
                      <div style={styles.costLabelBlock}>
                        <span style={styles.costLabel}>{modifier.name}</span>
                        <span style={styles.costCount}>Used {modifier.count}x</span>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={costMap[key] || ''}
                        onChange={(event) => handleCostInputChange(key, event.target.value)}
                        style={styles.costInput}
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div style={styles.costColumn}>
              <h3 style={styles.costColumnHeading}>Note Costs</h3>
              {costReferenceData.notes.length === 0 ? (
                <p style={styles.noOrdersText}>No notes found in this date range.</p>
              ) : (
                costReferenceData.notes.map((note) => {
                  const key = getCostKey('note', note.text);
                  return (
                    <div key={key} style={styles.costRow}>
                      <div style={styles.costLabelBlock}>
                        <span style={styles.costLabel}>{note.text}</span>
                        <span style={styles.costCount}>Used {note.count}x</span>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={costMap[key] || ''}
                        onChange={(event) => handleCostInputChange(key, event.target.value)}
                        style={styles.costInput}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h3 style={{ ...styles.costColumnHeading, marginBottom: '16px' }}>Order Cost Estimates</h3>
            {costOrders.length === 0 ? (
              <p style={styles.noOrdersText}>No completed orders found in the last {COST_LOOKBACK_MONTHS} months.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {costOrders.map((order) => {
                  const estimatedCost = getEstimatedOrderCost(order);
                  const saleTotal = Number(order?.totalMoney?.amount || 0) / 100;
                  const margin = saleTotal - estimatedCost;

                  return (
                    <div key={order.id} style={styles.card}>
                      <nav style={styles.nav}>
                        <div style={styles.navContent}>
                          <div style={styles.heartIconWrap}>
                            <LovwIcon style={styles.heartIcon} />
                          </div>
                        </div>
                        <span style={styles.orderDateNav}>
                          {new Date(getOrderTimestamp(order)).toLocaleDateString()}
                        </span>
                      </nav>
                      {getOrderName(order) && (
                        <div style={styles.customerNameBox}>
                          <span style={styles.customerNameText}>{getOrderName(order)}</span>
                        </div>
                      )}
                      <div style={styles.description}>
                        {(order.lineItems || []).map((item, index) => {
                          const primaryModifier = getPrimaryModifier(item);
                          const additionalModifiers = getAdditionalModifiers(item);
                          const visibleModifiers = primaryModifier ? additionalModifiers : (item.modifiers || []);
                          const itemEstimatedCost = getEstimatedItemCost(item);
                          return (
                            <div key={index} style={styles.lineItem}>
                              <h2 style={styles.orderTitle}>
                                {item.name} <strong>({item.quantity})</strong>
                              </h2>
                              {primaryModifier && (
                                <h4 style={styles.variationName}>{primaryModifier}</h4>
                              )}
                              {((primaryModifier && additionalModifiers.length > 0) || (!primaryModifier && item.modifiers && item.modifiers.length > 0) || item.note) ? (
                                <div style={styles.modifiers}>
                                  {visibleModifiers.map((mod, idx) => (
                                    <p key={idx} style={styles.modifier}>{mod.name}</p>
                                  ))}
                                  {item.note && <p style={styles.note}>{item.note}</p>}
                                </div>
                              ) : null}
                              {itemEstimatedCost > 0 && (
                                <div style={styles.itemCostLine}>
                                  <span style={styles.itemCostLabel}>Item cost: {formatDollars(itemEstimatedCost)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div style={styles.costTotalsRow}>
                          <span style={styles.orderTotal}>Total: {formatDollars(saleTotal)}</span>
                          <span style={{ ...styles.orderTotal, color: margin >= 0 ? '#2f855a' : '#c53030' }}>
                            Est. Cost: {formatDollars(estimatedCost)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Styles (unchanged, included for completeness)
const styles = {
  appContainer: {
    padding: '20px',
    fontFamily: "'Raleway', sans-serif",
    backgroundColor: '#ffffff',
    minHeight: '100vh',
  },
  heading: {
    textAlign: 'center',
    color: '#515151',
    marginBottom: '20px',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  noOrdersText: {
    textAlign: 'center',
    color: '#727272',
  },
  card: {
    width: '325px',
    background: 'white',
    boxShadow: '0 2px 5px rgba(0,0,0,0.16), 0 2px 10px rgba(0,0,0,0.12)',
    transition: 'all 0.3s',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    margin: '0',
  },
  nav: {
    width: '98%',
    padding: '5px',
    borderBottom: '2px solid pink',
    color: '#727272',
    textTransform: 'uppercase',
    fontSize: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navContent: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '36px',
    gap: '10px',
  },
  orderCustomer: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#515151',
    textTransform: 'none',
  },
  customerNameBox: {
    backgroundColor: '#fce7f3',
    borderRadius: '20px',
    padding: '8px 16px',
    margin: '10px 20px',
    display: 'inline-block',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  customerNameText: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'rgb(44,62,80)',
    textTransform: 'none',
  },
  heartIcon: {
    height: '24px',
    width: '24px',
    transform: 'scale(3.83)',
    transformOrigin: 'center',
    display: 'block',
    cursor: 'pointer',
  },
  heartIconWrap: {
    height: '24px',
    width: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'visible',
  },
  orderDateNav: {
    fontSize: '14px',
    color: '#727272',
    fontWeight: '500',
  },
  description: {
    padding: '20px',
  },
  orderTitle: {
    color: '#515151',
    fontWeight: '500',
    fontSize: '18px',
    margin: '10px 0',
    textTransform: 'uppercase',
  },
  variationName: {
    color: '#727272',
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '2px 0',
  },
  modifiers: {
    marginTop: '4px',
    paddingLeft: '10px',
  },
  modifier: {
    color: '#ff79a8',
    fontSize: '14px',
    margin: '2px 0',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  note: {
    color: '#ff79a8',
    fontSize: '14px',
    margin: '2px 0',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  lineItem: {
    marginBottom: '10px',
  },
  orderTotal: {
    color: '#515151',
    fontWeight: '500',
    fontSize: '20px',
    margin: '10px 0',
    textAlign: 'right',
  },
  activeTab: {
    backgroundColor: 'white',
    color: '#d14f69',
    padding: '10px 20px',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    fontWeight: 'bold',
  },
  inactiveTab: {
    backgroundColor: '#f0f0f0',
    color: '#727272',
    padding: '10px 20px',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    cursor: 'pointer',
    border: 'none',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#d14f69',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  undoTopButton: {
    padding: '12px 20px',
    backgroundColor: '#a8c4a0',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
  costBuilderContainer: {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  costToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  costHeading: {
    margin: 0,
    color: '#515151',
    fontSize: '24px',
  },
  costSubHeading: {
    margin: '6px 0 0',
    color: '#727272',
  },
  refreshButton: {
    padding: '10px 14px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#d14f69',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
  },
  costSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '12px 14px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    color: '#515151',
    gap: '4px',
  },
  costColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
    alignItems: 'start',
  },
  costColumn: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  costColumnHeading: {
    margin: 0,
    color: '#515151',
  },
  costRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  costLabelBlock: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1,
  },
  costLabel: {
    fontSize: '14px',
    color: '#404040',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  costCount: {
    fontSize: '12px',
    color: '#7b7b7b',
  },
  costInput: {
    width: '88px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    padding: '8px',
    textAlign: 'right',
  },
  costTotalsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
    borderTop: '1px solid #f9d4e0',
    paddingTop: '8px',
    marginTop: '6px',
  },
  itemCostLine: {
    marginTop: '4px',
    paddingTop: '4px',
    borderTop: '1px solid #f0e0e5',
  },
  itemCostLabel: {
    fontSize: '12px',
    color: '#8b5a6b',
    fontStyle: 'italic',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    maxWidth: '360px',
    width: '90%',
  },
  modalHeading: {
    margin: '0 0 8px',
    color: '#515151',
    fontSize: '24px',
    fontWeight: '600',
  },
  modalSubtext: {
    margin: '0 0 20px',
    color: '#727272',
    fontSize: '14px',
  },
  passwordForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  passwordInput: {
    padding: '10px 12px',
    border: '1px solid #d0d0d0',
    borderRadius: '8px',
    fontSize: '16px',
  },
  passwordButton: {
    padding: '10px 16px',
    backgroundColor: '#d14f69',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default App;