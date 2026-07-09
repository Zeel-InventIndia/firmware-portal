import React, { useState } from 'react';

export default function PasswordField({ value, onChange, required = false, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        style={{ paddingRight: 56 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="btn ghost small"
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '3px 8px',
        }}
        tabIndex={-1}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
