import type { TaskDef } from "./types";
import { SolutionOne } from "./task11-solution1";
import { SolutionTwo } from "./task11-solution2";

/**
 * Задание 10 (совместная работа): двое рабочих и заказ на 8 часов.
 *
 * Решение через части: весь заказ — 8 частей, рабочий делает 1 часть в час.
 * За 4 часа в одиночку сделано 4 части, остаток 4 части вдвоём занимает
 * 4 : 2 = 2 часа. Итого 4 + 2 = 6 часов.
 */
export const task11: TaskDef = {
  id: "Task10Workers",
  number: 10,

  tokens: [
    "Каждый",
    "из",
    "двух",
    "рабочих",
    { art: ["worker", "worker"], label: "двое рабочих" },
    "одинаковой",
    "квалификации",
    "может",
    "выполнить",
    "заказ",
    { art: ["order"], label: "заказ" },
    "за",
    "8",
    "часов.",
    { number: "8", unit: "часов", label: "восемь часов" },
    "Через",
    "4",
    "часа",
    { number: "4", unit: "часа", label: "четыре часа" },
    "после",
    "того,",
    "как",
    "один",
    "из",
    "них",
    "приступил",
    "к",
    "выполнению",
    "заказа,",
    "к",
    "нему",
    "присоединился",
    "второй",
    "рабочий,",
    { art: ["duo"], label: "вдвоём" },
    "и",
    "работу",
    "над",
    "заказом",
    "они",
    "довели",
    "до",
    "конца",
    "уже",
    "вместе.",
    "Сколько",
    "часов",
    "потребовалось",
    "на",
    "выполнение",
    "всего",
    "заказа?",
    { art: ["question"], label: "вопрос" },
  ],
  problemSize: 46,
  timerSize: 34,

  solutions: [
    { seconds: 11, Component: SolutionOne },
    { seconds: 13, Component: SolutionTwo },
  ],

  answerLead: "На весь заказ потребовалось",
  answerFormula: (
    <>
      4
      <span style={{ margin: "0 16px" }}>+</span>2
      <span style={{ margin: "0 18px" }}>=</span>
      <span style={{ color: "#1d4ed8", fontWeight: 700 }}>6</span>
      <span style={{ marginLeft: 16 }}>часов</span>
    </>
  ),
  answer: "6",
  unit: "часов",
  check: <>первый сделал 6 частей, второй — 2; вместе 8 — весь заказ</>,
};
