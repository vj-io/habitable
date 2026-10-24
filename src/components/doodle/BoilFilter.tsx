/** Shared boil filters (render once in the root layout). `.ink-boil` steps through them at ~10 fps. */
export function BoilFilter() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        {[1, 2, 3].map((seed) => (
          <filter key={seed} id={`boil-${seed}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed} />
            <feDisplacementMap in="SourceGraphic" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
