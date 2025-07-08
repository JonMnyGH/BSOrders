import React, { useEffect, useState } from 'react';

const POLLING_INTERVAL = 5000;

const App = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

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
        console.log('Fetched Orders:', data);

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

  const easeOutCubic = (t) => {
    return 1 - Math.pow(1 - t, 3);
  };

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

      if (displacement) {
        displacement.setAttribute('scale', displacementScale);
      }

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
    console.log('Double-clicked card with ID:', id);

    const element = document.querySelector(`[data-order-id="${id}"]`);
    if (element) {
      applyThanosSnap(element); // Updated function name

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

  return (
    <div style={styles.appContainer}>
      <h1 style={styles.heading}>Blonde Shot Coffee</h1>
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
      <div style={styles.ordersContainer}>
        {orders && orders.length > 0 ? (
          orders.map((order) => (
            <div
              key={order.id}
              className="card"
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
                      style={styles.svgIcon}
                    >
                      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484q-.121.12-.242.234c-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z" />
                    </svg>
                  ) : (
                    <svg
                      className="heart"
                      viewBox="0 0 512 512"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                      style={styles.heartIcon} // Heart icon is now pink
                    >
                      <path d="M340.8,98.4c50.7,0,91.9,41.3,91.9,92.3c0,26.2-10.9,49.8-28.3,66.6L256,407.1L105,254.6c-15.8-16.6-25.6-39.1-25.6-63.9  c0-51,41.1-92.3,91.9-92.3c38.2,0,70.9,23.4,84.8,56.8C269.8,121.9,302.6,98.4,340.8,98.4 M340.8,83C307,83,276,98.8,256,124.8  c-20-26-51-41.8-84.8-41.8C112.1,83,64,131.3,64,190.7c0,27.9,10.6,54.4,29.9,74.6L245.1,418l10.9,11l10.9-11l148.3-149.8  c21-20.3,32.8-47.9,32.8-77.5C448,131.3,399.9,83,340.8,83L340.8,83z" />
                    </svg>
                  )}
                </div>
                <span style={styles.orderDateNav}>{formatDate(order.createdAt)}</span>
              </nav>
              <div className="description" style={styles.description}>
                {order.lineItems && order.lineItems.length > 0 ? (
                  order.lineItems.map((item, index) => (
                    <div key={index} style={styles.lineItem}>
                      <div style={styles.itemHeader}>
                        <h2 style={styles.orderTitle}>{item.name}</h2>
                        <div style={styles.circle}>
                          <p style={styles.circleText}>{item.quantity}</p>
                        </div>
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={styles.modifiersContainer}>
                          <ul style={styles.modifiersList}>
                            {item.modifiers.map((modifier, modIndex) => (
                              <li key={modIndex} style={styles.modifierItem}>
                                {modifier.name}{' '}
                                {modifier.catalog_object_id && (
                                  <span style={styles.modifierDetail}>
                                    (ID: {modifier.catalog_object_id})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No items available for this order.</p>
                )}
                <div style={styles.totalContainer}>
                  <div style={styles.statusContainer}>
                    <span style={styles.orderStatus}>
                      Status: {order.state || 'Unknown'}
                    </span>
                  </div>
                  <hr style={styles.dottedLine} />
                  <h1 style={styles.orderTotal}>
                    Total: {formatCurrency(order.totalMoney?.amount)}
                  </h1>
                </div>

              </div>
            </div>
          ))
        ) : (
          <p style={styles.noOrdersText}>No orders available.</p>
        )}
      </div>
    </div>
  );
};

const styles = {
  appContainer: {
    padding: '20px',
    fontFamily: "'Raleway', sans-serif",
    backgroundColor: '#fec5e5',
    minHeight: '100vh',
  },
  heading: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '20px',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  ordersContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  card: {
    width: '325px',
    background: 'white',
    margin: '0 auto',
    boxShadow: '0 2px 5px rgba(0,0,0,0.16), 0 2px 10px rgba(0,0,0,0.12)',
    transition: 'all 0.3s',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
  },
  nav: {
    width: '90%',
    padding: '15px',
    borderBottom: '2px solid pink',
    color: '#727272',
    textTransform: 'capitalize',
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


  description: {
    padding: '20px',
  },
  orderTitle: {
    color: '#515151',
    fontWeight: '500',
    fontSize: '18px',
    margin: '10px 0',
    textTransform: 'capitalize',
  },
  lineItem: {
    marginBottom: '10px',
  },

  circle: {
    border: '0.1em solid pink',
    borderRadius: '100%',
    height: '1.5em',
    width: '1.5em',
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: '5px',
  },
  circleText: {
    margin: '0',
    fontSize: '1em',
    fontWeight: 'bold',
    color: 'grey',
    fontFamily: 'sans-serif',
  },
  modifiersContainer: {
    marginTop: '10px',
    marginLeft: '20px',
    paddingLeft: '10px',
    borderLeft: '2px solid #ffc0cb',
  },
  modifiersList: {
    listStyleType: 'none',
    padding: '0',
    margin: '0',
  },
  modifierItem: {
    fontSize: '14px',
    marginBottom: '5px',
    color: '#515151',
  },
  modifierDetail: {
    fontSize: '12px',
    color: '#727272',
    marginLeft: '5px',
  },
  totalContainer: {
    marginTop: '15px',
    textAlign: 'right',
  },
  dottedLine: {
    border: 'none',
    borderTop: '2px dotted #ccc',
    margin: '10px 0',
  },
  orderTotal: {
    color: '#515151',
    fontWeight: '500',
    fontSize: '20px',
    margin: '5px 0 0 0',
  },
  noOrdersText: {
    textAlign: 'center',
    color: '#727272',
  },

  orderStatus: {
    fontSize: '12px',
    color: '#727272',
    fontWeight: '500',
    textAlign: 'left',
  },

  statusContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
  },
  svgIcon: {
    height: '24px',
    width: '24px',
    cursor: 'pointer',
    marginLeft: '5px', // Indent SVGs slightly
  },
  heartIcon: {
    fill: 'pink', // Heart icon is now pink
    height: '24px',
    width: '24px',
    cursor: 'pointer',
    marginLeft: '5px', // Indent SVGs slightly
  },
  orderDateNav: {
    fontSize: '14px',
    color: '#727272',
    fontWeight: '500',
    marginRight: 'auto', // Moves date-time slightly to the left
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'nowrap', // Prevents number from moving to the next line
  },
};

export default App;
