import React, { useState } from 'react';
import { SegmentCoverData } from '../types';

interface SegmentCoverActionProps {
  segmentData: SegmentCoverData;
  onApply?: (dataList: SegmentCoverData['data_list']) => void | Promise<void>;
}

const formatFrequencyRange = ([start, end]: [number, number]) => {
  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1).replace(/\.0$/, '')} kHz`;
    }
    return `${value} Hz`;
  };

  return `${formatValue(start)} - ${formatValue(end)}`;
};

const SegmentCoverAction: React.FC<SegmentCoverActionProps> = ({ segmentData, onApply }) => {
  const [status, setStatus] = useState<'idle' | 'applying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApply = async () => {
    if (!onApply) {
      return;
    }

    setStatus('applying');
    setErrorMessage(null);
    try {
      await Promise.resolve(onApply(segmentData.data_list));
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (error: any) {
      console.error('执行频段覆盖失败:', error);
      setErrorMessage(error?.message || '执行失败，请稍后重试');
      setStatus('error');
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(24, 118, 210, 0.12)',
        border: '1px solid rgba(24, 118, 210, 0.35)',
        borderRadius: 10,
        padding: '12px 14px',
        color: '#cfe2ff',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span role="img" aria-label="segment">
          🎚️
        </span>
        频段覆盖建议
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segmentData.data_list.map((item) => (
          <li
            key={`${item.uuid}-${item.frequency_range.join('-')}`}
            style={{
              background: 'rgba(12, 60, 130, 0.25)',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 500 }}>{item.name}</div>
            <div style={{ opacity: 0.85, marginTop: 2 }}>{formatFrequencyRange(item.frequency_range)}</div>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={handleApply}
          disabled={status === 'applying' || !onApply}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: !onApply
              ? 'rgba(255,255,255,0.2)'
              : status === 'success'
              ? '#2e7d32'
              : 'var(--primary-color)',
            color: '#fff',
            fontSize: 13,
            cursor: status === 'applying' || !onApply ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
          }}
        >
          {!onApply
            ? '等待主应用接入'
            : status === 'applying'
            ? '应用中...'
            : status === 'success'
            ? '已应用'
            : '应用建议'}
        </button>
        {status === 'error' && (
          <span style={{ fontSize: 12, color: '#ff8a80' }}>{errorMessage}</span>
        )}
      </div>
    </div>
  );
};

export default SegmentCoverAction;
