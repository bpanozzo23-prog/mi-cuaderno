import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LessonPlayer from "../LessonPlayer.jsx";
import { lesson1917 } from "../content1917.js";
import { validateLesson } from "../contentValidation.js";
import "./preview.css";
import "@fontsource/literata/latin-400.css";
import "@fontsource/literata/latin-400-italic.css";
import "@fontsource/literata/latin-600.css";
import "@fontsource/literata/latin-700.css";

const problems = validateLesson(lesson1917);
if (problems.length) throw new Error(`Invalid lesson content:\n${problems.join("\n")}`);

// This disposable reader restarts at the opening; a restored pixel offset from
// another page would hide its title even though the reading state has reset.
window.history.scrollRestoration = "manual";
window.scrollTo({ top: 0, behavior: "instant" });

createRoot(document.getElementById("root")).render(
  <StrictMode><LessonPlayer lesson={lesson1917} /></StrictMode>
);
