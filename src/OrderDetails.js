import React, { useState } from 'react';

const PURPLE = '#2e1065';
const ACCENT = '#4f2ae0';

const emptyForm = {
  symbol: 'XHLD',
  companyName: 'Ten Hldgs Inc Com Usd0.0001',
  lastPrice: '12.95',
  change: '0.25',
  changePercent: '1.97',
  volume: '1.29M',
  asOf: '4:00 PM ET 09/25/2026',
  bidPrice: '12.9',
  bidSize: '1600',
  askPrice: '13.15',
  askSize: '100',
  orderNumber: '31',
  orderPlaced: '9:20 AM ET 09/25/2026',
  executed: '9:30 AM ET 09/25/2026',
  orderStatus: 'Executed',
  orderType: 'Buy',
  quantity: '117',
  term: 'Good for Day',
  priceType: 'Limit',
  limitPrice: '12.70',
  priceExecuted: '12.70',
  commission: '0.00'
};

const formFields = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'lastPrice', label: 'Last Price' },
  { key: 'change', label: 'Change' },
  { key: 'changePercent', label: 'Change %' },
  { key: 'volume', label: 'Volume' },
  { key: 'asOf', label: 'As Of' },
  { key: 'bidPrice', label: 'Bid Price' },
  { key: 'bidSize', label: 'Bid Size' },
  { key: 'askPrice', label: 'Ask Price' },
  { key: 'askSize', label: 'Ask Size' },
  { key: 'orderNumber', label: 'Order Number' },
  { key: 'orderPlaced', label: 'Order Placed' },
  { key: 'executed', label: 'Executed' },
  { key: 'orderStatus', label: 'Order Status' },
  { key: 'orderType', label: 'Order Type' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'term', label: 'Term' },
  { key: 'priceType', label: 'Price Type' },
  { key: 'limitPrice', label: 'Limit Price', prefix: '$' },
  { key: 'priceExecuted', label: 'Price Executed', prefix: '$' },
  { key: 'commission', label: 'Commission/Fees', prefix: '$' }
];

const styles = {
  wrapper: {
    width: '100%',
    maxWidth: '100%',
    margin: '0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#fff',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  header: {
    background: PURPLE,
    color: '#fff',
    padding: '16px',
    textAlign: 'center',
    fontSize: '22px',
    fontWeight: 700,
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    lineHeight: 1
  },
  body: { padding: '16px', flex: 1, boxSizing: 'border-box' },
  formRow: { display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' },
  formLabel: { flex: '0 0 45%', fontSize: '14px', color: '#333' },
  input: {
    flex: 1,
    padding: '8px 10px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    textAlign: 'right'
  },
  submitButton: {
    width: '100%',
    background: ACCENT,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '18px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '12px'
  },
  quoteBlock: { padding: '12px 16px', borderBottom: '1px solid #e5e5e5' },
  quoteTitle: { fontSize: '19px', fontWeight: 600, color: '#222' },
  quoteLine: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' },
  quotePrice: { fontSize: '20px', fontWeight: 700, color: '#222' },
  quoteChange: { fontSize: '19px', fontWeight: 700 },
  quoteVolume: { fontSize: '19px', fontWeight: 700, color: '#222' },
  asOf: { fontSize: '14px', color: '#444', marginTop: '4px' },
  actionLine: { padding: '14px 16px', fontSize: '19px', color: '#222', borderBottom: '1px solid #e5e5e5' },
  bidAskRow: { display: 'flex', borderBottom: '1px solid #e5e5e5' },
  bidAskCell: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 12px'
  },
  bidAskLabel: { fontSize: '16px', color: '#333' },
  bidAskValue: { fontSize: '18px', fontWeight: 700, color: '#222' },
  divider: { width: '1px', background: '#e5e5e5' },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '6px 16px',
    gap: '12px'
  },
  detailLabel: { fontSize: '16px', color: '#333' },
  detailValue: { fontSize: '16px', fontWeight: 700, color: '#111', textAlign: 'right' },
  stackedValue: { fontSize: '16px', fontWeight: 700, color: '#111', textAlign: 'right', padding: '0 16px 10px' }
};

const OrderDetails = () => {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(null);

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(form);
  };

  if (!submitted) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>New Order</div>
        <form style={styles.body} onSubmit={handleSubmit}>
          {formFields.map((field) => (
            <div key={field.key} style={styles.formRow}>
              <label style={styles.formLabel} htmlFor={field.key}>
                {field.label}
              </label>
              <input
                id={field.key}
                style={styles.input}
                value={form[field.key]}
                onChange={handleChange(field.key)}
              />
            </div>
          ))}
          <button type="submit" style={styles.submitButton}>
            Submit
          </button>
        </form>
      </div>
    );
  }

  const o = submitted;
  const changeValue = Number(o.change);
  const changeColor = Number.isFinite(changeValue) && changeValue < 0 ? '#c62828' : '#1b7f2f';

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <button type="button" style={styles.backButton} onClick={() => setSubmitted(null)}>
          &#8592;
        </button>
        Order Details
      </div>

      <div style={styles.quoteBlock}>
        <div style={styles.quoteTitle}>
          {o.symbol} - {o.companyName}
        </div>
        <div style={styles.quoteLine}>
          <span style={styles.quotePrice}>{o.lastPrice}</span>
          <span style={{ ...styles.quoteChange, color: changeColor }}>
            {o.change} ({o.changePercent}%)
          </span>
          <span style={styles.quoteVolume}>{o.volume}</span>
        </div>
        <div style={styles.asOf}>As of {o.asOf}</div>
      </div>

      <div style={styles.actionLine}>
        {o.orderType} {o.quantity} {o.symbol}
      </div>

      <div style={styles.bidAskRow}>
        <div style={styles.bidAskCell}>
          <span style={styles.bidAskLabel}>Bid</span>
          <span style={styles.bidAskValue}>
            {o.bidPrice} x {o.bidSize}
          </span>
        </div>
        <div style={styles.divider} />
        <div style={styles.bidAskCell}>
          <span style={styles.bidAskLabel}>Ask</span>
          <span style={styles.bidAskValue}>
            {o.askPrice} x {o.askSize}
          </span>
        </div>
      </div>

      <div style={{ padding: '10px 0', flex: 1 }}>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Order Number</span>
          <span style={styles.detailValue}>{o.orderNumber}</span>
        </div>

        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Order Placed</span>
        </div>
        <div style={styles.stackedValue}>{o.orderPlaced}</div>

        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Executed</span>
        </div>
        <div style={styles.stackedValue}>{o.executed}</div>

        {[
          ['Order Status', o.orderStatus],
          ['Order Type', o.orderType],
          ['Quantity', o.quantity],
          ['Term', o.term],
          ['Price Type', o.priceType],
          ['Limit Price', `$${o.limitPrice}`],
          ['Price Executed', `$${o.priceExecuted}`],
          ['Commission/Fees', `$${o.commission}`]
        ].map(([label, value]) => (
          <div key={label} style={styles.detailRow}>
            <span style={styles.detailLabel}>{label}</span>
            <span style={styles.detailValue}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px', marginTop: 'auto' }}>
        <button type="button" style={styles.submitButton} onClick={() => setSubmitted(null)}>
          New order
        </button>
      </div>
    </div>
  );
};

export default OrderDetails;
