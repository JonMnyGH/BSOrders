import React, { useEffect, useState } from 'react';
import { ReactComponent as LovwIcon } from './lovwteaecg.svg';

const POLLING_INTERVAL = 5000;

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

  // Save addresses to localStorage when they change
  useEffect(() => {
    localStorage.setItem('addresses', JSON.stringify(addresses));
  }, [addresses]);

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
      </div>

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
                  {order.lineItems.map((item, index) => {
                    const primaryModifier = getPrimaryModifier(item);
                    const additionalModifiers = getAdditionalModifiers(item);
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
                            {(primaryModifier ? additionalModifiers : item.modifiers).map((mod, idx) => (
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
    </div>
  );
};

// Styles (unchanged, included for completeness)
const styles = {
  appContainer: {
    padding: '20px',
    fontFamily: "'Raleway', sans-serif",
    backgroundColor: '#fce7f3',
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
};

export default App;