import React, { useEffect, useState } from "react";
import { delayRender, continueRender } from "remotion";
import { fontFaceCss, FONT_PROBES } from "./fontFaces";

/**
 * Останавливает рендер до тех пор, пока локальные шрифты (public/fonts)
 * действительно не загрузятся. Без этого первые кадры могут выйти
 * с подставным системным шрифтом.
 */
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("Загрузка шрифтов"));

  useEffect(() => {
    Promise.all(FONT_PROBES.map((p) => document.fonts.load(p, "Решение задачи 10 — ЕГЭ xy")))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  return (
    <>
      <style>{fontFaceCss()}</style>
      {children}
    </>
  );
};
