import React from 'react';

export default function StageLights({ stages }) {
  return (
    <div className="led-row">
      {stages.map((s) => (
        <div className="led" key={s.stage_number} title={s.remarks || s.status}>
          <div className={`led-dot ${s.status}`} />
          <div className="led-label">{s.stage_name}</div>
        </div>
      ))}
    </div>
  );
}
