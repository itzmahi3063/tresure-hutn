const SpinWheel = (() => {
  const COLORS = ['#f2b705', '#2dd4bf', '#ff5c8a', '#7c5cff', '#34d399', '#ff9f43', '#5c9eff', '#ffd95e'];

  function render(svgEl, labels) {
    const cx = 150, cy = 150, r = 145;
    const n = labels.length;
    const slice = (2 * Math.PI) / n;
    let html = '';

    for (let i = 0; i < n; i++) {
      const start = i * slice - Math.PI / 2;
      const end = start + slice;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      html += `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 0,1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${COLORS[i % COLORS.length]}" stroke="#0b1220" stroke-width="2" />`;

      const mid = start + slice / 2;
      const tx = cx + (r * 0.62) * Math.cos(mid), ty = cy + (r * 0.62) * Math.sin(mid);
      const rot = (mid * 180) / Math.PI + 90;
      html += `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" fill="#1a0f00" font-size="12" font-weight="800" text-anchor="middle" transform="rotate(${rot.toFixed(1)} ${tx.toFixed(2)} ${ty.toFixed(2)})">${labels[i]}</text>`;
    }

    html += `<circle cx="${cx}" cy="${cy}" r="26" fill="#1a0f00" stroke="${COLORS[0]}" stroke-width="3" />`;
    html += `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="20">🏆</text>`;

    svgEl.innerHTML = html;
    svgEl.style.transform = 'rotate(0deg)';
  }

  /** Spins to land the chosen segment index under the top pointer. */
  function spinTo(svgEl, segmentCount, resultIndex, currentRotation) {
    const slice = 360 / segmentCount;
    const targetAngle = 360 * 5 - resultIndex * slice - slice / 2;
    const finalRotation = currentRotation - (currentRotation % 360) + targetAngle;
    svgEl.style.transform = `rotate(${finalRotation}deg)`;
    return finalRotation;
  }

  return { render, spinTo };
})();
