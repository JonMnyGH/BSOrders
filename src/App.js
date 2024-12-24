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

        const clearedOrderIds = getClearedOrderIds();
        const filteredOrders = data.filter((order) => !clearedOrderIds.includes(order.id));

        setOrders(filteredOrders);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchOrders();
    const intervalId = setInterval(fetchOrders, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  const handleDoubleClick = (id) => {
    console.log('Double-clicked card with ID:', id);
    addClearedOrderId(id);
    setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
  };

  const formatCurrency = (amount) => `$${(amount / 100).toFixed(2)}`;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const options = { month: 'short' };
    const month = date.toLocaleString(undefined, options);
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${month} ${day} ${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  return (
    <div style={styles.appContainer}>
      <h1 style={styles.heading}>Today's Orders</h1>
      {error && <p style={styles.errorText}>{error}</p>}
      {orders.map((order) => (
  <div
    key={order.id}
    className="card"
    style={styles.card}
    onDoubleClick={() => handleDoubleClick(order.id)}
  >
    <nav style={styles.nav}>
      <div style={styles.navContent}>
        <svg
          className="heart"
          viewBox="0 0 512 512"
          width="24px"
          xmlns="http://www.w3.org/2000/svg"
          style={styles.heartIcon}
        >
          <path d="M340.8,98.4c50.7,0,91.9,41.3,91.9,92.3c0,26.2-10.9,49.8-28.3,66.6L256,407.1L105,254.6c-15.8-16.6-25.6-39.1-25.6-63.9  c0-51,41.1-92.3,91.9-92.3c38.2,0,70.9,23.4,84.8,56.8C269.8,121.9,302.6,98.4,340.8,98.4 M340.8,83C307,83,276,98.8,256,124.8  c-20-26-51-41.8-84.8-41.8C112.1,83,64,131.3,64,190.7c0,27.9,10.6,54.4,29.9,74.6L245.1,418l10.9,11l10.9-11l148.3-149.8  c21-20.3,32.8-47.9,32.8-77.5C448,131.3,399.9,83,340.8,83L340.8,83z" />
        </svg>
      </div>
      <span style={styles.orderDateNav}>{formatDate(order.createdAt)}</span>
    </nav>
    <div className="description" style={styles.description}>
      {/* Loop through all line items */}
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
      {/* Display the total amount */}
      <h1 style={styles.orderTotal}>
        Total: {formatCurrency(order.totalMoney?.amount)}
      </h1>
    </div>
  </div>
))}

    </div>
  );
};

const styles = {
  appContainer: {
    padding: '20px',
    fontFamily: "'Raleway', sans-serif",
    backgroundColor: 'white',
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
  ordersContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    justifyContent: 'center',
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
    marginBottom: '10px', // Add spacing between items
  },
  orderTotal: {
    color: '#515151',
    fontWeight: '500',
    fontSize: '20px',
    margin: '10px 0',
  },
};


export default App;
