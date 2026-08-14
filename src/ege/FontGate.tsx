import React, { useEffect, useState } from "react";
import { delayRender, continueRender } from "remotion";
import { fontFaceCss } from "./fontFaces";

/**
 * Останавливает рендер до тех пор, пока локальные шрифты (public/fonts)
 * действительно не загрузятся. Без этого первые кадры могут выйти
 * с подставным системным шрифтом.
 */
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("Загрузка шрифтов"));

  useEffect(() => {
    const probes = [
      '700 100px "Montserrat"',
      '800 100px "Montserrat"',
      '600 100px "Montserrat"',
      '400 100px "Inter"',
      '500 100px "Inter"',
      '600 100px "Inter"',
      '700 100px "Inter"',
      'italic 600 100px "Inter"',
      'italic 400 100px "Inter"',
    ];

    Promise.all(probes.map((p) => document.fonts.load(p, "Решение задачи 10 — ЕГЭ xy")))
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
