import React from 'react';
import { MentionedProduct } from '../types';

interface MentionChipProps {
  product: MentionedProduct;
}

const MentionChip: React.FC<MentionChipProps> = ({ product }) => {
  return (
    <span
      className="mention-chip-display"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(59, 130, 246, 0.18)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        color: '#a3c9ff',
        borderRadius: 12,
        padding: '0 8px',
        margin: '0 2px',
        fontSize: 13,
        lineHeight: '20px',
      }}
    >
      {product.name}
    </span>
  );
};

export default MentionChip;
