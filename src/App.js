import React, { useEffect, useState } from 'react';

const POLLING_INTERVAL = 5000;

const initialAddresses = [
  {
    id: '1',
    name: 'Farmers Market',
    address: {
      address_line_1: '228 E Kerr St',
      locality: 'Salisbury',
      administrative_district_level_1: 'NC',
      postal_code: '28144',
      country: 'US'
    }
  },
  {
    id: '2',
    name: 'Osprey At Lake Norman',
    address: {
      address_line_1: '134 Village Club Dr',
      locality: 'Mooresville',
      administrative_district_level_1: 'NC',
      postal_code: '28117',
      country: 'US'
    }
  },
  {
    id: '3',
    name: 'Leatherman Lane',
    address: {
      address_line_1: '79046 Overcash Rd',
      locality: 'Concord',
      administrative_district_level_1: 'NC',
      postal_code: '28027',
      country: 'US'
    }
  },
  {
    id: '4',
    name: 'Eastside Hub',
    address: {
      address_line_1: '101 Latte Rd',
      locality: 'Seattle',
      administrative_district_level_1: 'WA',
      postal_code: '98104',
      country: 'US'
    }
  },
  {
    id: '5',
    name: 'North End',
    address: {
      address_line_1: '321 Mocha Blvd',
      locality: 'Seattle',
      administrative_district_level_1: 'WA',
      postal_code: '98105',
      country: 'US'
    }
  }
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

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('Failed to fetch orders');
        const data = await response.json();
        const clearedOrderIds = getClearedOrderIds();
        const filteredOrders = data.filter((order) => !clearedOrderIds.includes(order.id));
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
        element.remove();
      }
    };

    requestAnimationFrame(animate);
  };

  const handleDoubleClick = (id) => {
    const element = document.querySelector(`[data-order-id="${id}"]`);
    if (element) {
      applyThanosSnap(element);
      setTimeout(() => {
        addClearedOrderId(id);
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
      }, 1000);
    }
  };

  const formatCurrency = (amount) => `$${(amount / 100).toFixed(2)}`;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const options = { month: 'short' };
    const month = date.toLocaleString(undefined, options);
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${month} ${day} ${formattedHours}:${formattedMinutes} ${ampm}`;
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
      const data = await response.json();
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
                    {order.source?.sourceType === 'ONLINE' ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        style={styles.heartIcon}
                      >
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484q-.121.12-.242.234c-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 512 512"
                        width="24"
                        xmlns="http://www.w3.org/2000/svg"
                        style={styles.heartIcon}
                      >
                        <path d="M340.8,98.4c50.7,0,91.9,41.3,91.9,92.3c0,26.2-10.9,49.8-28.3,66.6L256,407.1L105,254.6c-15.8-16.6-25.6-39.1-25.6-63.9 c0-51,41.1-92.3,91.9-92.3c38.2,0,70.9,23.4,84.8,56.8C269.8,121.9,302.6,98.4,340.8,98.4 M340.8,83C307,83,276,98.8,256,124.8 c-20-26-51-41.8-84.8-41.8C112.1,83,64,131.3,64,190.7c0,27.9,10.6,54.4,29.9,74.6L245.1,418l10.9,11l10.9-11l148.3-149.8 c21-20.3,32.8-47.9,32.8-77.5C448,131.3,399.9,83,340.8,83L340.8,83z" />
                      </svg>
                    )}
                  </div>
                  <span style={styles.orderDateNav}>{formatDate(order.createdAt)}</span>
                </nav>
                <div style={styles.description}>
                  {order.lineItems.map((item, index) => (
                    <div key={index} style={styles.lineItem}>
                      <h2 style={styles.orderTitle}>
                        {item.name} <strong>({item.quantity})</strong>
                      </h2>
                      {item.variationName && (
                        <h4 style={styles.variationName}>{item.variationName}</h4>
                      )}
                    </div>
                  ))}
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
    width: '100%',
    padding: '20px',
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
    gap: '10px',
  },
  heartIcon: {
    height: '24px',
    width: '24px',
    cursor: 'pointer',
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
  lineItem: {
    marginBottom: '10px',
  },
  orderTotal: {
    color: '#515151',
    fontWeight: '500',
    fontSize: '20px',
    margin: '10px 0',
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
};

export default App;