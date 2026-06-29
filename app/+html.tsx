import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web-only HTML shell.
 *
 * Zoom prevention strategy (viewport user-scalable=no is ignored by all
 * major browsers since ~2018, so JS + CSS are required):
 *
 *  1. CSS `* { touch-action: pan-x pan-y }` in global.css — prevents
 *     touch pinch-to-zoom on iOS Safari and Chrome/Firefox mobile.
 *     react-native-gesture-handler overrides this with inline
 *     `touch-action: none` on the ZoomableMap container so map pinch works.
 *
 *  2. `wheel` listener (ctrlKey) — prevents touchpad pinch in Chrome/Firefox
 *     on desktop (they send ctrl+wheel for touchpad pinch).
 *
 *  3. `gesturestart/change/end` listeners — prevents touchpad pinch in
 *     Safari on macOS (Safari uses Apple's proprietary GestureEvent API
 *     instead of ctrl+wheel). RNGH uses PointerEvents internally, so
 *     preventing GestureEvents does not break map pinch.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <ScrollViewStyleReset />
        {/* Prevent all browser-level zoom via JS — must be passive:false to call preventDefault */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var opts = { passive: false };
                // Chrome / Firefox desktop: touchpad pinch sends ctrl+wheel
                document.addEventListener('wheel', function (e) {
                  if (e.ctrlKey) e.preventDefault();
                }, opts);
                // Safari macOS: touchpad pinch sends GestureEvent
                document.addEventListener('gesturestart',  function (e) { e.preventDefault(); }, opts);
                document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, opts);
                document.addEventListener('gestureend',    function (e) { e.preventDefault(); }, opts);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
