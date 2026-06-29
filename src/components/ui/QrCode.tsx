import React, { useMemo } from 'react';
import Svg, { Rect, Path } from 'react-native-svg';
import qrcodegen from 'qrcode-generator';

interface Props {
  value: string;
  size: number;
  color?: string;
  backgroundColor?: string;
}

/**
 * QR code rendered entirely via react-native-svg.
 * Uses qrcode-generator (pure JS) for the matrix — no native modules required.
 */
export function QrCode({ value, size, color = '#000000', backgroundColor = '#ffffff' }: Props) {
  const path = useMemo(() => {
    const qr = qrcodegen(0, 'M');
    qr.addData(value);
    qr.make();

    const count = qr.getModuleCount();
    const cell = size / count;
    let d = '';

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          const x = col * cell;
          const y = row * cell;
          d += `M${x},${y}h${cell}v${cell}h-${cell}Z`;
        }
      }
    }
    return d;
  }, [value, size]);

  return (
    <Svg width={size} height={size}>
      <Rect width={size} height={size} fill={backgroundColor} />
      <Path d={path} fill={color} />
    </Svg>
  );
}
